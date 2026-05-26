// ============================================================
//  Test WhatsApp Bot (Static-to-Video E2E)
//  Run with: node test_bot.js
// ============================================================

'use strict';

require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { generatePosterVideo } = require('./generate');
const fs = require('fs');

console.log(`[${new Date().toISOString()}] [BOOT] Starting client initialization…`);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  }
});

client.on('qr', (qr) => {
  console.log(`[${new Date().toISOString()}] [QR] Scan this QR code to log in:`);
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log(`[${new Date().toISOString()}] [AUTH] WhatsApp session authenticated ✓`);
});

client.on('ready', async () => {
  console.log(`[${new Date().toISOString()}] [READY] WhatsApp client is ready ✓`);
  console.log(`[${new Date().toISOString()}] [TEST] Starting test status post…`);

  try {
    const data = {
      type: 'hadith',
      arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
      urdu: 'بے شک اعمال کا دارومدار نیتوں پر ہے',
      reference: 'صحیح بخاری : 1',
    };
    console.log(`[TEST] Generating MP4 poster video with background: lake…`);

    const videoPath = await generatePosterVideo({
      ...data,
      bgStyle: 'lake'
    });
    
    console.log(`[${new Date().toISOString()}] [TEST] Sending media to status@broadcast…`);
    const media = MessageMedia.fromFilePath(videoPath);
    await client.sendMessage('status@broadcast', media, {
      caption: `🌙 Daily Islamic Reminder: ${data.reference}`
    });

    console.log(`[${new Date().toISOString()}] [TEST] ✓ Test status posted successfully! Check your phone.`);
    
    // Clean up
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [TEST] ✗ Failed:`, err);
  } finally {
    console.log(`[${new Date().toISOString()}] [TEST] Closing WhatsApp client…`);
    await client.destroy();
  }
});

client.initialize();
