import type { QuranAyah, SurahListItem } from './types';

const BASE = 'https://api.alquran.cloud/v1';

// Fallback if API fails
const FALLBACK: QuranAyah = {
  arabic: 'وَمَن يَتَّقِ ٱللَّهَ يَجۡعَل لَّهُۥ مَخۡرَجٗا',
  urdu: 'اور جو اللہ سے ڈرتا ہے اللہ اس کے لیے نکلنے کی راہ بنا دیتا ہے',
  surahEnglish: 'At-Talaq',
  surahArabic: 'الطَّلَاق',
  surahNumber: 65,
  ayahNumber: 2,
};

export async function fetchRandomAyah(): Promise<QuranAyah> {
  try {
    const n = Math.floor(Math.random() * 6236) + 1;
    const res = await fetch(`${BASE}/ayah/${n}/editions/quran-uthmani,ur.maududi`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return FALLBACK;
    const json = await res.json();
    const ar = json.data[0];
    const ur = json.data[1];
    return {
      arabic: ar.text,
      urdu: ur.text,
      surahEnglish: ar.surah.englishName,
      surahArabic: ar.surah.name,
      surahNumber: ar.surah.number,
      ayahNumber: ar.numberInSurah,
    };
  } catch {
    return FALLBACK;
  }
}

export async function fetchSurahAyahs(surahNumber: number): Promise<QuranAyah> {
  try {
    const res = await fetch(
      `${BASE}/surah/${surahNumber}/editions/quran-uthmani,ur.maududi`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return FALLBACK;
    const json = await res.json();
    const ayahs0 = json.data[0].ayahs;
    const ayahs1 = json.data[1].ayahs;
    const idx = Math.floor(Math.random() * ayahs0.length);
    const ar = ayahs0[idx];
    const ur = ayahs1[idx];
    const meta = json.data[0];
    return {
      arabic: ar.text,
      urdu: ur.text,
      surahEnglish: meta.englishName,
      surahArabic: meta.name,
      surahNumber: meta.number,
      ayahNumber: ar.numberInSurah,
    };
  } catch {
    return FALLBACK;
  }
}

// ── Common Islamic term mappings (Urdu/transliteration → English search term)
const KEYWORD_MAP: Record<string, string> = {
  // Urdu transliterations
  'namaz': 'prayer',
  'salah': 'prayer',
  'salat': 'prayer',
  'roza': 'fasting',
  'rozah': 'fasting',
  'saum': 'fasting',
  'sawm': 'fasting',
  'iftar': 'fasting',
  'sehri': 'fasting',
  'hajj': 'pilgrimage',
  'haj': 'pilgrimage',
  'umrah': 'pilgrimage',
  'zakat': 'charity',
  'zakaat': 'charity',
  'sadaqah': 'charity',
  'sadqa': 'charity',
  'jihad': 'strive',
  'tawbah': 'repentance',
  'taubah': 'repentance',
  'toba': 'repentance',
  'iman': 'faith',
  'emaan': 'faith',
  'taqwa': 'righteous',
  'sabr': 'patience',
  'shukr': 'gratitude',
  'dua': 'supplication',
  'quran': 'quran',
  'tawhid': 'monotheism',
  'jannah': 'paradise',
  'jahannam': 'hellfire',
  'rizq': 'provision',
  'tawakkul': 'trust',
  'istighfar': 'forgiveness',
  'maghfirat': 'forgiveness',
  'maut': 'death',
  'qiyamah': 'resurrection',
  'aakhirat': 'hereafter',
  'akhirat': 'hereafter',
  'nabi': 'prophet',
  'rasool': 'messenger',
  'wudu': 'purification',
  'tahara': 'purification',
  'nikah': 'marriage',
  'shadi': 'marriage',
  'ilm': 'knowledge',
  'alim': 'knowledge',
};

export async function searchQuranAyah(keyword: string): Promise<QuranAyah | null> {
  try {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return null;

    // Map common Urdu/transliteration terms to English search terms
    const searchTerm = KEYWORD_MAP[trimmed] || trimmed;

    // Try English translation search first
    let matches: Array<{ surah: { number: number }; numberInSurah: number }> = [];

    const searchRes = await fetch(`${BASE}/search/${encodeURIComponent(searchTerm)}/all/en.sahih`, {
      next: { revalidate: 0 },
    });
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      matches = searchJson.data?.matches || [];
    }

    // Fall back to Urdu translation search if no English results
    if (matches.length === 0) {
      const urduRes = await fetch(`${BASE}/search/${encodeURIComponent(trimmed)}/all/ur.maududi`, {
        next: { revalidate: 0 },
      });
      if (urduRes.ok) {
        const urduJson = await urduRes.json();
        matches = urduJson.data?.matches || [];
      }
    }

    if (matches.length === 0) return null;

    // Pick a random match from the first 50 results for variety
    const pool = matches.slice(0, 50);
    const match = pool[Math.floor(Math.random() * pool.length)];
    const surahNum = match.surah.number;
    const ayahNum = match.numberInSurah;

    // Fetch the specific ayah in Arabic (Uthmani) and Urdu
    const res = await fetch(`${BASE}/ayah/${surahNum}:${ayahNum}/editions/quran-uthmani,ur.maududi`);
    if (!res.ok) return null;
    const json = await res.json();
    const ar = json.data[0];
    const ur = json.data[1];

    return {
      arabic: ar.text,
      urdu: ur.text,
      surahEnglish: ar.surah.englishName,
      surahArabic: ar.surah.name,
      surahNumber: ar.surah.number,
      ayahNumber: ar.numberInSurah,
    };
  } catch {
    return null;
  }
}

export async function fetchSurahList(): Promise<SurahListItem[]> {
  try {
    const res = await fetch(`${BASE}/surah`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data.map((s: { number: number; name: string; englishName: string }) => ({
      number: s.number,
      name: s.name,
      englishName: s.englishName,
    }));
  } catch {
    return [];
  }
}
