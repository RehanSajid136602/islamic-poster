// ── TypeScript interfaces for the entire app ──────────────────

export interface QuranAyah {
  arabic: string;
  urdu: string;
  surahEnglish: string;
  surahArabic: string;
  surahNumber: number;
  ayahNumber: number;
}

export interface Hadith {
  arabic: string;
  urdu: string;
  bookName: string;
  hadithNumber: number | string;
  chapterNumber: number | string;
}

export type ContentType = 'quran' | 'hadith';

export type BgStyle = 'green' | 'navy' | 'black' | 'maroon' | 'mountains' | 'lake'
  | 'mountain-night' | 'desert-sunset' | 'forest-mist' | 'starry-night';

export interface PosterData {
  type: ContentType;
  arabic: string;
  urdu: string;
  reference: string;
  referenceArabic: string;
  bgStyle: BgStyle;
}

export interface SurahListItem {
  number: number;
  name: string;         // Arabic
  englishName: string;
}
