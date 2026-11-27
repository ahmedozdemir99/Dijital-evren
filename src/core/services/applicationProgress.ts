import { MODULES as courses } from '../../integrations/mihrap/data/academyData';
import { ACADEMY_MODULE_ID, ACADEMY_ROUTE, combinedAcademyProgress } from '../../integrations/mihrap/progress';
import {
  asRow, asText, readKitchenBackup, readMusicPlaylists, readPrayerStudy, readVideoShelf,
} from '../../integrations/shared/importedData';
import type { Book, ModuleRecord, Quote } from '../types/entities';
import { getRecordRoute, searchText } from './integrationService';

type Metric = { label: string; value: number | string };
type Recent = { id: string; title: string; detail?: string; href: string };
export type ApplicationProgress = {
  appId: string;
  metrics: Metric[];
  recent?: { label: string; entries: Recent[] }[];
  href?: string;
};

const library = 'dijital-kutuphanem';
const notebook = 'alinti-defterim';
const poetry = 'siir-deryasi';
const growth = 'tekamul-yolunda';
const prayers = 'namaz-yolculugum';
const conversation = 'sohbet-arsivi';
const music = 'automusicpro';
const kitchen = 'bugun-ne-yesem';

function current<T extends { isDemo?: boolean; isArchived?: boolean }>(items: T[]) {
  return items.filter((item) => !item.isDemo && !item.isArchived);
}

function latest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, 3);
}

function readingDetail(book: Book) {
  return book.totalPages > 0 ? `${book.author} · ${book.currentPage}/${book.totalPages} sayfa` : book.author;
}

function isSaying(quote: Quote) {
  return /\b(ozlu\s*soz(?:ler)?|ozdeyis(?:ler)?|vecize(?:ler)?|aforizma(?:lar)?)\b/.test(
    searchText([quote.category, ...(Array.isArray(quote.tags) ? quote.tags : [])].join(' ')),
  );
}

function recordEntry(record: ModuleRecord, detail?: string): Recent {
  return {
    id: record.id, title: record.title, detail,
    href: getRecordRoute(record.moduleId, record.id, record.entityType),
  };
}

export function summarizeApplicationProgress(data: { books: Book[]; quotes: Quote[]; moduleRecords: ModuleRecord[] }, today: string): ApplicationProgress[] {
  const books = current(data.books);
  const quotes = current(data.quotes);
  const records = current(data.moduleRecords);
  const ofType = (id: string, type: string) => records.filter((r) => r.moduleId === id && r.entityType === type);
  const words = ofType(notebook, 'word_entry');
  const sayings = quotes.filter(isSaying);
  const otherQuotes = quotes.filter((quote) => !isSaying(quote));
  const poems = ofType(poetry, 'poem');
  const habits = ofType(growth, 'habit');
  const goals = ofType(growth, 'goal');
  const { result: academy } = combinedAcademyProgress(records);
  const lessonCount = courses.reduce((count, course) => count + course.cards.length, 0);
  const doneLessons = courses.reduce((count, course) => count + course.cards.filter(
    (_lesson, index) => academy.completed[`${course.index}:${index}`] === true,
  ).length, 0);
  const prayerDays = ofType(prayers, 'prayer_day');
  const todayPrayers = prayerDays
    .filter((record) => (record.date || asRow(record.payload).date) === today)
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))[0];
  const markedPrayers = asRow(asRow(todayPrayers?.payload).prayers);
  const prayerCount = ['sabah', 'ogle', 'ikindi', 'aksam', 'yatsi'].filter((time) => markedPrayers[time] === true).length;
  const recitation = readPrayerStudy(records);
  const videos = readVideoShelf(records);
  const chats = ofType(conversation, 'conversation');
  const tracks = readMusicPlaylists(records);
  const compositions = ofType(music, 'composition');
  const recipes = ofType(kitchen, 'recipe');
  const kitchenBackup = readKitchenBackup(records);
  const places = ofType('karadeniz-asistani', 'karadeniz_spot');
  const quoteEntry = (quote: Quote) => ({
    id: quote.id, title: quote.text, detail: quote.author, href: getRecordRoute(notebook, quote.id),
  });

  return [
    {
      appId: library, href: '/modul/dijital-kutuphanem',
      metrics: [{ label: 'Okunuyor', value: books.filter((book) => book.status === 'okunuyor').length },
        { label: 'Bitirilen', value: books.filter((book) => book.status === 'okundu').length }],
      recent: [{ label: 'Okuma ilerlemesi', entries: latest(books.filter((book) => book.status === 'okunuyor')).map((book) =>
        ({ id: book.id, title: book.title, detail: readingDetail(book), href: getRecordRoute(library, book.id) })) },
        { label: 'Yeni kitaplar', entries: latest(books).map((book) =>
          ({ id: book.id, title: book.title, detail: book.author, href: getRecordRoute(library, book.id) })) }],
    },
    {
      appId: notebook, href: '/modul/alinti-defterim',
      metrics: [{ label: 'Alıntı', value: otherQuotes.length }, { label: 'Kelime', value: words.length },
        { label: 'Özlü söz', value: sayings.length }],
      recent: [{ label: 'Yeni alıntılar', entries: latest(otherQuotes).map(quoteEntry) },
        { label: 'Yeni kelimeler', entries: latest(words).map((record) => recordEntry(record, asText(asRow(record.payload).meaningToday))) },
        { label: 'Yeni özlü sözler', entries: latest(sayings).map(quoteEntry) }],
    },
    {
      appId: poetry, href: '/modul/siir-deryasi', metrics: [{ label: 'Şiir', value: poems.length },
        { label: 'Okunan', value: poems.filter((poem) => {
          const payload = asRow(poem.payload);
          return payload.importedPercent === 100 || payload.lastReadAt || (typeof payload.readCount === 'number' && payload.readCount > 0);
        }).length }],
      recent: [{ label: 'Yeni şiirler', entries: latest(poems).map((record) => {
        const payload = asRow(record.payload);
        const percent = payload.importedPercent;
        return recordEntry(record, typeof percent === 'number' && Number.isFinite(percent)
          ? `Okuma %${Math.min(100, Math.max(0, percent))}` : asText(payload.poetName));
      }) }],
    },
    {
      appId: ACADEMY_MODULE_ID, href: ACADEMY_ROUTE,
      metrics: [{ label: 'Ders tamamlandı', value: `${doneLessons}/${lessonCount}` }],
    },
    {
      appId: growth, href: '/modul/tekamul-yolunda',
      metrics: [{ label: 'Bugün tamamlanan alışkanlık', value: `${habits.filter((record) => {
        const dates = asRow(record.payload).completedDates;
        return Array.isArray(dates) && dates.includes(today);
      }).length}/${habits.length}` }, { label: 'Hedef', value: goals.length }],
      recent: [{ label: 'Hedefler', entries: latest(goals).map((record) => {
        const { currentValue, targetValue } = asRow(record.payload);
        return recordEntry(record, typeof currentValue === 'number' && typeof targetValue === 'number'
          ? `${currentValue}/${targetValue}` : undefined);
      }) }],
    },
    {
      appId: prayers, href: '/modul/namaz-yolculugum',
      metrics: [{ label: 'Bugün işaretlenen vakit', value: `${prayerCount}/5` },
        { label: 'Tamamlanan ezber', value: recitation.filter((item) => item.status === 'done').length }],
    },
    ...(chats.length || videos.length ? [{
      appId: conversation, href: '/entegrasyonlar/sohbet-arsivi',
      metrics: [{ label: 'Sohbet', value: chats.length }, { label: 'Tamamlanan video', value: videos.filter((item) => item.percent === 100).length }],
      recent: [{ label: 'Yeni sohbetler', entries: latest(chats).map((record) => recordEntry(record)) }],
    }] : []),
    ...(compositions.length || tracks.length ? [{
      appId: music, href: '/entegrasyonlar/automusicpro',
      metrics: [{ label: 'Beste', value: compositions.length }, { label: 'Çalma listesi', value: tracks.length }],
      recent: [{ label: 'Yeni besteler', entries: latest(compositions).map((record) => recordEntry(record)) }],
    }] : []),
    ...(kitchenBackup.found || recipes.length ? [{
      appId: kitchen, href: '/entegrasyonlar/bugun-ne-yesem',
      metrics: [{ label: 'Alışveriş listesi', value: `${kitchenBackup.shopping.filter((item) => item.checked).length}/${kitchenBackup.shopping.length}` },
        { label: 'Kayıtlı tarif', value: recipes.length }],
      recent: [{ label: 'Yeni tarifler', entries: latest(recipes).map((record) => recordEntry(record)) }],
    }] : []),
    ...(places.length ? [{
      appId: 'karadeniz-asistani', href: '/modul/karadeniz-asistani',
      metrics: [{ label: 'Kayıtlı gezi noktası', value: places.length }],
      recent: [{ label: 'Yeni gezi noktaları', entries: latest(places).map((record) => recordEntry(record)) }],
    }] : []),
  ];
}
