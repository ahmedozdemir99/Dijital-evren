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
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
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
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const hasFilter =
    Boolean(filters.moduleId && filters.moduleId !== 'all') ||
    Boolean(filters.kind && filters.kind !== 'all') ||
    Boolean(filters.category) ||
    Boolean(filters.tag) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  if (!q && !hasFilter) return [];

  const enabledMap = new Map(data.moduleSettings.map((s) => [s.moduleId, s.enabled]));
  const allowPrivate = data.preferences.crossModuleSharing.allowSearchInPrivateDomains;

  const isModuleAllowed = (moduleId: string): boolean => {
    if (enabledMap.get(moduleId) === false) return false;
    const mod = MODULES.find((m) => m.id === moduleId);
    if (!mod) return false;
    if (!allowPrivate && mod.privacyDomain !== 'genel') return false;
    return true;
  };

  const results: SearchResultItem[] = [];

  for (const mod of MODULES) {
    if (!isModuleAllowed(mod.id)) continue;
    if (
      !q ||
      mod.name.toLocaleLowerCase('tr-TR').includes(q) ||
      mod.shortDescription.toLocaleLowerCase('tr-TR').includes(q)
    ) {
      if (q) {
        results.push({
          id: mod.id,
          title: mod.name,
          subtitle: `${mod.shortDescription}`,
          kind: 'module',
          moduleId: mod.id,
          route: mod.route,
        });
      }
    }
  }

  if (isModuleAllowed('dijital-kutuphanem')) {
    for (const book of data.books) {
      if (book.isArchived) continue;
      if (
        !q ||
        book.title.toLocaleLowerCase('tr-TR').includes(q) ||
        book.author.toLocaleLowerCase('tr-TR').includes(q) ||
        book.category.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        results.push({
          id: book.id,
          title: book.title,
          subtitle: `${book.author} · ${book.category}`,
          kind: 'book',
          moduleId: 'dijital-kutuphanem',
          category: book.category,
          date: book.updatedAt.slice(0, 10),
          route: `/modul/dijital-kutuphanem?bookId=${encodeURIComponent(book.id)}`,
          isDemo: book.isDemo,
        });
      }
    }
  }

  if (isModuleAllowed('alinti-defterim')) {
    for (const quote of data.quotes) {
      if (quote.isArchived) continue;
      if (
        !q ||
        quote.text.toLocaleLowerCase('tr-TR').includes(q) ||
        quote.author.toLocaleLowerCase('tr-TR').includes(q) ||
        quote.sourceTitle.toLocaleLowerCase('tr-TR').includes(q) ||
        quote.tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(q))
      ) {
        results.push({
          id: quote.id,
          title: quote.text.length > 76 ? `${quote.text.slice(0, 76)}…` : quote.text,
          subtitle: `${quote.author} · ${quote.sourceTitle}`,
          kind: 'quote',
          moduleId: 'alinti-defterim',
          category: quote.category ?? 'Alıntı',
          tags: quote.tags,
          date: quote.updatedAt.slice(0, 10),
          route: `/modul/alinti-defterim?quoteId=${encodeURIComponent(quote.id)}`,
          isDemo: quote.isDemo,
        });
      }
    }
  }

  if (isModuleAllowed('zihin-atlasi')) {
    for (const node of data.knowledgeNodes) {
      if (
        !q ||
        node.title.toLocaleLowerCase('tr-TR').includes(q) ||
        node.summary.toLocaleLowerCase('tr-TR').includes(q) ||
        node.tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(q))
      ) {
        results.push({
          id: node.id,
          title: node.title,
          subtitle: `Zihin Atlası (${node.nodeType}) · ${node.summary.slice(0, 60)}`,
          kind: 'knowledge_node',
          moduleId: 'zihin-atlasi',
          tags: node.tags,
          date: node.updatedAt.slice(0, 10),
          route: `/modul/zihin-atlasi?nodeId=${encodeURIComponent(node.id)}`,
          isDemo: node.isDemo,
        });
      }
    }
  }

  for (const rec of data.moduleRecords ?? []) {
    if (rec.isArchived) continue;
    if (!isModuleAllowed(rec.moduleId)) continue;
    // Hatıralarım / private records marked hidden from search stay excluded
    const payloadObj = rec.payload as Record<string, unknown>;
    if (payloadObj?.hideFromGlobalSearch === true) continue;
    if (rec.privacyDomain !== 'genel' && !allowPrivate) continue;

    const modName = getModuleById(rec.moduleId)?.name ?? rec.moduleId;
    const textBlob = `${rec.title} ${rec.subtitle ?? ''} ${rec.category} ${rec.tags.join(' ')}`.toLocaleLowerCase('tr-TR');
    if (!q || textBlob.includes(q)) {
      results.push({
        id: rec.id,
        title: rec.title,
        subtitle: `${modName} · ${rec.subtitle || rec.category}`,
        kind: 'record',
        moduleId: rec.moduleId,
        category: rec.category,
        tags: rec.tags,
        date: rec.date ?? rec.updatedAt.slice(0, 10),
        route: `/modul/${rec.moduleId}?recordId=${encodeURIComponent(rec.id)}`,
        isDemo: rec.isDemo,
      });
    }
  }

  for (const note of data.quickNotes) {
    if (
      !q ||
      note.title.toLocaleLowerCase('tr-TR').includes(q) ||
      note.content.toLocaleLowerCase('tr-TR').includes(q)
    ) {
      results.push({
        id: note.id,
        title: note.title,
        subtitle: `Hızlı Not · ${note.content.slice(0, 65)}`,
        kind: 'quick_note',
        moduleId: 'idrak',
        tags: note.tags,
        date: note.updatedAt.slice(0, 10),
        route: '/',
        isDemo: note.isDemo,
      });
    }
  }

  return results
    .filter((item) => {
      if (filters.moduleId && filters.moduleId !== 'all' && item.moduleId !== filters.moduleId) {
        return false;
      }
      if (filters.kind && filters.kind !== 'all' && item.kind !== filters.kind) {
        return false;
      }
      if (
        filters.category &&
        !(item.category ?? '').toLocaleLowerCase('tr-TR').includes(filters.category.toLocaleLowerCase('tr-TR'))
      ) {
        return false;
      }
      if (
        filters.tag &&
        !(item.tags ?? []).some((t) =>
          t.toLocaleLowerCase('tr-TR').includes(filters.tag!.toLocaleLowerCase('tr-TR'))
        )
      ) {
        return false;
      }
      if (filters.dateFrom && item.date && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date && item.date > filters.dateTo) return false;
      return true;
    })
    .slice(0, 40);
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
      route: `/modul/${rec.moduleId}?recordId=${encodeURIComponent(rec.id)}`,
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
