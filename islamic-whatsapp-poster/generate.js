const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const { execSync } = require('child_process');

/**
 * Generate a poster image using a headless browser.
 * @param {Object} data
 * @param {string} data.type - 'quran' or 'hadith'
 * @param {string} data.arabic - The Arabic text
 * @param {string} data.urdu - The Urdu translation
 * @param {string} data.reference - The citation reference
 * @param {string} data.bgStyle - The style name (green, navy, black, maroon, mountains, lake)
 * @returns {Promise<string>} The path to the generated PNG file
 */
async function generatePosterImage({ type, arabic, urdu, reference, bgStyle }) {
  console.log('[PUPPETEER] Launching headless browser…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--font-render-hinting=none',
      '--force-color-profile=srgb',
      '--disable-font-subpixel-positioning'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // High resolution capture (1080x1920) for optimal WhatsApp vertical status dimensions
    await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });

    // Construct query parameters
    const query = new URLSearchParams({
      bot: 'true',
      type: type,
      bg: bgStyle,
      arabic: arabic,
      urdu: urdu,
      reference: reference
    }).toString();

    const targetUrl = `http://127.0.0.1:3000/?${query}`;
    
    page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.toString()));
    
    console.log(`[PUPPETEER] Navigating to: http://127.0.0.1:3000/?bot=true&type=${type}&bg=${bgStyle}&ref=${reference}`);

    // Navigate and wait until network is quiet
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log(`[PUPPETEER] Actual page URL after navigation: ${page.url()}`);

    // Wait for the bot mode container to render (ensures React hydration and useEffect have run)
    await page.waitForSelector('#bot-mode-card-container', { timeout: 30000 });

    // Force fonts ready evaluation
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    // Extra formatting sleep for Nastaleeq shaping
    await new Promise(resolve => setTimeout(resolve, 800));

    // Capture the #bot-mode-card-container element to get the full 9:16 layout
    const element = await page.$('#bot-mode-card-container');
    if (!element) {
      throw new Error('Element #bot-mode-card-container not found on page');
    }

    const outputPath = path.join(__dirname, `temp_poster_${Date.now()}.jpg`);
    await element.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
    console.log(`[PUPPETEER] Screenshot captured successfully: ${outputPath}`);

    return outputPath;
  } finally {
    await browser.close();
  }
}

async function generatePosterVideo(data) {
  const imagePath = await generatePosterImage(data);
  const videoPath = imagePath.replace('.jpg', '.mp4');

  console.log(`[FFMPEG] Encoding static image to 7-second HD video (anti-blur settings)...`);
  try {
    // Anti-blur FFmpeg strategy:
    //   -crf 18           → near-lossless quality (WhatsApp won't need to re-compress)
    //   -preset slow      → better compression efficiency at the same CRF
    //   -tune stillimage  → optimise H.264 encoder specifically for static content
    //   scale=1080:1920   → explicit output resolution matching WhatsApp Story format
    //   pad=...           → letterbox any non-9:16 source rather than stretching
    //   setsar=1          → correct sample aspect ratio flag
    //   -r 30             → standard 30 fps
    //   -t 7              → 7 seconds is long enough for a Status card read
    const ffmpegCmd = [
      `"${ffmpegStatic}"`,
      `-loop 1`,
      `-i "${imagePath}"`,
      `-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"`,
      `-c:v libx264`,
      `-crf 18`,
      `-preset slow`,
      `-tune stillimage`,
      `-pix_fmt yuv420p`,
      `-r 30`,
      `-t 7`,
      `-movflags +faststart`,
      `-y "${videoPath}"`
    ].join(' ');

    execSync(ffmpegCmd, { stdio: 'pipe' });
    console.log(`[FFMPEG] HD video generated: ${videoPath}`);
  } catch (err) {
    console.error('[FFMPEG] Failed to generate video:', err.message);
    throw err;
  } finally {
    // Clean up the temporary high-res JPEG
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  
  return videoPath;
}

module.exports = { generatePosterImage, generatePosterVideo };
