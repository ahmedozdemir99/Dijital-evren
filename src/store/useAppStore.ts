import type { ExternalImport } from '../core/services/externalImports';
import { create } from 'zustand';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  ecosystemRepository,
  activeSnapshot,
} from '../core/repositories/ecosystemRepository';
import { MODULES } from '../core/registry/modules';
import { generateId, isSafeDataUrl } from '../core/services/integrationService';
import type {
  ActivityLog,
  AttachmentFile,
  Book,
  BookStatus,
  CollectionItemRef,
  EntityRelation,
  ExportBundle,
  ExternalAppConfig,
  KnowledgeNode,
  KnowledgeNodeType,
  ModuleRecord,
  ModuleRuntimeSetting,
  NotificationItem,
  PrivacyDomain,
  QuickNote,
  Quote,
  RelationType,
  ThematicCollection,
  ThemePreference,
  UserPreferences,
  UserProfile,
} from '../core/types/entities';

interface AppState {
  initialized: boolean;
  loading: boolean;
  error: string | null;

  profile: UserProfile;
  preferences: UserPreferences;
  moduleSettings: ModuleRuntimeSetting[];
  externalApps: ExternalAppConfig[];
  books: Book[];
  quotes: Quote[];
  knowledgeNodes: KnowledgeNode[];
  entityRelations: EntityRelation[];
  retiredEntityIds: ReadonlySet<string>;
  quickNotes: QuickNote[];
  moduleRecords: ModuleRecord[];
  collections: ThematicCollection[];
  attachments: AttachmentFile[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];

  searchOpen: boolean;
  aiDrawerOpen: boolean;

  setSearchOpen: (open: boolean) => void;
  setAiDrawerOpen: (open: boolean) => void;
  init: () => Promise<void>;
  refreshAll: () => Promise<void>;

  recordModuleOpen: (moduleId: string) => Promise<void>;
  toggleModuleEnabled: (moduleId: string) => Promise<void>;
  toggleModuleFavorite: (moduleId: string) => Promise<void>;
  reorderModule: (moduleId: string, direction: -1 | 1) => Promise<void>;
  updateModuleCustomSetting: (
    moduleId: string,
    patch: Record<string, string | number | boolean>
  ) => Promise<void>;

  setTheme: (theme: ThemePreference) => Promise<void>;
  toggleSidebarCollapsed: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;

  addBook: (input: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Book>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;

  addQuote: (input: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quote>;
  updateQuote: (id: string, patch: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;

  addKnowledgeNode: (
    input: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<KnowledgeNode>;
  updateKnowledgeNode: (id: string, patch: Partial<KnowledgeNode>) => Promise<void>;
  deleteKnowledgeNode: (id: string) => Promise<void>;
  linkEntities: (input: {
    fromModule: string;
    fromEntityId: string;
    fromEntityType: string;
    fromLabel: string;
    toModule: string;
    toEntityId: string;
    toEntityType: string;
    toLabel: string;
    relationType: RelationType;
    note?: string;
  }) => Promise<EntityRelation>;
  deleteRelation: (relationId: string) => Promise<void>;

  ensureEntityNode: (params: {
    title: string;
    nodeType: KnowledgeNodeType;
    summary: string;
    sourceModule: string;
    sourceEntityId: string;
    tags?: string[];
  }) => Promise<KnowledgeNode>;
  linkQuoteToConcept: (params: {
    quote: Quote;
    conceptNodeId?: string;
    newConceptTitle?: string;
    newConceptSummary?: string;
    relationType?: RelationType;
  }) => Promise<{ conceptNode: KnowledgeNode; relation: EntityRelation }>;

  // Universal Module Records (used by all 27+ domain modules)
  addModuleRecord: <T = Record<string, unknown>>(
    input: Omit<ModuleRecord<T>, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<ModuleRecord<T>>;
  updateModuleRecord: <T = Record<string, unknown>>(
    id: string,
    patch: Partial<ModuleRecord<T>>
  ) => Promise<void>;
  deleteModuleRecord: (id: string) => Promise<void>;
  bulkUpdateModuleRecords: (
    ids: string[],
    action: 'archive' | 'unarchive' | 'favorite' | 'delete'
  ) => Promise<void>;

  // Collections (Section 16)
  addCollection: (title: string, description: string, color: string) => Promise<ThematicCollection>;
  deleteCollection: (id: string) => Promise<void>;
  addItemToCollection: (collectionId: string, item: Omit<CollectionItemRef, 'addedAt'>) => Promise<void>;
  removeItemFromCollection: (collectionId: string, entityId: string) => Promise<void>;

  // File & Media Center (Section 17)
  addAttachment: (params: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    dataUrl: string;
    privacyDomain: PrivacyDomain;
    initialRef?: { moduleId: string; entityId: string; label: string };
  }) => Promise<AttachmentFile>;
  linkAttachmentToRef: (
    attachmentId: string,
    ref: { moduleId: string; entityId: string; label: string }
  ) => Promise<void>;
  deleteAttachment: (id: string) => Promise<void>;

  addQuickNote: (title: string, content: string, tags?: string[]) => Promise<QuickNote>;
  deleteQuickNote: (id: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  updateExternalApp: (app: ExternalAppConfig) => Promise<void>;
  importBooksBulk: (items: Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<number>;

  exportBundle: (scope?: 'full' | string) => Promise<ExportBundle>;
  importExternal: (data: ExternalImport) => Promise<number>;
  mergeCloudBackup: (bundle: ExportBundle) => Promise<void>;
  importBundle: (bundle: ExportBundle, mode?: 'replace' | 'merge') => Promise<void>;
  clearDemoData: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

async function appendActivity(
  moduleId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string
): Promise<ActivityLog> {
  const log: ActivityLog = {
    id: generateId('act'),
    moduleId,
    action,
    entityType,
    entityId,
    summary,
    createdAt: new Date().toISOString(),
  };
  await ecosystemRepository.saveActivityLog(log);
  return log;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: true,
  error: null,

  profile: DEFAULT_PROFILE,
  preferences: DEFAULT_PREFERENCES,
  moduleSettings: [],
  externalApps: [],
  books: [],
  quotes: [],
  knowledgeNodes: [],
  entityRelations: [],
  retiredEntityIds: new Set(),
  quickNotes: [],
  moduleRecords: [],
  collections: [],
  attachments: [],
  activityLogs: [],
  notifications: [],

  searchOpen: false,
  aiDrawerOpen: false,

  setSearchOpen: (open) => set({ searchOpen: open }),
  setAiDrawerOpen: (open) => set({ aiDrawerOpen: open }),

  init: async () => {
    try {
      set({ loading: true, error: null });
      const snap = await ecosystemRepository.initialize();
      set({
        ...activeSnapshot(snap),
        initialized: true,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Veri katmanı başlatılamadı.',
        loading: false,
        initialized: true,
      });
    }
  },

  refreshAll: async () => {
    const snap = await ecosystemRepository.loadAll();
    set(activeSnapshot(snap));
  },

  recordModuleOpen: async (moduleId) => {
    const existing = get().moduleSettings.find((s) => s.moduleId === moduleId);
    const updated: ModuleRuntimeSetting = {
      moduleId,
      enabled: existing?.enabled ?? true,
      isFavorite: existing?.isFavorite ?? false,
      sortOrder: existing?.sortOrder,
      customSettings: existing?.customSettings ?? {},
      lastOpenedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveModuleSetting(updated);
    set((state) => ({
      moduleSettings: state.moduleSettings.some((s) => s.moduleId === moduleId)
        ? state.moduleSettings.map((s) => (s.moduleId === moduleId ? updated : s))
        : [...state.moduleSettings, updated],
    }));
  },

  toggleModuleEnabled: async (moduleId) => {
    const existing = get().moduleSettings.find((s) => s.moduleId === moduleId);
    const updated: ModuleRuntimeSetting = {
      ...existing,
      moduleId,
      enabled: !(existing?.enabled ?? true),
      isFavorite: existing?.isFavorite ?? false,
    };
    await ecosystemRepository.saveModuleSetting(updated);
    const modName = MODULES.find((m) => m.id === moduleId)?.name ?? moduleId;
    const log = await appendActivity(
      moduleId,
      updated.enabled ? 'modul_etkinlestirildi' : 'modul_devre_disi',
      'module',
      moduleId,
      `${modName} modülü ${updated.enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`
    );
    set((state) => ({
      moduleSettings: state.moduleSettings.map((s) => (s.moduleId === moduleId ? updated : s)),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  toggleModuleFavorite: async (moduleId) => {
    const existing = get().moduleSettings.find((s) => s.moduleId === moduleId);
    const updated: ModuleRuntimeSetting = {
      ...existing,
      moduleId,
      enabled: existing?.enabled ?? true,
      isFavorite: !(existing?.isFavorite ?? false),
    };
    await ecosystemRepository.saveModuleSetting(updated);
    set((state) => ({
      moduleSettings: state.moduleSettings.map((s) => (s.moduleId === moduleId ? updated : s)),
    }));
  },

  reorderModule: async (moduleId, direction) => {
    const settings = get().moduleSettings;
    const ordered = [...MODULES].sort((a, b) => {
      const sa = settings.find((s) => s.moduleId === a.id);
      const sb = settings.find((s) => s.moduleId === b.id);
      return (sa?.sortOrder ?? 999) - (sb?.sortOrder ?? 999);
    });
    const idx = ordered.findIndex((m) => m.id === moduleId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[idx], swapped[targetIdx]] = [swapped[targetIdx], swapped[idx]];

    const updatedSettings: ModuleRuntimeSetting[] = swapped.map((mod, orderIdx) => {
      const existing = settings.find((s) => s.moduleId === mod.id);
      return {
        moduleId: mod.id,
        enabled: existing?.enabled ?? true,
        isFavorite: existing?.isFavorite ?? false,
        lastOpenedAt: existing?.lastOpenedAt,
        customSettings: existing?.customSettings ?? {},
        sortOrder: orderIdx + 1,
      };
    });

    await Promise.all(updatedSettings.map((s) => ecosystemRepository.saveModuleSetting(s)));
    set({ moduleSettings: updatedSettings });
  },

  updateModuleCustomSetting: async (moduleId, patch) => {
    const existing = get().moduleSettings.find((s) => s.moduleId === moduleId);
    const updated: ModuleRuntimeSetting = {
      ...existing,
      moduleId,
      enabled: existing?.enabled ?? true,
      isFavorite: existing?.isFavorite ?? false,
      customSettings: { ...(existing?.customSettings ?? {}), ...patch },
    };
    await ecosystemRepository.saveModuleSetting(updated);
    set((state) => ({
      moduleSettings: state.moduleSettings.map((s) => (s.moduleId === moduleId ? updated : s)),
    }));
  },

  setTheme: async (theme) => {
    const prefs: UserPreferences = {
      ...get().preferences,
      theme,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.savePreferences(prefs);
    set({ preferences: prefs });
  },

  toggleSidebarCollapsed: async () => {
    const prefs: UserPreferences = {
      ...get().preferences,
      sidebarCollapsed: !get().preferences.sidebarCollapsed,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.savePreferences(prefs);
    set({ preferences: prefs });
  },

  updateProfile: async (patch) => {
    const next: UserProfile = {
      ...get().profile,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveProfile(next);
    set({ profile: next });
  },

  updatePreferences: async (patch) => {
    const next: UserPreferences = {
      ...get().preferences,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.savePreferences(next);
    set({ preferences: next });
  },

  addBook: async (input) => {
    const now = new Date().toISOString();
    const book: Book = {
      ...input,
      id: generateId('book'),
      isDemo: input.isDemo ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveBook(book);
    const log = await appendActivity(
      'dijital-kutuphanem',
      'kitap_eklendi',
      'book',
      book.id,
      `"${book.title}" (${book.author}) kütüphaneye eklendi`
    );
    set((state) => ({
      books: [book, ...state.books],
      activityLogs: [log, ...state.activityLogs],
    }));
    return book;
  },

  updateBook: async (id, patch) => {
    const current = get().books.find((b) => b.id === id);
    if (!current) return;
    const nextStatus: BookStatus =
      patch.status ??
      (patch.currentPage !== undefined && patch.currentPage >= current.totalPages
        ? 'okundu'
        : current.status);
    const updated: Book = {
      ...current,
      ...patch,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveBook(updated);
    const log = await appendActivity(
      'dijital-kutuphanem',
      'kitap_guncellendi',
      'book',
      updated.id,
      `"${updated.title}" güncellendi (${updated.currentPage}/${updated.totalPages} s.)`
    );
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? updated : b)),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  deleteBook: async (id) => {
    const target = get().books.find((b) => b.id === id);
    await ecosystemRepository.deleteBook(id);
    const affectedQuotes = get().quotes.filter((q) => q.bookId === id);
    for (const q of affectedQuotes) {
      await ecosystemRepository.saveQuote({
        ...q,
        bookId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    const orphanRelations = get().entityRelations.filter(
      (r) => r.fromEntityId === id || r.toEntityId === id
    );
    for (const r of orphanRelations) {
      await ecosystemRepository.deleteRelation(r.id);
    }
    const orphanNodes = get().knowledgeNodes.filter((n) => n.sourceEntityId === id);
    for (const n of orphanNodes) {
      await ecosystemRepository.saveKnowledgeNode({
        ...n,
        sourceEntityId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    const updatedCols = get().collections.filter((c) => c.items.some((i) => i.entityId === id));
    for (const col of updatedCols) {
      await ecosystemRepository.saveCollection({
        ...col,
        items: col.items.filter((i) => i.entityId !== id),
        updatedAt: new Date().toISOString(),
      });
    }
    const updatedAtts = get().attachments.filter((a) => a.linkedRefs.some((r) => r.entityId === id));
    for (const att of updatedAtts) {
      await ecosystemRepository.saveAttachment({
        ...att,
        linkedRefs: att.linkedRefs.filter((r) => r.entityId !== id),
      });
    }

    const log = await appendActivity(
      'dijital-kutuphanem',
      'kitap_silindi',
      'book',
      id,
      `"${target?.title ?? id}" silindi; ilişkili bağlantılar temizlendi`
    );

    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
      quotes: state.quotes.map((q) => (q.bookId === id ? { ...q, bookId: undefined } : q)),
      entityRelations: state.entityRelations.filter(
        (r) => r.fromEntityId !== id && r.toEntityId !== id
      ),
      knowledgeNodes: state.knowledgeNodes.map((n) =>
        n.sourceEntityId === id ? { ...n, sourceEntityId: undefined } : n
      ),
      collections: state.collections.map((c) =>
        c.items.some((i) => i.entityId === id)
          ? { ...c, items: c.items.filter((i) => i.entityId !== id) }
          : c
      ),
      attachments: state.attachments.map((a) =>
        a.linkedRefs.some((r) => r.entityId === id)
          ? { ...a, linkedRefs: a.linkedRefs.filter((r) => r.entityId !== id) }
          : a
      ),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  addQuote: async (input) => {
    const now = new Date().toISOString();
    const quote: Quote = {
      ...input,
      id: generateId('quote'),
      isDemo: input.isDemo ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveQuote(quote);

    const newRelations: EntityRelation[] = [];
    const targetEntityId = quote.bookId ?? quote.sourceEntityId;
    const targetModule = quote.bookId ? 'dijital-kutuphanem' : quote.sourceModule;
    if (targetEntityId && targetModule) {
      const rel: EntityRelation = {
        id: generateId('rel'),
        fromModule: 'alinti-defterim',
        fromEntityId: quote.id,
        fromEntityType: 'quote',
        fromLabel: quote.text.slice(0, 52) + (quote.text.length > 52 ? '…' : ''),
        toModule: targetModule,
        toEntityId: targetEntityId,
        toEntityType: quote.bookId ? 'book' : 'record',
        toLabel: quote.sourceTitle,
        relationType: 'kaynaklidir',
        note: quote.pageNumber ? `Sayfa ${quote.pageNumber}` : undefined,
        createdAt: now,
      };
      await ecosystemRepository.saveRelation(rel);
      newRelations.push(rel);
    }

    const log = await appendActivity(
      'alinti-defterim',
      'alinti_eklendi',
      'quote',
      quote.id,
      `"${quote.sourceTitle}" kaynağından yeni alıntı kaydedildi`
    );

    set((state) => ({
      quotes: [quote, ...state.quotes],
      entityRelations: [...newRelations, ...state.entityRelations],
      activityLogs: [log, ...state.activityLogs],
    }));
    return quote;
  },

  updateQuote: async (id, patch) => {
    const current = get().quotes.find((q) => q.id === id);
    if (!current) return;
    const updated: Quote = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveQuote(updated);
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? updated : q)),
    }));
  },

  deleteQuote: async (id) => {
    await ecosystemRepository.deleteQuote(id);
    const orphanRelations = get().entityRelations.filter(
      (r) => r.fromEntityId === id || r.toEntityId === id
    );
    for (const r of orphanRelations) {
      await ecosystemRepository.deleteRelation(r.id);
    }
    const updatedCols = get().collections.filter((c) => c.items.some((i) => i.entityId === id));
    for (const col of updatedCols) {
      await ecosystemRepository.saveCollection({
        ...col,
        items: col.items.filter((i) => i.entityId !== id),
        updatedAt: new Date().toISOString(),
      });
    }
    const updatedAtts = get().attachments.filter((a) => a.linkedRefs.some((r) => r.entityId === id));
    for (const att of updatedAtts) {
      await ecosystemRepository.saveAttachment({
        ...att,
        linkedRefs: att.linkedRefs.filter((r) => r.entityId !== id),
      });
    }
    const log = await appendActivity(
      'alinti-defterim',
      'alinti_silindi',
      'quote',
      id,
      'Alıntı kaydı ve bağlantıları silindi'
    );
    set((state) => ({
      quotes: state.quotes.filter((q) => q.id !== id),
      entityRelations: state.entityRelations.filter(
        (r) => r.fromEntityId !== id && r.toEntityId !== id
      ),
      collections: state.collections.map((c) =>
        c.items.some((i) => i.entityId === id)
          ? { ...c, items: c.items.filter((i) => i.entityId !== id) }
          : c
      ),
      attachments: state.attachments.map((a) =>
        a.linkedRefs.some((r) => r.entityId === id)
          ? { ...a, linkedRefs: a.linkedRefs.filter((r) => r.entityId !== id) }
          : a
      ),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  addKnowledgeNode: async (input) => {
    const now = new Date().toISOString();
    const node: KnowledgeNode = {
      ...input,
      id: generateId('node'),
      isDemo: input.isDemo ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveKnowledgeNode(node);
    const log = await appendActivity(
      'zihin-atlasi',
      'dugum_olusturuldu',
      'knowledge_node',
      node.id,
      `"${node.title}" düğümü Zihin Atlası'na eklendi`
    );
    set((state) => ({
      knowledgeNodes: [node, ...state.knowledgeNodes],
      activityLogs: [log, ...state.activityLogs],
    }));
    return node;
  },

  updateKnowledgeNode: async (id, patch) => {
    const current = get().knowledgeNodes.find((n) => n.id === id);
    if (!current) return;
    const updated: KnowledgeNode = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveKnowledgeNode(updated);
    set((state) => ({
      knowledgeNodes: state.knowledgeNodes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  deleteKnowledgeNode: async (id) => {
    const target = get().knowledgeNodes.find((n) => n.id === id);
    await ecosystemRepository.deleteKnowledgeNode(id);
    const orphanRelations = get().entityRelations.filter(
      (r) => r.fromEntityId === id || r.toEntityId === id
    );
    for (const r of orphanRelations) {
      await ecosystemRepository.deleteRelation(r.id);
    }
    const log = await appendActivity(
      'zihin-atlasi',
      'dugum_silindi',
      'knowledge_node',
      id,
      `"${target?.title ?? id}" düğümü kaldırıldı`
    );
    set((state) => ({
      knowledgeNodes: state.knowledgeNodes.filter((n) => n.id !== id),
      entityRelations: state.entityRelations.filter(
        (r) => r.fromEntityId !== id && r.toEntityId !== id
      ),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  linkEntities: async (input) => {
    const rel: EntityRelation = {
      ...input,
      id: generateId('rel'),
      createdAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveRelation(rel);
    const log = await appendActivity(
      'zihin-atlasi',
      'baglanti_kuruldu',
      'entity_relation',
      rel.id,
      `Bağlantı kuruldu: ${rel.fromLabel} → ${rel.toLabel}`
    );
    set((state) => ({
      entityRelations: [rel, ...state.entityRelations],
      activityLogs: [log, ...state.activityLogs],
    }));
    return rel;
  },

  deleteRelation: async (relationId) => {
    await ecosystemRepository.deleteRelation(relationId);
    set((state) => ({
      entityRelations: state.entityRelations.filter((r) => r.id !== relationId),
    }));
  },

  ensureEntityNode: async ({ title, nodeType, summary, sourceModule, sourceEntityId, tags = [] }) => {
    const existing = get().knowledgeNodes.find(
      (n) => n.sourceEntityId === sourceEntityId && n.sourceModule === sourceModule
    );
    if (existing) return existing;

    const count = get().knowledgeNodes.length;
    const angle = (count * 137.5 * Math.PI) / 180;
    const radius = 110 + (count % 4) * 45;
    const x = Math.round(340 + Math.cos(angle) * radius);
    const y = Math.round(230 + Math.sin(angle) * radius * 0.72);

    return get().addKnowledgeNode({
      title,
      nodeType,
      summary,
      sourceModule,
      sourceEntityId,
      tags,
      x,
      y,
      isDemo: false,
    });
  },

  linkQuoteToConcept: async ({
    quote,
    conceptNodeId,
    newConceptTitle,
    newConceptSummary,
    relationType = 'kavramlastirir',
  }) => {
    await get().ensureEntityNode({
      title: quote.text.length > 48 ? `${quote.text.slice(0, 48)}…` : quote.text,
      nodeType: 'alinti',
      summary: `${quote.sourceTitle}${quote.pageNumber ? `, s. ${quote.pageNumber}` : ''} · Alıntı Defterim`,
      sourceModule: 'alinti-defterim',
      sourceEntityId: quote.id,
      tags: quote.tags,
    });

    if (quote.bookId) {
      const book = get().books.find((b) => b.id === quote.bookId);
      if (book) {
        await get().ensureEntityNode({
          title: book.title,
          nodeType: 'kitap',
          summary: `${book.author} · Dijital Kütüphanem`,
          sourceModule: 'dijital-kutuphanem',
          sourceEntityId: book.id,
          tags: [book.category],
        });
      }
    }

    let conceptNode = conceptNodeId
      ? get().knowledgeNodes.find((n) => n.id === conceptNodeId)
      : undefined;

    if (!conceptNode) {
      const count = get().knowledgeNodes.length;
      conceptNode = await get().addKnowledgeNode({
        title: newConceptTitle?.trim() || 'Yeni Kavram',
        nodeType: 'kavram',
        summary:
          newConceptSummary?.trim() ||
          `"${quote.sourceTitle}" alıntısından türetilen kavram düğümü.`,
        sourceModule: 'zihin-atlasi',
        tags: quote.tags,
        x: Math.round(260 + ((count * 97) % 280)),
        y: Math.round(120 + ((count * 71) % 210)),
        isDemo: false,
      });
    }

    const relation = await get().linkEntities({
      fromModule: 'alinti-defterim',
      fromEntityId: quote.id,
      fromEntityType: 'quote',
      fromLabel: quote.text.length > 52 ? `${quote.text.slice(0, 52)}…` : quote.text,
      toModule: 'zihin-atlasi',
      toEntityId: conceptNode.id,
      toEntityType: 'knowledge_node',
      toLabel: conceptNode.title,
      relationType,
      note: `${quote.sourceTitle} kaynağından kavram bağlantısı`,
    });

    return { conceptNode, relation };
  },

  addModuleRecord: async <T = Record<string, unknown>>(
    input: Omit<ModuleRecord<T>, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const record: ModuleRecord<T> = {
      ...input,
      id: generateId('rec'),
      isDemo: input.isDemo ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveModuleRecord(record as ModuleRecord);

    const newRelations: EntityRelation[] = [];
    if (record.sourceModule && record.sourceEntityId) {
      const rel: EntityRelation = {
        id: generateId('rel'),
        fromModule: record.moduleId,
        fromEntityId: record.id,
        fromEntityType: record.entityType,
        fromLabel: record.title,
        toModule: record.sourceModule,
        toEntityId: record.sourceEntityId,
        toEntityType: 'source',
        toLabel: record.sourceLabel ?? record.sourceEntityId,
        relationType: 'turetilmistir',
        createdAt: now,
      };
      await ecosystemRepository.saveRelation(rel);
      newRelations.push(rel);
    }

    const modName = MODULES.find((m) => m.id === record.moduleId)?.name ?? record.moduleId;
    const log = await appendActivity(
      record.moduleId,
      'kayit_eklendi',
      record.entityType,
      record.id,
      `${modName}: "${record.title}" eklendi`
    );

    set((state) => ({
      moduleRecords: [record as ModuleRecord, ...state.moduleRecords],
      entityRelations: [...newRelations, ...state.entityRelations],
      activityLogs: [log, ...state.activityLogs],
    }));

    return record;
  },

  updateModuleRecord: async <T = Record<string, unknown>>(
    id: string,
    patch: Partial<ModuleRecord<T>>
  ) => {
    const current = get().moduleRecords.find((r) => r.id === id);
    if (!current) return;
    const updated: ModuleRecord = {
      ...current,
      ...(patch as Partial<ModuleRecord>),
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveModuleRecord(updated);
    const modName = MODULES.find((m) => m.id === updated.moduleId)?.name ?? updated.moduleId;
    const log = await appendActivity(
      updated.moduleId,
      'kayit_guncellendi',
      updated.entityType,
      updated.id,
      `${modName}: "${updated.title}" güncellendi`
    );
    set((state) => ({
      moduleRecords: state.moduleRecords.map((r) => (r.id === id ? updated : r)),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  deleteModuleRecord: async (id) => {
    const target = get().moduleRecords.find((r) => r.id === id);
    await ecosystemRepository.deleteModuleRecord(id);
    const orphans = get().entityRelations.filter(
      (r) => r.fromEntityId === id || r.toEntityId === id
    );
    for (const rel of orphans) {
      await ecosystemRepository.deleteRelation(rel.id);
    }
    const updatedCols = get().collections.filter((c) => c.items.some((i) => i.entityId === id));
    for (const col of updatedCols) {
      await ecosystemRepository.saveCollection({
        ...col,
        items: col.items.filter((i) => i.entityId !== id),
        updatedAt: new Date().toISOString(),
      });
    }
    const updatedAtts = get().attachments.filter((a) => a.linkedRefs.some((r) => r.entityId === id));
    for (const att of updatedAtts) {
      await ecosystemRepository.saveAttachment({
        ...att,
        linkedRefs: att.linkedRefs.filter((r) => r.entityId !== id),
      });
    }
    const log = await appendActivity(
      target?.moduleId ?? 'idrak',
      'kayit_silindi',
      target?.entityType ?? 'record',
      id,
      `"${target?.title ?? id}" silindi; ilişkili bağlantılar temizlendi`
    );
    set((state) => ({
      moduleRecords: state.moduleRecords.filter((r) => r.id !== id),
      entityRelations: state.entityRelations.filter(
        (r) => r.fromEntityId !== id && r.toEntityId !== id
      ),
      collections: state.collections.map((c) =>
        c.items.some((i) => i.entityId === id)
          ? { ...c, items: c.items.filter((i) => i.entityId !== id) }
          : c
      ),
      attachments: state.attachments.map((a) =>
        a.linkedRefs.some((r) => r.entityId === id)
          ? { ...a, linkedRefs: a.linkedRefs.filter((r) => r.entityId !== id) }
          : a
      ),
      activityLogs: [log, ...state.activityLogs],
    }));
  },

  bulkUpdateModuleRecords: async (ids, action) => {
    if (ids.length === 0) return;
    if (action === 'delete') {
      for (const id of ids) {
        await get().deleteModuleRecord(id);
      }
      return;
    }
    for (const id of ids) {
      if (action === 'archive') await get().updateModuleRecord(id, { isArchived: true });
      if (action === 'unarchive') await get().updateModuleRecord(id, { isArchived: false });
      if (action === 'favorite') await get().updateModuleRecord(id, { isFavorite: true });
    }
  },

  addCollection: async (title, description, color) => {
    const now = new Date().toISOString();
    const col: ThematicCollection = {
      id: generateId('col'),
      title: title.trim(),
      description: description.trim(),
      color,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveCollection(col);
    set((state) => ({ collections: [col, ...state.collections] }));
    return col;
  },

  deleteCollection: async (id) => {
    await ecosystemRepository.deleteCollection(id);
    set((state) => ({ collections: state.collections.filter((c) => c.id !== id) }));
  },

  addItemToCollection: async (collectionId, item) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    if (col.items.some((i) => i.entityId === item.entityId)) return;
    const updated: ThematicCollection = {
      ...col,
      items: [...col.items, { ...item, addedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveCollection(updated);
    set((state) => ({
      collections: state.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  removeItemFromCollection: async (collectionId, entityId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated: ThematicCollection = {
      ...col,
      items: col.items.filter((i) => i.entityId !== entityId),
      updatedAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveCollection(updated);
    set((state) => ({
      collections: state.collections.map((c) => (c.id === collectionId ? updated : c)),
    }));
  },

  addAttachment: async ({ name, mimeType, sizeBytes, dataUrl, privacyDomain, initialRef }) => {
    if (!isSafeDataUrl(dataUrl)) {
      throw new Error(
        'Desteklenmeyen veya güvenli olmayan dosya türü. Yalnızca PNG, JPG, WebP, GIF, PDF, TXT, CSV, JSON veya ses dosyaları eklenebilir.'
      );
    }
    const file: AttachmentFile = {
      id: generateId('file'),
      name,
      mimeType,
      sizeBytes,
      dataUrl,
      privacyDomain,
      linkedRefs: initialRef ? [initialRef] : [],
      createdAt: new Date().toISOString(),
    };
    await ecosystemRepository.saveAttachment(file);
    set((state) => ({ attachments: [file, ...state.attachments] }));
    return file;
  },

  linkAttachmentToRef: async (attachmentId, ref) => {
    const file = get().attachments.find((f) => f.id === attachmentId);
    if (!file) return;
    if (file.linkedRefs.some((r) => r.entityId === ref.entityId)) return;
    const updated: AttachmentFile = {
      ...file,
      linkedRefs: [...file.linkedRefs, ref],
    };
    await ecosystemRepository.saveAttachment(updated);
    set((state) => ({
      attachments: state.attachments.map((f) => (f.id === attachmentId ? updated : f)),
    }));
  },

  deleteAttachment: async (id) => {
    await ecosystemRepository.deleteAttachment(id);
    set((state) => ({ attachments: state.attachments.filter((f) => f.id !== id) }));
  },

  addQuickNote: async (title, content, tags = []) => {
    const now = new Date().toISOString();
    const note: QuickNote = {
      id: generateId('note'),
      title: title.trim(),
      content: content.trim(),
      tags,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    await ecosystemRepository.saveQuickNote(note);
    const log = await appendActivity(
      'idrak',
      'hizli_not_eklendi',
      'quick_note',
      note.id,
      `Hızlı not kaydedildi: "${note.title}"`
    );
    set((state) => ({
      quickNotes: [note, ...state.quickNotes],
      activityLogs: [log, ...state.activityLogs],
    }));
    return note;
  },

  deleteQuickNote: async (id) => {
    await ecosystemRepository.deleteQuickNote(id);
    set((state) => ({
      quickNotes: state.quickNotes.filter((n) => n.id !== id),
    }));
  },

  markNotificationRead: async (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target) return;
    const updated = { ...target, read: true };
    await ecosystemRepository.saveNotification(updated);
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
    }));
  },

  markAllNotificationsRead: async () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    await Promise.all(updated.map((n) => ecosystemRepository.saveNotification(n)));
    set({ notifications: updated });
  },

  updateExternalApp: async (app) => {
    await ecosystemRepository.saveExternalApp(app);
    set((state) => ({
      externalApps: state.externalApps.map((a) => (a.appId === app.appId ? app : a)),
    }));
  },

  importBooksBulk: async (items) => {
    const now = new Date().toISOString();
    const books: Book[] = items.map((item) => ({
      ...item,
      id: generateId('book'),
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    }));
    for (const b of books) {
      await ecosystemRepository.saveBook(b);
    }
    const log = await appendActivity(
      'dijital-kutuphanem',
      'toplu_ice_aktarma',
      'book',
      'bulk',
      `${books.length} kitap içe aktarıldı`
    );
    set((state) => ({
      books: [...books, ...state.books],
      activityLogs: [log, ...state.activityLogs],
    }));
    return books.length;
  },

  exportBundle: (scope = 'full') => ecosystemRepository.exportAll(scope),

  importExternal: async (data) => {
    const count = await ecosystemRepository.importExternal(data);
    set(activeSnapshot(await ecosystemRepository.loadAll()));
    return count;
  },

  mergeCloudBackup: async (bundle) => {
    await ecosystemRepository.mergeCloudBackup(bundle);
    set(activeSnapshot(await ecosystemRepository.loadAll()));
  },

  importBundle: async (bundle, mode = 'replace') => {
    await ecosystemRepository.importBundle(bundle, mode);
    const snap = await ecosystemRepository.loadAll();
    set(activeSnapshot(snap));
  },

  clearDemoData: async () => {
    await ecosystemRepository.clearDemoData();
    const snap = await ecosystemRepository.loadAll();
    set(activeSnapshot(snap));
  },

  resetAllData: async () => {
    await ecosystemRepository.resetAllData();
    const snap = await ecosystemRepository.loadAll();
    set(activeSnapshot(snap));
  },
}));
