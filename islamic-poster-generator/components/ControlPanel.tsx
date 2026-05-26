'use client';
import React, { useState } from 'react';
import { Download, RefreshCw, Share2, BookOpen, AlignRight, Search, Send, Loader2 } from 'lucide-react';
import type { ContentType, BgStyle, SurahListItem } from '@/lib/types';
import { BOOKS, BOOK_LABELS, type BookSlug } from '@/lib/hadith';

// ── Props ─────────────────────────────────────────────────────
interface ControlPanelProps {
  contentType: ContentType;
  bgStyle: BgStyle;
  selectedSurah: number | 'random';
  selectedBook: BookSlug | 'random';
  surahs: SurahListItem[];
  loading: boolean;
  isSearching: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  isUploading: boolean;
  uploadError: string | null;
  onTypeChange: (t: ContentType) => void;
  onBgChange: (b: BgStyle) => void;
  onSurahChange: (s: number | 'random') => void;
  onBookChange: (b: BookSlug | 'random') => void;
  onGenerate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onSearch: (keyword: string) => void;
  onWhatsAppUpload: () => void;
  onDismissUploadError: () => void;
  toast: string | null;
}

const BG_OPTIONS: { key: BgStyle; label: string; from: string; to: string; isPhoto?: boolean }[] = [
  { key: 'green',          label: 'Forest Green',    from: '#1a4a2e', to: '#0a2015' },
  { key: 'navy',           label: 'Midnight Navy',   from: '#11306b', to: '#040c1e' },
  { key: 'black',          label: 'Obsidian',        from: '#1e1e1e', to: '#050505' },
  { key: 'maroon',         label: 'Deep Maroon',     from: '#4a1a1a', to: '#1a0808' },
  { key: 'mountains',      label: 'Misty Mountains', from: '#201a30', to: '#0f0a15' },
  { key: 'lake',           label: 'Tranquil Lake',   from: '#0f3a40', to: '#05181a' },
  { key: 'mountain-night', label: 'Mountain Night',  from: '#1a1a30', to: '#050510', isPhoto: true },
  { key: 'desert-sunset',  label: 'Desert Sunset',   from: '#5c3010', to: '#1a0d05', isPhoto: true },
  { key: 'forest-mist',    label: 'Forest Mist',     from: '#1a3020', to: '#060e06', isPhoto: true },
  { key: 'starry-night',   label: 'Starry Night',    from: '#0d0d2e', to: '#04040d', isPhoto: true },
];

export default function ControlPanel({
  contentType, bgStyle, selectedSurah, selectedBook, surahs,
  loading, isSearching, isDownloading, isSharing, isUploading, uploadError,
  onTypeChange, onBgChange, onSurahChange, onBookChange,
  onGenerate, onDownload, onShare, onSearch, onWhatsAppUpload, onDismissUploadError, toast,
}: ControlPanelProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'notfound'>('idle');

  const handleSearchClick = () => {
    if (!searchKeyword.trim()) return;
    setSearchStatus('idle');
    onSearch(searchKeyword);
  };

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Card wrapper ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">

        {/* Card header */}
        <div
          className="px-6 py-4"
          style={{ background: 'linear-gradient(90deg, #1a4a2e, #245c38)' }}
        >
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#d4af37' }} />
            Content Generator
          </h2>
          <p className="text-green-200 text-sm mt-0.5">Choose content type and generate</p>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ── Content type toggle ───────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100">
              {(['quran', 'hadith'] as ContentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onTypeChange(t)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    contentType === t
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={contentType === t ? { background: '#1a4a2e' } : {}}
                >
                  {t === 'quran' ? '📖 Quran Ayah' : '📜 Hadith'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Surah selector (Quran mode) ───────────────── */}
          {contentType === 'quran' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Select Surah
              </label>
              <div className="relative">
                <AlignRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedSurah}
                  onChange={(e) =>
                    onSurahChange(e.target.value === 'random' ? 'random' : parseInt(e.target.value))
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                             focus:outline-none focus:ring-2 focus:border-transparent appearance-none cursor-pointer"
                  style={{ '--tw-ring-color': '#1a4a2e' } as React.CSSProperties}
                >
                  <option value="random">🎲 Random Surah</option>
                  {surahs.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.englishName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Book selector (Hadith mode) ───────────────── */}
          {contentType === 'hadith' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Select Hadith Book
              </label>
              <div className="relative">
                <AlignRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedBook}
                  onChange={(e) => onBookChange(e.target.value as BookSlug | 'random')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700
                             focus:outline-none focus:ring-2 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="random">🎲 Random Book</option>
                  {BOOKS.map((b) => (
                    <option key={b} value={b}>{BOOK_LABELS[b]}</option>
                  ))}
                </select>
              </div>
              {!process.env.NEXT_PUBLIC_HADITH_API_KEY ||
               process.env.NEXT_PUBLIC_HADITH_API_KEY === 'your_hadith_api_key_here' ? (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  ⚠️ Add NEXT_PUBLIC_HADITH_API_KEY in .env.local for live Hadith data
                </p>
              ) : null}
            </div>
          )}

          {/* ── Background style ──────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Poster Background
            </label>
            {/* Gradient row */}
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">🎨 Gradient Themes</p>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {BG_OPTIONS.filter(o => !o.isPhoto).map((opt) => (
                <button
                  key={opt.key}
                  title={opt.label}
                  onClick={() => onBgChange(opt.key)}
                  className={`h-10 rounded-xl transition-all duration-200 ${
                    bgStyle === opt.key ? 'ring-2 ring-offset-2 scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${opt.from}, ${opt.to})`,
                    outline: bgStyle === opt.key ? '2px solid #d4af37' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {BG_OPTIONS.filter(o => !o.isPhoto).map((opt) => (
                <p key={opt.key} className="text-center text-[9px] text-gray-400 truncate">{opt.label.split(' ')[0]}</p>
              ))}
            </div>
            {/* Photo row */}
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">📷 Real Photo Backgrounds</p>
            <div className="grid grid-cols-4 gap-2">
              {BG_OPTIONS.filter(o => o.isPhoto).map((opt) => (
                <button
                  key={opt.key}
                  title={opt.label + ' (real photo)'}
                  onClick={() => onBgChange(opt.key)}
                  className={`h-12 rounded-xl transition-all duration-200 relative overflow-hidden ${
                    bgStyle === opt.key ? 'ring-2 ring-offset-2 scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${opt.from}, ${opt.to})`,
                    outline: bgStyle === opt.key ? '2px solid #d4af37' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <img
                    src={`/images/${opt.key}.jpg`}
                    alt={opt.label}
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[8px] text-white/80 font-bold drop-shadow">📷</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {BG_OPTIONS.filter(o => o.isPhoto).map((opt) => (
                <p key={opt.key} className="text-center text-[9px] text-gray-400 truncate">{opt.label.split(' ')[0]}</p>
              ))}
            </div>
          </div>

          {/* ── Search by Topic ─────────────────────────────── */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              🔍 Search by Topic (Quran)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchKeyword}
                placeholder="e.g. Hajj, Namaz, Sabr, Forgiveness…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': '#1a4a2e' } as React.CSSProperties}
                onChange={(e) => { setSearchKeyword(e.target.value); setSearchStatus('idle'); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              />
              <button
                onClick={handleSearchClick}
                disabled={isSearching || !searchKeyword.trim()}
                className="px-4 rounded-xl transition-all flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#1a4a2e', minWidth: 44 }}
                title="Search Quran by topic"
              >
                {isSearching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Try: <span className="font-medium text-gray-500">namaz, hajj, sabr, roza, jannah, tawbah…</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Generate */}
        <button
          onClick={onGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-semibold
                     text-base transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1a4a2e, #245c38)' }}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : 'Generate Random Poster'}
        </button>

        {/* Download */}
        <button
          onClick={onDownload}
          disabled={isDownloading || loading}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold
                     text-base transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed border-2"
          style={{ color: '#1a4a2e', borderColor: '#1a4a2e', background: 'white' }}
          onMouseEnter={(e) => { if (!isDownloading) { e.currentTarget.style.background = '#1a4a2e'; e.currentTarget.style.color = 'white'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#1a4a2e'; }}
        >
          {isDownloading ? (
            <><RefreshCw className="w-5 h-5 animate-spin" />Preparing image…</>
          ) : (
            <><Download className="w-5 h-5" />Download as PNG</>
          )}
        </button>

        {/* WhatsApp share */}
        <button
          onClick={onShare}
          disabled={isSharing || loading}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold
                     text-white text-base transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow"
          style={{ background: '#128c3e' }}
          onMouseEnter={(e) => { if (!isSharing) e.currentTarget.style.background = '#0f7034'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#128c3e'; }}
        >
          {isSharing ? (
            <><RefreshCw className="w-5 h-5 animate-spin" />Generating…</>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Share Web
            </>
          )}
        </button>
      </div>

      <button
        onClick={() => { onDismissUploadError(); onWhatsAppUpload(); }}
        disabled={isUploading || loading}
        className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {isUploading ? (
          <><RefreshCw className="w-5 h-5 animate-spin" /> Uploading…</>
        ) : (
          <><Send className="w-5 h-5" /> Post to WhatsApp Status</>
        )}
      </button>
      {uploadError && (
        <div className="mt-1 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span className="flex-1">{uploadError}</span>
          <button onClick={onDismissUploadError} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-2xl
                     transition-all duration-300 flex items-center gap-2"
          style={{ background: '#1a4a2e' }}
        >
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
