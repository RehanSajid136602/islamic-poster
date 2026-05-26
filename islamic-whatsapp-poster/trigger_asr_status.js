'use strict';

require('dotenv').config();
const { execSync } = require('child_process');
const axios = require('axios');

const HADITH_API_KEY = process.env.HADITH_API_KEY || '';

async function triggerAsr() {
  console.log('Fetching random Hadith...');
  const books = ['sahih-bukhari', 'sahih-muslim', 'abu-dawood', 'ibn-e-majah', 'tirmidhi', 'nasai'];
  
  let item = null;
  let chosenBook = '';
  
  // Try books in random order until one works
  const shuffledBooks = books.sort(() => 0.5 - Math.random());
  
  for (const book of shuffledBooks) {
    console.log(`Trying book: ${book}...`);
    const url = `https://hadithapi.com/api/hadiths?apiKey=${HADITH_API_KEY}&book=${book}&paginate=50`;
    
    try {
      const stdout = execSync(`curl -s '${url}'`, { maxBuffer: 10 * 1024 * 1024 });
      const data = JSON.parse(stdout.toString());
      
      if (data.status === 200 && data.hadiths?.data && data.hadiths.data.length > 0) {
        const list = data.hadiths.data;
        item = list[Math.floor(Math.random() * list.length)];
        chosenBook = book;
        break;
      } else {
        console.log(`Book ${book} returned status ${data.status} or empty data.`);
      }
    } catch (err) {
      console.error(`Fetch failed for ${book}:`, err.message);
    }
  }

  if (!item) {
    console.error('Could not fetch any Hadith from any book.');
    process.exit(1);
  }

  console.log(`Fetched Hadith from ${chosenBook}: ${item.hadithArabic ? item.hadithArabic.slice(0, 40) : ''}...`);

  const bookNameMap = {
    'sahih-bukhari': 'صحیح بخاری',
    'sahih-muslim': 'صحیح مسلم',
    'abu-dawood': 'سنن ابو داؤد',
    'ibn-e-majah': 'سنن ابن ماجہ',
    'tirmidhi': 'جامع ترمذی',
    'nasai': 'سنن نسائی',
  };

  const bgStyles = ['green', 'navy', 'black', 'maroon', 'mountains', 'lake', 'mountain-night', 'desert-sunset', 'forest-mist', 'starry-night'];
  const randomBg = bgStyles[Math.floor(Math.random() * bgStyles.length)];

  const payload = {
    type: 'hadith',
    arabic: item.hadithArabic || 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    urdu: item.hadithUrdu || 'بے شک اعمال کا دارومدار نیتوں پر ہے',
    reference: `${item.book?.bookName || bookNameMap[chosenBook]} : ${item.hadithNumber}`,
    bgStyle: randomBg
  };

  console.log(`Triggering upload with background: ${randomBg}...`);
  try {
    const res = await axios.post('http://localhost:3001/api/upload', payload);
    console.log('Upload result:', res.data);
  } catch (err) {
    console.error('Upload failed:', err.response?.data || err.message);
  }
}

triggerAsr();
