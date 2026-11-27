import { growthHabits } from '../../integrations/shared/importedData';
import { ACADEMY_BACKUP_TYPE, readAcademyBackup } from '../../integrations/mihrap/progress';
import { getModuleById } from '../registry/modules';
import type { Book, BookStatus, ExternalAppConfig, ModuleRecord, Quote } from '../types/entities';
import { isSafeHttpUrl, parseCsvBooks, searchText } from './integrationService';

type Row = Record<string, unknown>;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export interface ExternalImport {
  books: Book[];
  quotes: Quote[];
  records: ModuleRecord[];
}

export const SOURCE_IMPORTS: Record<string, { hint: string; live?: string; file?: boolean }> = {
  'dijital-kutuphanem': { hint: 'Kütüphanedeki JSON yedeği veya kitap CSV dosyası.', file: true },
  'alinti-defterim': { hint: 'Alıntı ve Lügat JSON yedeği. Alıntılar ve sözlük kartları Alıntı Defterim’e aktarılır.', file: true },
  'sohbet-arsivi': { hint: 'Kaynak tarayıcıdaki favori, izleme ilerlemesi ve not verileri JSON olarak alınabilir (SA_FAVS, SA_PROGRESS, SA_NOTES).', live: 'https://sohbet-arsivi-e1701a.toughtamarind.chatgpt.site', file: true },
  'siir-deryasi': { hint: 'Defterim ekranındaki JSON yedeği. Kişisel şiirler, favori işaretleri ve notlarıyla şiir listesine eklenir.', file: true },
  'automusicpro': { hint: 'Genel Ayarlar ekranından AutoMusic Pro 4 JSON yedeği. Çalma listeleri ve favoriler entegre oynatıcıda açılır.', file: true },
  'tekamul-yolunda': { hint: 'Tekâmül JSON yedeği. Günlük yazıları ve tarihli alışkanlık işaretleri Tekâmül modülüne eklenir.', file: true },
  'mihrap-ve-minber': { hint: 'Akademi Yedek ekranındaki JSON dosyası. Ders ilerlemesi ve notlar Dijital Evrenim’deki Akademi kayıtlarına aktarılır.', live: 'https://mihrap-ve-minber-akademisi.toughtamarind.chatgpt.site', file: true },
  'namaz-yolculugum': { hint: 'Kaynak tarayıcıdaki namaz-yolculugum:ezber verisi JSON olarak ezber çizelgesine alınabilir.', live: 'https://namaz-yolculugum.toughtamarind.chatgpt.site', file: true },
  'bugun-ne-yesem': { hint: 'Malzemeler, favori tarif kimlikleri ve alışveriş listesi içeren mutfak JSON yedeği.', live: 'https://bugun-ne-yesem-mutfak.toughtamarind.chatgpt.site', file: true },
  'karadeniz-asistani': { hint: 'Canlı rota, hava ve deniz tahmini. Kaynak uygulama rota verisini oturum sonunda saklamıyor.' },
};

const object = (value: unknown): Row | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : undefined;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(object).filter((r): r is Row => Boolean(r)) : [];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const date = (value: unknown, fallback: string) =>
  (typeof value === 'number' || typeof value === 'string') && Number.isFinite(new Date(value).valueOf()) ? new Date(value).toISOString() : fallback;
const natural = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (!object(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]));
  });
}

async function importId(namespace: string, key: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(key)));
  return `ext-${namespace}-${Array.from(new Uint8Array(hash).slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function omitExportMetadata(row: Row): Row {
  const { exportedAt, exportDate, ...rest } = row;
  return rest;
}

export async function prepareExternalImport(app: Pick<ExternalAppConfig, 'appId' | 'name' | 'targetModuleId'>, content: string, csv = false): Promise<ExternalImport> {
  if (new Blob([content]).size > MAX_IMPORT_BYTES) throw new Error('Aktarım dosyası 5 MB sınırını aşıyor.');
  if (csv && app.appId !== 'dijital-kutuphanem') throw new Error('Bu kaynak için JSON dosyası seçin.');
  const parsed: unknown = csv ? parseCsvBooks(content) : JSON.parse(content);
  const root = object(parsed) ?? {};
  const now = new Date().toISOString();
  const result: ExternalImport = { books: [], quotes: [], records: [] };
  const addRecord = async (title: string, payload: Row, options: Partial<ModuleRecord> = {}, key: unknown = payload) => {
    const moduleId = options.moduleId ?? app.targetModuleId;
    if (!getModuleById(moduleId)) throw new Error('Aktarımın hedef modülü bulunamadı.');
    // Reimporting a dictionary card must still match its previously saved ID.
    const identityModuleId = app.appId === 'alinti-defterim' && options.entityType === 'word_entry' ? 'kelime-muzesi' : moduleId;
    result.records.push({
      id: await importId(app.appId, [identityModuleId, options.entityType ?? 'archive', key]),
      moduleId, entityType: 'imported_record', title, category: 'Harici uygulama yedeği',
      tags: [app.name], isFavorite: false, isArchived: false, privacyDomain: 'kisisel',
      payload, createdAt: now, updatedAt: now, ...options,
    });
  };
  const addQuotes = async (source: unknown, bookIds = new Map<string, string>()) => {
    for (const row of rows(source)) {
      const quote = text(row.text ?? row.quoteText);
      if (!quote) continue;
      const author = text(row.author) || 'Bilinmeyen';
      const sourceTitle = text(row.sourceTitle || row.book || row.bookTitle) || app.name;
      result.quotes.push({
        id: await importId(app.appId + '-quote', row.id ?? [quote, author, sourceTitle]),
        text: quote, author, sourceTitle, bookId: bookIds.get(String(row.bookId ?? '')),
        pageNumber: text(String(row.pageNumber ?? row.page ?? '')) || undefined,
        tags: Array.isArray(row.tags) ? row.tags.map(text).filter(Boolean) : [],
        isFavorite: row.isFavorite === true,
        createdAt: date(row.createdAt, now), updatedAt: date(row.updatedAt ?? row.createdAt, now),
      });
    }
  };

  switch (app.appId) {
    case 'dijital-kutuphanem': {
      const statuses: Record<string, BookStatus> = {
        reading: 'okunuyor', completed: 'okundu', paused: 'beklemede', want_to_read: 'okunacak',
        okunuyor: 'okunuyor', okundu: 'okundu', beklemede: 'beklemede', okunacak: 'okunacak',
      };
      const bookIds = new Map<string, string>();
      for (const row of rows(root.userBooks ?? root.books ?? parsed)) {
        const title = text(row.title);
        if (!title) continue;
        const author = text(row.author) || 'Bilinmeyen Yazar';
        const totalPages = Math.max(1, natural(row.totalPages, 200));
        const cover = text(row.coverUrl);
        const id = await importId(app.appId + '-book', row.id ?? [searchText(title), searchText(author)]);
        if (row.id != null) bookIds.set(String(row.id), id);
        result.books.push({
          id,
          title, author, category: text(row.category) || 'Genel',
          status: statuses[text(row.status)] ?? 'okunacak', totalPages,
          currentPage: Math.min(totalPages, natural(row.currentPage)), isbn: text(row.isbn) || undefined,
          publishYear: text(String(row.publishYear ?? '')) || undefined,
          notes: text(row.userNotes ?? row.notes) || undefined,
          coverUrl: isSafeHttpUrl(cover) ? cover : undefined, isFavorite: row.isFavorite === true,
          createdAt: date(row.createdAt, now), updatedAt: date(row.updatedAt ?? row.createdAt, now),
        });
      }
      await addQuotes(root.quotations, bookIds);
      break;
    }
    case 'alinti-defterim':
      await addQuotes(root.quotes ?? parsed);
      for (const row of rows(root.dictionary)) {
        if (text(row.word) && text(row.meaning)) {
          await addRecord(text(row.word), {
            originLanguage: '', rootForm: text(row.originalScript), etymologyNote: text(row.origin),
            etymologyVerification: 'kaynak_belirtilmedi', sourceRef: text(row.book),
            meaningToday: text(row.meaning), semanticShifts: '', synonyms: [], antonyms: [],
            literaryExample: text(row.example), isForgotten: false, cognates: [],
          }, { entityType: 'word_entry', category: 'Lügat kartı' }, row.id ?? row);
        }
      }
      break;
    case 'siir-deryasi':
      for (const row of rows(root.ownPoems)) {
        const title = text(row.title);
        const lines = text(row.text);
        if (!title || !lines) continue;
        const poetName = text(row.author) || 'Ben';
        const id = text(row.id);
        const progress = object(object(root.progress)?.[id]);
        const favorite = object(root.favorites)?.[id];
        await addRecord(title, {
          kind: 'poem', poetName, lines, theme: 'Kişisel şiir', isPersonal: true,
          notes: text(object(root.notes)?.[id]), readCount: progress ? 1 : undefined,
          lastReadAt: date(progress?.at, '') || undefined,
          importedPercent: progress ? progress.done ? 100 : Math.min(99, natural(progress.pct)) : undefined,
        }, {
          entityType: 'poem', subtitle: poetName, category: 'Kişisel şiir', updatedAt: date(row.updatedAt, now),
          isFavorite: typeof favorite === 'number' && favorite > 0,
        }, row.id ?? [title, lines]);
      }
      if (root.app === 'siir-deryasi') {
        const { ownPoems, ...archive } = omitExportMetadata(root);
        await addRecord('Şiir Deryası okuma defteri', archive);
      }
      break;
    case 'tekamul-yolunda':
      for (const row of rows(root.journal)) {
        const title = text(row.title);
        const reflectionNote = text(row.content);
        if (!title || !reflectionNote) continue;
        await addRecord(title, { kind: 'reflection', reflectionNote }, {
          entityType: 'reflection', category: 'Kişisel Tekâmül',
          date: /^\d{4}-\d{2}-\d{2}$/.test(text(row.date)) ? text(row.date) : undefined,
        }, row.id ?? row);
      }
      const habitDays = object(root.dailyHabits) ?? {};
      const datesByHabit = new Map<string, string[]>();
      for (const [key, checked] of Object.entries(habitDays)) {
        const match = /^(\d{4}-\d{2}-\d{2})-([a-z]+)$/.exec(key);
        if (checked !== true || !match || !Object.hasOwn(growthHabits, match[2])) continue;
        datesByHabit.set(match[2], [...(datesByHabit.get(match[2]) ?? []), match[1]]);
      }
      for (const [id, completedDates] of datesByHabit) {
        await addRecord(growthHabits[id as keyof typeof growthHabits], {
          kind: 'habit', completedDates: completedDates.sort(),
        }, { entityType: 'habit', category: 'Kişisel Tekâmül', subtitle: 'Günlük Alışkanlık' }, ['habit', id]);
      }
      if (object(root.tasks) && typeof root.version === 'number') {
        const { journal, ...archive } = omitExportMetadata(root);
        await addRecord('Tekâmül gelişim ve alışkanlık yedeği', archive);
      }
      break;
    case 'automusicpro': {
      const data = object(root.data);
      if (root.app === 'AutoMusic Pro 4' && data) await addRecord('AutoMusic Pro 4 arşivi', data);
      break;
    }
    case 'mihrap-ve-minber':
      if (readAcademyBackup(root)) {
        await addRecord('Mihrap ve Minber ders ilerlemesi', omitExportMetadata(root), {
          entityType: ACADEMY_BACKUP_TYPE, privacyDomain: 'ibadet',
        });
      }
      break;
    case 'bugun-ne-yesem':
      if (root.version === 1 && typeof root.staples === 'boolean' &&
          ['selected', 'custom', 'favorites', 'shopping'].every((field) => Array.isArray(root[field]))) {
        await addRecord('Mutfak ve alışveriş yedeği', root);
      }
      break;
    case 'sohbet-arsivi':
      if (Array.isArray(root.SA_FAVS) || object(root.SA_PROGRESS) || object(root.SA_NOTES)) {
        await addRecord('Favoriler, izleme ilerlemesi ve notlar', {
          favorites: root.SA_FAVS, progress: root.SA_PROGRESS, notes: root.SA_NOTES,
        });
      }
      break;
    case 'namaz-yolculugum': {
      const state = root['namaz-yolculugum:ezber'] ?? parsed;
      if (Array.isArray(state) && state.length && state.every((id) => typeof id === 'string' || typeof id === 'number') ||
          object(state) && Object.keys(state as Row).length && Object.values(state as Row).every((value) => value === 'done' || value === 'practice')) {
        await addRecord('Namaz ezber çizelgesi', { study: state }, { privacyDomain: 'ibadet' });
      }
      break;
    }
  }
  const count = result.books.length + result.quotes.length + result.records.length;
  if (!count) throw new Error('Bu kaynak için desteklenen kayıt bulunamadı. Uygulamanın belirtilen yedek biçimini kullanın.');
  if (count > 3000) throw new Error('Bir aktarım en fazla 3.000 kayıt içerebilir.');
  return result;
}

export async function fetchExternalJson(value: string): Promise<string> {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('API için geçerli bir HTTPS veri adresi girin.');
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'omit',
    referrerPolicy: 'no-referrer', redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Kaynak HTTP ${response.status} yanıtı verdi.`);
  if (!response.headers.get('Content-Type')?.match(/\/json\b|\+json\b/i) || !response.body) {
    throw new Error('Kaynak JSON veri döndürmedi.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return content + decoder.decode();
    size += chunk.value.byteLength;
    if (size > MAX_IMPORT_BYTES) {
      await reader.cancel();
      throw new Error('Kaynak verisi 5 MB sınırını aşıyor.');
    }
    content += decoder.decode(chunk.value, { stream: true });
  }
}
