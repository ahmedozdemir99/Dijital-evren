export type DomainId = 'zihin' | 'kesif' | 'yasam';

export type CenterId = 'irfan' | 'idrak' | 'kozmos' | 'atolye' | 'tekamul' | 'hayat';

export type ModuleStatus = 'active' | 'in_development';

export type PrivacyDomain = 'genel' | 'kisisel' | 'egitim' | 'ibadet' | 'saglik';

export type ThemePreference = 'dark' | 'light' | 'system';

export type BookStatus = 'okunacak' | 'okunuyor' | 'okundu' | 'beklemede';

export type KnowledgeNodeType = 'kavram' | 'kitap' | 'alinti' | 'siir' | 'olay' | 'dusunce';

export type RelationType =
  | 'kaynaklidir'
  | 'iliskilidir'
  | 'besler'
  | 'kavramlastirir'
  | 'referans_verir'
  | 'icerir'
  | 'turetilmistir';

export type IntegrationMethod =
  | 'none'
  | 'external_link'
  | 'api'
  | 'file_import'
  | 'db_adapter'
  | 'gradual_migration';

export type DashboardWidgetId =
  | 'daily_thought'
  | 'continue_where_left'
  | 'domains_overview'
  | 'quick_capture'
  | 'favorite_and_recent'
  | 'recent_connections'
  | 'activity_summary'
  | 'daily_curated'
  | 'upcoming_calendar';

export interface DomainDefinition {
  id: DomainId;
  romanNumeral: 'I' | 'II' | 'III';
  name: string;
  subtitle: string;
  description: string;
  color: string;
  secondaryColor: string;
  order: number;
}

export interface CenterDefinition {
  id: CenterId;
  domainId: DomainId;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  order: number;
}

export interface ModuleDefinition {
  id: string;
  centerId: CenterId;
  name: string;
  shortDescription: string;
  status: ModuleStatus;
  stage: number;
  privacyDomain: PrivacyDomain;
  isDataOwner?: string;
  feedsInto: string[];
  plannedFeatures: string[];
  helpGuide?: string;
  hasExistingApp?: boolean;
  route: string;
}

export interface ModuleRuntimeSetting {
  moduleId: string;
  enabled: boolean;
  isFavorite: boolean;
  sortOrder?: number;
  lastOpenedAt?: string;
  customSettings?: Record<string, string | number | boolean>;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  publishYear?: string;
  isbn?: string;
  rating?: number;
  notes?: string;
  coverUrl?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  attachmentIds?: string[];
  targetDate?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  bookId?: string;
  sourceModule?: string;
  sourceEntityId?: string;
  sourceTitle: string;
  pageNumber?: string;
  category?: string;
  tags: string[];
  isFavorite: boolean;
  isArchived?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  nodeType: KnowledgeNodeType;
  summary: string;
  sourceModule: string;
  sourceEntityId?: string;
  tags: string[];
  x: number;
  y: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EntityRelation {
  id: string;
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
  isDemo?: boolean;
  createdAt: string;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleRecord<T = unknown> {
  id: string;
  moduleId: string;
  entityType: string;
  title: string;
  subtitle?: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  privacyDomain: PrivacyDomain;
  date?: string; // YYYY-MM-DD for calendar aggregation
  sourceModule?: string;
  sourceEntityId?: string;
  sourceLabel?: string;
  attachmentIds?: string[];
  isDemo?: boolean;
  payload: T;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItemRef {
  moduleId: string;
  entityId: string;
  entityType: string;
  label: string;
  addedAt: string;
}

export interface ThematicCollection {
  id: string;
  title: string;
  description: string;
  color: string;
  items: CollectionItemRef[];
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  privacyDomain: PrivacyDomain;
  linkedRefs: Array<{ moduleId: string; entityId: string; label: string }>;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  moduleId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  moduleId?: string;
  read: boolean;
  createdAt: string;
}

export interface ExternalAppConfig {
  appId: string;
  name: string;
  centerId: CenterId;
  targetModuleId: string;
  method: IntegrationMethod;
  endpointOrUrl: string;
  repoUrl?: string;
  liveUrl?: string;
  apiUrl?: string;
  fieldMapping?: string;
  disabled?: boolean;
  status: 'not_configured' | 'ready_for_import' | 'configured';
  lastSyncAt?: string;
  lastTestAt?: string;
  lastTestMessage?: string;
  errorHistory?: Array<{ timestamp: string; message: string }>;
  notes?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  title: string;
  bio: string;
  interests: string[];
  updatedAt: string;
}

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  label: string;
  visible: boolean;
  order: number;
}

export interface UserPreferences {
  id: string;
  theme: ThemePreference;
  language: 'tr';
  fontScale?: 'normal' | 'large';
  highContrast?: boolean;
  reducedMotion?: boolean;
  calendarFirstDay?: 'monday' | 'sunday';
  sidebarCollapsed: boolean;
  dailyThoughtCustom?: string;
  notificationsEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiPermittedDomains: Record<PrivacyDomain, boolean>;
  crossModuleSharing: {
    allowEducationFromPersonal: boolean;
    allowPersonalFromPrayerSummary: boolean;
    allowPersonalFromHealthSummary: boolean;
    allowSearchInPrivateDomains: boolean;
  };
  dashboardWidgets: DashboardWidgetConfig[];
  updatedAt: string;
}

export interface ExportBundle {
  schemaVersion: number;
  app: 'Dijital Evrenim';
  exportedAt: string;
  scope?: 'full' | string; // 'full' or moduleId
  data: {
    profile: UserProfile;
    preferences: UserPreferences;
    moduleSettings: ModuleRuntimeSetting[];
    externalApps: ExternalAppConfig[];
    books: Book[];
    quotes: Quote[];
    knowledgeNodes: KnowledgeNode[];
    entityRelations: EntityRelation[];
    quickNotes: QuickNote[];
    moduleRecords?: ModuleRecord[];
    collections?: ThematicCollection[];
    attachments?: AttachmentFile[];
    activityLogs: ActivityLog[];
    notifications: NotificationItem[];
  };
}
