import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookMarked, BookOpen, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface LiteratureAnalysisPayload {
  movement: string;
  narratorType: string;
  rhetoricalFigures: string[];
  characters: string;
  symbolsAndMotifs: string;
  excerpt: string;
  analysisText: string;
  sourceKind: 'book' | 'poem' | 'independent';
  sourceRefId?: string;
}

const RHETORICAL_LIST = [
  'Teşbih (Benzetme)',
  'İstiare (Eğretileme)',
  'Kinaye',
  'Tevriye',
  'Telmih (Hatırlatma)',
  'Hüsn-i Talil',
  'Tezat (Karşıtlık)',
  'Mübalağa',
  'Teşhis ve İntak',
];

export function LiteratureWorkshopModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    books,
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('edebiyat-atolyesi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'edebiyat-atolyesi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const poems = useMemo(
    () => moduleRecords.filter((r) => r.moduleId === 'siir-deryasi' && r.entityType !== 'poet'),
    [moduleRecords]
  );

  const analyses = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'edebiyat-atolyesi' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<LiteratureAnalysisPayload>>,
    [moduleRecords, showDemo]
  );

  const selectedId = searchParams.get('recordId') || analyses[0]?.id || null;
  const selected = analyses.find((a) => a.id === selectedId) ?? null;

  const [query, setQuery] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [movement, setMovement] = useState('Modern Türk Edebiyatı');
  const [narratorType, setNarratorType] = useState('İlahi / Hâkim Bakış Açısı');
  const [sourceSelection, setSourceSelection] = useState('independent:');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [characters, setCharacters] = useState('');
  const [symbolsAndMotifs, setSymbolsAndMotifs] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<LiteratureAnalysisPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return analyses.filter((a) => {
      if (movementFilter !== 'all' && a.payload.movement !== movementFilter) return false;
      if (!q) return true;
      return (
        a.title.toLocaleLowerCase('tr-TR').includes(q) ||
        a.payload.analysisText.toLocaleLowerCase('tr-TR').includes(q) ||
        a.payload.symbolsAndMotifs.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [analyses, query, movementFilter]);

  const movements = useMemo(
    () => Array.from(new Set(analyses.map((a) => a.payload.movement).filter(Boolean))),
    [analyses]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !analysisText.trim()) return;
    const [kind, refId] = sourceSelection.split(':') as ['book' | 'poem' | 'independent', string];
    const book = kind === 'book' ? books.find((b) => b.id === refId) : undefined;
    const poem = kind === 'poem' ? poems.find((p) => p.id === refId) : undefined;

    const created = await addModuleRecord<LiteratureAnalysisPayload>({
      moduleId: 'edebiyat-atolyesi',
      entityType: 'literary_analysis',
      title: title.trim(),
      subtitle: `${movement}${book ? ` · ${book.title}` : poem ? ` · ${poem.title}` : ''}`,
      category: movement,
      tags: selectedFigures,
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: kind === 'book' ? 'dijital-kutuphanem' : kind === 'poem' ? 'siir-deryasi' : undefined,
      sourceEntityId: refId || undefined,
      sourceLabel: book?.title ?? poem?.title,
      payload: {
        movement,
        narratorType,
        rhetoricalFigures: selectedFigures,
        characters: characters.trim(),
        symbolsAndMotifs: symbolsAndMotifs.trim(),
        excerpt: excerpt.trim(),
        analysisText: analysisText.trim(),
        sourceKind: kind,
        sourceRefId: refId || undefined,
      },
    });
    setTitle('');
    setExcerpt('');
    setAnalysisText('');
    setSelectedFigures([]);
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleSendToEncyclopedia = async (item: ModuleRecord<LiteratureAnalysisPayload>) => {
    const entry = await addModuleRecord({
      moduleId: 'kendi-ansiklopedim',
      entityType: 'encyclopedia_article',
      title: `Edebî Çözümleme: ${item.title}`,
      subtitle: `${item.payload.movement} · Edebiyat Atölyesi`,
      category: 'Türk Dili ve Edebiyatı',
      tags: ['Edebiyat Atölyesi', ...item.payload.rhetoricalFigures.slice(0, 2)],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'edebiyat-atolyesi',
      sourceEntityId: item.id,
      sourceLabel: item.title,
      payload: {
        status: 'taslak',
        verification: 'inceleniyor',
        body: `${item.payload.analysisText}\n\nSemboller ve Motifler: ${item.payload.symbolsAndMotifs}`,
        bibliography: item.sourceLabel ? `Kaynak: ${item.sourceLabel}` : 'Edebiyat Atölyesi çözümlemesi',
        versions: [
          {
            savedAt: new Date().toISOString(),
            summary: 'Edebiyat Atölyesi üzerinden ansiklopedi taslağı olarak aktarıldı',
          },
        ],
      },
    });
    setFeedback('Çözümleme Kendi Ansiklopedim taslak maddesi olarak aktarıldı.');
    setTimeout(() => setFeedback(null), 2600);
    navigate(`/modul/kendi-ansiklopedim?recordId=${entry.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="edebiyat-atolyesi"
        recordCount={analyses.length}
        primaryActionLabel="Yeni Çözümleme"
        onPrimaryAction={() => setShowNew((v) => !v)}
        csvRows={analyses.map((a) => ({
          Baslik: a.title,
          Akim: a.payload.movement,
          Anlatici: a.payload.narratorType,
          Sanatlar: a.payload.rhetoricalFigures.join(' | '),
        }))}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40">
          {feedback}
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <h2 className="text-base font-semibold">Yeni Edebî Metin Çözümlemesi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Çözümleme başlığı..."
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={movement}
              onChange={(e) => setMovement(e.target.value)}
              placeholder="Edebî akım / dönem..."
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={sourceSelection}
              onChange={(e) => setSourceSelection(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="independent:">Bağımsız Metin</option>
              {books.map((b) => (
                <option key={b.id} value={`book:${b.id}`}>
                  Kitap (Kütüphane): {b.title}
                </option>
              ))}
              {poems.map((p) => (
                <option key={p.id} value={`poem:${p.id}`}>
                  Şiir (Şiir Deryası): {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={narratorType}
              onChange={(e) => setNarratorType(e.target.value)}
              placeholder="Anlatıcı / Bakış açısı..."
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder="Karakter inceleme özeti..."
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">
              Tespit Edilen Edebî Sanatlar
            </p>
            <div className="flex flex-wrap gap-2">
              {RHETORICAL_LIST.map((fig) => {
                const active = selectedFigures.includes(fig);
                return (
                  <button
                    key={fig}
                    type="button"
                    onClick={() =>
                      setSelectedFigures((prev) =>
                        active ? prev.filter((x) => x !== fig) : [...prev, fig]
                      )
                    }
                    className={`h-8 px-2.5 text-xs rounded-lg border inline-flex items-center justify-center whitespace-nowrap ${
                      active
                        ? 'bg-[#D5B477] text-[#10151E] border-[#D5B477] font-medium'
                        : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {fig}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            type="text"
            value={symbolsAndMotifs}
            onChange={(e) => setSymbolsAndMotifs(e.target.value)}
            placeholder="Metafor, sembol ve ana motifler..."
            className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />

          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="İncelenen kısa pasaj..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 font-serif"
          />
          <textarea
            rows={4}
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            placeholder="Metin çözümlemesi ve yorumunuz..."
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
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
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Analiz veya motif ara..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
              />
            </div>
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="h-9 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="all">Tüm Akımlar</option>
              {movements.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSearchParams({ recordId: a.id })}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                  a.id === selected?.id
                    ? 'bg-[#D5B477]/12 border-[#D5B477]'
                    : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                }`}
              >
                <p className="font-semibold text-sm truncate">{a.title}</p>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 truncate">
                  {a.payload.movement} · {a.payload.narratorType}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                Filtreye uygun edebî çözümleme bulunamadı.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#D5B477]">
                    {selected.payload.movement} · {selected.payload.narratorType}
                  </p>
                  <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                  {selected.sourceLabel && (
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6] inline-flex items-center gap-1 mt-1">
                      <BookMarked className="w-3.5 h-3.5" />
                      Kaynak Referansı: {selected.sourceLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selected)}
                  title="Çözümlemeyi sil"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {selected.payload.excerpt && (
                <blockquote className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-serif italic text-sm">
                  “{selected.payload.excerpt}”
                </blockquote>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-line">
                {selected.payload.analysisText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                  <strong>Edebî Sanatlar:</strong>{' '}
                  {selected.payload.rhetoricalFigures.length > 0
                    ? selected.payload.rhetoricalFigures.join(' · ')
                    : 'Belirtilmedi'}
                </div>
                <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                  <strong>Sembol ve Motifler:</strong> {selected.payload.symbolsAndMotifs || '—'}
                </div>
              </div>

              {selected.payload.characters && (
                <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs">
                  <strong>Karakter İncelemesi:</strong> {selected.payload.characters}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => handleSendToEncyclopedia(selected)}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  Kendi Ansiklopedim’e Taslak Aktar
                </button>
              </div>

              <RecordActionsBar
                moduleId="edebiyat-atolyesi"
                entityId={selected.id}
                entityType="literary_analysis"
                entityLabel={selected.title}
                privacyDomain="genel"
                nodeType="kavram"
                summary={selected.subtitle}
              />
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
              Çözümleme seçin veya yeni bir edebî analiz oluşturun.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Çözümlemeyi Sil"
        message={`"${deleteTarget?.title}" çözümlemesini silmek istiyor musunuz?`}
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
