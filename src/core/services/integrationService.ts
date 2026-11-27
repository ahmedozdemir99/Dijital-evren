import { MODULES, getModuleById } from '../registry/modules';
import type {
  Book,
  EntityRelation,
  KnowledgeNode,
  ModuleRecord,
  ModuleRuntimeSetting,
  QuickNote,
  Quote,
  UserPreferences,
} from '../types/entities';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  kind: 'module' | 'book' | 'quote' | 'knowledge_node' | 'quick_note' | 'record';
  moduleId: string;
  category?: string;
  tags?: string[];
  date?: string;
  route: string;
  isDemo?: boolean;
}

export interface SearchFilters {
  moduleId?: string;
  kind?: string;
  category?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CalendarEventItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  moduleId: string;
  moduleName: string;
  centerColor: string;
  route: string;
  privacyDomain: string;
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function localDateIso(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSafeHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const SAFE_DATA_URL_PREFIXES = [
  /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i,
  /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i,
  /^data:text\/(plain|csv|json)(?:;charset=[A-Za-z0-9_-]+)?;base64,[A-Za-z0-9+/=]+$/i,
  /^data:application\/json(?:;charset=[A-Za-z0-9_-]+)?;base64,[A-Za-z0-9+/=]+$/i,
  /^data:audio\/(mpeg|mp3|wav|ogg|webm);base64,[A-Za-z0-9+/=]+$/i,
];

export function isSafeDataUrl(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return SAFE_DATA_URL_PREFIXES.some((re) => re.test(trimmed));
}

export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSimilarQuotes(candidateText: string, existingQuotes: Quote[], excludeId?: string): Quote[] {
  const normalizedCandidate = normalizeText(candidateText);
  if (normalizedCandidate.length < 12) return [];

  const candidateWords = new Set(normalizedCandidate.split(' ').filter((w) => w.length > 2));
  if (candidateWords.size === 0) return [];

  return existingQuotes.filter((q) => {
    if (excludeId && q.id === excludeId) return false;
    const norm = normalizeText(q.text);
    if (norm === normalizedCandidate) return true;
    if (norm.includes(normalizedCandidate) || normalizedCandidate.includes(norm)) return true;

    const words = new Set(norm.split(' ').filter((w) => w.length > 2));
    let overlap = 0;
    for (const w of candidateWords) {
      if (words.has(w)) overlap++;
    }
    const ratio = overlap / Math.max(candidateWords.size, words.size);
    return ratio >= 0.6;
  });
}

export function searchText(text: string): string {
  return normalizeText(text.normalize('NFC'))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i');
}

function searchableDetails(payload: unknown): string {
  const parts: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 4 || parts.length >= 80) return;
    if (typeof value === 'string') {
      if (!/^(data:|blob:|https?:)/i.test(value)) parts.push(value.slice(0, 2000));
    } else if (Array.isArray(value)) {
      value.slice(0, 40).forEach((item) => visit(item, depth + 1));
    } else if (value && typeof value === 'object') {
      Object.entries(value).slice(0, 40).forEach(([key, item]) => {
        if (!/(password|token|secret|key|base64|dataurl|url)$/i.test(key)) visit(item, depth + 1);
      });
    }
  };
  visit(payload, 0);
  return parts.join(' ');
}

export function getRecordRoute(moduleId: string, id: string, type?: string): string {
  if (moduleId === 'mihrap-ve-minber' && type?.startsWith('mihrap_academy_')) return '/modul/mihrap-ve-minber/akademi';
  if (type === 'module_study' || type === 'imported_record') return `/modul/${moduleId}/calisma?workspaceId=${encodeURIComponent(id)}`;
  const key = moduleId === 'dijital-kutuphanem' ? 'bookId'
    : moduleId === 'alinti-defterim' ? 'quoteId'
    : moduleId === 'zihin-atlasi' ? 'nodeId' : 'recordId';
  return `/modul/${moduleId}?${key}=${encodeURIComponent(id)}`;
}

export function searchEcosystem(
  query: string,
  data: {
    books: Book[];
    quotes: Quote[];
    knowledgeNodes: KnowledgeNode[];
    quickNotes: QuickNote[];
    moduleRecords?: ModuleRecord[];
    moduleSettings: ModuleRuntimeSetting[];
    preferences: UserPreferences;
  },
  filters: SearchFilters = {}
): SearchResultItem[] {
  const q = searchText(query);
  const terms = [...new Set(q.split(' ').filter(Boolean))];
  const hasFilter = Object.values(filters).some((value) => value && value !== 'all');
  if (!q && !hasFilter) return [];

  const disabled = new Set(data.moduleSettings.filter((setting) => !setting.enabled).map((setting) => setting.moduleId));
  const allowPrivate = data.preferences.crossModuleSharing.allowSearchInPrivateDomains;
  const records = new Map((data.moduleRecords ?? []).map((record) => [record.id, record]));
  const isAllowed = (id: string) => {
    const mod = getModuleById(id);
    return Boolean(mod && !disabled.has(id) && (allowPrivate || mod.privacyDomain === 'genel'));
  };
  const results: Array<{ item: SearchResultItem; score: number }> = [];
  const add = (item: SearchResultItem, details = '') => {
    if (filters.moduleId && filters.moduleId !== 'all' && item.moduleId !== filters.moduleId) return;
    if (filters.kind && filters.kind !== 'all' && item.kind !== filters.kind) return;
    if (filters.category && !searchText(item.category ?? '').includes(searchText(filters.category))) return;
    if (filters.tag && !item.tags?.some((tag) => searchText(tag).includes(searchText(filters.tag!)))) return;
    if (filters.dateFrom && (!item.date || item.date < filters.dateFrom)) return;
    if (filters.dateTo && (!item.date || item.date > filters.dateTo)) return;
    const title = searchText(item.title);
    const labels = searchText([item.subtitle, item.category, ...(item.tags ?? [])].join(' '));
    const body = searchText(details);
    if (!terms.every((term) => title.includes(term) || labels.includes(term) || body.includes(term))) return;
    const score = q ? (title === q ? 100 : title.startsWith(q) ? 40 : title.includes(q) ? 20 : 0)
      + terms.reduce((total, term) => total + (title.includes(term) ? 8 : labels.includes(term) ? 3 : 1), 0) : 0;
    results.push({ item, score });
  };
  const date = (value?: string) => value?.slice(0, 10);
  for (const mod of MODULES) {
    if (q && isAllowed(mod.id)) add({
      id: mod.id, title: mod.name, subtitle: mod.shortDescription, kind: 'module', moduleId: mod.id, route: mod.route,
    });
  }
  if (isAllowed('dijital-kutuphanem')) for (const book of data.books) {
    if (book.isArchived) continue;
    const moduleId = 'dijital-kutuphanem';
    add({ id: book.id, title: book.title, subtitle: book.author, kind: 'book', moduleId,
      category: book.category, date: date(book.updatedAt), route: getRecordRoute(moduleId, book.id), isDemo: book.isDemo });
  }
  if (isAllowed('alinti-defterim')) for (const quote of data.quotes) {
    if (quote.isArchived) continue;
    const moduleId = 'alinti-defterim';
    add({ id: quote.id, title: quote.text.length > 76 ? `${quote.text.slice(0, 76)}…` : quote.text,
      subtitle: `${quote.author} · ${quote.sourceTitle}`, kind: 'quote', moduleId,
      category: quote.category ?? 'Alıntı', tags: quote.tags, date: date(quote.updatedAt),
      route: getRecordRoute(moduleId, quote.id), isDemo: quote.isDemo }, quote.text);
  }
  if (isAllowed('zihin-atlasi')) for (const node of data.knowledgeNodes) {
    const source = node.sourceEntityId ? records.get(node.sourceEntityId) : undefined;
    if (!isAllowed(node.sourceModule)) continue;
    if (source && (source.isArchived || (source.payload as { hideFromGlobalSearch?: boolean })?.hideFromGlobalSearch === true ||
      (!allowPrivate && source.privacyDomain !== 'genel'))) continue;
    const moduleId = 'zihin-atlasi';
    add({ id: node.id, title: node.title, subtitle: `Zihin Atlası · ${node.nodeType}`, kind: 'knowledge_node',
      moduleId, tags: node.tags, date: date(node.updatedAt), route: getRecordRoute(moduleId, node.id), isDemo: node.isDemo },
      node.summary);
  }
  for (const rec of records.values()) {
    if (rec.isArchived || !isAllowed(rec.moduleId) || (rec.payload as { hideFromGlobalSearch?: boolean })?.hideFromGlobalSearch === true) continue;
    if (!allowPrivate && rec.privacyDomain !== 'genel') continue;
    add({ id: rec.id, title: rec.title, subtitle: rec.subtitle || getModuleById(rec.moduleId)!.name, kind: 'record',
      moduleId: rec.moduleId, category: rec.category, tags: rec.tags, date: date(rec.date ?? rec.updatedAt),
      route: getRecordRoute(rec.moduleId, rec.id, rec.entityType), isDemo: rec.isDemo }, searchableDetails(rec.payload));
  }
  for (const note of data.quickNotes) {
    add({ id: note.id, title: note.title, subtitle: 'Hızlı Not', kind: 'quick_note', moduleId: 'idrak',
      tags: note.tags, date: date(note.updatedAt), route: `/?noteId=${encodeURIComponent(note.id)}`, isDemo: note.isDemo },
      note.content);
  }
  return results.sort((a, b) => b.score - a.score || (b.item.date ?? '').localeCompare(a.item.date ?? '')
    || a.item.title.localeCompare(b.item.title, 'tr')).slice(0, 40).map(({ item }) => item);
}

export function getRelationsForEntity(entityId: string, relations: EntityRelation[]): EntityRelation[] {
  return relations.filter((r) => r.fromEntityId === entityId || r.toEntityId === entityId);
}

export function buildCalendarEvents(data: {
  books: Book[];
  moduleRecords: ModuleRecord[];
  moduleSettings: ModuleRuntimeSetting[];
  preferences: UserPreferences;
  centerColors: Record<string, string>;
}): CalendarEventItem[] {
  const enabledMap = new Map(data.moduleSettings.map((s) => [s.moduleId, s.enabled]));
  const allowPrivate = data.preferences.crossModuleSharing.allowSearchInPrivateDomains;
  const events: CalendarEventItem[] = [];

  if (enabledMap.get('dijital-kutuphanem') !== false) {
    for (const b of data.books) {
      if (b.targetDate) {
        events.push({
          id: `cal-book-${b.id}`,
          date: b.targetDate.slice(0, 10),
          title: `Okuma: ${b.title}`,
          subtitle: `${b.author} (${b.currentPage}/${b.totalPages} s.)`,
          moduleId: 'dijital-kutuphanem',
          moduleName: 'Dijital Kütüphanem',
          centerColor: data.centerColors.idrak ?? '#71C6BD',
          route: `/modul/dijital-kutuphanem?bookId=${encodeURIComponent(b.id)}`,
          privacyDomain: 'genel',
        });
      }
    }
  }

  for (const rec of data.moduleRecords) {
    if (rec.isArchived || !rec.date) continue;
    if (enabledMap.get(rec.moduleId) === false) continue;
    if (rec.privacyDomain !== 'genel' && !allowPrivate) continue;
    const mod = getModuleById(rec.moduleId);
    if (!mod) continue;
    events.push({
      id: `cal-rec-${rec.id}`,
      date: rec.date.slice(0, 10),
      title: rec.title,
      subtitle: rec.subtitle || rec.category,
      moduleId: rec.moduleId,
      moduleName: mod?.name ?? rec.moduleId,
      centerColor: mod ? data.centerColors[mod.centerId] ?? '#D6B782' : '#D6B782',
      route: getRecordRoute(rec.moduleId, rec.id, rec.entityType),
      privacyDomain: rec.privacyDomain,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function parseCsvBooks(csvText: string): Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLocaleLowerCase('tr-TR'));
  const titleIdx = header.findIndex((h) => h.includes('title') || h.includes('baslik') || h.includes('kitap'));
  const authorIdx = header.findIndex((h) => h.includes('author') || h.includes('yazar'));
  const catIdx = header.findIndex((h) => h.includes('cat') || h.includes('kategori') || h.includes('tur'));
  const pagesIdx = header.findIndex((h) => h.includes('page') || h.includes('sayfa'));

  const result: Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const title = cols[titleIdx >= 0 ? titleIdx : 0];
    if (!title) continue;
    result.push({
      title,
      author: cols[authorIdx >= 0 ? authorIdx : 1] || 'Bilinmeyen Yazar',
      category: cols[catIdx >= 0 ? catIdx : 2] || 'Genel',
      status: 'okunacak',
      totalPages: Math.max(1, Number(cols[pagesIdx >= 0 ? pagesIdx : 3]) || 200),
      currentPage: 0,
      isDemo: false,
    });
  }
  return result;
}
