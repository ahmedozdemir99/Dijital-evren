import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CENTERS,
  DOMAINS,
  EXISTING_APPS_LIST,
  MODULES,
  getCentersByDomain,
  getModulesByCenter,
  getModulesByDomain,
} from '../registry/modules.ts';
import {
  buildCalendarEvents,
  findSimilarQuotes,
  isSafeDataUrl,
  isSafeHttpUrl,
  parseCsvBooks,
  searchEcosystem,
} from '../services/integrationService.ts';
import {
  createDefaultModuleSettings,
  DEFAULT_PREFERENCES,
  LEGACY_REMOVED_MODULE_IDS,
} from '../repositories/ecosystemRepository.ts';
import { analyzePoemProsody, countTurkishSyllables } from '../../modules/irfan/PoetrySeaModule.tsx';
import { buildTruthTable } from '../../modules/irfan/LogicAcademyModule.tsx';
import { evaluateMathExpression } from '../../modules/kozmos/MathLabModule.tsx';
import { computeSolarReferenceTimes } from '../../modules/tekamul/PrayerJourneyModule.tsx';
import type { Book, KnowledgeNode, ModuleRecord, Quote } from '../types/entities.ts';

test('1-3-6-22 architecture: 3 domains, 6 centers, 22 unique active modules', () => {
  assert.equal(DOMAINS.length, 3);
  assert.equal(CENTERS.length, 6);
  assert.equal(MODULES.length, 22);
  const ids = new Set(MODULES.map((m) => m.id));
  assert.equal(ids.size, 22);
  assert.equal(EXISTING_APPS_LIST.length, 10);
  assert.ok(MODULES.every((m) => m.status === 'active'));

  // Exact domain & center counts
  assert.equal(getCentersByDomain('zihin').length, 2);
  assert.equal(getCentersByDomain('kesif').length, 2);
  assert.equal(getCentersByDomain('yasam').length, 2);
  assert.equal(getModulesByDomain('zihin').length, 12);
  assert.equal(getModulesByDomain('kesif').length, 5);
  assert.equal(getModulesByDomain('yasam').length, 5);
  assert.equal(getModulesByCenter('irfan').length, 6);
  assert.equal(getModulesByCenter('idrak').length, 6);
  assert.equal(getModulesByCenter('kozmos').length, 3);
  assert.equal(getModulesByCenter('atolye').length, 2);
  assert.equal(getModulesByCenter('tekamul').length, 3);
  assert.equal(getModulesByCenter('hayat').length, 2);

  // Removed modules and merged tarih-simulatoru must not appear in active registry or feedsInto
  const retiredSet = new Set<string>([...LEGACY_REMOVED_MODULE_IDS, 'tarih-simulatoru']);
  for (const mod of MODULES) {
    assert.equal(retiredSet.has(mod.id), false);
    for (const target of mod.feedsInto) {
      assert.equal(retiredSet.has(target), false, `${mod.id} feedsInto stale ${target}`);
    }
  }
  for (const app of EXISTING_APPS_LIST) {
    assert.equal(retiredSet.has(app.targetModuleId), false);
    assert.ok(ids.has(app.targetModuleId));
  }
});

test('findSimilarQuotes detects exact and high-overlap Turkish quotes', () => {
  const existing: Quote[] = [
    {
      id: 'q1',
      text: 'Zaman ve mekan insanla mevcuttur, saatin kendisi mekandır.',
      author: 'Ahmet Hamdi Tanpınar',
      sourceTitle: 'Saatleri Ayarlama Enstitüsü',
      tags: ['zaman'],
      isFavorite: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const matches = findSimilarQuotes('Zaman ve mekan insanla mevcuttur', existing);
  assert.equal(matches.length, 1);

  const nonMatches = findSimilarQuotes('Bilim evrenin ortak dilidir.', existing);
  assert.equal(nonMatches.length, 0);
});

test('searchEcosystem respects module enabled flags, privacy domains, and moduleRecords', () => {
  const books: Book[] = [
    {
      id: 'b1',
      title: 'Saatleri Ayarlama Enstitüsü',
      author: 'Ahmet Hamdi Tanpınar',
      category: 'Roman',
      status: 'okunuyor',
      totalPages: 382,
      currentPage: 100,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];
  const nodes: KnowledgeNode[] = [
    {
      id: 'n1',
      title: 'Zaman Bilinci',
      nodeType: 'kavram',
      summary: 'İçsel zaman ve mekanik zaman ilişkisi',
      sourceModule: 'zihin-atlasi',
      tags: [],
      x: 100,
      y: 100,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];
  const moduleRecords: ModuleRecord[] = [
    {
      id: 'rec-poem-1',
      moduleId: 'siir-deryasi',
      entityType: 'poem',
      title: 'Sessiz Gemi',
      subtitle: 'Yahya Kemal Beyatlı',
      category: 'Aruz',
      tags: ['ölüm', 'deniz'],
      isFavorite: true,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rec-mem-hidden',
      moduleId: 'hatiralarim',
      entityType: 'memory',
      title: 'Gizli Günlük Kaydı',
      category: 'Kişisel',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      payload: { hideFromGlobalSearch: true },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rec-prayer-priv',
      moduleId: 'namaz-yolculugum',
      entityType: 'prayer_day',
      title: 'İbadet Takibi · 2026-05-01',
      category: 'Günlük Takip',
      tags: ['İbadet'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'ibadet',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rec-band-priv',
      moduleId: 'akilli-bileklik',
      entityType: 'metric',
      title: 'Sağlık Ölçümü',
      category: 'Sağlık',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'saglik',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'rec-growth-priv',
      moduleId: 'tekamul-yolunda',
      entityType: 'habit',
      title: 'Sabah Okuması Alışkanlığı',
      category: 'Alışkanlık',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const settings = createDefaultModuleSettings().map((s) =>
    s.moduleId === 'dijital-kutuphanem' ? { ...s, enabled: false } : s
  );

  const results = searchEcosystem('Tanpınar', {
    books,
    quotes: [],
    knowledgeNodes: nodes,
    quickNotes: [],
    moduleRecords,
    moduleSettings: settings,
    preferences: DEFAULT_PREFERENCES,
  });

  // Dijital Kütüphanem is disabled, so book should not appear
  assert.equal(results.filter((r) => r.kind === 'book').length, 0);

  const poemResults = searchEcosystem('Sessiz Gemi', {
    books,
    quotes: [],
    knowledgeNodes: nodes,
    quickNotes: [],
    moduleRecords,
    moduleSettings: settings,
    preferences: DEFAULT_PREFERENCES,
  });
  assert.equal(poemResults.filter((r) => r.kind === 'record').length, 1);

  const hiddenMemResults = searchEcosystem('Gizli Günlük', {
    books,
    quotes: [],
    knowledgeNodes: nodes,
    quickNotes: [],
    moduleRecords,
    moduleSettings: settings,
    preferences: DEFAULT_PREFERENCES,
  });
  assert.equal(hiddenMemResults.length, 0);

  // Private domains (ibadet, saglik, kisisel) stay excluded when allowSearchInPrivateDomains is false
  const strictPrefs = {
    ...DEFAULT_PREFERENCES,
    crossModuleSharing: {
      ...DEFAULT_PREFERENCES.crossModuleSharing,
      allowSearchInPrivateDomains: false,
    },
  };
  assert.equal(
    searchEcosystem('İbadet Takibi', {
      books,
      quotes: [],
      knowledgeNodes: nodes,
      quickNotes: [],
      moduleRecords,
      moduleSettings: settings,
      preferences: strictPrefs,
    }).length,
    0
  );
  assert.equal(
    searchEcosystem('Sağlık Ölçümü', {
      books,
      quotes: [],
      knowledgeNodes: nodes,
      quickNotes: [],
      moduleRecords,
      moduleSettings: settings,
      preferences: strictPrefs,
    }).length,
    0
  );
  assert.equal(
    searchEcosystem('Sabah Okuması', {
      books,
      quotes: [],
      knowledgeNodes: nodes,
      quickNotes: [],
      moduleRecords,
      moduleSettings: settings,
      preferences: strictPrefs,
    }).length,
    0
  );
});

test('parseCsvBooks parses valid Turkish CSV headers and rows', () => {
  const csv = 'Başlık,Yazar,Kategori,Sayfa\nTutunamayanlar,Oğuz Atay,Roman,724\n';
  const parsed = parseCsvBooks(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Tutunamayanlar');
  assert.equal(parsed[0].author, 'Oğuz Atay');
  assert.equal(parsed[0].totalPages, 724);
});

test('buildCalendarEvents aggregates dated books and module records respecting privacy', () => {
  const books: Book[] = [
    {
      id: 'b1',
      title: 'Mesnevi Okuması',
      author: 'Mevlana',
      category: 'Tasavvuf',
      status: 'okunuyor',
      totalPages: 300,
      currentPage: 50,
      targetDate: '2026-05-20',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];
  const moduleRecords: ModuleRecord[] = [
    {
      id: 'r1',
      moduleId: 'karadeniz-asistani',
      entityType: 'travel_spot',
      title: 'Trabzon Sahil Rotası',
      category: 'Rota',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: '2026-05-18',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'r-legacy-ignored',
      moduleId: 'deneme-analiz',
      entityType: 'exam',
      title: 'Arşivlenmiş Deneme Kaydı',
      category: 'Sınav',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'egitim',
      date: '2026-05-19',
      payload: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const events = buildCalendarEvents({
    books,
    moduleRecords,
    moduleSettings: createDefaultModuleSettings(),
    preferences: DEFAULT_PREFERENCES,
    centerColors: { idrak: '#71C6BD', hayat: '#DFA183' },
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].date, '2026-05-18');
  assert.equal(events[1].date, '2026-05-20');
});

test('Turkish prosody syllable and rhyme helper evaluates lines accurately', () => {
  assert.equal(countTurkishSyllables('Merhaba dünya'), 5);
  const analysis = analyzePoemProsody('Bir garip rüya rengiyle\nUyuşmuş gibi her şekil');
  assert.equal(analysis.lineCount, 2);
  assert.deepEqual(
    analysis.syllablesPerLine.map((s) => s.syllables),
    [8, 8]
  );
  assert.ok(analysis.meterLabel.includes("8'li"));
});

test('Propositional logic truth table evaluates classical implication and tautology', () => {
  const table = buildTruthTable('p -> (q | p)');
  assert.deepEqual(table.vars, ['p', 'q']);
  assert.equal(table.classification, 'Totoloji (Her zaman doğru)');
  assert.equal(table.rows.length, 4);
  assert.ok(table.rows.every((r) => r.result === true));
});

test('Safe math expression evaluator computes valid expressions and rejects malformed input', () => {
  assert.ok(Math.abs(evaluateMathExpression('2*x^2 + a*x + b', 3, 4, -5) - 25) < 1e-9);
  assert.ok(Math.abs(evaluateMathExpression('sin(0) + cos(0)', 0) - 1) < 1e-9);
  assert.ok(Number.isNaN(evaluateMathExpression('', 1)));
  assert.ok(Number.isNaN(evaluateMathExpression('(x+1', 1)));
  assert.ok(Number.isNaN(evaluateMathExpression('2*x foo', 1)));
});

test('isSafeHttpUrl allows only http and https protocols', () => {
  assert.equal(isSafeHttpUrl('https://api.example.com/v1/books'), true);
  assert.equal(isSafeHttpUrl('http://localhost:3000/webhook'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl('file:///etc/passwd'), false);
  assert.equal(isSafeHttpUrl('   '), false);
  assert.equal(isSafeHttpUrl('not-a-url'), false);
});

test('isSafeDataUrl allows safe base64 media/document types and blocks active content', () => {
  assert.equal(isSafeDataUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isSafeDataUrl('data:application/pdf;base64,JVBERi0xLjQ='), true);
  assert.equal(isSafeDataUrl('data:text/csv;charset=utf-8;base64,YSxi'), true);
  assert.equal(isSafeDataUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
  assert.equal(isSafeDataUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isSafeDataUrl('javascript:alert(1)'), false);
});

test('computeSolarReferenceTimes formats valid HH:MM strings across full year without :60 rollover', () => {
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (let month = 1; month <= 12; month++) {
    for (const day of [1, 15, 28]) {
      const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const times = computeSolarReferenceTimes(dateStr, 41.0, 39.72);
      for (const value of Object.values(times)) {
        assert.match(value, hhmm, `Invalid time ${value} for ${dateStr}`);
      }
    }
  }
});

test('all modules have distinct study activities', async () => {
  const { MODULE_STUDIES } = await import('../registry/studies.ts');
  assert.deepEqual(Object.keys(MODULE_STUDIES).sort(), MODULES.map(({ id }) => id).sort());
  assert.equal(new Set(Object.values(MODULE_STUDIES).map(({ title }) => title)).size, 22);
  assert.ok(Object.values(MODULE_STUDIES).every(({ steps }) => steps.length === 3));
});

test('search ranks Turkish titles, indexes record content, and excludes hidden source nodes', () => {
  const records: ModuleRecord[] = [
    { id: 'a1', moduleId: 'siir-deryasi', entityType: 'module_study', title: 'Şiir Okuması',
      category: 'Atölye', tags: ['şiir'], isFavorite: false, isArchived: false, privacyDomain: 'genel',
      payload: { body: 'İç içe imgeler', apiToken: 'buaranmamali' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'a2', moduleId: 'siir-deryasi', entityType: 'poem', title: 'Gizli çalışma',
      category: 'Atölye', tags: [], isFavorite: false, isArchived: false, privacyDomain: 'kisisel',
      payload: { hideFromGlobalSearch: true }, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  ];
  const data = {
    books: [], quotes: [], quickNotes: [], moduleSettings: [], moduleRecords: records, preferences: DEFAULT_PREFERENCES,
    knowledgeNodes: [{ id: 'a2-node', title: 'Gizli çalışma', nodeType: 'kavram' as const,
      sourceModule: records[1].moduleId, sourceEntityId: 'a2', summary: '', tags: [], x: 1, y: 2,
      createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  };
  assert.equal(searchEcosystem('siir okumasi', data)[0]?.id, 'a1');
  assert.equal(searchEcosystem('imgeler siir', data)[0]?.route, '/modul/siir-deryasi/calisma?workspaceId=a1');
  assert.equal(searchEcosystem('gizli calisma', data).length, 0);
  assert.equal(searchEcosystem('buaranmamali', data).length, 0);
  assert.equal(searchEcosystem('siir', data, { dateFrom: '2026-01-02' }).length, 0);
});

test('external source adapters preserve native formats and repeatable identities', async () => {
  const { prepareExternalImport } = await import('../services/externalImports.ts');
  const fixtures: Record<string, unknown> = {
    'dijital-kutuphanem': { userBooks: [{ id: 'a', title: 'Roman', status: 'reading', currentPage: 27 }] },
    'alinti-defterim': { quotes: [{ text: 'Bir cümle', book: 'Bir kitap', page: '25' }], dictionary: [{ word: 'Yol', meaning: 'Yöntem' }] },
    'sohbet-arsivi': { SA_FAVS: ['one'] },
    'siir-deryasi': { app: 'siir-deryasi', ownPoems: [{ id: 'own', title: 'Şiir', text: 'Bir dize' }] },
    automusicpro: { app: 'AutoMusic Pro 4', data: { playlists: [{ name: 'Akşam' }] } },
    'tekamul-yolunda': { version: 5, tasks: {}, journal: [{ id: 'a', title: 'Gün', content: 'Not' }] },
    'mihrap-ve-minber': { version: 5, completed: { a: true } },
    'namaz-yolculugum': { fatiha: 'done' },
    'bugun-ne-yesem': { version: 1, staples: false, selected: ['limon'], custom: [], favorites: [], shopping: [] },
  };
  for (const app of EXISTING_APPS_LIST) {
    if (!fixtures[app.appId]) {
      await assert.rejects(prepareExternalImport(app, '{}'), /desteklenen kayıt bulunamadı/);
      continue;
    }
    const content = JSON.stringify(fixtures[app.appId]);
    const parsed = await prepareExternalImport(app, content);
    const repeated = await prepareExternalImport(app, content);
    const ids = (data: typeof parsed) => [...data.books, ...data.quotes, ...data.records].map((item) => item.id);
    assert.ok(ids(parsed).length > 0, app.appId);
    assert.deepEqual(ids(parsed), ids(repeated));
    if (app.appId === 'dijital-kutuphanem') assert.equal(parsed.books[0].status, 'okunuyor');
  }
});

test('assistant rejects unsigned and unauthorized requests before contacting Gemini', async (t) => {
  const { onRequestPost } = await import('../../../functions/api/ai/assist.ts');
  const env = { GEMINI_API_KEY: 'test', SUPABASE_URL: 'https://example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'test', AI_ALLOWED_USER_IDS: 'allowed' };
  const url = 'https://local.invalid/api/ai/assist';
  const noToken = await onRequestPost({ request: new Request(url, { method: 'POST' }), env });
  assert.equal(noToken.status, 401);
  assert.equal(noToken.headers.get('cache-control'), 'no-store');
  assert.equal((await onRequestPost({ request: new Request(url, { method: 'POST' }), env: {} })).status, 503);
  const stub = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'another-user' }));
  const denied = await onRequestPost({ request: new Request(url, {
    method: 'POST', headers: { Authorization: 'Bearer test' },
  }), env });
  assert.equal(denied.status, 403);
  assert.equal(stub.mock.callCount(), 1);
});

test('assistant validates a Supabase session and forwards only bounded, text-only context', async (t) => {
  const { onRequestPost } = await import('../../../functions/api/ai/assist.ts');
  const env = { GEMINI_API_KEY: 'provider-key', SUPABASE_URL: 'https://project.example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'publishable-key', AI_ALLOWED_USER_IDS: 'owner' };
  const seen: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL, options: RequestInit) => {
    seen.push(String(input));
    if (seen.length === 1) {
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer session');
      return Response.json({ id: 'owner' });
    }
    assert.equal(new Headers(options.headers).get('Authorization'), null);
    const sent = JSON.parse(String(options.body));
    assert.equal(sent.contents.length, 7);
    assert.equal(sent.contents[0].parts[0].text.length, 1500);
    assert.ok(sent.contents.at(-1).parts[0].text.endsWith('Bir soru'));
    return Response.json({ candidates: [{ content: { parts: [
      { text: 'internal thought', thought: true }, { text: 'Türkçe yanıt' },
    ] } }] });
  });
  const request = new Request('https://local.invalid/api/ai/assist', {
    method: 'POST', headers: { Authorization: 'Bearer session', 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Bir soru', history: Array.from({ length: 8 }, () => ({ role: 'user', text: 'x'.repeat(1700) })) }),
  });
  const response = await onRequestPost({ request, env });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, 'Türkçe yanıt');
  assert.deepEqual(seen, [
    'https://project.example.invalid/auth/v1/user',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  ]);
});

test('retired module data and derived records stay in raw backups and leave the active knowledge network', async () => {
  const { activeSnapshot, DEFAULT_PROFILE } = await import('../repositories/ecosystemRepository.ts');
  const base = { entityType: 'note', title: 'Kayıt', category: 'Not', tags: [], isFavorite: false,
    isArchived: false, privacyDomain: 'genel' as const, payload: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
  const moduleRecords = [
    { ...base, id: 'ride', moduleId: 'bizbize-riders' },
    { ...base, id: 'watch', moduleId: 'akilli-bileklik' },
    { ...base, id: 'reflection', moduleId: 'tekamul-yolunda', sourceEntityId: 'ride', sourceModule: 'bizbize-riders' },
    { ...base, id: 'other', moduleId: 'tekamul-yolunda' },
  ];
  const knowledgeNodes = [{ id: 'derived-node', title: 'Tefekkür kavramı', nodeType: 'kavram' as const,
    summary: '', sourceModule: 'tekamul-yolunda', sourceEntityId: 'reflection', tags: [], x: 0, y: 0,
    createdAt: base.createdAt, updatedAt: base.updatedAt }];
  const snapshot = {
    profile: DEFAULT_PROFILE, preferences: DEFAULT_PREFERENCES, moduleSettings: [], externalApps: [],
    books: [], quotes: [], knowledgeNodes, entityRelations: [], quickNotes: [], moduleRecords,
    collections: [], attachments: [], activityLogs: [], notifications: [],
  };
  const active = activeSnapshot(snapshot);
  assert.deepEqual(active.moduleRecords.map((record) => record.id), ['other']);
  assert.deepEqual(active.knowledgeNodes, []);
  assert.ok(active.retiredEntityIds.has('derived-node'));
  assert.equal(snapshot.moduleRecords.length, 4);
  assert.equal(snapshot.knowledgeNodes.length, 1);
});

test('original Mihrap Akademisi backup maps real lessons and preserves local edits on export', async () => {
  const { prepareExternalImport } = await import('../services/externalImports.ts');
  const { ACADEMY_BACKUP_TYPE, ACADEMY_PROGRESS_TYPE, combinedAcademyProgress } = await import('../../integrations/mihrap/progress.ts');
  const app = EXISTING_APPS_LIST.find((entry) => entry.appId === 'mihrap-ve-minber')!;
  const payload = { version: 5, completed: { '0:0': true }, practiceChecks: { 'm0-c0:1': true },
    notes: { 'm0-c0': 'Dış uygulamada yazılan not.' } };
  const backup = (await prepareExternalImport(app, JSON.stringify(payload))).records[0];
  assert.equal(backup.entityType, ACADEMY_BACKUP_TYPE);
  assert.equal(backup.privacyDomain, 'ibadet');
  assert.equal(combinedAcademyProgress([backup]).result.notes?.['m0-c0'], payload.notes['m0-c0']);
  const edited = { ...backup, id: 'native-progress', entityType: ACADEMY_PROGRESS_TYPE,
    payload: { cardId: 'm0-c0', completed: false, note: 'Evrenim’de düzenlendi.' } };
  const exported = combinedAcademyProgress([edited, backup]).result;
  assert.equal(exported.completed['0:0'], false);
  assert.equal(exported.notes?.['m0-c0'], 'Evrenim’de düzenlendi.');
  assert.equal(exported.practiceChecks?.['m0-c0:1'], true);
});

test('every integration opens its own published URL', async () => {
  const { INDEPENDENT_APPLICATIONS, independentApplicationHref } = await import('../../integrations/shared/liveApplications.ts');
  assert.equal(Object.keys(INDEPENDENT_APPLICATIONS).length, EXISTING_APPS_LIST.length);
  assert.equal(independentApplicationHref('automusicpro'), 'https://automusic-pro.ai.studio/');
  assert.equal(independentApplicationHref('tekamul-yolunda'), 'https://tek-mul-yolunda.pages.dev/');
  for (const { appId } of EXISTING_APPS_LIST) {
    assert.equal(new URL(independentApplicationHref(appId)).protocol, 'https:');
  }
});

test('independent library, quote, poetry and habit backups produce usable local records', async () => {
  const { prepareExternalImport } = await import('../services/externalImports.ts');
  const parse = (id: string, data: object) => prepareExternalImport(EXISTING_APPS_LIST.find((app) => app.appId === id)!, JSON.stringify(data));
  const words = await parse('alinti-defterim', { dictionary: [{ id: 't', word: 'Söz', meaning: 'Kelam' }] });
  assert.equal(words.records[0].entityType, 'word_entry');
  assert.equal((words.records[0].payload as { meaningToday: string }).meaningToday, 'Kelam');
  const library = await parse('dijital-kutuphanem', {
    userBooks: [{ id: 'b', title: 'Yerel kitap' }], quotations: [{ bookId: 'b', bookTitle: 'Yerel kitap', quoteText: 'Kitapta geçen söz' }],
  });
  assert.equal(library.quotes[0].bookId, library.books[0].id);
  const poetry = await parse('siir-deryasi', {
    app: 'siir-deryasi', version: 1, ownPoems: [{ id: 'x', title: 'Şiir', text: 'İlk dize' }],
    favorites: { x: 1 }, progress: { x: { at: 1234, pct: 55 } }, notes: { x: 'Kendi notum' },
  });
  assert.equal(poetry.records[0].isFavorite, true);
  assert.equal((poetry.records[0].payload as { importedPercent: number }).importedPercent, 55);
  assert.equal((poetry.records[0].payload as { notes: string }).notes, 'Kendi notum');
  const habits = await parse('tekamul-yolunda', {
    version: 5, tasks: {}, dailyHabits: { '2026-11-14-quran': true, '2026-11-13-quran': true, '2026-11-15-quran': false },
  });
  const habit = habits.records.find((record) => record.entityType === 'habit')!;
  assert.deepEqual((habit.payload as { completedDates: string[] }).completedDates, ['2026-11-13', '2026-11-14']);
});

test('source playlist, kitchen, video and prayer backup values drive the integrated views', async () => {
  const { prepareExternalImport } = await import('../services/externalImports.ts');
  const { readKitchenBackup, readMusicPlaylists, readPrayerStudy, readVideoShelf } = await import('../../integrations/shared/importedData.ts');
  const parse = async (id: string, data: object) => (await prepareExternalImport(EXISTING_APPS_LIST.find((app) => app.appId === id)!, JSON.stringify(data))).records;
  const playlist = await parse('automusicpro', { app: 'AutoMusic Pro 4', data: { playlists: [{ name: 'Liste', items: [
    { title: 'Çalınabilir', streamUrl: 'https://audio.example.org/track.mp3' }, { title: 'Geçersiz adres', streamUrl: 'javascript:alert(1)' },
  ] }] } });
  assert.equal(readMusicPlaylists(playlist)[0].tracks[0].url, 'https://audio.example.org/track.mp3');
  assert.equal(readMusicPlaylists(playlist)[0].tracks[1].url, '');
  const kitchen = readKitchenBackup(await parse('bugun-ne-yesem', { version: 1, selected: ['Un'], custom: [],
    staples: true, favorites: [], shopping: [{ name: 'Süt', checked: true }] }));
  assert.deepEqual(kitchen.selected, ['Un']);
  assert.deepEqual(kitchen.shopping, [{ name: 'Süt', checked: true }]);
  assert.deepEqual(readVideoShelf(await parse('sohbet-arsivi', {
    SA_FAVS: ['x'], SA_PROGRESS: { x: { p: 75, done: false } }, SA_NOTES: { x: 'Not' },
  })), [{ id: 'x', favorite: true, percent: 75, note: 'Not' }]);
  assert.deepEqual(readPrayerStudy(await parse('namaz-yolculugum', { fatiha: 'practice' })), [{ id: 'fatiha', status: 'practice' }]);
});
