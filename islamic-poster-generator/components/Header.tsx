'use client';
// ── Header component ──────────────────────────────────────────

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 shadow-lg"
      style={{ background: 'linear-gradient(90deg, #0a2015 0%, #1a4a2e 60%, #0a2015 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Crescent SVG */}
            <svg viewBox="0 0 40 40" className="w-9 h-9 flex-shrink-0" fill="none">
              <circle cx="20" cy="20" r="18" fill="rgba(212,175,55,0.15)" stroke="#d4af37" strokeWidth="1.5" />
              <path
                d="M26 12a10 10 0 0 1 0 16 12 12 0 0 0 0-16z"
                fill="#d4af37"
              />
              <circle cx="27" cy="11" r="2" fill="#d4af37" />
            </svg>

            {/* Title block */}
            <div className="leading-tight">
              <p
                className="text-lg sm:text-2xl font-bold leading-none"
                style={{ color: '#d4af37', fontFamily: 'Amiri, serif', direction: 'rtl' }}
              >
                نور الإسلام
              </p>
              <p className="text-xs sm:text-sm text-gray-300 leading-tight mt-0.5 tracking-wide">
                Islamic Poster Generator
              </p>
            </div>
          </div>

          {/* Tagline — desktop only */}
          <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: '#d4af37' }}>
            <span className="font-amiri text-base" style={{ fontFamily: 'Amiri, serif' }}>
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
            </span>
          </div>

          {/* Badge */}
          <div
            className="hidden sm:block text-xs font-medium px-3 py-1 rounded-full border"
            style={{ borderColor: '#d4af37', color: '#d4af37' }}
          >
            Quran · Hadith
          </div>
        </div>
      </div>

      {/* Gold gradient line */}
      <div style={{ height: '2px', background: 'linear-gradient(to right, transparent, #d4af37, transparent)' }} />
    </header>
  );
}
