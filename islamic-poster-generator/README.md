# 🌙 Islamic Poster Generator

A beautiful Next.js 14 website that generates downloadable 1080×1080 Islamic posters featuring Quran ayahs and authentic Hadiths in Arabic + Urdu.

---

## ✨ Features

- 📖 **Quran Ayahs** — Arabic (Uthmani) + Urdu (Maududi) from Al-Quran Cloud API
- 📜 **Hadiths** — Arabic + Urdu from HadithAPI (Bukhari, Muslim, Abu Dawood + more)
- 🖼️ **Beautiful 1080×1080 Poster** — Islamic geometric design, gold borders, corner ornaments
- 🎨 **4 Background Themes** — Forest Green, Midnight Navy, Obsidian Black, Deep Maroon
- 💾 **PNG Download** — High quality `scale:2` via html2canvas
- 📱 **WhatsApp Share** — Web Share API on mobile, WhatsApp web fallback on desktop
- 📖 **114 Surahs** selectable + Random mode
- 📚 **6 Hadith Books** selectable + Random mode
- ⚡ **Responsive** — Works on mobile and desktop

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Step 1 — Clone / enter the folder
```bash
cd islamic-poster-generator
```

### Step 2 — Install dependencies
```bash
# Using npm (recommended if pnpm has network issues)
npm install

# OR using pnpm
pnpm install
```

### Step 3 — Configure environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_HADITH_API_KEY=your_key_from_hadithapi.com
```

> **Hadith API key** — register free at [hadithapi.com](https://hadithapi.com). Without it, the app uses a fallback Hadith.

### Step 4 — Run
```bash
npm run dev
# or
pnpm dev
```

Open **http://localhost:3000** 🎉

---

## 📁 Project Structure

```
islamic-poster-generator/
├── app/
│   ├── layout.tsx          ← Root layout + metadata + font preconnects
│   ├── page.tsx            ← Main page (state, API calls, download/share)
│   └── globals.css         ← CSS variables, poster styles, skeleton
├── components/
│   ├── Header.tsx          ← Sticky header with Islamic branding
│   ├── PosterPreview.tsx   ← The 1080×1080 poster (forwardRef for html2canvas)
│   └── ControlPanel.tsx    ← Type toggle, selectors, action buttons
├── lib/
│   ├── types.ts            ← TypeScript interfaces
│   ├── quran.ts            ← Al-Quran Cloud API helpers
│   └── hadith.ts           ← HadithAPI helpers
├── .env.local              ← Your API keys
└── .env.local.example      ← Template
```

---

## 🎨 Poster Design

- **Size**: 1080×1080 px (WhatsApp status format)
- **Font Arabic**: Amiri (Google Fonts)
- **Font Urdu**: Noto Nastaliq Urdu (Google Fonts)
- **Background**: Deep gradient with Islamic geometric pattern overlay
- **Border**: Golden inset border with corner ornaments
- **Download**: html2canvas at `scale: 2` for crisp 2× quality

---

## 🚀 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add `NEXT_PUBLIC_HADITH_API_KEY` in Vercel environment variables.

---

## 🔑 API Keys

| API | Key Required | Where to Get |
|-----|-------------|-------------|
| Al-Quran Cloud | ❌ No | Free, no key |
| Aladhan Prayer Times | ❌ No | Free, no key |
| HadithAPI | ✅ Yes | [hadithapi.com](https://hadithapi.com) — Free |

---

## 📄 License

MIT — Free to use for the Ummah 🤲
