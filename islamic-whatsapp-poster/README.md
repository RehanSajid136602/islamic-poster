# 🌙 Islamic WhatsApp Status Auto-Poster

A production-ready Node.js script that automatically posts Islamic content (Quran ayahs, Hadiths, and prayer reminders) as your WhatsApp status, timed 20 minutes before each daily prayer.

---

## ✨ Features

| Prayer | Content Posted |
|--------|---------------|
| Fajr   | Random Quran Ayah (beautified by AI) |
| Dhuhr  | Dhuhr prayer alert |
| Asr    | Random Hadith (Sahih Bukhari) |
| Maghrib| Evening Adhkar reminder |
| Isha   | Surah Al-Mulk reminder |

- AI-beautified content via NVIDIA NIM (Llama 3.1)
- Session saved after first QR scan — no re-scanning needed
- Full activity log in `logs/status.log`
- Auto-reconnects if WhatsApp disconnects
- Falls back to raw content if any API fails

---

## 📦 Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **WhatsApp** installed on your phone
- A **free NVIDIA NIM API key** — [build.nvidia.com](https://build.nvidia.com)
- A **HadithAPI key** — [hadithapi.com](https://hadithapi.com) (free)

---

## 🚀 Setup (Linux / Mac)

### Step 1 — Install dependencies

```bash
cd islamic-whatsapp-poster
npm install
```

### Step 2 — Configure environment

```bash
cp .env.example .env
nano .env        # or open in any text editor
```

Fill in your keys:

```
HADITH_API_KEY=abc123yourkey
NVIDIA_API_KEY=nvapi-yourkey
CITY=Rawalpindi
COUNTRY=Pakistan
```

### Step 3 — Run the script

```bash
node index.js
```

### Step 4 — Scan QR code

A QR code will appear in the terminal. Open WhatsApp on your phone:

> **WhatsApp → Settings → Linked Devices → Link a Device**

Scan the QR code. The session is saved automatically — you will never need to scan again.

---

## 🪟 Setup (Windows)

Double-click **`setup.bat`** — it installs Node.js (via winget) and all npm dependencies automatically, then starts the bot.

---

## 📁 File Structure

```
islamic-whatsapp-poster/
├── index.js          ← Main script (all logic here)
├── .env              ← Your API keys (never share this)
├── .env.example      ← Template for .env
├── package.json
├── README.md
├── setup.bat         ← Windows one-click installer
└── logs/
    └── status.log    ← Full activity log
```

---

## 📋 Log Format

Every action is logged like this:

```
[2024-01-15 05:10:00] [BOOT]         🌙 Islamic WhatsApp Status Poster starting…
[2024-01-15 05:10:02] [READY]        WhatsApp client is ready ✓
[2024-01-15 05:10:03] [API_OK]       Quran ayah fetched: Al-Baqarah 255
[2024-01-15 05:10:05] [NIM_OK]       Content beautified successfully ✓
[2024-01-15 05:10:06] [STATUS_POSTED] Fajr Ayah posted successfully ✓
```

---

## ⚙️ How It Works

1. On startup the script connects to WhatsApp and tests all APIs.
2. It fetches today's prayer times from Aladhan API for your city.
3. It schedules `node-cron` jobs **20 minutes before** each prayer.
4. When a job fires, it fetches content, sends it to NVIDIA NIM for AI beautification, then posts it as your WhatsApp status.
5. Every night at 00:01 it refreshes prayer times for the new day.

---

## 🔑 API Keys

| API | Where to get | Cost |
|-----|-------------|------|
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) | Free tier available |
| HadithAPI | [hadithapi.com](https://hadithapi.com) | Free |
| Al-Quran Cloud | No key needed | Free |
| Aladhan | No key needed | Free |

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| QR not scanning | Make sure your phone and PC are on the same network |
| WhatsApp disconnects | Script auto-reconnects after 30 seconds |
| NIM API error | Check NVIDIA_API_KEY in .env |
| Status not posting | Check `logs/status.log` for errors |
| Wrong prayer times | Update CITY / COUNTRY in .env |

---

## 🔄 Running 24/7 (Linux with PM2)

```bash
npm install -g pm2
pm2 start index.js --name islamic-poster
pm2 save
pm2 startup     # follow the command it gives you
```

---

## 📄 License

MIT — Free to use, modify and share. May Allah accept it. 🤲
