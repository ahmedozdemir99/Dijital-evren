import { EXISTING_APPS_LIST, MODULES } from '../registry/modules';
import { isSafeDataUrl, localDateIso } from '../services/integrationService';
import {
  clearStore,
  deleteFromStore,
  getAllFromStore,
  getOneFromStore,
  putInStore,
  putManyInStore,
  STORE_NAMES,
} from '../storage/indexedDb';
import type {
  ActivityLog,
  AttachmentFile,
  Book,
  DashboardWidgetConfig,
  EntityRelation,
  ExportBundle,
  ExternalAppConfig,
  KnowledgeNode,
  ModuleRecord,
  ModuleRuntimeSetting,
  NotificationItem,
  QuickNote,
  Quote,
  ThematicCollection,
  UserPreferences,
  UserProfile,
} from '../types/entities';

export const CURRENT_SCHEMA_VERSION = 3;

export const LEGACY_REMOVED_MODULE_IDS = [
  'hatiralarim',
  'soy-agacim',
  'zeka-pro-ligi',
  'bilge-akademi',
  'deneme-analiz',
  'akilli-bileklik',
] as const;

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'daily_thought', label: 'Günün Düşüncesi', visible: true, order: 1 },
  { id: 'continue_where_left', label: 'Kaldığım Yerden Devam Et', visible: true, order: 2 },
  { id: 'domains_overview', label: 'Üç Ana Alan', visible: true, order: 3 },
  { id: 'quick_capture', label: 'Hızlı Kayıt Araçları', visible: true, order: 4 },
  { id: 'upcoming_calendar', label: 'Ortak Takvim ve Görevler', visible: true, order: 5 },
  { id: 'favorite_and_recent', label: 'Favori ve Son Modüller', visible: true, order: 6 },
  { id: 'recent_connections', label: 'Son Bilgi Bağlantıları', visible: true, order: 7 },
  { id: 'activity_summary', label: 'Haftalık Etkinlik Özeti', visible: true, order: 8 },
  { id: 'daily_curated', label: 'Günün Seçkisi (Kelime, Soru ve Olay)', visible: true, order: 9 },
];

export const DEFAULT_PROFILE: UserProfile = {
  id: 'primary-user',
  fullName: 'Kullanıcı',
  title: 'Eğitimci, Okur ve Araştırmacı',
  bio: 'Edebiyat, tarih, bilim, felsefe ve kişisel gelişim arasında kalıcı anlam bağları kuran kişisel bilgi evreni.',
  interests: ['Edebiyat', 'Felsefe', 'Tarih', 'Matematik', 'Bilim'],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'primary-preferences',
  theme: 'dark',
  language: 'tr',
  fontScale: 'normal',
  highContrast: false,
  reducedMotion: false,
  calendarFirstDay: 'monday',
  sidebarCollapsed: false,
  notificationsEnabled: true,
  aiAssistantEnabled: true,
  aiPermittedDomains: {
    genel: true,
    kisisel: true,
    egitim: false,
    ibadet: false,
    saglik: false,
  },
  crossModuleSharing: {
    allowEducationFromPersonal: true,
    allowPersonalFromPrayerSummary: false,
    allowPersonalFromHealthSummary: false,
    allowSearchInPrivateDomains: true,
  },
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  updatedAt: new Date().toISOString(),
};

export function createDefaultModuleSettings(): ModuleRuntimeSetting[] {
  return MODULES.map((m, idx) => ({
    moduleId: m.id,
    enabled: true,
    sortOrder: idx + 1,
    isFavorite:
      m.id === 'dijital-kutuphanem' ||
      m.id === 'alinti-defterim' ||
      m.id === 'zihin-atlasi' ||
      m.id === 'siir-deryasi' ||
      m.id === 'matematik-laboratuvari',
    lastOpenedAt: m.stage === 1 ? new Date().toISOString() : undefined,
    customSettings: {},
  }));
}

function createDemoSeedData(): {
  books: Book[];
  quotes: Quote[];
  knowledgeNodes: KnowledgeNode[];
  entityRelations: EntityRelation[];
  quickNotes: QuickNote[];
  moduleRecords: ModuleRecord[];
  collections: ThematicCollection[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
} {
  const now = new Date().toISOString();
  const todayStr = localDateIso();
  const book1Id = 'demo-book-tanpinar';
  const book2Id = 'demo-book-ibn-haldun';
  const quote1Id = 'demo-quote-saatleri-ayarlama';
  const node1Id = 'demo-node-zaman-bilinci';
  const node2Id = 'demo-node-book-tanpinar';
  const node3Id = 'demo-node-quote-saatler';

  const books: Book[] = [
    {
      id: book1Id,
      title: 'Saatleri Ayarlama Enstitüsü',
      author: 'Ahmet Hamdi Tanpınar',
      category: 'Türk Edebiyatı',
      status: 'okunuyor',
      totalPages: 382,
      currentPage: 164,
      publishYear: '1961',
      rating: 5,
      notes: 'Modernleşme, zaman algısı ve kurumların ironik dönüşümü üzerine temel metin.',
      isFavorite: true,
      targetDate: todayStr,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: book2Id,
      title: 'Mukaddime (Seçmeler)',
      author: 'İbn Haldun',
      category: 'Tarih ve Sosyoloji',
      status: 'okunacak',
      totalPages: 420,
      currentPage: 0,
      publishYear: '1377',
      notes: 'Umran ilmi, asabiyet ve medeniyet döngüleri için temel başvuru eseri.',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const quotes: Quote[] = [
    {
      id: quote1Id,
      text: 'Saatin kendisi mekân, yürüyüşü zaman, ayarı insandır... Bu da gösterir ki, zaman ve mekân, insanla mevcuttur.',
      author: 'Ahmet Hamdi Tanpınar',
      bookId: book1Id,
      sourceModule: 'dijital-kutuphanem',
      sourceEntityId: book1Id,
      sourceTitle: 'Saatleri Ayarlama Enstitüsü',
      pageNumber: '33',
      category: 'Edebiyat',
      tags: ['zaman', 'insan', 'modernleşme'],
      isFavorite: true,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const knowledgeNodes: KnowledgeNode[] = [
    {
      id: node1Id,
      title: 'Zaman Bilinci ve Modernleşme',
      nodeType: 'kavram',
      summary: 'Ölçülen mekanik zaman ile insanın içsel zamanı arasındaki gerilim ve kültürel dönüşüm.',
      sourceModule: 'zihin-atlasi',
      tags: ['zaman', 'felsefe', 'edebiyat'],
      x: 420,
      y: 160,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: node2Id,
      title: 'Saatleri Ayarlama Enstitüsü',
      nodeType: 'kitap',
      summary: 'Ahmet Hamdi Tanpınar eseri · Dijital Kütüphanem kaydı',
      sourceModule: 'dijital-kutuphanem',
      sourceEntityId: book1Id,
      tags: ['kitap', 'edebiyat'],
      x: 160,
      y: 260,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: node3Id,
      title: 'Zaman ve mekân insanla mevcuttur',
      nodeType: 'alinti',
      summary: 'Saatleri Ayarlama Enstitüsü, s. 33 · Alıntı Defterim kaydı',
      sourceModule: 'alinti-defterim',
      sourceEntityId: quote1Id,
      tags: ['alıntı', 'zaman'],
      x: 290,
      y: 350,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const entityRelations: EntityRelation[] = [
    {
      id: 'demo-rel-1',
      fromModule: 'alinti-defterim',
      fromEntityId: quote1Id,
      fromEntityType: 'quote',
      fromLabel: 'Zaman ve mekân insanla mevcuttur (s. 33)',
      toModule: 'dijital-kutuphanem',
      toEntityId: book1Id,
      toEntityType: 'book',
      toLabel: 'Saatleri Ayarlama Enstitüsü',
      relationType: 'kaynaklidir',
      note: 'Kitaptan çıkarılan alıntı',
      isDemo: true,
      createdAt: now,
    },
    {
      id: 'demo-rel-2',
      fromModule: 'alinti-defterim',
      fromEntityId: quote1Id,
      fromEntityType: 'quote',
      fromLabel: 'Zaman ve mekân insanla mevcuttur (s. 33)',
      toModule: 'zihin-atlasi',
      toEntityId: node1Id,
      toEntityType: 'knowledge_node',
      toLabel: 'Zaman Bilinci ve Modernleşme',
      relationType: 'kavramlastirir',
      note: 'Kavram düğümüne bağlandı',
      isDemo: true,
      createdAt: now,
    },
  ];

  const quickNotes: QuickNote[] = [
    {
      id: 'demo-note-1',
      title: 'Ekosistem Başlangıç Notu',
      content: 'Dijital Evrenim 1–3–6–23 yapısıyla 3 ana alan, 6 merkez ve 23 modülü ortak veri ilişkileriyle birbirine bağlar.',
      tags: ['rehber'],
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const moduleRecords: ModuleRecord[] = [
    {
      id: 'demo-poem-1',
      moduleId: 'siir-deryasi',
      entityType: 'poem',
      title: 'Sessiz Gemi',
      subtitle: 'Yahya Kemal Beyatlı',
      category: 'Klasik Türk Şiiri',
      tags: ['zaman', 'yolculuk', 'hece-aruz'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        kind: 'poem',
        poetName: 'Yahya Kemal Beyatlı',
        era: 'Cumhuriyet Öncesi / Modern Klasik',
        isPersonal: false,
        theme: 'Ayrılık ve Sonsuzluk',
        lines: 'Artık demir almak günü gelmişse zamandan,\nMeçhule giden bir gemi kalkar bu limandan.\nHiç yolcusu yokmuş gibi sessizce alır yol;\nSallanmaz o kalkışta ne mendil ne de bir kol.',
        notes: 'Zaman ve yolculuk imgesi üzerine temel metin.',
        readCount: 1,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-word-1',
      moduleId: 'kelime-muzesi',
      entityType: 'word_entry',
      title: 'Tefekkür',
      subtitle: 'Arapça · f-k-r kökü',
      category: 'Arapça',
      tags: ['düşünce', 'klasik', 'kavram'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        originLanguage: 'Arapça',
        rootForm: 'f-k-r (فكر)',
        etymologyNote: 'Tefe‘ül babından türemiş olup derin ve çok yönlü düşünme anlamı taşır.',
        etymologyVerification: 'dogrulandi',
        sourceRef: 'TDV İslam Ansiklopedisi / Kubbealtı Lügati',
        meaningToday: 'Derin düşünme, bir meselenin iç yüzünü ve sonuçlarını etraflıca değerlendirme.',
        semanticShifts: 'Klasik metinlerde salt zihinsel çıkarımdan ibret ve hikmet odaklı derinleşmeye genişlemiştir.',
        synonyms: ['Düşünce', 'Mülahaza', 'Derinleşme'],
        antonyms: ['Gaflet', 'Yüzeysellik'],
        literaryExample: 'İlim, tefekkür ile birleştiğinde hikmete yol açar.',
        isForgotten: false,
        cognates: ['Fikir', 'Mütefekkir', 'Efkar'],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-1',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: 'Bilgi ve Hikmet Ayrımı',
      subtitle: 'Meşşai Geleneği · Klasik Çağ',
      category: 'Epistemoloji',
      tags: ['bilgi', 'hikmet', 'felsefe'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        kind: 'philosopher',
        school: 'Meşşai Geleneği (Aristoteles & Farabi)',
        era: 'Antik Çağ – İslam Altın Çağı',
        coreThesis: 'Teorik bilginin (episteme / nazarî ilim) erdemli eylem ve toplumsal düzenle bütünleşmesi.',
        socraticQuestions: [
          'Bilmek ile hikmet sahibi olmak arasındaki fark nedir?',
          'Erdem öğretilebilir mi yoksa alışkanlıkla mı kazanılır?',
        ],
        body: 'Aristoteles Nikomakhos\'a Etik\'te teorik bilgelik (sophia) ile pratik bilgeliği (phronesis) ayırırken, Farabi Medinetü\'l-Fazıla\'da nazarî kemalin toplumsal düzenle bütünleşmesini savunur.',
        isFictionalSimulation: false,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-sokrates',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: "Sokratik sorgulama",
      subtitle: "Antik Yunan",
      category: "Bilgi ve erdem",
      tags: ['felsefe', "Bilgi ve erdem"],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {"kind":"philosopher","school":"Bilgi ve erdem","era":"Antik Yunan","coreThesis":"Bir iddianın tanımını ve tutarlılığını sorularla incelemek.","body":"Bir iddianın tanımını ve tutarlılığını sorularla incelemek.\n\nOkuma kaynağı: Platon, Euthyphron ve Sokrates’in Savunması. Sokrates’in kendi yazılı eserleri günümüze ulaşmamıştır.","isFictionalSimulation":false},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-stoacilik',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: "Stoacılık",
      subtitle: "Helenistik ve Roma dönemi",
      category: "Etik",
      tags: ['felsefe', "Etik"],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {"kind":"philosopher","school":"Etik","era":"Helenistik ve Roma dönemi","coreThesis":"Denetimimizde olan yargılar ile denetimimiz dışında kalan olayları ayırmak.","body":"Denetimimizde olan yargılar ile denetimimiz dışında kalan olayları ayırmak.\n\nOkuma kaynağı: Epiktetos, El Kitabı, bölüm 1.","isFictionalSimulation":false},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-ibn-haldun',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: "İbn Haldun ve asabiyet",
      subtitle: "14. yüzyıl",
      category: "Toplum felsefesi",
      tags: ['felsefe', "Toplum felsefesi"],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {"kind":"philosopher","school":"Toplum felsefesi","era":"14. yüzyıl","coreThesis":"Toplumsal dayanışmanın siyasi iktidarın oluşumundaki rolü.","body":"Toplumsal dayanışmanın siyasi iktidarın oluşumundaki rolü.\n\nOkuma kaynağı: İbn Haldun, Mukaddime.","isFictionalSimulation":false},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-kant',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: "Kant ve ödev ahlakı",
      subtitle: "18. yüzyıl",
      category: "Etik",
      tags: ['felsefe', "Etik"],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {"kind":"philosopher","school":"Etik","era":"18. yüzyıl","coreThesis":"Eylemin ilkesinin evrensel yasa olarak istenebilirliğini sorgulamak.","body":"Eylemin ilkesinin evrensel yasa olarak istenebilirliğini sorgulamak.\n\nOkuma kaynağı: Immanuel Kant, Ahlak Metafiziğinin Temellendirilmesi.","isFictionalSimulation":false},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-phil-descartes',
      moduleId: 'felsefe-meclisi',
      entityType: 'philosopher',
      title: "Descartes ve yöntemsel şüphe",
      subtitle: "17. yüzyıl",
      category: "Epistemoloji",
      tags: ['felsefe', "Epistemoloji"],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {"kind":"philosopher","school":"Epistemoloji","era":"17. yüzyıl","coreThesis":"Kesin bilgiye ulaşmak için kuşku duyulabilen inançları yöntemli biçimde sınamak.","body":"Kesin bilgiye ulaşmak için kuşku duyulabilen inançları yöntemli biçimde sınamak.\n\nOkuma kaynağı: René Descartes, Meditasyonlar, I–II.","isFictionalSimulation":false},
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-hist-1',
      moduleId: 'tarih-atlasi',
      entityType: 'event',
      title: 'Beytü\'l-Hikme\'nin Kuruluşu',
      subtitle: '825 · Mezopotamya / Bağdat',
      category: 'Bilim ve Medeniyet Tarihi',
      tags: ['bağdat', 'çeviri', 'bilim'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        kind: 'event',
        year: 825,
        region: 'Mezopotamya / Bağdat',
        modernPlaceName: 'Bağdat (Irak)',
        lat: 33.31,
        lng: 44.36,
        summary: 'Antik Yunan, Hint ve Fars bilimsel-felsefi külliyatının Arapçaya çevrildiği ve özgün matematik-astronomi araştırmalarının yürütüldüğü araştırma kurumu.',
        bibliography: 'İbnü\'n-Nedîm, El-Fihrist; DİA Beytü\'l-Hikme maddesi',
        uncertainty: 'tartismali',
        isFictionalSimulation: false,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-hist-sim-1',
      moduleId: 'tarih-atlasi',
      entityType: 'alt_history_scenario',
      title: 'İpek Yolu ve Bilgi Kurumları (Kurgu Senaryo)',
      subtitle: 'Alternatif Tarih · 825 Sonrası',
      category: 'Alternatif Tarih',
      tags: ['simülasyon', 'kurgu', 'bilim-diplomasisi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'tarih-atlasi',
      sourceEntityId: 'demo-hist-1',
      sourceLabel: 'Beytü\'l-Hikme\'nin Kuruluşu',
      isDemo: true,
      payload: {
        kind: 'alt_history_scenario',
        baseEventTitle: 'Beytü\'l-Hikme\'nin Kuruluşu',
        pivotYear: 825,
        hypothesis: 'Çeviri hareketi Merv, Semerkant ve Kurtuba eşzamanlı şubelerle çok merkezli akademi ağına dönüşseydi bilimsel iletişim nasıl şekillenirdi?',
        isFictionalSimulation: true,
        stability: 68,
        economy: 74,
        stepIndex: 0,
        choicesLog: [],
        branches: [
          {
            label: 'Çok Merkezli Gözlemevi Ağı Kur',
            stabilityDelta: 12,
            economyDelta: -6,
            outcome: 'Bağdat, Semerkant ve Kurtuba arasında eşzamanlı astronomi cetvelleri oluşturulur; standart ölçü birimleri yaygınlaşır.',
          },
          {
            label: 'Ticaret Loncalarıyla Kâğıt Üretimini Teşvik Et',
            stabilityDelta: 4,
            economyDelta: 18,
            outcome: 'Kitap istinsah maliyetleri düşer; bölgesel kütüphaneler hızla büyür ancak siyasal himaye rekabeti artar.',
          },
          {
            label: 'Yalnızca Başkent Merkezli Devam Et',
            stabilityDelta: -8,
            economyDelta: 6,
            outcome: 'Külliyat tek merkezde yoğunlaşır; taşra şehirlerinde bilimsel üretim yavaş kalır.',
          },
        ],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-card-1',
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: 'Tefekkür',
      subtitle: 'Kelime Odası · İlk Tekrar',
      category: 'Kelime ve Kavram',
      tags: ['tefekkür'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: todayStr,
      sourceModule: 'kelime-muzesi',
      sourceEntityId: 'demo-word-1',
      sourceLabel: 'Tefekkür (Kelime Müzesi)',
      isDemo: true,
      payload: {
        palace: 'İrfan Konağı',
        room: 'Kavramlar Salonu',
        front: 'Tefekkür kavramı klasik düşüncede neyi ifade eder?',
        back: 'Bir meselenin iç yüzünü, sebep-sonuç bağlamını ve hikmetini derinlemesine düşünme.',
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr,
        lastScore: null,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-karadeniz-1',
      moduleId: 'karadeniz-asistani',
      entityType: 'karadeniz_spot',
      title: 'Sümela Manastırı ve Altındere Vadisi',
      subtitle: 'Trabzon · Tarihî Mekân',
      category: 'Trabzon',
      tags: ['trabzon', 'maçka', 'tarih'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        province: 'Trabzon',
        spotType: 'Tarihî Mekân',
        lat: 40.6901,
        lng: 39.6584,
        bestSeason: 'İlkbahar – Sonbahar',
        localDish: 'Hamsiköy Sütlacı',
        description: 'Karadağ yamacında yer alan tarihî manastır ve çevresindeki Altındere Vadisi yürüyüş rotası.',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-math-1',
      moduleId: 'matematik-laboratuvari',
      entityType: 'formula_model',
      title: 'Euler Özdeşliği ve Altın Oran',
      subtitle: 'Matematiksel Estetik ve Analiz',
      category: 'Analiz ve Geometri',
      tags: ['euler', 'geometri', 'formül'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        formulaName: 'Euler Özdeşliği (e^{i\pi} + 1 = 0)',
        description: 'Matematiğin beş temel sabitini (0, 1, e, i, pi) tek denklemde birleştiren zarif sentez.',
        parameters: { e: 2.718, pi: 3.1415, i: 'imajiner birim' },
        notes: 'Doğadaki simetri ve spiral formların matematiksel arka planı.',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-science-1',
      moduleId: 'bilim-muzesi',
      entityType: 'invention',
      title: 'İbn el-Heysem ve Optik Deneyleri',
      subtitle: 'Kitabü\'l-Menazır · Karanlık Oda',
      category: 'Fizik ve Optik',
      tags: ['optik', 'fizik', 'bilim-tarihi'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        inventor: 'İbn el-Heysem (Alhazen)',
        century: '11. Yüzyıl',
        discovery: 'Işığın nesnelerden göze yansıdığı teorisi ve karanlık oda (camera obscura) ilkesi.',
        impact: 'Modern optik biliminin ve deneysel metodun temeli.',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-music-1',
      moduleId: 'automusicpro',
      entityType: 'composition',
      title: 'Hicaz Meditasyon Taslağı',
      subtitle: 'Geleneksel Makam Formu',
      category: 'Makam ve Kompozisyon',
      tags: ['hicaz', 'beste', 'müzik'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      isDemo: true,
      payload: {
        bpm: 76,
        scale: 'Hicaz / Minör',
        lyrics: 'Gönül bahçesinde açan saklı çiçek...',
        steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        melodyNotes: ['A4', 'C5', 'D5', 'Eb5', 'D5', 'C5', 'A4', 'G4'],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-world-1',
      moduleId: 'kendi-dunyam',
      entityType: 'world_domain',
      title: 'Hikmet Şehri — Ütopik Tasarım',
      subtitle: 'Mimari, Doğa ve Eğitim Entegrasyonu',
      category: 'Kurgu ve Tasarım',
      tags: ['ütopya', 'mimari', 'kurgu'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'kisisel',
      isDemo: true,
      payload: {
        domainName: 'Hikmet Şehri',
        concept: 'Merkezinde kütüphane ve gözlemevi bulunan, doğayla uyumlu dikey mimari yerleşkesi.',
        governance: 'Bilge heyeti ve halk meclisi ortak yönetimi.',
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-mihrap-1',
      moduleId: 'mihrap-ve-minber',
      entityType: 'khutbah',
      title: 'Cuma Hutbesi: Bilgi, Emanet ve Sorumluluk',
      subtitle: 'Hutbe ve Tefekkür Notları',
      category: 'İlmiye',
      tags: ['hutbe', 'ilim', 'emanet'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'ibadet',
      isDemo: true,
      payload: {
        topic: 'Bilginin Ahlaki Sorumluluğu',
        keyVerses: ['Hiç bilenlerle bilmeyenler bir olur su mu? (Zümer, 9)'],
        notes: 'Bilginin eyleme ve toplumsal faydaya dönüşmesinin önemi.',
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const collections: ThematicCollection[] = [
    {
      id: 'demo-col-zaman',
      title: 'Zaman, Hafıza ve Medeniyet',
      description: 'Edebiyat, tarih ve kavramları tek tematik çatı altında toplayan örnek koleksiyon.',
      color: '#D6B782',
      items: [
        {
          moduleId: 'dijital-kutuphanem',
          entityId: book1Id,
          entityType: 'book',
          label: 'Saatleri Ayarlama Enstitüsü',
          addedAt: now,
        },
        {
          moduleId: 'alinti-defterim',
          entityId: quote1Id,
          entityType: 'quote',
          label: 'Zaman ve mekân insanla mevcuttur',
          addedAt: now,
        },
        {
          moduleId: 'siir-deryasi',
          entityId: 'demo-poem-1',
          entityType: 'poem',
          label: 'Sessiz Gemi — Yahya Kemal Beyatlı',
          addedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'demo-act-1',
      moduleId: 'dijital-kutuphanem',
      action: 'demo_baslangic',
      entityType: 'book',
      entityId: book1Id,
      summary: 'Örnek başlangıç kaydı: Saatleri Ayarlama Enstitüsü',
      createdAt: now,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-full-ecosystem',
      title: 'Dijital Evrenim — 3 Alan · 6 Merkez · 23 Modül Hazır',
      message: '3 ana alan, 6 tematik merkez, 23 işlevsel modül, ortak takvim, koleksiyonlar ve PWA desteği etkin.',
      moduleId: 'dijital-kutuphanem',
      read: false,
      createdAt: now,
    },
  ];

  return {
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    quickNotes,
    moduleRecords,
    collections,
    activityLogs,
    notifications,
  };
}

export interface EcosystemSnapshot {
  profile: UserProfile;
  preferences: UserPreferences;
  moduleSettings: ModuleRuntimeSetting[];
  externalApps: ExternalAppConfig[];
  books: Book[];
  quotes: Quote[];
  knowledgeNodes: KnowledgeNode[];
  entityRelations: EntityRelation[];
  quickNotes: QuickNote[];
  moduleRecords: ModuleRecord[];
  collections: ThematicCollection[];
  attachments: AttachmentFile[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
}

export class IndexedDbEcosystemRepository {
  async initialize(): Promise<EcosystemSnapshot> {
    let profile = await getOneFromStore<UserProfile>('profile', 'primary-user');
    let preferences = await getOneFromStore<UserPreferences>('preferences', 'primary-preferences');
    let moduleSettings = await getAllFromStore<ModuleRuntimeSetting>('module_settings');
    let externalApps = await getAllFromStore<ExternalAppConfig>('external_apps');
    const existingRecords = await getAllFromStore<ModuleRecord>('module_records');

    const isFirstRun = !profile || !preferences;

    if (!profile) {
      profile = DEFAULT_PROFILE;
      await putInStore('profile', profile);
    }

    if (!preferences) {
      preferences = DEFAULT_PREFERENCES;
      await putInStore('preferences', preferences);
    } else {
      // Migrate legacy 'centers_overview' widget id -> 'domains_overview' and ensure new defaults
      let widgetsChanged = false;
      const mappedWidgets = preferences.dashboardWidgets.map((w) => {
        if ((w.id as string) === 'centers_overview') {
          widgetsChanged = true;
          return { ...w, id: 'domains_overview' as const, label: 'Üç Ana Alan' };
        }
        return w;
      });
      const existingWidgetIds = new Set(mappedWidgets.map((w) => w.id));
      const newWidgets = DEFAULT_DASHBOARD_WIDGETS.filter((w) => !existingWidgetIds.has(w.id));
      if (widgetsChanged || newWidgets.length > 0) {
        preferences = {
          ...preferences,
          dashboardWidgets: [...mappedWidgets, ...newWidgets],
        };
        await putInStore('preferences', preferences);
      }
    }

    // Non-destructive v2 -> v3 migration:
    // 1. Merge 'tarih-simulatoru' records and relations into unified 'tarih-atlasi'
    // 2. Preserve all user records for LEGACY_REMOVED_MODULE_IDS untouched in IndexedDB!
    const simulatorRecords = existingRecords.filter((r) => r.moduleId === 'tarih-simulatoru');
    if (simulatorRecords.length > 0) {
      const migratedRecords: ModuleRecord[] = simulatorRecords.map((rec) => ({
        ...rec,
        moduleId: 'tarih-atlasi',
        entityType: 'alt_history_scenario',
        payload: {
          ...((rec.payload as Record<string, unknown>) ?? {}),
          kind: 'alt_history_scenario',
          isFictionalSimulation: true,
        },
        updatedAt: new Date().toISOString(),
      }));
      await putManyInStore('module_records', migratedRecords);

      const allRelations = await getAllFromStore<EntityRelation>('entity_relations');
      const affectedRels = allRelations.filter(
        (rel) => rel.fromModule === 'tarih-simulatoru' || rel.toModule === 'tarih-simulatoru'
      );
      if (affectedRels.length > 0) {
        await putManyInStore(
          'entity_relations',
          affectedRels.map((rel) => ({
            ...rel,
            fromModule: rel.fromModule === 'tarih-simulatoru' ? 'tarih-atlasi' : rel.fromModule,
            toModule: rel.toModule === 'tarih-simulatoru' ? 'tarih-atlasi' : rel.toModule,
          }))
        );
      }
    }

    const activeModuleIds = new Set(MODULES.map((m) => m.id));
    if (moduleSettings.length === 0) {
      moduleSettings = createDefaultModuleSettings();
      await putManyInStore('module_settings', moduleSettings);
    } else {
      // Remove stale module_settings rows for retired/merged modules (records remain intact in module_records)
      const staleSettings = moduleSettings.filter((s) => !activeModuleIds.has(s.moduleId));
      if (staleSettings.length > 0) {
        await Promise.all(staleSettings.map((s) => deleteFromStore('module_settings', s.moduleId)));
        moduleSettings = moduleSettings.filter((s) => activeModuleIds.has(s.moduleId));
      }
      const existingIds = new Set(moduleSettings.map((s) => s.moduleId));
      const missing = createDefaultModuleSettings().filter((s) => !existingIds.has(s.moduleId));
      if (missing.length > 0) {
        await putManyInStore('module_settings', missing);
        moduleSettings = [...moduleSettings, ...missing];
      }
    }

    const activeAppIds = new Set(EXISTING_APPS_LIST.map((a) => a.appId));
    if (externalApps.length === 0) {
      externalApps = EXISTING_APPS_LIST;
      await putManyInStore('external_apps', externalApps);
    } else {
      const staleApps = externalApps.filter((a) => !activeAppIds.has(a.appId));
      if (staleApps.length > 0) {
        await Promise.all(staleApps.map((a) => deleteFromStore('external_apps', a.appId)));
        externalApps = externalApps.filter((a) => activeAppIds.has(a.appId));
      }
      // Update AutoMusicPro centerId kozmos -> atolye if needed
      const amp = externalApps.find((a) => a.appId === 'automusicpro' && a.centerId !== 'atolye');
      if (amp) {
        const updatedAmp = { ...amp, centerId: 'atolye' as const };
        await putInStore('external_apps', updatedAmp);
        externalApps = externalApps.map((a) => (a.appId === 'automusicpro' ? updatedAmp : a));
      }
    }

    if (isFirstRun) {
      const seed = createDemoSeedData();
      await Promise.all([
        putManyInStore('books', seed.books),
        putManyInStore('quotes', seed.quotes),
        putManyInStore('knowledge_nodes', seed.knowledgeNodes),
        putManyInStore('entity_relations', seed.entityRelations),
        putManyInStore('quick_notes', seed.quickNotes),
        putManyInStore('module_records', seed.moduleRecords),
        putManyInStore('collections', seed.collections),
        putManyInStore('activity_logs', seed.activityLogs),
        putManyInStore('notifications', seed.notifications),
      ]);
    } else if (existingRecords.length === 0) {
      const seed = createDemoSeedData();
      await Promise.all([
        putManyInStore('module_records', seed.moduleRecords),
        putManyInStore('collections', seed.collections),
      ]);
    }

    return this.loadAll();
  }

  async loadAll(): Promise<EcosystemSnapshot> {
    const [
      profile,
      preferences,
      moduleSettings,
      externalApps,
      books,
      quotes,
      knowledgeNodes,
      entityRelations,
      quickNotes,
      moduleRecords,
      collections,
      attachments,
      activityLogs,
      notifications,
    ] = await Promise.all([
      getOneFromStore<UserProfile>('profile', 'primary-user'),
      getOneFromStore<UserPreferences>('preferences', 'primary-preferences'),
      getAllFromStore<ModuleRuntimeSetting>('module_settings'),
      getAllFromStore<ExternalAppConfig>('external_apps'),
      getAllFromStore<Book>('books'),
      getAllFromStore<Quote>('quotes'),
      getAllFromStore<KnowledgeNode>('knowledge_nodes'),
      getAllFromStore<EntityRelation>('entity_relations'),
      getAllFromStore<QuickNote>('quick_notes'),
      getAllFromStore<ModuleRecord>('module_records'),
      getAllFromStore<ThematicCollection>('collections'),
      getAllFromStore<AttachmentFile>('attachments'),
      getAllFromStore<ActivityLog>('activity_logs'),
      getAllFromStore<NotificationItem>('notifications'),
    ]);

    return {
      profile: profile ?? DEFAULT_PROFILE,
      preferences: preferences ?? DEFAULT_PREFERENCES,
      moduleSettings,
      externalApps,
      books: books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      quotes: quotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      knowledgeNodes: knowledgeNodes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      entityRelations: entityRelations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      quickNotes: quickNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      moduleRecords: moduleRecords.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      collections: collections.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      attachments: attachments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      activityLogs: activityLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      notifications: notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  saveBook(book: Book) {
    return putInStore('books', book);
  }
  deleteBook(id: string) {
    return deleteFromStore('books', id);
  }

  saveQuote(quote: Quote) {
    return putInStore('quotes', quote);
  }
  deleteQuote(id: string) {
    return deleteFromStore('quotes', id);
  }

  saveKnowledgeNode(node: KnowledgeNode) {
    return putInStore('knowledge_nodes', node);
  }
  deleteKnowledgeNode(id: string) {
    return deleteFromStore('knowledge_nodes', id);
  }

  saveRelation(relation: EntityRelation) {
    return putInStore('entity_relations', relation);
  }
  deleteRelation(id: string) {
    return deleteFromStore('entity_relations', id);
  }

  saveQuickNote(note: QuickNote) {
    return putInStore('quick_notes', note);
  }
  deleteQuickNote(id: string) {
    return deleteFromStore('quick_notes', id);
  }

  saveModuleRecord(record: ModuleRecord) {
    return putInStore('module_records', record);
  }
  deleteModuleRecord(id: string) {
    return deleteFromStore('module_records', id);
  }

  saveCollection(col: ThematicCollection) {
    return putInStore('collections', col);
  }
  deleteCollection(id: string) {
    return deleteFromStore('collections', id);
  }

  saveAttachment(file: AttachmentFile) {
    return putInStore('attachments', file);
  }
  deleteAttachment(id: string) {
    return deleteFromStore('attachments', id);
  }

  saveActivityLog(log: ActivityLog) {
    return putInStore('activity_logs', log);
  }

  saveNotification(item: NotificationItem) {
    return putInStore('notifications', item);
  }

  saveModuleSetting(setting: ModuleRuntimeSetting) {
    return putInStore('module_settings', setting);
  }

  saveExternalApp(app: ExternalAppConfig) {
    return putInStore('external_apps', app);
  }

  saveProfile(profile: UserProfile) {
    return putInStore('profile', profile);
  }

  savePreferences(prefs: UserPreferences) {
    return putInStore('preferences', prefs);
  }

  async clearDemoData(): Promise<void> {
    const snap = await this.loadAll();
    await Promise.all([
      ...snap.books.filter((b) => b.isDemo).map((b) => deleteFromStore('books', b.id)),
      ...snap.quotes.filter((q) => q.isDemo).map((q) => deleteFromStore('quotes', q.id)),
      ...snap.knowledgeNodes
        .filter((n) => n.isDemo)
        .map((n) => deleteFromStore('knowledge_nodes', n.id)),
      ...snap.entityRelations
        .filter((r) => r.isDemo)
        .map((r) => deleteFromStore('entity_relations', r.id)),
      ...snap.quickNotes.filter((n) => n.isDemo).map((n) => deleteFromStore('quick_notes', n.id)),
      ...snap.moduleRecords
        .filter((r) => r.isDemo)
        .map((r) => deleteFromStore('module_records', r.id)),
    ]);
  }

  async exportAll(scope: 'full' | 'legacy_archive' | string = 'full'): Promise<ExportBundle> {
    const snap = await this.loadAll();
    if (scope === 'legacy_archive') {
      const legacySet = new Set<string>(LEGACY_REMOVED_MODULE_IDS);
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        app: 'Dijital Evrenim',
        exportedAt: new Date().toISOString(),
        scope: 'legacy_archive',
        data: {
          profile: snap.profile,
          preferences: snap.preferences,
          moduleSettings: [],
          externalApps: [],
          books: [],
          quotes: [],
          knowledgeNodes: [],
          entityRelations: snap.entityRelations.filter(
            (r) => legacySet.has(r.fromModule) || legacySet.has(r.toModule)
          ),
          quickNotes: [],
          moduleRecords: snap.moduleRecords.filter((r) => legacySet.has(r.moduleId)),
          collections: [],
          attachments: [],
          activityLogs: snap.activityLogs.filter((l) => legacySet.has(l.moduleId)),
          notifications: [],
        },
      };
    }

    if (scope !== 'full') {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        app: 'Dijital Evrenim',
        exportedAt: new Date().toISOString(),
        scope,
        data: {
          profile: snap.profile,
          preferences: snap.preferences,
          moduleSettings: snap.moduleSettings.filter((m) => m.moduleId === scope),
          externalApps: snap.externalApps.filter((a) => a.targetModuleId === scope),
          books: scope === 'dijital-kutuphanem' ? snap.books : [],
          quotes: scope === 'alinti-defterim' ? snap.quotes : [],
          knowledgeNodes: scope === 'zihin-atlasi' ? snap.knowledgeNodes : [],
          entityRelations: snap.entityRelations.filter(
            (r) => r.fromModule === scope || r.toModule === scope
          ),
          quickNotes: [],
          moduleRecords: snap.moduleRecords.filter((r) => r.moduleId === scope),
          collections: [],
          attachments: [],
          activityLogs: snap.activityLogs.filter((l) => l.moduleId === scope),
          notifications: [],
        },
      };
    }

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      app: 'Dijital Evrenim',
      exportedAt: new Date().toISOString(),
      scope: 'full',
      data: snap,
    };
  }

  async importBundle(bundle: ExportBundle, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
    if (
      !bundle ||
      typeof bundle !== 'object' ||
      bundle.app !== 'Dijital Evrenim' ||
      typeof bundle.schemaVersion !== 'number' ||
      !bundle.data ||
      typeof bundle.data !== 'object'
    ) {
      throw new Error('Geçersiz yedek dosyası biçimi.');
    }
    if (bundle.schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Yedek dosyası daha yeni bir şema sürümüne (${bundle.schemaVersion}) ait. Güncel sürüm: ${CURRENT_SCHEMA_VERSION}.`
      );
    }

    const asValidRecords = <T extends { id?: unknown }>(raw: unknown): T[] =>
      Array.isArray(raw)
        ? raw.filter((item): item is T => Boolean(item) && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
        : [];

    const d = bundle.data;
    const safeBooks = asValidRecords<Book>(d.books);
    const safeQuotes = asValidRecords<Quote>(d.quotes);
    const safeNodes = asValidRecords<KnowledgeNode>(d.knowledgeNodes);
    const safeRelations = asValidRecords<EntityRelation>(d.entityRelations);
    const safeQuickNotes = asValidRecords<QuickNote>(d.quickNotes);
    const safeModuleRecords = asValidRecords<ModuleRecord>(d.moduleRecords);
    const safeCollections = asValidRecords<ThematicCollection>(d.collections);
    const safeAttachments = asValidRecords<AttachmentFile>(d.attachments).filter((att) =>
      isSafeDataUrl(att.dataUrl)
    );
    const safeActivityLogs = asValidRecords<ActivityLog>(d.activityLogs);
    const safeNotifications = asValidRecords<NotificationItem>(d.notifications);

    const scope = bundle.scope && bundle.scope !== 'full' ? bundle.scope : 'full';

    if (mode === 'replace') {
      if (scope === 'full') {
        await Promise.all(STORE_NAMES.map((store) => clearStore(store)));
        await Promise.all([
          putInStore('profile', d.profile && typeof d.profile === 'object' ? d.profile : DEFAULT_PROFILE),
          putInStore(
            'preferences',
            d.preferences && typeof d.preferences === 'object' ? d.preferences : DEFAULT_PREFERENCES
          ),
          putManyInStore(
            'module_settings',
            Array.isArray(d.moduleSettings) && d.moduleSettings.length > 0
              ? d.moduleSettings
              : createDefaultModuleSettings()
          ),
          putManyInStore(
            'external_apps',
            Array.isArray(d.externalApps) && d.externalApps.length > 0
              ? d.externalApps
              : EXISTING_APPS_LIST
          ),
          putManyInStore('books', safeBooks),
          putManyInStore('quotes', safeQuotes),
          putManyInStore('knowledge_nodes', safeNodes),
          putManyInStore('entity_relations', safeRelations),
          putManyInStore('quick_notes', safeQuickNotes),
          putManyInStore('module_records', safeModuleRecords),
          putManyInStore('collections', safeCollections),
          putManyInStore('attachments', safeAttachments),
          putManyInStore('activity_logs', safeActivityLogs),
          putManyInStore('notifications', safeNotifications),
        ]);
        return;
      }

      // Module-scoped replace: replace ONLY the targeted module's data without wiping other modules
      const existingSnap = await this.loadAll();
      if (scope === 'dijital-kutuphanem') {
        await clearStore('books');
        await putManyInStore('books', safeBooks);
      } else if (scope === 'alinti-defterim') {
        await clearStore('quotes');
        await putManyInStore('quotes', safeQuotes);
      } else if (scope === 'zihin-atlasi') {
        await clearStore('knowledge_nodes');
        await putManyInStore('knowledge_nodes', safeNodes);
      }

      const oldScopedRecords = existingSnap.moduleRecords.filter((r) => r.moduleId === scope);
      await Promise.all(oldScopedRecords.map((r) => deleteFromStore('module_records', r.id)));
      await putManyInStore(
        'module_records',
        safeModuleRecords.filter((r) => r.moduleId === scope)
      );

      const oldScopedRelations = existingSnap.entityRelations.filter(
        (r) => r.fromModule === scope || r.toModule === scope
      );
      await Promise.all(oldScopedRelations.map((r) => deleteFromStore('entity_relations', r.id)));
      await putManyInStore(
        'entity_relations',
        safeRelations.filter((r) => r.fromModule === scope || r.toModule === scope)
      );

      if (Array.isArray(d.moduleSettings)) {
        const scopedSetting = d.moduleSettings.find((m) => m?.moduleId === scope);
        if (scopedSetting) await putInStore('module_settings', scopedSetting);
      }
      return;
    }

    // Merge mode: putMany overwrites matching IDs and preserves non-conflicting existing records
    await Promise.all([
      putManyInStore('books', safeBooks),
      putManyInStore('quotes', safeQuotes),
      putManyInStore('knowledge_nodes', safeNodes),
      putManyInStore('entity_relations', safeRelations),
      putManyInStore('quick_notes', safeQuickNotes),
      putManyInStore('module_records', safeModuleRecords),
      putManyInStore('collections', safeCollections),
      putManyInStore('attachments', safeAttachments),
    ]);
  }

  async resetAllData(): Promise<void> {
    await Promise.all(STORE_NAMES.map((store) => clearStore(store)));
    await putInStore('profile', DEFAULT_PROFILE);
    await putInStore('preferences', DEFAULT_PREFERENCES);
    await putManyInStore('module_settings', createDefaultModuleSettings());
    await putManyInStore('external_apps', EXISTING_APPS_LIST);
  }
}

export const ecosystemRepository = new IndexedDbEcosystemRepository();
