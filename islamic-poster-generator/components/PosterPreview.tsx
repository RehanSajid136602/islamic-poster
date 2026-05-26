'use client';
import React, { forwardRef } from 'react';
import type { PosterData } from '@/lib/types';

// ── Background gradients per theme ────────────────────────────
const BG_GRADIENTS: Record<string, { gradient: string; solid: string; image?: string; overlayColor?: string }> = {
  green : { gradient: 'linear-gradient(160deg, #1a4a2e 0%, #0d2e1b 60%, #0a2015 100%)', solid: '#0d1f13' },
  navy  : { gradient: 'linear-gradient(160deg, #1a2a4a 0%, #0a1828 60%, #0a1020 100%)', solid: '#0a1020' },
  black : { gradient: 'linear-gradient(160deg, #1e1e1e 0%, #111 60%, #050505 100%)',    solid: '#050505' },
  maroon: { gradient: 'linear-gradient(160deg, #4a1a1a 0%, #2e0d0d 60%, #1a0808 100%)', solid: '#1a0808' },
  mountains: { gradient: 'linear-gradient(160deg, #201a30 0%, #120d20 60%, #0a0512 100%)', solid: '#0f0a15' },
  lake: { gradient: 'linear-gradient(160deg, #0d3a40 0%, #062024 60%, #020e10 100%)', solid: '#05181a' },
  'mountain-night': { gradient: 'none', solid: '#0a0a14', image: '/images/mountain-night.jpg', overlayColor: 'rgba(8,6,20,0.55)' },
  'desert-sunset':  { gradient: 'none', solid: '#1a0d05', image: '/images/desert-sunset.jpg',  overlayColor: 'rgba(20,8,2,0.50)'  },
  'forest-mist':    { gradient: 'none', solid: '#060e06', image: '/images/forest-mist.jpg',    overlayColor: 'rgba(4,10,4,0.52)'  },
  'starry-night':   { gradient: 'none', solid: '#04040d', image: '/images/starry-night.jpg',   overlayColor: 'rgba(3,3,15,0.48)'  },
};

// ── Props ─────────────────────────────────────────────────────
interface Props {
  data: PosterData | null;
  loading: boolean;
}

// ── PosterPreview ─────────────────────────────────────────────
const PosterPreview = forwardRef<HTMLDivElement, Props>(function PosterPreview(
  { data, loading },
  ref
) {
  const bg = BG_GRADIENTS[data?.bgStyle ?? 'green'];

  return (
    <div
      ref={ref}
      id="poster-card"
      style={{
        width: '540px',
        height: '540px',
        minWidth: '540px',
        minHeight: '540px',
        maxWidth: '540px',
        maxHeight: '540px',
        overflow: 'hidden',
        background: bg.image ? bg.solid : bg.gradient,
        backgroundColor: bg.solid,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '50px 30px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Photo background image */}
      {bg.image && (
        <>
          <img
            src={bg.image}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          {/* Dark overlay for text legibility */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: bg.overlayColor,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        </>
      )}

      {/* Geometric Pattern Overlay */}
      {data?.bgStyle !== 'mountains' && data?.bgStyle !== 'lake' && !bg.image && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.07,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <defs>
            <pattern id="geo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none" />
              <path
                d="M20 0 L40 20 L20 40 L0 20 Z"
                fill="none"
                stroke="#d4af37"
                strokeWidth="0.5"
              />
              <circle cx="20" cy="20" r="4" fill="none" stroke="#d4af37" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo)" />
        </svg>
      )}

      {/* Misty Mountains Theme Overlay */}
      {data?.bgStyle === 'mountains' && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          viewBox="0 0 540 540"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Starry Night Sky */}
          <g fill="#d4af37" opacity="0.6">
            <circle cx="50" cy="80" r="1" />
            <circle cx="120" cy="140" r="1.5" />
            <circle cx="180" cy="90" r="0.8" />
            <circle cx="220" cy="150" r="1.2" />
            <circle cx="310" cy="80" r="1.5" />
            <circle cx="380" cy="130" r="0.8" />
            <circle cx="480" cy="110" r="1.2" />
            <circle cx="80" cy="240" r="1" />
            <circle cx="450" cy="220" r="1.5" />
          </g>

          {/* Golden Crescent Moon */}
          <path
            d="M450 70 A 24 24 0 1 0 478 98 A 20 20 0 1 1 450 70"
            fill="#d4af37"
            opacity="0.85"
          />

          {/* Mountain Ridges */}
          {/* Far Mountains */}
          <path
            d="M0 540 L0 440 L80 390 L180 430 L280 360 L380 420 L480 370 L540 400 L540 540 Z"
            fill="#0a0512"
            opacity="0.7"
          />
          <path
            d="M0 440 L80 390 L180 430 L280 360 L380 420 L480 370 L540 400"
            fill="none"
            stroke="#d4af37"
            strokeWidth="0.8"
            opacity="0.25"
          />

          {/* Near Mountains */}
          <path
            d="M0 540 L0 460 L120 410 L240 470 L340 420 L450 480 L540 430 L540 540 Z"
            fill="#050209"
          />
          <path
            d="M0 460 L120 410 L240 470 L340 420 L450 480 L540 430"
            fill="none"
            stroke="#d4af37"
            strokeWidth="1.2"
            opacity="0.45"
          />
        </svg>
      )}

      {/* Tranquil Lake Theme Overlay */}
      {data?.bgStyle === 'lake' && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          viewBox="0 0 540 540"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Reflection Starry Sky */}
          <g fill="#d4af37" opacity="0.5">
            <circle cx="70" cy="110" r="1.2" />
            <circle cx="150" cy="180" r="1" />
            <circle cx="210" cy="130" r="1.5" />
            <circle cx="390" cy="100" r="1.2" />
            <circle cx="470" cy="160" r="1" />
          </g>

          {/* Shimmering Full Moon */}
          <circle cx="270" cy="100" r="28" fill="#d4af37" opacity="0.1" />
          <circle cx="270" cy="100" r="18" fill="#f5e6c0" opacity="0.75" />

          {/* Tranquil Lake Ripples */}
          <ellipse cx="270" cy="460" rx="220" ry="10" fill="none" stroke="#d4af37" strokeWidth="0.8" opacity="0.25" />
          <ellipse cx="270" cy="490" rx="160" ry="8" fill="none" stroke="#d4af37" strokeWidth="0.6" opacity="0.2" />
          <ellipse cx="270" cy="520" rx="100" ry="6" fill="none" stroke="#d4af37" strokeWidth="0.5" opacity="0.15" />

          {/* Moon Reflection */}
          <ellipse cx="270" cy="460" rx="12" ry="3" fill="#f5e6c0" opacity="0.4" />
          <ellipse cx="270" cy="490" rx="8" ry="2.2" fill="#f5e6c0" opacity="0.3" />

          {/* Reeds Silhouette */}
          <path d="M0 540 L8 440 L12 540 L22 410 L25 540 L35 450 L38 540 Z" fill="#020e10" opacity="0.9" />
          <path d="M540 540 L532 430 L528 540 L518 400 L515 540 L505 460 L502 540 Z" fill="#020e10" opacity="0.9" />
        </svg>
      )}

      {/* Corners SVG Overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox="0 0 540 540"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer border */}
        <rect
          x="16" y="16"
          width="508" height="508"
          fill="none"
          stroke="#d4af37"
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
        {/* Top-left corner */}
        <path d="M16 60 L16 16 L60 16" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 16 L45 45" fill="none" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <circle cx="16" cy="16" r="3.5" fill="#d4af37" />
        <circle cx="60" cy="16" r="2" fill="#d4af37" fillOpacity="0.7" />
        <circle cx="16" cy="60" r="2" fill="#d4af37" fillOpacity="0.7" />

        {/* Top-right corner */}
        <path d="M480 16 L524 16 L524 60" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
        <path d="M524 16 L495 45" fill="none" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <circle cx="524" cy="16" r="3.5" fill="#d4af37" />
        <circle cx="480" cy="16" r="2" fill="#d4af37" fillOpacity="0.7" />
        <circle cx="524" cy="60" r="2" fill="#d4af37" fillOpacity="0.7" />

        {/* Bottom-left corner */}
        <path d="M16 480 L16 524 L60 524" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 524 L45 495" fill="none" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <circle cx="16" cy="524" r="3.5" fill="#d4af37" />
        <circle cx="60" cy="524" r="2" fill="#d4af37" fillOpacity="0.7" />
        <circle cx="16" cy="480" r="2" fill="#d4af37" fillOpacity="0.7" />

        {/* Bottom-right corner */}
        <path d="M524 480 L524 524 L480 524" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
        <path d="M524 524 L495 495" fill="none" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
        <circle cx="524" cy="524" r="3.5" fill="#d4af37" />
        <circle cx="480" cy="524" r="2" fill="#d4af37" fillOpacity="0.7" />
        <circle cx="524" cy="480" r="2" fill="#d4af37" fillOpacity="0.7" />
      </svg>

      {/* Content wrapper */}
      {loading ? <LoadingSkeleton /> : <PosterContent data={data} />}
    </div>
  );
});

export default PosterPreview;

// ── Loading skeleton ──────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 w-full px-6" style={{ zIndex: 1 }}>
      <div className="skeleton h-6 w-48 rounded" />
      <div className="skeleton h-0.5 w-56 rounded" />
      <div className="skeleton h-12 w-full rounded" />
      <div className="skeleton h-10 w-4/5 rounded" />
      <div className="skeleton h-0.5 w-56 rounded" />
      <div className="skeleton h-8 w-44 rounded" />
      <div className="skeleton h-7 w-32 rounded-full" />
    </div>
  );
}

// ── Poster content ────────────────────────────────────────────
function PosterContent({ data }: { data: PosterData | null }) {
  const d = data ?? {
    type: 'quran' as const,
    arabic: 'وَمَن يَتَّقِ ٱللَّهَ يَجۡعَل لَّهُۥ مَخۡرَجٗا',
    urdu: 'اور جو اللہ سے ڈرتا ہے اللہ اس کے لیے نکلنے کی راہ بنا دیتا ہے',
    reference: 'At-Talaq : 2',
    referenceArabic: 'سورۃ الطلاق — آیت ۲',
    bgStyle: 'green' as const,
  };

  const arabicLen = d.arabic?.length || 0;
  const arabicFontSize = arabicLen > 300 ? '16px' : arabicLen > 200 ? '18px' : arabicLen > 100 ? '20px' : '24px';
  const arabicLineHeight = arabicLen > 200 ? '1.8' : '2.4';

  const urduLen = d.urdu?.length || 0;
  const urduFontSize = urduLen > 300 ? '13px' : urduLen > 200 ? '14px' : urduLen > 100 ? '16px' : '18px';
  const urduLineHeight = urduLen > 200 ? '1.8' : '2.4';

  return (
    <>
      {/* Bismillah */}
      <p
        className="poster-bismillah"
        style={{
          fontFamily: "'Amiri', serif",
          fontSize: '18px',
          color: '#d4af37',
          direction: 'rtl',
          textAlign: 'center',
          lineHeight: '1.4',
          margin: '0 0 4px 0',
          zIndex: 1,
        }}
      >
        بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
      </p>

      {/* Top divider */}
      <div
        className="poster-divider"
        style={{
          width: '160px',
          height: '1.5px',
          background: 'linear-gradient(to right, transparent, #d4af37, transparent)',
          margin: '4px auto',
          zIndex: 1,
        }}
      />

      {/* Arabic text — Amiri Quran with Amiri fallback */}
      <p
        className="poster-arabic"
        style={{
          fontFamily: "'Amiri Quran', 'Amiri', serif",
          fontSize: arabicFontSize,
          direction: 'rtl',
          unicodeBidi: 'embed',
          lineHeight: arabicLineHeight,
          textAlign: 'center',
          color: '#f5e6c0',
          width: '100%',
          maxWidth: '460px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          margin: '0 auto',
          padding: '0 10px',
          zIndex: 1,
          fontFeatureSettings: '"liga" 1, "calt" 1, "rlig" 1',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {d.arabic}
      </p>

      {/* Mid divider */}
      <div
        className="poster-divider"
        style={{
          width: '160px',
          height: '1.5px',
          background: 'linear-gradient(to right, transparent, #d4af37, transparent)',
          margin: '4px auto',
          zIndex: 1,
        }}
      />

      {/* Urdu translation — JameelNoori with Noto Nastaliq fallback */}
      <p
        className="poster-urdu"
        style={{
          fontFamily: "'JameelNoori', 'Noto Nastaliq Urdu', serif",
          fontSize: urduFontSize,
          direction: 'rtl',
          lineHeight: urduLineHeight,
          textAlign: 'center',
          color: '#b8ccb0',
          width: '100%',
          maxWidth: '420px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          margin: '0 auto',
          padding: '0 10px',
          zIndex: 1,
        }}
      >
        {d.urdu}
      </p>

      {/* Reference pill */}
      <div
        className="poster-reference"
        style={{
          background: '#d4af37',
          color: '#0a2015',
          fontFamily: "'Amiri', serif",
          fontSize: '14px',
          fontWeight: 700,
          direction: 'rtl',
          padding: '4px 18px',
          borderRadius: '999px',
          position: 'relative',
          zIndex: 1,
          marginTop: '6px',
          textAlign: 'center',
        }}
      >
        {d.referenceArabic}
      </div>

      {/* Brand watermark */}
      <p
        style={{
          position: 'absolute',
          bottom: 24,
          fontFamily: "'Amiri', serif",
          fontSize: 14,
          color: 'rgba(212,175,55,0.5)',
          zIndex: 1,
          letterSpacing: '0.05em',
          direction: 'rtl',
          margin: 0,
        }}
      >
        نور الإسلام
      </p>
    </>
  );
}
