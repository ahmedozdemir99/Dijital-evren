import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Atom, BookOpen, FlaskConical, Microscope, Search, Sparkles, Trash2, Zap } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface SciencePayload {
  discipline: 'Fizik' | 'Kimya' | 'Biyoloji' | 'Astronomi' | 'Teknoloji';
  scientist: string;
  year: number;
  summary: string;
  formula?: string;
}

export function ScienceMuseumModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('bilim-muzesi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'bilim-muzesi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const exhibits = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'bilim-muzesi' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<SciencePayload>>,
    [moduleRecords, showDemo]
  );

  const [tab, setTab] = useState<'galleries' | 'labs'>('galleries');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  const selectedId = searchParams.get('recordId') || exhibits[0]?.id || null;
  const selected = exhibits.find((e) => e.id === selectedId) ?? null;

  // Interactive Lab 1: Ohm's Law
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(4);
  const currentAmps = resistance > 0 ? voltage / resistance : 0;

  // Interactive Lab 2: Simple Pendulum
  const [lengthM, setLengthM] = useState(1.0);
  const [gravity, setGravity] = useState(9.81);
  const periodSec = 2 * Math.PI * Math.sqrt(lengthM / gravity);

  // Interactive Lab 3: pH Scale
  const [phVal, setPhVal] = useState(7.0);
  const [massKg, setMassKg] = useState(2);
  const [speed, setSpeed] = useState(5);

  // New Exhibit Form
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<SciencePayload['discipline']>('Fizik');
  const [scientist, setScientist] = useState('');
  const [year, setYear] = useState(1905);
  const [summary, setSummary] = useState('');
  const [formula, setFormula] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<SciencePayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return exhibits
      .filter((e) => {
        if (disciplineFilter !== 'all' && e.payload.discipline !== disciplineFilter) return false;
        if (!q) return true;
        return (
          e.title.toLocaleLowerCase('tr-TR').includes(q) ||
          e.payload.scientist.toLocaleLowerCase('tr-TR').includes(q) ||
          e.payload.summary.toLocaleLowerCase('tr-TR').includes(q)
        );
      })
      .sort((a, b) => a.payload.year - b.payload.year);
  }, [exhibits, disciplineFilter, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    const created = await addModuleRecord<SciencePayload>({
      moduleId: 'bilim-muzesi',
      entityType: 'science_discovery',
      title: title.trim(),
      subtitle: `${scientist.trim() || 'Bilim İnsanı'} · ${year}`,
      category: discipline,
      tags: [discipline],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        discipline,
        scientist: scientist.trim() || 'Bilinmeyen',
        year: Number(year),
        summary: summary.trim(),
        formula: formula.trim() || undefined,
      },
    });
    setTitle('');
    setScientist('');
    setSummary('');
    setFormula('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleSendToWorldbuilder = async (item: ModuleRecord<SciencePayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'kendi-dunyam',
      entityType: 'fictional_world',
      title: `Bilimsel İlke İlhamı: ${item.title}`,
      subtitle: `${item.payload.discipline} · Bilim Müzesi esinli kurgu`,
      category: 'Bilim-Kurgu Evreni',
      tags: ['Kurgu', 'Bilim Müzesi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      sourceModule: 'bilim-muzesi',
      sourceEntityId: item.id,
      sourceLabel: item.title,
      payload: {
        worldName: `${item.title} Temelli Dünya`,
        eraLabel: 'Bilimsel Dönem',
        cultures: `Bilimsel İlke: ${item.payload.summary}${item.payload.formula ? `\nFormül: ${item.payload.formula}` : ''}`,
        conlangNotes: '',
        characters: '',
        timelineText: `${item.payload.scientist} (${item.payload.year}) keşfinden uyarlanan teknolojik eşik.`,
        pins: [{ id: 'pin-1', name: 'Bilim Kenti', kind: 'city', x: 240, y: 120 }],
      },
    });
    setFeedback('Keşif kaydı Kendi Dünyam için bilimsel ilham taslağına aktarıldı.');
    setTimeout(() => setFeedback(null), 2600);
    navigate(`/modul/kendi-dunyam?recordId=${rec.id}`);
  };

  const handleSendToEncyclopedia = async (item: ModuleRecord<SciencePayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'kendi-ansiklopedim',
      entityType: 'encyclopedia_article',
      title: item.title,
      subtitle: `${item.payload.discipline} · ${item.payload.scientist} (${item.payload.year})`,
      category: item.payload.discipline,
      tags: ['Bilim Müzesi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'bilim-muzesi',
      sourceEntityId: item.id,
      sourceLabel: item.title,
      payload: {
        status: 'taslak',
        verification: 'inceleniyor',
        body: `${item.payload.summary}${item.payload.formula ? `\n\nFormül / İlke: ${item.payload.formula}` : ''}`,
        bibliography: `Bilim Müzesi kaydı · ${item.payload.scientist} (${item.payload.year})`,
        versions: [
          {
            savedAt: new Date().toISOString(),
            summary: 'Bilim Müzesi üzerinden ansiklopedi maddesi olarak aktarıldı',
          },
        ],
      },
    });
    setFeedback('Keşif kaydı Kendi Ansiklopedim taslak maddesine eklendi.');
    setTimeout(() => setFeedback(null), 2600);
    navigate(`/modul/kendi-ansiklopedim?recordId=${rec.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="bilim-muzesi"
        recordCount={exhibits.length}
        primaryActionLabel="Yeni Keşif / Sergi"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#88B4FF]/15 border border-[#88B4FF]/40">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setTab('galleries')}
          className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg whitespace-nowrap shrink-0 ${
            tab === 'galleries'
              ? 'bg-[#88B4FF] text-[#10151E] font-medium'
              : 'text-[#546070] dark:text-[#9BA7B6]'
          }`}
        >
          <Microscope className="w-3.5 h-3.5" />
          Sergi Salonları ve Zaman Çizelgesi ({exhibits.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('labs')}
          className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg whitespace-nowrap shrink-0 ${
            tab === 'labs'
              ? 'bg-[#88B4FF] text-[#10151E] font-medium'
              : 'text-[#546070] dark:text-[#9BA7B6]'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Etkileşimli Deney Simülasyonları
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Bilimsel Keşif Kaydı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Keşif veya icat adı..."
              required
              className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as SciencePayload['discipline'])}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="Fizik">Fizik</option>
              <option value="Kimya">Kimya</option>
              <option value="Biyoloji">Biyoloji</option>
              <option value="Astronomi">Astronomi</option>
              <option value="Teknoloji">Teknoloji</option>
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={scientist}
              onChange={(e) => setScientist(e.target.value)}
              placeholder="Bilim insanı..."
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="İlişkili denklem / ilke (isteğe bağlı)"
              className="h-9 px-3 text-xs font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Keşfin bilimsel açıklaması..."
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">
              Vazgeç
            </button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#88B4FF] text-[#10151E] whitespace-nowrap shrink-0">
              Kaydet
            </button>
          </div>
        </form>
      )}

      {tab === 'labs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 tabular-nums">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Zap className="w-4 h-4 text-[#D6B782]" />
              <span>Ohm Yasası (V = I · R)</span>
            </div>
            <label className="block text-xs space-y-1">
              <span>Gerilim (V): {voltage} V</span>
              <input type="range" min={1} max={48} value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
            </label>
            <label className="block text-xs space-y-1">
              <span>Direnç (R): {resistance} Ω</span>
              <input type="range" min={1} max={20} value={resistance} onChange={(e) => setResistance(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
            </label>
            <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-mono text-xs space-y-1">
              <p>Akım (I) = {currentAmps.toFixed(2)} A</p>
              <p>Güç (P) = {(voltage * currentAmps).toFixed(1)} W</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Atom className="w-4 h-4 text-[#88B4FF]" />
              <span>Basit Sarkaç Periyodu</span>
            </div>
            <label className="block text-xs space-y-1">
              <span>İp Uzunluğu (L): {lengthM.toFixed(2)} m</span>
              <input type="range" min={0.2} max={5} step={0.1} value={lengthM} onChange={(e) => setLengthM(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
            </label>
            <label className="block text-xs space-y-1">
              <span>Yerçekimi (g): {gravity.toFixed(2)} m/s²</span>
              <select value={gravity} onChange={(e) => setGravity(Number(e.target.value))} className="w-full h-9 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10">
                <option value={9.81}>Dünya (9.81 m/s²)</option>
                <option value={1.62}>Ay (1.62 m/s²)</option>
                <option value={3.72}>Mars (3.72 m/s²)</option>
              </select>
            </label>
            <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-mono text-xs">
              T = 2π√(L/g) = <strong>{periodSec.toFixed(3)} s</strong>
              <p className="mt-2 font-sans">Küçük salınım açısı, sürtünmesiz ortam ve ideal ip varsayımı.</p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <FlaskConical className="w-4 h-4 text-[#71C6BD]" />
              <span>Kimya pH Ölçeği</span>
            </div>
            <label className="block text-xs space-y-1">
              <span>pH Değeri: {phVal.toFixed(1)}</span>
              <input type="range" min={0} max={14} step={0.5} value={phVal} onChange={(e) => setPhVal(Number(e.target.value))} className="w-full accent-[#71C6BD]" />
            </label>
            <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs space-y-1">
              <p>
                <strong>Durum:</strong>{' '}
                {phVal < 7 ? 'Asidik Çözelti' : phVal > 7 ? 'Bazik (Alkali) Çözelti' : 'Nötr (25 °C)'}
              </p>
              <p className="font-mono text-[#546070] dark:text-[#9BA7B6]">
                [H⁺] ≈ 10^(-{phVal.toFixed(1)}) mol/L
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'labs' && (
        <section className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <h2 className="font-semibold">Hareket Laboratuvarı — Kinetik Enerji</h2>
          <label className="block text-sm">Kütle: {massKg} kg
            <input type="range" min={1} max={100} value={massKg} onChange={e => setMassKg(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
          </label>
          <label className="block text-sm">Sürat: {speed} m/s
            <input type="range" min={0} max={40} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
          </label>
          <p className="font-mono">E = ½mv² = {(0.5 * massKg * speed ** 2).toFixed(1)} J</p>
          <p className="font-mono">Momentum = {(massKg * speed).toFixed(1)} kg·m/s</p>
          <p className="text-xs">Klasik mekanikte sürat iki katına çıkarsa kinetik enerji dört katına çıkar.</p>
        </section>
      )}

      {tab === 'galleries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Keşif veya bilim insanı ara..."
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                />
              </div>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
              >
                <option value="all">Tüm Dallar</option>
                <option value="Fizik">Fizik</option>
                <option value="Kimya">Kimya</option>
                <option value="Biyoloji">Biyoloji</option>
                <option value="Astronomi">Astronomi</option>
                <option value="Teknoloji">Teknoloji</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Arama veya bilim dalı filtresine uygun keşif kaydı bulunamadı.
                </div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSearchParams({ recordId: item.id })}
                    className={`w-full text-left p-3.5 rounded-xl border ${
                      item.id === selected?.id
                        ? 'bg-[#88B4FF]/12 border-[#88B4FF]'
                        : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{item.title}</span>
                      <span className="text-xs font-mono tabular-nums text-[#88B4FF]">{item.payload.year}</span>
                    </div>
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                      {item.payload.discipline} · {item.payload.scientist}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#88B4FF]">
                      {selected.payload.discipline} · {selected.payload.scientist} ({selected.payload.year})
                    </p>
                    <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    aria-label="Keşif kaydını sil"
                    className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm leading-relaxed">{selected.payload.summary}</p>
                {selected.payload.formula && (
                  <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-mono text-sm text-[#88B4FF]">
                    {selected.payload.formula}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendToWorldbuilder(selected)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#A78BFA] text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    Kendi Dünyam’a İlham Aktar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToEncyclopedia(selected)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-4 h-4" />
                    Kendi Ansiklopedim’e Aktar
                  </button>
                </div>

                <RecordActionsBar
                  moduleId="bilim-muzesi"
                  entityId={selected.id}
                  entityType="science_discovery"
                  entityLabel={selected.title}
                  privacyDomain="genel"
                />
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
                <Microscope className="w-7 h-7 text-[#88B4FF] mx-auto" />
                <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Ayrıntılarını görmek için soldan bir keşif seçin veya yeni bir keşif ekleyin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Keşif Kaydını Sil"
        message={`"${deleteTarget?.title}" kaydını silmek istiyor musunuz?`}
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
