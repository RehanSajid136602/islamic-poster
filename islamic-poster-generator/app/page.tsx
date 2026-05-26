'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Header from '@/components/Header';
import PosterPreview from '@/components/PosterPreview';
import ControlPanel from '@/components/ControlPanel';
import BotStatusPanel from '@/components/BotStatusPanel';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchRandomAyah, fetchSurahAyahs, fetchSurahList, searchQuranAyah } from '@/lib/quran';
import { fetchRandomHadith, BOOKS, type BookSlug } from '@/lib/hadith';
import type { ContentType, BgStyle, PosterData, SurahListItem } from '@/lib/types';

const BOT_API_KEY = process.env.NEXT_PUBLIC_BOT_API_KEY || '';

export default function HomePage() {
  const posterRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);

  const [contentType, setContentType] = useState<ContentType>('quran');
  const [bgStyle, setBgStyle] = useState<BgStyle>('green');
  const [selectedSurah, setSelectedSurah] = useState<number | 'random'>('random');
  const [selectedBook, setSelectedBook] = useState<BookSlug | 'random'>('random');
  const [surahs, setSurahs] = useState<SurahListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [poster, setPoster] = useState<PosterData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Bot-mode state for automatic capturing
  const [isBotMode, setIsBotMode] = useState(false);
  const [botPoster, setBotPoster] = useState<PosterData | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('bot') === 'true') {
        setIsBotMode(true);
        const type = (params.get('type') || 'quran') as ContentType;
        const bg = (params.get('bg') || 'green') as BgStyle;
        const arabic = params.get('arabic') || '';
        const urdu = params.get('urdu') || '';
        const reference = params.get('reference') || '';
        
        setBotPoster({
          type,
          arabic,
          urdu,
          reference,
          referenceArabic: reference,
          bgStyle: bg
        });
      }
    }
  }, []);

  // ── Load surah list once ─────────────────────────────────────
  useEffect(() => {
    fetchSurahList().then(setSurahs);
  }, []);

  // ── FIX: Preload both self-hosted fonts immediately on mount ─
  useEffect(() => {
    const preloadFonts = async () => {
      try {
        await Promise.all([
          document.fonts.load('16px "Amiri Quran"'),
          document.fonts.load('16px JameelNoori'),
        ]);
        await document.fonts.ready;
      } catch {
        // Non-fatal fallback
      }
    };
    preloadFonts();
  }, []);

  // ── Responsive scale for preview ─────────────────────────────
  useEffect(() => {
    function recalc() {
      if (!wrapperRef.current) return;
      const w = wrapperRef.current.getBoundingClientRect().width;
      setScale(w / 540);
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Show toast ────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Build poster data ─────────────────────────────────────────
  function buildQuranPoster(data: Awaited<ReturnType<typeof fetchRandomAyah>>, bg: BgStyle): PosterData {
    return {
      type: 'quran',
      arabic: data.arabic,
      urdu: data.urdu,
      reference: `${data.surahEnglish} : ${data.ayahNumber}`,
      referenceArabic: `سورۃ ${data.surahArabic} — آیت ${data.ayahNumber}`,
      bgStyle: bg,
    };
  }

  function buildHadithPoster(data: Awaited<ReturnType<typeof fetchRandomHadith>>, bg: BgStyle): PosterData {
    return {
      type: 'hadith',
      arabic: data.arabic,
      urdu: data.urdu,
      reference: `${data.bookName} : ${data.hadithNumber}`,
      referenceArabic: `${data.bookName} — حدیث نمبر ${data.hadithNumber}`,
      bgStyle: bg,
    };
  }

  // ── Generate poster ───────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      if (contentType === 'quran') {
        const data = selectedSurah === 'random'
          ? await fetchRandomAyah()
          : await fetchSurahAyahs(selectedSurah);
        setPoster(buildQuranPoster(data, bgStyle));
      } else {
        const book = selectedBook === 'random'
          ? BOOKS[Math.floor(Math.random() * BOOKS.length)]
          : selectedBook;
        const data = await fetchRandomHadith(book);
        setPoster(buildHadithPoster(data, bgStyle));
      }
    } catch {
      showToast('Failed to fetch content. Showing fallback.');
    } finally {
      setLoading(false);
    }
  }, [contentType, selectedSurah, selectedBook, bgStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate on first load
  useEffect(() => { handleGenerate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync bgStyle into existing poster
  useEffect(() => {
    if (poster) setPoster((p) => p ? { ...p, bgStyle } : p);
  }, [bgStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FIX: Shared capture helper → returns Blob ─────────────────
  const capturePosterBlob = async (): Promise<Blob> => {
    const element = posterRef.current;
    const wrapper = scaleWrapperRef.current;
    if (!element) throw new Error('poster-card element not found');

    const oldTransform = wrapper ? wrapper.style.transform : `scale(${scale})`;

    try {
      if (wrapper) {
        wrapper.style.transform = 'none';
      }

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      if (typeof document !== 'undefined' && document.fonts) {
        await Promise.allSettled([
          document.fonts.load('normal 24px "Amiri Quran"'),
          document.fonts.load('normal 18px JameelNoori'),
          document.fonts.load('normal 18px Amiri'),
        ]);
        await document.fonts.ready;
      }
      await new Promise<void>((r) => setTimeout(r, 400));

      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        throw new Error(`Poster element has zero dimensions (${element.offsetWidth}x${element.offsetHeight})`);
      }

      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(element, {
        quality: 1.0,
        pixelRatio: 2,
        width: 540,
        height: 540,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
        fontEmbedCSS: `
          @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');
        `,
      });

      if (!blob) {
        throw new Error('html-to-image toBlob returned null blob');
      }

      return blob;
    } finally {
      if (wrapper) {
        wrapper.style.transform = oldTransform;
      }
    }
  };

  // ── FIX: Download as PNG ──────────────────────────────────────
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const blob = await capturePosterBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `islamic-poster-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      showToast('Poster downloaded successfully!');
    } catch (err) {
      console.error('Download failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Download failed: ${errMsg}`);
      showToast('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [poster, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FIX: Share on WhatsApp — 3 fallback layers ───────────────
  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const blob = await capturePosterBlob();

      // LAYER 1: Web Share API — full native sharing
      if (typeof navigator.share === 'function' && navigator.canShare) {
        const file = new File([blob], 'islamic-poster.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Islamic Poster',
            text: 'بسم اللہ الرحمن الرحیم — Beautiful Islamic Poster',
            files: [file],
          });
          return;
        }
      }

      // LAYER 2: Web Share API — text only (no file support on this browser)
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Islamic Poster', text: 'بسم اللہ الرحمن الرحیم — Beautiful Islamic Poster' });
        return;
      }

      // LAYER 3: Desktop fallback — download image + open WhatsApp Web
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `islamic-poster-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      setTimeout(() => window.open('https://web.whatsapp.com', '_blank', 'noopener,noreferrer'), 800);
      showToast('Image saved! Opening WhatsApp Web…');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user cancelled share sheet
      console.error('Share failed:', err);
      showToast('Share failed. Image downloaded — share manually on WhatsApp.');
    } finally {
      setIsSharing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search by Topic ───────────────────────────────────
  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    setContentType('quran');
    try {
      const data = await searchQuranAyah(keyword);
      if (data) {
        setPoster(buildQuranPoster(data, bgStyle));
        showToast('🔍 Found ayah for: ' + keyword);
      } else {
        showToast('⚠️ No Quran results found for: ' + keyword);
      }
    } catch {
      showToast('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [bgStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload to WhatsApp Bot (uses Puppeteer screenshot like cron) ─
  const handleWhatsAppUpload = useCallback(async () => {
    if (!poster) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const headers: Record<string, string> = {};
      if (BOT_API_KEY) {
        headers['Authorization'] = `Bearer ${BOT_API_KEY}`;
      }

      const statusRes = await fetch('http://127.0.0.1:3001/api/status', {
        headers,
        signal: controller.signal
      });
      const statusData = await statusRes.json();

      if (statusData.state === 'qr' && statusData.qr) {
        setQrCodeData(statusData.qr);
        setShowQrModal(true);
        setIsUploading(false);
        return;
      }

      if (statusData.state !== 'ready') {
        setUploadError(`Bot is not ready (${statusData.state}). Scan QR first.`);
        setIsUploading(false);
        return;
      }

      showToast('Generating poster via bot (5-10 sec)...');

      const uploadHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (BOT_API_KEY) {
        uploadHeaders['Authorization'] = `Bearer ${BOT_API_KEY}`;
      }

      const uploadRes = await fetch('http://127.0.0.1:3001/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: JSON.stringify({
          type: poster.type,
          arabic: poster.arabic,
          urdu: poster.urdu,
          reference: poster.reference,
          bgStyle: poster.bgStyle
        })
      });
      const uploadData = await uploadRes.json();

      clearTimeout(timeoutId);

      if (uploadData.success) {
        showToast('Posted to WhatsApp Status!');
      } else {
        setUploadError(uploadData.error || 'Upload failed');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setUploadError('Request timed out — is the bot running?');
      } else {
        setUploadError('Cannot reach WhatsApp bot. Make sure it is running.');
      }
    } finally {
      setIsUploading(false);
    }
  }, [poster]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isBotMode) {
    return (
      <div
        id="bot-mode-card-container"
        style={{
          width: '540px',
          height: '960px',
          overflow: 'hidden',
          backgroundColor: '#020e10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      >
        <PosterPreview ref={posterRef} data={botPoster} loading={false} />
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#1a4a2e' }}>
            Islamic Poster Generator
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Generate beautiful Quran &amp; Hadith posters in Arabic and Urdu — download or share instantly
          </p>
          <div style={{ height: 2, background: 'linear-gradient(to right, transparent, #d4af37, transparent)', marginTop: 12 }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT — Poster preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#1a4a2e' }} />
              Live Preview
            </p>
            <div
              ref={wrapperRef}
              className="w-full rounded-2xl overflow-hidden shadow-2xl border-4"
              style={{ borderColor: '#d4af37', aspectRatio: '1 / 1', position: 'relative' }}
            >
              {/* Inner container at true 540×540, scaled down */}
              <div ref={scaleWrapperRef} style={{ width: 540, height: 540, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                <PosterPreview ref={posterRef} data={poster} loading={loading} />
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Poster is 540×540 px — perfect for WhatsApp status
            </p>
          </div>

          {/* RIGHT — Controls */}
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#d4af37' }} />
              Controls
            </p>
            <ControlPanel
              contentType={contentType}
              bgStyle={bgStyle}
              selectedSurah={selectedSurah}
              selectedBook={selectedBook}
              surahs={surahs}
              loading={loading}
              isSearching={isSearching}
              isDownloading={isDownloading}
              isSharing={isSharing}
              isUploading={isUploading}
              uploadError={uploadError}
              onTypeChange={setContentType}
              onBgChange={setBgStyle}
              onSurahChange={setSelectedSurah}
              onBookChange={setSelectedBook}
              onGenerate={handleGenerate}
              onDownload={handleDownload}
              onShare={handleShare}
              onSearch={handleSearch}
              onWhatsAppUpload={handleWhatsAppUpload}
              onDismissUploadError={() => setUploadError(null)}
              toast={toast}
            />
            <BotStatusPanel />
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-400 text-sm pb-8">
          <p style={{ fontFamily: 'Amiri, serif', fontSize: 20, color: '#1a4a2e' }}>
            وَذَكِّرۡ فَإِنَّ ٱلذِّكۡرَىٰ تَنفَعُ ٱلۡمُؤۡمِنِينَ
          </p>
          <p className="mt-2">And remind, for indeed, the reminder benefits the believers. — Adh-Dhariyat 51:55</p>
          <p className="mt-3 text-xs">Built with ❤️ for the Ummah · Data from Al-Quran Cloud &amp; HadithAPI</p>
        </footer>
      </main>
    </>
  );
}
