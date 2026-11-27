import { MODULES as courses } from '../../integrations/mihrap/data/academyData';
import { ACADEMY_BACKUP_TYPE, readAcademyBackup } from '../../integrations/mihrap/progress';
import {
  asRow, asText, readKitchenBackup, readMusicPlaylists, readPrayerStudy, readVideoShelf,
} from '../../integrations/shared/importedData';
import type { ApplicationProgress, ModuleRecord } from '../types/entities';
import type { ExternalImport } from './externalImports';
import { searchText } from './integrationService';

function recent<T extends { id: string; createdAt: string }>(
  label: string, items: T[], describe: (item: T) => { title: string; detail?: string },
) {
  return {
    label,
    entries: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
      .map((item) => ({ id: item.id, ...describe(item) })),
  };
}

function sourceRecords(records: ModuleRecord[], appId: string) {
  return records.filter((record) =>
    record.moduleId === appId && record.id.startsWith(`ext-${appId}-`) && !record.isDemo && !record.isArchived);
}

export function summarizeApplicationProgress(appId: string, data: ExternalImport): ApplicationProgress {
  const records = sourceRecords(data.records, appId);
  switch (appId) {
    case 'dijital-kutuphanem': {
      const books = data.books.filter((book) => book.id.startsWith('ext-dijital-kutuphanem-book-') && !book.isDemo && !book.isArchived);
      if (!books.length) break;
      const reading = books.filter((book) => book.status === 'okunuyor');
      return {
        metrics: [{ label: 'Okunuyor', value: reading.length },
          { label: 'Bitirilen', value: books.filter((book) => book.status === 'okundu').length }],
        recent: [recent('Okuma ilerlemesi', reading, ({ title, currentPage }) =>
          ({ title, detail: currentPage > 0 ? `${currentPage}. sayfa` : undefined })),
        recent('Yeni kitaplar', books, ({ title, author }) => ({ title, detail: author }))],
      };
    }
    case 'alinti-defterim': {
      const quotes = data.quotes.filter((quote) => quote.id.startsWith('ext-alinti-defterim-quote-') && !quote.isDemo && !quote.isArchived);
      const words = records.filter(({ entityType }) => entityType === 'word_entry');
      if (!quotes.length && !words.length) break;
      const sayings = quotes.filter((quote) =>
        /\b(ozlu\s*soz(?:ler)?|ozdeyis(?:ler)?|vecize(?:ler)?|aforizma(?:lar)?)\b/.test(
          searchText([quote.category, ...quote.tags].join(' '))));
      const otherQuotes = quotes.filter((quote) => !sayings.includes(quote));
      const describeQuote = ({ text, author }: { text: string; author: string }) => ({ title: text, detail: author });
      return {
        metrics: [{ label: 'Alıntı', value: otherQuotes.length }, { label: 'Kelime', value: words.length },
          { label: 'Özlü söz', value: sayings.length }],
        recent: [recent('Yeni alıntılar', otherQuotes, describeQuote), recent('Yeni kelimeler', words, (record) =>
          ({ title: record.title, detail: asText(asRow(record.payload).meaningToday) })),
        recent('Yeni özlü sözler', sayings, describeQuote)],
      };
    }
    case 'siir-deryasi': {
      const poems = records.filter(({ entityType }) => entityType === 'poem');
      const backup = records.find(({ entityType }) => entityType === 'imported_record');
      const reading = Object.values(asRow(asRow(backup?.payload).progress)).map(asRow);
      const completed = backup ? reading.filter((item) => item.done === true).length
        : poems.filter((poem) => asRow(poem.payload).importedPercent === 100).length;
      if (!poems.length && !reading.length) break;
      return {
        metrics: [{ label: 'Kişisel şiir', value: poems.length }, { label: 'Okuması tamamlanan', value: completed }],
        recent: [recent('Yeni şiirler', poems, (record) => {
          const payload = asRow(record.payload);
          return { title: record.title, detail: typeof payload.importedPercent === 'number'
            ? `Okuma %${payload.importedPercent}` : asText(payload.poetName) };
        })],
      };
    }
    case 'mihrap-ve-minber': {
      const backup = records.find(({ entityType }) => entityType === ACADEMY_BACKUP_TYPE);
      const progress = readAcademyBackup(backup?.payload);
      const doneLessons = courses.reduce((count, course) => count + course.cards.filter(
        (_card, index) => progress?.completed[`${course.index}:${index}`] === true,
      ).length, 0);
      if (doneLessons) return { metrics: [{ label: 'Ders tamamlandı', value: doneLessons }] };
      break;
    }
    case 'tekamul-yolunda': {
      const habits = records.filter(({ entityType }) => entityType === 'habit');
      const completions = habits.reduce((total, record) => {
        const dates = asRow(record.payload).completedDates;
        return total + (Array.isArray(dates) ? dates.length : 0);
      }, 0);
      if (completions) return { metrics: [{ label: 'Alışkanlık tamamlaması', value: completions }] };
      break;
    }
    case 'namaz-yolculugum': {
      const study = readPrayerStudy(records);
      if (study.length) return { metrics: [
        { label: 'Tamamlanan ezber', value: study.filter((item) => item.status === 'done').length },
        { label: 'Çalışılan ezber', value: study.filter((item) => item.status === 'practice').length },
      ] };
      break;
    }
    case 'sohbet-arsivi': {
      const videos = readVideoShelf(records);
      const started = videos.filter((video) => video.percent > 0 && video.percent < 100).length;
      const completed = videos.filter((video) => video.percent === 100).length;
      if (started || completed) return { metrics: [
        { label: 'İzleniyor', value: started }, { label: 'İzlemesi tamamlanan', value: completed },
      ] };
      break;
    }
    case 'automusicpro': {
      const playlists = readMusicPlaylists(records).filter(({ key }) => !key.startsWith('favorites-'));
      if (playlists.length) return { metrics: [{ label: 'Çalma listesi', value: playlists.length }] };
      break;
    }
    case 'bugun-ne-yesem': {
      const { shopping } = readKitchenBackup(records);
      if (shopping.length) return { metrics: [
        { label: 'Alışverişte tamamlanan', value: `${shopping.filter((item) => item.checked).length}/${shopping.length}` },
      ] };
      break;
    }
  }
  return { metrics: [] };
}
