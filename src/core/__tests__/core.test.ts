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

test('1-3-6-23 architecture: 3 domains, 6 centers, 23 unique active modules', () => {
  assert.equal(DOMAINS.length, 3);
  assert.equal(CENTERS.length, 6);
  assert.equal(MODULES.length, 23);
  const ids = new Set(MODULES.map((m) => m.id));
  assert.equal(ids.size, 23);
  assert.equal(EXISTING_APPS_LIST.length, 11);
  assert.ok(MODULES.every((m) => m.status === 'active'));

  // Exact domain & center counts
  assert.equal(getCentersByDomain('zihin').length, 2);
  assert.equal(getCentersByDomain('kesif').length, 2);
  assert.equal(getCentersByDomain('yasam').length, 2);
  assert.equal(getModulesByDomain('zihin').length, 12);
  assert.equal(getModulesByDomain('kesif').length, 5);
  assert.equal(getModulesByDomain('yasam').length, 7);
  assert.equal(getModulesByCenter('irfan').length, 6);
  assert.equal(getModulesByCenter('idrak').length, 6);
  assert.equal(getModulesByCenter('kozmos').length, 3);
  assert.equal(getModulesByCenter('atolye').length, 2);
  assert.equal(getModulesByCenter('tekamul').length, 3);
  assert.equal(getModulesByCenter('hayat').length, 4);

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
      moduleId: 'bizbize-riders',
      entityType: 'ride',
      title: 'Trabzon Sahil Sürüşü',
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
