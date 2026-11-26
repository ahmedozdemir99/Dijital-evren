import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  BookOpen,
  Feather,
  Music,
  Plus,
  Quote,
  Search,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface PoemPayload {
  kind: 'poem' | 'poet';
  poetName: string;
  era?: string;
  bio?: string;
  lines: string;
  theme: string;
  isPersonal: boolean;
  notes: string;
  readCount?: number;
  lastReadAt?: string;
}

const VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü', 'A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü']);

export function countTurkishSyllables(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (VOWELS.has(ch)) count++;
  }
  return count;
}

export function analyzePoemProsody(text: string) {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const syllablesPerLine = rawLines.map((line) => ({
    line,
    syllables: countTurkishSyllables(line),
  }));

  const counts = syllablesPerLine.map((s) => s.syllables);
  const freq = new Map<number, number>();
  for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1);
  let dominant = 0;
  let dominantFreq = 0;
  for (const [val, f] of freq.entries()) {
    if (f > dominantFreq) {
      dominant = val;
      dominantFreq = f;
    }
  }
  const meterLabel =
    rawLines.length === 0
      ? 'Belirsiz'
      : dominantFreq >= Math.ceil(rawLines.length * 0.6) && dominant > 0
        ? `${dominant}'li Hece Ölçüsü (Baskın)`
        : 'Serbest / Karma Ölçü';

  // Basic end-word suffix & rhyme/redif grouping across lines
  const lineEndings = rawLines.map((line) => {
    const clean = line.replace(/[.,;:!?'"“”‘’()—-]/g, '').trim();
    const words = clean.split(/\s+/);
    const lastWord = (words[words.length - 1] ?? '').toLocaleLowerCase('tr-TR');
    return { line, lastWord };
  });

  const suffixGroups = new Map<string, number[]>();
  lineEndings.forEach((item, idx) => {
    const tail = item.lastWord.slice(-2);
    if (tail.length >= 2) {
      const list = suffixGroups.get(tail) ?? [];
      list.push(idx + 1);
      suffixGroups.set(tail, list);
    }
  });

  const rhymePairs = Array.from(suffixGroups.entries())
    .filter(([, idxs]) => idxs.length >= 2)
    .map(([ending, idxs]) => ({
      ending: `-${ending}`,
      lines: idxs,
    }));

  // Detect identical trailing words/suffixes for potential redif observation
  const wordCounts = new Map<string, number[]>();
  lineEndings.forEach((item, idx) => {
    if (!item.lastWord) return;
    const arr = wordCounts.get(item.lastWord) ?? [];
    arr.push(idx + 1);
    wordCounts.set(item.lastWord, arr);
  });
  const repeatedEndWords = Array.from(wordCounts.entries())
    .filter(([, idxs]) => idxs.length >= 2)
    .map(([word, idxs]) => ({ word, lines: idxs }));

  return {
    lineCount: rawLines.length,
    syllablesPerLine,
    meterLabel,
    rhymePairs,
    repeatedEndWords,
  };
}

export function PoetrySeaModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
    bulkUpdateModuleRecords,
    addQuote,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('siir-deryasi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'siir-deryasi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const allRecords = useMemo(
    () =>
      moduleRecords.filter(
        (r) =>
          r.moduleId === 'siir-deryasi' &&
          !r.isArchived &&
          (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<PoemPayload>>,
    [moduleRecords, showDemo]
  );

  const poems = allRecords.filter((r) => r.payload.kind !== 'poet');
  const poets = allRecords.filter((r) => r.payload.kind === 'poet');

  const [tab, setTab] = useState<'poems' | 'poets' | 'compare' | 'history'>('poems');
  const [query, setQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'personal' | 'archive' | 'fav'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newKind, setNewKind] = useState<'poem' | 'poet'>('poem');

  const selectedId = searchParams.get('recordId') || poems[0]?.id || poets[0]?.id || null;
  const selected = allRecords.find((r) => r.id === selectedId) ?? null;

  // Comparison state
  const [compareA, setCompareA] = useState<string>(poems[0]?.id ?? '');
  const [compareB, setCompareB] = useState<string>(poems[1]?.id ?? poems[0]?.id ?? '');

  // Form state
  const [title, setTitle] = useState('');
  const [poetName, setPoetName] = useState('');
  const [era, setEra] = useState('Cumhuriyet Dönemi');
  const [theme, setTheme] = useState('Tefekkür');
  const [lines, setLines] = useState('');
  const [notes, setNotes] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);
  const [quoteSelection, setQuoteSelection] = useState('');
  const [inspectWord, setInspectWord] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<PoemPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2600);
  };

  const filteredPoems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return poems.filter((p) => {
      if (filterScope === 'personal' && !p.payload.isPersonal) return false;
      if (filterScope === 'archive' && p.payload.isPersonal) return false;
      if (filterScope === 'fav' && !p.isFavorite) return false;
      if (!q) return true;
      const poetStr = (p.payload.poetName ?? (p.payload as { poet?: string }).poet ?? '').toLocaleLowerCase('tr-TR');
      const linesStr = (p.payload.lines ?? (p.payload as { text?: string }).text ?? '').toLocaleLowerCase('tr-TR');
      const themeStr = (p.payload.theme ?? '').toLocaleLowerCase('tr-TR');
      return (
        p.title.toLocaleLowerCase('tr-TR').includes(q) ||
        poetStr.includes(q) ||
        linesStr.includes(q) ||
        themeStr.includes(q)
      );
    });
  }, [poems, query, filterScope]);

  const prosody = useMemo(
    () =>
      selected && selected.payload.kind !== 'poet'
        ? analyzePoemProsody(selected.payload.lines ?? (selected.payload as { text?: string }).text ?? '')
        : null,
    [selected]
  );

  const handleSelectPoem = async (item: ModuleRecord<PoemPayload>) => {
    setSearchParams({ recordId: item.id });
    if (item.payload.kind !== 'poet') {
      await updateModuleRecord<PoemPayload>(item.id, {
        payload: {
          ...item.payload,
          readCount: (item.payload.readCount ?? 0) + 1,
          lastReadAt: new Date().toISOString(),
        },
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const created = await addModuleRecord<PoemPayload>({
      moduleId: 'siir-deryasi',
      entityType: newKind,
      title: title.trim(),
      subtitle: newKind === 'poet' ? era : poetName.trim() || 'Anonim / Kişisel',
      category: newKind === 'poet' ? 'Şair Profili' : theme.trim() || 'Genel',
      tags: isPersonal ? ['Kişisel Şiir'] : [theme.trim()].filter(Boolean),
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: localDateIso(),
      payload: {
        kind: newKind,
        poetName: newKind === 'poet' ? title.trim() : poetName.trim() || 'Kişisel',
        era,
        bio: newKind === 'poet' ? lines.trim() : undefined,
        lines: newKind === 'poem' ? lines.trim() : '',
        theme: theme.trim() || 'Genel',
        isPersonal,
        notes: notes.trim(),
        readCount: 1,
        lastReadAt: new Date().toISOString(),
      },
    });
    setTitle('');
    setLines('');
    setNotes('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
    notify(newKind === 'poet' ? 'Şair profili eklendi.' : 'Şiir kaydedildi.');
  };

  const handleSendToQuotes = async () => {
    if (!selected) return;
    const snippet = quoteSelection.trim() || selected.payload.lines.split(/\r?\n/).slice(0, 2).join('\n');
    if (!snippet) return;
    await addQuote({
      text: snippet,
      author: selected.payload.poetName || 'Şair',
      sourceModule: 'siir-deryasi',
      sourceEntityId: selected.id,
      sourceTitle: selected.title,
      category: 'Şiir',
      tags: ['Şiir Deryası', selected.payload.theme].filter(Boolean),
      isFavorite: false,
      isArchived: false,
      isDemo: false,
    });
    setQuoteSelection('');
    notify('Seçili dizeler Alıntı Defterim modülüne gönderildi.');
  };

  const handleInspectWord = () => {
    const clean = inspectWord.trim();
    if (!clean) return;
    navigate(`/modul/kelime-muzesi?word=${encodeURIComponent(clean)}`);
  };

  const handleExportToAutoMusic = async () => {
    if (!selected || !selected.payload.isPersonal) return;
    const created = await addModuleRecord({
      moduleId: 'automusicpro',
      entityType: 'composition',
      title: `${selected.title} — Beste Taslağı`,
      subtitle: 'Şiir Deryası kaynaklı özgür şiir bestesi',
      category: 'Şiir Bestesi',
      tags: ['Şiir Deryası', 'Beste'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'siir-deryasi',
      sourceEntityId: selected.id,
      sourceLabel: selected.title,
      payload: {
        bpm: 84,
        scale: 'Hicaz / Minör',
        lyrics: selected.payload.lines,
        steps: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
        melodyNotes: ['A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'G4'],
      },
    });
    notify('Özgün şiir AutoMusicPro beste taslağına aktarıldı.');
    navigate(`/modul/automusicpro?recordId=${created.id}`);
  };

  const compPoemA = poems.find((p) => p.id === compareA);
  const compPoemB = poems.find((p) => p.id === compareB);
  const prosodyA = compPoemA ? analyzePoemProsody(compPoemA.payload.lines) : null;
  const prosodyB = compPoemB ? analyzePoemProsody(compPoemB.payload.lines) : null;

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="siir-deryasi"
        recordCount={allRecords.length}
        primaryActionLabel="Yeni Şiir / Şair"
        onPrimaryAction={() => setShowNew((v) => !v)}
        csvRows={poems.map((p) => ({
          Baslik: p.title,
          Sair: p.payload.poetName,
          Tema: p.payload.theme,
          Kisisel: p.payload.isPersonal ? 'Evet' : 'Hayır',
        }))}
        onImportRecords={async (items) => {
          for (const item of items) {
            if (!item.title) continue;
            await addModuleRecord<PoemPayload>({
              moduleId: 'siir-deryasi',
              entityType: 'poem',
              title: item.title,
              subtitle: item.subtitle ?? '',
              category: item.category ?? 'Genel',
              tags: item.tags ?? [],
              isFavorite: false,
              isArchived: false,
              privacyDomain: 'genel',
              payload: (item.payload as unknown as PoemPayload) ?? {
                kind: 'poem',
                poetName: 'İçe Aktarılan',
                lines: '',
                theme: 'Genel',
                isPersonal: false,
                notes: '',
              },
            });
          }
        }}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40 text-[#141923] dark:text-[#F1F3F5]">
          {feedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'poems', label: `Şiir Arşivi (${poems.length})` },
          { id: 'poets', label: `Şair Profilleri (${poets.length})` },
          { id: 'compare', label: 'Şiir Karşılaştırma' },
          { id: 'history', label: 'Okuma Geçmişi' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`h-8 px-3 text-xs rounded-lg inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-[#D5B477] text-[#10151E] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Yeni Şiir veya Şair Profili</h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setNewKind('poem')}
                className={`h-8 px-3 rounded-lg border inline-flex items-center justify-center whitespace-nowrap shrink-0 ${
                  newKind === 'poem' ? 'border-[#D5B477] bg-[#D5B477]/15 font-medium' : 'border-black/10 dark:border-white/10'
                }`}
              >
                Şiir
              </button>
              <button
                type="button"
                onClick={() => setNewKind('poet')}
                className={`h-8 px-3 rounded-lg border inline-flex items-center justify-center whitespace-nowrap shrink-0 ${
                  newKind === 'poet' ? 'border-[#D5B477] bg-[#D5B477]/15 font-medium' : 'border-black/10 dark:border-white/10'
                }`}
              >
                Şair Profili
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={newKind === 'poet' ? 'Şair adı...' : 'Şiir başlığı...'}
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            {newKind === 'poem' ? (
              <input
                type="text"
                value={poetName}
                onChange={(e) => setPoetName(e.target.value)}
                placeholder="Şair (ör. Yunus Emre / Kendi)"
                className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            ) : (
              <input
                type="text"
                value={era}
                onChange={(e) => setEra(e.target.value)}
                placeholder="Dönem / Yüzyıl..."
                className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            )}
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Tema / Koleksiyon (ör. Tabiat, Tefekkür)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>

          <textarea
            rows={6}
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            placeholder={newKind === 'poet' ? 'Şairin biyografisi ve edebî yönü...' : 'Dizeleri alt alta yazınız...'}
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 font-serif"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
              />
              <span>Özgün kendi şiirim (AutoMusicPro besteleme için uygun)</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="h-8 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 inline-flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="h-8 px-4 text-xs font-medium rounded-lg bg-[#D5B477] text-[#10151E] inline-flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Kaydet
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === 'compare' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeftRight className="w-4 h-4 text-[#D5B477]" />
            <span>İki Şiiri Yapısal ve Tematik Olarak Karşılaştır</span>
          </div>
          {poems.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Karşılaştırma yapabilmek için en az bir şiir ekleyin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { val: compareA, set: setCompareA, poem: compPoemA, info: prosodyA, label: 'Birinci Şiir' },
                { val: compareB, set: setCompareB, poem: compPoemB, info: prosodyB, label: 'İkinci Şiir' },
              ].map((slot, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-3">
                  <select
                    value={slot.val}
                    onChange={(e) => slot.set(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                  >
                    <option value="">{slot.label} seç...</option>
                    {poems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — {p.payload.poetName}
                      </option>
                    ))}
                  </select>
                  {slot.poem && slot.info && (
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-sm">{slot.poem.title}</p>
                      <p className="text-[#546070] dark:text-[#9BA7B6]">
                        {slot.poem.payload.poetName} · {slot.poem.payload.theme}
                      </p>
                      <p className="tabular-nums">
                        Dize Sayısı: {slot.info.lineCount} · Ölçü: {slot.info.meterLabel}
                      </p>
                      <p className="font-serif whitespace-pre-line text-sm pt-2 border-t border-black/10 dark:border-white/10">
                        {slot.poem.payload.lines}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <h2 className="text-sm font-semibold">Şiir Okuma ve İnceleme Geçmişi</h2>
          {poems.filter((p) => p.payload.lastReadAt).length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Henüz okuma geçmişi kaydı oluşmadı. Arşivden bir şiir açtığınızda burada listelenir.
            </div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {poems
                .filter((p) => p.payload.lastReadAt)
                .sort((a, b) => (b.payload.lastReadAt ?? '').localeCompare(a.payload.lastReadAt ?? ''))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setTab('poems');
                      setSearchParams({ recordId: p.id });
                    }}
                    className="w-full py-2.5 flex items-center justify-between text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded"
                  >
                    <span>
                      <strong className="text-sm">{p.title}</strong> · {p.payload.poetName}
                    </span>
                    <span className="tabular-nums text-[#546070] dark:text-[#9BA7B6]">
                      {p.payload.readCount ?? 1} kez okundu ·{' '}
                      {new Date(p.payload.lastReadAt!).toLocaleDateString('tr-TR')}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {(tab === 'poems' || tab === 'poets') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Başlık, şair veya dize ara..."
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                />
              </div>
              {tab === 'poems' && (
                <select
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
                  className="h-9 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                >
                  <option value="all">Tümü</option>
                  <option value="personal">Kişisel Şiirlerim</option>
                  <option value="archive">Şiir Arşivi</option>
                  <option value="fav">Favoriler</option>
                </select>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[#D5B477]/15 flex items-center justify-between gap-2 text-xs">
                <span className="tabular-nums">{selectedIds.length} seçili</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await bulkUpdateModuleRecords(selectedIds, 'archive');
                      setSelectedIds([]);
                    }}
                    className="h-7 px-2.5 rounded border border-[#D5B477]/40 hover:bg-[#D5B477]/20 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                  >
                    Arşivle
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await bulkUpdateModuleRecords(selectedIds, 'favorite');
                      setSelectedIds([]);
                    }}
                    className="h-7 px-2.5 rounded border border-[#D5B477]/40 hover:bg-[#D5B477]/20 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                  >
                    Favorile
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {(tab === 'poets' ? poets : filteredPoems).map((item) => {
                const active = item.id === selected?.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      active
                        ? 'bg-[#D5B477]/12 border-[#D5B477]'
                        : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10 hover:border-[#D5B477]/50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                          )
                        }
                        className="mt-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSelectPoem(item)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate">{item.title}</span>
                          {item.payload.isPersonal && (
                            <span className="text-[11px] font-medium text-[#D5B477] shrink-0">Özgün</span>
                          )}
                        </div>
                        <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 truncate">
                          {item.payload.kind === 'poet'
                            ? `${item.payload.era ?? 'Dönem belirtilmemiş'}`
                            : `${item.payload.poetName} · ${item.payload.theme}`}
                        </p>
                      </button>
                    </div>
                  </div>
                );
              })}

              {(tab === 'poets' ? poets : filteredPoems).length === 0 && (
                <div className="p-6 text-center rounded-xl border border-dashed border-black/15 dark:border-white/15 text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Kayıt bulunamadı. Yeni şiir veya şair profili ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>

          {/* Right Detail */}
          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                      {selected.payload.kind === 'poet' ? <User className="w-3.5 h-3.5" /> : <Feather className="w-3.5 h-3.5 text-[#D5B477]" />}
                      <span>
                        {selected.payload.kind === 'poet'
                          ? `Şair Profili · ${selected.payload.era ?? ''}`
                          : `${selected.payload.poetName} · ${selected.payload.theme}`}
                      </span>
                      {selected.payload.isPersonal && <span>· Özgün Eserim</span>}
                    </div>
                    <h2 className="text-2xl font-serif font-semibold mt-1">{selected.title}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateModuleRecord(selected.id, { isFavorite: !selected.isFavorite })}
                      className="h-8 px-2.5 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                    >
                      {selected.isFavorite ? 'Favori ★' : 'Favorile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                      title="Kaydı sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selected.payload.kind === 'poet' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {selected.payload.bio || 'Biyografi notu henüz eklenmedi.'}
                  </p>
                ) : (
                  <>
                    {/* Poem Text + Line-by-line Syllable Breakdown */}
                    <div className="p-5 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] space-y-2">
                      {prosody?.syllablesPerLine.map((row, idx) => (
                        <div key={idx} className="flex items-baseline justify-between gap-4">
                          <span className="font-serif text-base leading-relaxed">{row.line}</span>
                          <span className="text-[11px] font-mono tabular-nums text-[#546070] dark:text-[#9BA7B6] shrink-0">
                            {row.syllables} hece
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Prosody Analysis Box */}
                    {prosody && (
                      <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Sparkles className="w-4 h-4 text-[#D5B477]" />
                          <span>Hece Ölçüsü, Kafiye ve Redif Çözümlemesi</span>
                        </div>
                        <p className="tabular-nums">
                          <strong>Toplam Dize:</strong> {prosody.lineCount} · <strong>Ölçü Tespiti:</strong> {prosody.meterLabel}
                        </p>
                        <p>
                          <strong>Benzer Ses Sonlanmaları (Kafiye İpuçları):</strong>{' '}
                          {prosody.rhymePairs.length > 0
                            ? prosody.rhymePairs.map((rp) => `${rp.ending} (dize ${rp.lines.join(',')})`).join(' · ')
                            : 'Düzenli son ses tekrarı tespit edilmedi.'}
                        </p>
                        <p>
                          <strong>Tekrarlanan Son Sözcükler (Olası Redif):</strong>{' '}
                          {prosody.repeatedEndWords.length > 0
                            ? prosody.repeatedEndWords.map((rw) => `"${rw.word}" (dize ${rw.lines.join(',')})`).join(' · ')
                            : 'Tekrarlanan son sözcük yok.'}
                        </p>
                      </div>
                    )}

                    {/* Cross-module actions */}
                    <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] space-y-3 text-xs">
                      <p className="font-semibold">Modüller Arası Aktarım</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={quoteSelection}
                            onChange={(e) => setQuoteSelection(e.target.value)}
                            placeholder="Alıntı yapılacak dize (boşsa ilk 2 dize)..."
                            className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                          />
                          <button
                            type="button"
                            onClick={handleSendToQuotes}
                            className="h-9 inline-flex items-center justify-center gap-1 px-3 rounded-lg bg-[#71C6BD] text-[#10151E] font-medium whitespace-nowrap shrink-0"
                          >
                            <Quote className="w-3.5 h-3.5" />
                            Alıntıla
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={inspectWord}
                            onChange={(e) => setInspectWord(e.target.value)}
                            placeholder="Kelime Müzesi'nde incele..."
                            className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                          />
                          <button
                            type="button"
                            onClick={handleInspectWord}
                            className="h-9 inline-flex items-center justify-center gap-1 px-3 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#D5B477]" />
                            İncele
                          </button>
                        </div>
                      </div>

                      {selected.payload.isPersonal && (
                        <button
                          type="button"
                          onClick={handleExportToAutoMusic}
                          className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#88B4FF]/20 text-[#141923] dark:text-[#88B4FF] font-medium whitespace-nowrap shrink-0"
                        >
                          <Music className="w-3.5 h-3.5" />
                          Özgün Şiiri AutoMusicPro’ya Aktar
                        </button>
                      )}
                    </div>
                  </>
                )}

                <RecordActionsBar
                  moduleId="siir-deryasi"
                  entityId={selected.id}
                  entityType={selected.entityType}
                  entityLabel={selected.title}
                  privacyDomain="genel"
                  nodeType="siir"
                  summary={`${selected.payload.poetName} · Şiir Deryası`}
                />
              </div>
            ) : (
              <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                İncelemek için soldan bir şiir veya şair profili seçin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Şiir Kaydını Sil"
        message={`"${deleteTarget?.title}" kaydını silmek istediğinize emin misiniz?`}
        danger
        confirmLabel="Sil"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteModuleRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
