import type { Hadith } from './types';

const API_KEY = process.env.NEXT_PUBLIC_HADITH_API_KEY || '';

const BOOKS = ['sahih-bukhari', 'sahih-muslim', 'abu-dawood', 'ibn-e-majah', 'tirmidhi', 'nasai'] as const;
export type BookSlug = typeof BOOKS[number];

export const BOOK_LABELS: Record<BookSlug, string> = {
  'sahih-bukhari': 'صحیح بخاری',
  'sahih-muslim': 'صحیح مسلم',
  'abu-dawood': 'سنن ابو داؤد',
  'ibn-e-majah': 'سنن ابن ماجہ',
  'tirmidhi': 'جامع ترمذی',
  'nasai': 'سنن نسائی',
};

const FALLBACK: Hadith = {
  arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
  urdu: 'بے شک اعمال کا دارومدار نیتوں پر ہے',
  bookName: 'صحیح بخاری',
  hadithNumber: 1,
  chapterNumber: 1,
};

export async function fetchRandomHadith(book: BookSlug = 'sahih-bukhari'): Promise<Hadith> {
  if (!API_KEY || API_KEY === 'your_hadith_api_key_here') return FALLBACK;
  try {
    const res = await fetch(
      `https://hadithapi.com/api/hadiths?apiKey=${API_KEY}&book=${book}&paginate=50`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return FALLBACK;
    const json = await res.json();
    const list = json.hadiths?.data;
    if (!list || list.length === 0) return FALLBACK;
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      arabic: item.hadithArabic || FALLBACK.arabic,
      urdu: item.hadithUrdu || FALLBACK.urdu,
      bookName: item.book?.bookName || BOOK_LABELS[book],
      hadithNumber: item.hadithNumber || 1,
      chapterNumber: item.chapterNumber || 1,
    };
  } catch {
    return FALLBACK;
  }
}

export { BOOKS };
