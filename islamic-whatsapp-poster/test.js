// ============================================================
//  PREVIEW / DRY-RUN SCRIPT
//  Run with: node test.js
//  This does NOT post anything to WhatsApp.
//  It just shows you exactly what the bot would post.
// ============================================================

'use strict';

require('dotenv').config();
const axios = require('axios');

const HADITH_API_KEY = process.env.HADITH_API_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const CITY           = process.env.CITY           || 'Rawalpindi';
const COUNTRY        = process.env.COUNTRY        || 'Pakistan';
const PRAYER_METHOD  = process.env.PRAYER_METHOD  || '1';

// ── Colour helpers for terminal output ────────────────────────
const C = {
  reset : '\x1b[0m',
  green : '\x1b[32m',
  yellow: '\x1b[33m',
  cyan  : '\x1b[36m',
  red   : '\x1b[31m',
  bold  : '\x1b[1m',
  dim   : '\x1b[2m',
};

function banner(title) {
  console.log('\n' + C.cyan + C.bold + '═'.repeat(60) + C.reset);
  console.log(C.cyan + C.bold + `  ${title}` + C.reset);
  console.log(C.cyan + '═'.repeat(60) + C.reset);
}

function ok(msg)   { console.log(C.green  + '  ✓ ' + C.reset + msg); }
function err(msg)  { console.log(C.red    + '  ✗ ' + C.reset + msg); }
function info(msg) { console.log(C.yellow + '  → ' + C.reset + msg); }

function printStatus(label, text) {
  console.log('\n' + C.bold + `  📱 [${label}] What would be posted:` + C.reset);
  console.log(C.dim + '  ' + '─'.repeat(56) + C.reset);
  // Wrap text at 56 chars for readability
  const words = text.split(' ');
  let line = '  ';
  words.forEach((w) => {
    if ((line + w).length > 58) { console.log(line); line = '  ' + w + ' '; }
    else line += w + ' ';
  });
  if (line.trim()) console.log(line);
  console.log(C.dim + '  ' + '─'.repeat(56) + C.reset);
  console.log(C.dim + `  Length: ${text.length} characters` + C.reset);
}

// ── APIs ───────────────────────────────────────────────────────
async function fetchQuranAyah() {
  const randomNum = Math.floor(Math.random() * 6236) + 1;
  const res  = await axios.get(`https://api.alquran.cloud/v1/ayah/${randomNum}/en.asad`, { timeout: 15_000 });
  const data = res.data.data;
  return { text: data.text, surah: data.surah.englishName, ayahNumber: data.numberInSurah, surahNumber: data.surah.number };
}

async function fetchHadith() {
  const url = `https://hadithapi.com/api/hadiths/?apiKey=${HADITH_API_KEY}&book=sahih-bukhari&paginate=10`;
  const res  = await axios.get(url, { timeout: 15_000 });
  const list = res.data.hadiths.data;
  if (!list || list.length === 0) throw new Error('Hadith list empty');
  const item = list[Math.floor(Math.random() * list.length)];
  return { text: item.hadithEnglish, source: item.book?.bookName || 'Sahih Bukhari' };
}

async function fetchPrayerTimes() {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=${PRAYER_METHOD}`;
  const res = await axios.get(url, { timeout: 15_000 });
  return res.data.data.timings;
}

async function beautifyWithNIM(systemPrompt, userPrompt) {
  const res = await axios.post(
    'https://integrate.api.nvidia.com/v1/chat/completions',
    {
      model      : 'meta/llama-3.1-8b-instruct',
      messages   : [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens : 200,
      temperature: 0.7,
    },
    {
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30_000,
    }
  );
  const text = res.data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('NIM returned empty response');
  return text;
}

// ── Preview each prayer ────────────────────────────────────────
async function previewFajr() {
  banner('🌅 FAJR — Quran Ayah Preview');
  try {
    info('Fetching random Quran ayah…');
    const ayah = await fetchQuranAyah();
    ok(`Fetched: ${ayah.surah} ${ayah.ayahNumber}`);
    console.log(C.dim + `  Raw verse: "${ayah.text.slice(0, 80)}…"` + C.reset);

    const nimAvailable = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
    if (nimAvailable) {
      info('Sending to NVIDIA NIM for beautification…');
      const beautified = await beautifyWithNIM(
        'You are an Islamic content writer. Write beautiful WhatsApp statuses only.',
        `Write a WhatsApp status.\nRules:\n- Max 200 characters total\n- Include the verse in quotes\n- Add surah name and number\n- Write 1 short reflection line below\n- End with a relevant emoji\n- English only.\n\nVerse: "${ayah.text}"\nSurah: ${ayah.surah} (${ayah.surahNumber})\nAyah: ${ayah.ayahNumber}`
      );
      ok('NIM beautification done ✓');
      printStatus('FAJR', beautified);
    } else {
      err('NVIDIA_API_KEY not set — showing raw fallback content:');
      printStatus('FAJR (raw)', `"${ayah.text.slice(0, 100)}" — ${ayah.surah} ${ayah.ayahNumber} 🌅`);
    }
  } catch (e) { err(`Fajr preview failed: ${e.message}`); }
}

async function previewDhuhr() {
  banner('🕛 DHUHR — Prayer Reminder Preview');
  try {
    const nimAvailable = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
    if (nimAvailable) {
      info('Sending to NVIDIA NIM…');
      const beautified = await beautifyWithNIM(
        'You are an Islamic reminder bot. Short status messages only.',
        `Write a WhatsApp status for Dhuhr prayer time.\nRules:\n- Max 150 characters\n- Say it is Dhuhr time\n- Add one short hadith about salah\n- End with 🕌\n- English only`
      );
      ok('NIM beautification done ✓');
      printStatus('DHUHR', beautified);
    } else {
      err('NVIDIA_API_KEY not set — showing raw fallback content:');
      printStatus('DHUHR (raw)', "🕌 It's Dhuhr time! Leave everything and pray. Salah is the pillar of our deen.");
    }
  } catch (e) { err(`Dhuhr preview failed: ${e.message}`); }
}

async function previewAsr() {
  banner('🌤️  ASR — Hadith Preview');
  try {
    const hadithAvailable = HADITH_API_KEY && HADITH_API_KEY !== 'your_hadith_api_key_here';
    if (!hadithAvailable) {
      err('HADITH_API_KEY not set in .env — skipping Hadith fetch');
      printStatus('ASR (raw)', '"Actions are judged by intentions." — Sahih Bukhari 📖');
      return;
    }

    info('Fetching random Hadith…');
    const hadith = await fetchHadith();
    ok(`Fetched from: ${hadith.source}`);
    console.log(C.dim + `  Raw hadith: "${hadith.text.slice(0, 80)}…"` + C.reset);

    const nimAvailable = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
    if (nimAvailable) {
      info('Sending to NVIDIA NIM for beautification…');
      const beautified = await beautifyWithNIM(
        'You are an Islamic content writer. Write beautiful WhatsApp statuses only.',
        `Write a WhatsApp status for this Hadith.\nRules:\n- Max 200 characters total\n- Hadith in quotes\n- Mention the source book\n- Add 1 line simple meaning\n- End with relevant emoji\n- English only\n\nHadith: "${hadith.text}"\nSource: ${hadith.source}`
      );
      ok('NIM beautification done ✓');
      printStatus('ASR', beautified);
    } else {
      err('NVIDIA_API_KEY not set — showing raw fallback content:');
      printStatus('ASR (raw)', `"${hadith.text.slice(0, 120)}…" — ${hadith.source} 📖`);
    }
  } catch (e) { err(`Asr preview failed: ${e.message}`); }
}

async function previewMaghrib() {
  banner('🌙 MAGHRIB — Evening Adhkar Preview');
  try {
    const nimAvailable = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
    if (nimAvailable) {
      info('Sending to NVIDIA NIM…');
      const beautified = await beautifyWithNIM(
        'You are an Islamic reminder bot. Short status messages only.',
        `Write a WhatsApp status reminding Muslims to read evening adhkar.\nRules:\n- Max 180 characters\n- Mention Maghrib time\n- Include one short dhikr with translation\n- Warm gentle tone\n- End with 🌙\n- English only`
      );
      ok('NIM beautification done ✓');
      printStatus('MAGHRIB', beautified);
    } else {
      err('NVIDIA_API_KEY not set — showing raw fallback content:');
      printStatus('MAGHRIB (raw)', "🌙 Maghrib time! Read your evening adhkar — \"Astaghfirullah\" — I seek forgiveness from Allah.");
    }
  } catch (e) { err(`Maghrib preview failed: ${e.message}`); }
}

async function previewIsha() {
  banner('⭐ ISHA — Surah Al-Mulk Reminder Preview');
  try {
    const nimAvailable = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here';
    if (nimAvailable) {
      info('Sending to NVIDIA NIM…');
      const beautified = await beautifyWithNIM(
        'You are an Islamic reminder bot. Short status messages only.',
        `Write a WhatsApp status reminding Muslims to read Surah Al-Mulk before sleeping.\nRules:\n- Max 180 characters\n- Mention the benefit (protection from grave)\n- Peaceful tone\n- End with 🌟\n- English only`
      );
      ok('NIM beautification done ✓');
      printStatus('ISHA', beautified);
    } else {
      err('NVIDIA_API_KEY not set — showing raw fallback content:');
      printStatus('ISHA (raw)', "🌟 Before you sleep — read Surah Al-Mulk. It protects from the punishment of the grave. Sleep peacefully.");
    }
  } catch (e) { err(`Isha preview failed: ${e.message}`); }
}

async function previewPrayerTimes() {
  banner('🕌 TODAY\'S PRAYER TIMES (with -20 min trigger)');
  try {
    info(`Fetching prayer times for ${CITY}, ${COUNTRY}…`);
    const t = await fetchPrayerTimes();
    ok('Prayer times fetched ✓');
    const prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    prayers.forEach((p) => {
      if (!t[p]) return;
      const [h, m] = t[p].split(':').map(Number);
      const totalMin = h * 60 + m - 20;
      const th = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
      const tm = ((totalMin % 1440) + 1440) % 1440 % 60;
      console.log(`  ${C.yellow}${p.padEnd(8)}${C.reset} actual: ${t[p]}  →  bot triggers at: ${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}`);
    });
  } catch (e) { err(`Prayer times fetch failed: ${e.message}`); }
}

// ── Main ───────────────────────────────────────────────────────
(async () => {
  console.log('\n' + C.bold + C.cyan + '🌙 Islamic WhatsApp Poster — PREVIEW MODE (no status posted)' + C.reset);
  console.log(C.dim + '  City: ' + CITY + ' | Country: ' + COUNTRY + C.reset);
  console.log(C.dim + '  NIM key: ' + (NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_api_key_here' ? 'SET ✓' : 'NOT SET ✗') + C.reset);
  console.log(C.dim + '  Hadith key: ' + (HADITH_API_KEY && HADITH_API_KEY !== 'your_hadith_api_key_here' ? 'SET ✓' : 'NOT SET ✗') + C.reset);

  await previewPrayerTimes();
  await previewFajr();
  await previewDhuhr();
  await previewAsr();
  await previewMaghrib();
  await previewIsha();

  console.log('\n' + C.green + C.bold + '✅ Preview complete! Nothing was posted to WhatsApp.' + C.reset + '\n');
})();
