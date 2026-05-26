// ============================================================
//  Islamic WhatsApp Status Auto-Poster (Poster Edition)
//  Author : Rehan Sajid
//  Stack  : Node.js · whatsapp-web.js · node-cron · axios
// ============================================================

// ── Global EIO Guard for hidden terminals ────────────────────
const originalConsoleLog = console.log;
console.log = function(...args) {
  try {
    originalConsoleLog.apply(console, args);
  } catch(e) {
    if (e.code !== 'EIO') throw e;
  }
};
const originalConsoleError = console.error;
console.error = function(...args) {
  try {
    originalConsoleError.apply(console, args);
  } catch(e) {
    if (e.code !== 'EIO') throw e;
  }
};

'use strict';

require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode   = require('qrcode-terminal');
const axios    = require('axios');
const cron     = require('node-cron');
const fs       = require('fs');
const path     = require('path');
const express  = require('express');
const cors     = require('cors');
const { generatePosterImage, generatePosterVideo } = require('./generate');
const { execSync } = require('child_process');

// ── Environment variables ─────────────────────────────────────
const HADITH_API_KEY = process.env.HADITH_API_KEY || '';
const CITY           = process.env.CITY           || 'Rawalpindi';
const COUNTRY        = process.env.COUNTRY        || 'Pakistan';
const PRAYER_METHOD  = process.env.PRAYER_METHOD  || '1';

// ── Log file setup ────────────────────────────────────────────
const LOG_DIR  = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'status.log');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

/**
 * Write a formatted log line to file and stdout with robust log rotation.
 */
function log(tag, message) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${now}] [${tag}] ${message}`;
  try {
    console.log(line);
  } catch (e) {
    // Ignore EIO when terminal pane is closed
  }
  try {
    // Rotate log file if it exceeds 10MB
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 10 * 1024 * 1024) { // 10 MB
        // Shift existing rotated files: status.3.log -> status.4.log, etc.
        for (let i = 3; i >= 1; i--) {
          const oldPath = path.join(LOG_DIR, `status.${i}.log`);
          const newPath = path.join(LOG_DIR, `status.${i + 1}.log`);
          if (fs.existsSync(oldPath)) {
            try { fs.renameSync(oldPath, newPath); } catch (e) {}
          }
        }
        try { fs.renameSync(LOG_FILE, path.join(LOG_DIR, 'status.1.log')); } catch (e) {}
      }
    }
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
}

// ── Prayer times state (refreshed daily at 00:01) ─────────────
let prayerTimings = {};
let activeJobs    = [];   // hold cron job references so we can stop old ones

// ── Bot state tracking for API ────────────────────────────────
let botState = 'initializing';
let currentQr = null;
let isRestarting = false;

// ── WhatsApp client ───────────────────────────────────────────
const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer   : {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
    ],
  },
});

// Retry initialize on failure
async function initClient() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // Clean up Chrome lock files to prevent startup issues
      const lockPaths = [
        path.join(__dirname, '.wwebjs_auth/session/SingletonLock'),
        path.join(__dirname, '.wwebjs_auth/session/Lock'),
      ];
      for (const p of lockPaths) {
        try {
          fs.unlinkSync(p);
          log('CLEANUP', `Removed dangling Chrome lock file: ${p}`);
        } catch (e) {
          if (e.code !== 'ENOENT') {
            log('CLEANUP_ERR', `Failed to remove Chrome lock file: ${e.message}`);
          }
        }
      }

      await waClient.initialize();
      return;
    } catch (err) {
      log('ERROR', `Client init attempt ${attempt}/5 failed: ${err.message?.slice(0, 100)}`);
      if (attempt === 5) throw err;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
}

async function restartClient() {
  if (isRestarting) return;
  isRestarting = true;
  botState = 'initializing';
  log('RESTART', 'Initiating self-healing restart due to detached frame / protocol error...');
  try {
    await waClient.destroy();
    log('RESTART', 'Old client destroyed.');
  } catch (e) {
    log('RESTART_ERR', `Failed to destroy client: ${e.message}`);
  }
  
  // Delay slightly before re-initializing
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    await initClient();
    log('RESTART', 'Self-healing client restart successful ✓');
  } catch (e) {
    log('RESTART_ERR', `Failed to restart client: ${e.message}`);
  } finally {
    isRestarting = false;
  }
}

// ── WhatsApp events ───────────────────────────────────────────
waClient.on('qr', (qr) => {
  botState = 'qr';
  currentQr = qr;
  log('QR', 'Scan this QR code with WhatsApp to login:');
  qrcode.generate(qr, { small: true });
});

waClient.on('authenticated', () => {
  botState = 'authenticated';
  log('AUTH', 'WhatsApp session authenticated ✓');
});

waClient.on('auth_failure', (msg) => {
  botState = 'auth_failure';
  log('AUTH_FAIL', `Authentication failed: ${msg}`);
});

waClient.on('change_state', (state) => {
  log('STATE', `Connection state changed: ${state}`);
});

waClient.on('ready', async () => {
  botState = 'ready';
  currentQr = null;
  log('READY', 'WhatsApp client is ready ✓');
  await runStartupChecks();
  await refreshPrayerTimes();
  scheduleDailyRefresh();
});

waClient.on('disconnected', (reason) => {
  botState = 'disconnected';
  log('DISCONNECTED', `WhatsApp disconnected — reason: ${reason}. Reconnecting in 30s…`);
  setTimeout(async () => {
    log('RECONNECT', 'Attempting WhatsApp reconnect…');
    try {
      await initClient();
      log('RECONNECT', 'WhatsApp reconnected successfully ✓');
    } catch (e) {
      log('ERROR', `Reconnect failed: ${e.message}`);
    }
  }, 30_000);
});

// ── Express API Server ────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/status', (req, res) => {
  res.json({ state: botState, qr: currentQr });
});

app.post('/api/upload', async (req, res) => {
  if (botState !== 'ready') return res.status(400).json({ error: 'WhatsApp bot is not ready' });
  const { type, arabic, urdu, reference, bgStyle } = req.body;

  if (!arabic || !reference) {
    return res.status(400).json({ error: 'Missing required fields (arabic, reference)' });
  }

  log('API_UPLOAD', `Manual upload requested: ${reference}`);
  let tempPath = null;

  try {
    // Use the MP4 video trick — WhatsApp's video compression preserves
    // sharp text far better than its JPEG image pipeline.
    tempPath = await generatePosterVideo({
      type: type || 'quran',
      arabic,
      urdu: urdu || '',
      reference,
      bgStyle: bgStyle || 'lake'
    });

    const media = MessageMedia.fromFilePath(tempPath);
    await waClient.sendMessage('status@broadcast', media, {
      caption: `🌙 ${reference}`
    });

    log('API_UPLOAD', `Upload successful: ${reference}`);
    res.json({ success: true });
  } catch (err) {
    log('ERROR', `Upload failed: ${err.message}`);
    if (err.message && (err.message.includes('detached') || err.message.includes('Protocol error') || err.message.includes('Target closed'))) {
      log('HEAL', 'Detached frame / protocol error detected in upload API. Triggering self-healing restart...');
      restartClient().catch(() => {});
      res.status(500).json({ error: 'WhatsApp bot frame detached. Re-initializing the bot. Please try again in 15-20 seconds.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
});

// ── Bot Control API ──────────────────────────────────────────
let cronEnabled = true;
let dailyRefreshJob = null;

app.get('/api/control', (req, res) => {
  res.json({
    state: botState,
    cronEnabled,
    city: CITY,
    country: COUNTRY,
    scheduledJobs: activeJobs.length,
    prayerTimings
  });
});

app.post('/api/control', async (req, res) => {
  const { action } = req.body;
  log('API_CONTROL', `Control action received: ${action}`);

  try {
    switch (action) {
      case 'start': {
        if (!cronEnabled) {
          cronEnabled = true;
          await refreshPrayerTimes();
          log('API_CONTROL', 'Cron scheduler started');
        }
        return res.json({ success: true, cronEnabled });
      }
      case 'stop': {
        if (cronEnabled) {
          cronEnabled = false;
          activeJobs.forEach(j => j.stop());
          activeJobs = [];
          if (dailyRefreshJob) { dailyRefreshJob.stop(); dailyRefreshJob = null; }
          log('API_CONTROL', 'Cron scheduler stopped');
        }
        return res.json({ success: true, cronEnabled });
      }
      case 'refresh': {
        await refreshPrayerTimes();
        return res.json({ success: true, message: 'Prayer times refreshed' });
      }
      case 'status': {
        return res.json({
          state: botState,
          cronEnabled,
          city: CITY,
          country: COUNTRY,
          scheduledJobs: activeJobs.length
        });
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    log('ERROR', `Control action failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  log('API_SERVER', 'Express API server listening on port 3001');
});

// ── API: Al-Quran Cloud — fetch a random Uthmani Ayah and Urdu Translation ──
async function fetchQuranAyah() {
  log('API_FETCH', 'Fetching random Quran ayah (Arabic & Urdu)…');
  const randomNum = Math.floor(Math.random() * 6236) + 1;
  const url = `https://api.alquran.cloud/v1/ayah/${randomNum}/editions/quran-uthmani,ur.maududi`;
  const res = await axios.get(url, { timeout: 15_000 });
  const data = res.data.data;
  const ar = data[0];
  const ur = data[1];
  log('API_OK', `Quran ayah fetched: ${ar.surah.englishName} ${ar.numberInSurah}`);
  return {
    type: 'quran',
    arabic: ar.text,
    urdu: ur.text,
    reference: `${ar.surah.englishName} : ${ar.numberInSurah}`,
  };
}

// ── API: HadithAPI.com — fetch a random Hadith (Arabic & Urdu) ────────
async function fetchHadith() {
  log('API_FETCH', 'Fetching random Hadith (Arabic & Urdu) via curl…');
  const books = ['sahih-bukhari', 'sahih-muslim', 'abu-dawood', 'ibn-e-majah', 'tirmidhi', 'nasai'];
  const randomBook = books[Math.floor(Math.random() * books.length)];
  const url = `https://hadithapi.com/api/hadiths?apiKey=${HADITH_API_KEY}&book=${randomBook}&paginate=50`;
  
  let data;
  try {
    const stdout = execSync(`curl -s '${url}'`, { maxBuffer: 10 * 1024 * 1024 });
    data = JSON.parse(stdout.toString());
  } catch (err) {
    throw new Error(`HadithAPI curl fetch failed: ${err.message}`);
  }

  const list = data.hadiths?.data;
  if (!list || list.length === 0) throw new Error('Hadith list is empty');
  const item = list[Math.floor(Math.random() * list.length)];
  log('API_OK', `Hadith fetched: ${item.book?.bookName || randomBook} Hadith #${item.hadithNumber}`);
  
  const bookNameMap = {
    'sahih-bukhari': 'صحیح بخاری',
    'sahih-muslim': 'صحیح مسلم',
    'abu-dawood': 'سنن ابو داؤد',
    'ibn-e-majah': 'سنن ابن ماجہ',
    'tirmidhi': 'جامع ترمذی',
    'nasai': 'سنن نسائی',
  };

  return {
    type: 'hadith',
    arabic: item.hadithArabic || 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    urdu: item.hadithUrdu || 'بے شک اعمال کا دارومدار نیتوں پر ہے',
    reference: `${item.book?.bookName || bookNameMap[randomBook]} : ${item.hadithNumber}`,
  };
}

// ── API: Aladhan — fetch prayer times for today ───────────────
async function fetchPrayerTimes() {
  log('API_FETCH', `Fetching prayer times for ${CITY}, ${COUNTRY}…`);
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=${PRAYER_METHOD}`;
  const res  = await axios.get(url, { timeout: 15_000 });
  const timings = res.data.data.timings;
  log('API_OK', `Prayer times received — Fajr: ${timings.Fajr} Dhuhr: ${timings.Dhuhr} Asr: ${timings.Asr} Maghrib: ${timings.Maghrib} Isha: ${timings.Isha}`);
  return timings;
}

// ── WhatsApp: Generate poster & post as status media ─────────────────
const BG_STYLES = ['green', 'navy', 'black', 'maroon', 'mountains', 'lake', 'mountain-night', 'desert-sunset', 'forest-mist', 'starry-night'];

async function postMediaStatus(posterData, label) {
  log('POSTING', `Generating poster for ${label}…`);
  let tempImagePath = null;
  try {
    // 1. Choose a random background style
    const bgStyle = BG_STYLES[Math.floor(Math.random() * BG_STYLES.length)];

    // 2. Generate screenshot
    tempImagePath = await generatePosterVideo({
      type: posterData.type,
      arabic: posterData.arabic,
      urdu: posterData.urdu,
      reference: posterData.reference,
      bgStyle: bgStyle
    });

    // 3. Load image as WhatsApp Media
    const media = MessageMedia.fromFilePath(tempImagePath);

    // 4. Send to status@broadcast
    await waClient.sendMessage('status@broadcast', media, {
      caption: `🌙 Daily Islamic Reminder: ${posterData.reference}`
    });

    log('STATUS_POSTED', `${label} status story posted successfully ✓`);
  } catch (err) {
    log('ERROR', `postMediaStatus failed: ${err.message}`);
    if (err.message && (err.message.includes('detached') || err.message.includes('Protocol error') || err.message.includes('Target closed'))) {
      log('HEAL', 'Detached frame / protocol error detected in postMediaStatus. Triggering self-healing restart...');
      restartClient().catch(() => {});
    }
    // Fallback: update status About or send to self
    try {
      const fallbackText = `"${posterData.arabic.slice(0, 50)}…" - ${posterData.reference}`;
      await waClient.setStatus(fallbackText);
      log('STATUS_POSTED', `${label} set as Text Status (About) due to error ✓`);
    } catch (e) {
      log('ERROR', `Text fallback failed: ${e.message}`);
    }
  } finally {
    // Clean up temporary image
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
        log('CLEANUP', 'Temporary image file removed.');
      } catch (err) {
        log('ERROR', `Failed to delete temp image file: ${err.message}`);
      }
    }
  }
}

// ── Prayer action handlers ────────────────────────────────────

async function handleFajr() {
  log('TRIGGER', '--- FAJR action triggered ---');
  try {
    const data = await fetchQuranAyah();
    await postMediaStatus(data, 'Fajr Quran Ayah');
  } catch (err) {
    log('ERROR', `handleFajr failed: ${err.message}`);
  }
}

async function handleDhuhr() {
  log('TRIGGER', '--- DHUHR action triggered ---');
  try {
    const data = {
      type: 'quran',
      arabic: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ',
      urdu: 'سورج کے ڈھلنے سے لے کر رات کے اندھیرے تک نماز قائم کیا کرو۔',
      reference: 'القرآن (الإسراء : ٧٨)'
    };
    await postMediaStatus(data, 'Dhuhr Prayer Reminder');
  } catch (err) {
    log('ERROR', `handleDhuhr failed: ${err.message}`);
  }
}

async function handleAsr() {
  log('TRIGGER', '--- ASR action triggered ---');
  try {
    const data = await fetchHadith();
    await postMediaStatus(data, 'Asr Hadith');
  } catch (err) {
    log('ERROR', `handleAsr failed: ${err.message}`);
  }
}

async function handleMaghrib() {
  log('TRIGGER', '--- MAGHRIB action triggered ---');
  try {
    const data = {
      type: 'quran',
      arabic: 'فَاصْبِرْ عَلَىٰ مَا يَقُولُونَ وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا',
      urdu: 'پس جو کچھ یہ باتیں بناتے ہیں اس پر صبر کیجئے، اور اپنے رب کی حمد کے ساتھ تسبیح پڑھتے رہئے سورج نکلنے سے پہلے بھی اور اس کے غروب ہونے سے پہلے بھی۔',
      reference: 'القرآن (طه : ١٣٠)'
    };
    await postMediaStatus(data, 'Maghrib Evening Adhkar');
  } catch (err) {
    log('ERROR', `handleMaghrib failed: ${err.message}`);
  }
}

async function handleIsha() {
  log('TRIGGER', '--- ISHA action triggered ---');
  try {
    const data = {
      type: 'quran',
      arabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
      urdu: 'نہایت بابرکت ہے وہ (اللہ) جس کے ہاتھ میں کائنات کی بادشاہی ہے، اور وہ ہر چیز پر قادر ہے۔',
      reference: 'القرآن (الملك : ١)'
    };
    await postMediaStatus(data, 'Isha Al-Mulk Reminder');
  } catch (err) {
    log('ERROR', `handleIsha failed: ${err.message}`);
  }
}

// ── Helpers: Parse prayer time string → cron expression ───────
function subtractMinutes(timeStr, offsetMinutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m - offsetMinutes;
  const fh = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
  const fm = ((totalMin % 1440) + 1440) % 1440 % 60;
  return { h: fh, m: fm };
}

function toCron({ h, m }) {
  return `${m} ${h} * * *`;
}

// ── Schedule cron jobs from today's prayer times ──────────────
function schedulePrayerJobs(timings) {
  // Cancel any previously running jobs
  activeJobs.forEach((j) => j.stop());
  activeJobs = [];

  if (!cronEnabled) {
    log('SCHEDULE', 'Cron is disabled — skipping job scheduling');
    return;
  }

  const prayers = [
    { name: 'Fajr'   , time: timings.Fajr   , handler: handleFajr    },
    { name: 'Dhuhr'  , time: timings.Dhuhr  , handler: handleDhuhr   },
    { name: 'Asr'    , time: timings.Asr    , handler: handleAsr     },
    { name: 'Maghrib', time: timings.Maghrib, handler: handleMaghrib },
    { name: 'Isha'   , time: timings.Isha   , handler: handleIsha    },
  ];

  prayers.forEach(({ name, time, handler }) => {
    const adjusted = subtractMinutes(time, 20);
    const expression = toCron(adjusted);
    log('SCHEDULE', `${name} scheduled at ${adjusted.h}:${String(adjusted.m).padStart(2,'0')} (20 min before ${time}) → cron "${expression}"`);
    const job = cron.schedule(expression, async () => {
      if (!cronEnabled) return;
      log('CRON', `Cron fired for ${name}`);
      await handler();
    }, { timezone: 'Asia/Karachi' });
    activeJobs.push(job);
  });
}

// ── Daily refresh: re-fetch prayer times at 00:01 ─────────────
function scheduleDailyRefresh() {
  if (dailyRefreshJob) dailyRefreshJob.stop();
  log('SCHEDULE', 'Daily prayer-time refresh scheduled at 00:01 Asia/Karachi');
  dailyRefreshJob = cron.schedule('1 0 * * *', async () => {
    if (!cronEnabled) return;
    log('REFRESH', 'Midnight refresh — fetching new prayer times…');
    await refreshPrayerTimes();
  }, { timezone: 'Asia/Karachi' });
}

async function refreshPrayerTimes() {
  try {
    prayerTimings = await fetchPrayerTimes();
    schedulePrayerJobs(prayerTimings);
    log('REFRESH', 'Prayer times refreshed and cron jobs rescheduled ✓');
  } catch (err) {
    log('ERROR', `refreshPrayerTimes failed: ${err.message}. Will retry in 5 min…`);
    setTimeout(refreshPrayerTimes, 5 * 60 * 1000);
  }
}

// ── Startup: test each API connection ────────────────────────
async function runStartupChecks() {
  log('STARTUP', '============ Running API startup checks ============');

  // 1. Aladhan prayer times
  try {
    await fetchPrayerTimes();
    log('STARTUP', '✓ Aladhan Prayer Times API — OK');
  } catch (e) {
    log('STARTUP', `✗ Aladhan Prayer Times API — FAILED: ${e.message}`);
  }

  // 2. Al-Quran Cloud
  try {
    await fetchQuranAyah();
    log('STARTUP', '✓ Al-Quran Cloud API — OK');
  } catch (e) {
    log('STARTUP', `✗ Al-Quran Cloud API — FAILED: ${e.message}`);
  }

  // 3. HadithAPI (only if key provided)
  if (HADITH_API_KEY && HADITH_API_KEY !== 'your_hadith_api_key_here') {
    try {
      await fetchHadith();
      log('STARTUP', '✓ HadithAPI — OK');
    } catch (e) {
      log('STARTUP', `✗ HadithAPI — FAILED: ${e.message}`);
    }
  } else {
    log('STARTUP', '⚠ HadithAPI — SKIPPED (no HADITH_API_KEY set in .env)');
  }

  log('STARTUP', '============ Startup checks complete ============');
}

// ── Uncaught error guards — never crash the process ──────────
process.on('uncaughtException', (err) => {
  if (err.code === 'EIO') return;
  log('FATAL', `Uncaught exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason || 'unknown';
  log('FATAL', `Unhandled rejection: ${msg}`);
});

// ── Boot ──────────────────────────────────────────────────────
log('BOOT', '🌙 Islamic WhatsApp Status Poster starting…');
log('BOOT', `Config → City: ${CITY}, Country: ${COUNTRY}, Method: ${PRAYER_METHOD}`);
log('BOOT', 'Initialising WhatsApp client (scan QR if first run)…');

initClient().catch((err) => {
  log('FATAL', `Failed to initialize WhatsApp client after 5 attempts: ${err.message}`);
  process.exit(1);
});
