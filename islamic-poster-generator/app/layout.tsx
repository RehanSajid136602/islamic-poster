import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Islamic Poster Generator — Quran & Hadith',
  description: 'Generate beautiful Islamic posters with Quran ayahs and authentic Hadiths in Arabic and Urdu',
  keywords: ['Islamic', 'Quran', 'Hadith', 'poster', 'Arabic', 'Urdu', 'WhatsApp status'],
  openGraph: {
    title: 'Islamic Poster Generator',
    description: 'Beautiful Quran & Hadith posters in Arabic and Urdu',
    type: 'website',
    locale: 'ur_PK',
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ur" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#f0f4f0]">{children}</body>
    </html>
  );
}
