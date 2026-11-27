import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Compass,
  Globe,
  MapPin,
  RotateCcw,
  Sparkles,
  Split,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

type HistoryRecordKind =
  | 'event'
  | 'world_history'
  | 'turkish_history'
  | 'civilization'
  | 'state'
  | 'figure'
  | 'city_memory';

interface HistoryEventPayload {
  kind: HistoryRecordKind;
  scope?: 'Dünya Tarihi' | 'Türk Tarihi';
  year: number;
  endYear?: number;
  region: string;
  modernPlaceName: string;
  lat: number;
  lng: number;
  summary: string;
  bibliography: string;
  uncertainty: 'kesin' | 'tartismali' | 'sinirli_kaynak';
  isFictionalSimulation?: false;
}

interface BranchOption {
  label: string;
  outcome: string;
  stabilityDelta: number;
  economyDelta: number;
}

interface SimulatorPayload {
  kind: 'alt_history_scenario';
  isFictionalSimulation: true;
  realHistoryFact?: string;
  anchorEventId?: string;
  baseEventTitle?: string;
  pivotYear?: number;
  hypothesis?: string;
  decisionQuestion?: string;
  stability?: number;
  economy?: number;
  branches: BranchOption[];
}

type HistoryTab = 'atlas' | 'civilizations' | 'cities' | 'compare' | 'simulator';

const KIND_LABELS: Record<HistoryRecordKind, string> = {
  event: 'Tarihî Olay',
  world_history: 'Dünya Tarihi',
  turkish_history: 'Türk Tarihi',
  civilization: 'Medeniyet',
  state: 'Devlet / İmparatorluk',
  figure: 'Tarihî Şahsiyet',
  city_memory: 'Şehrin Hafızası',
};

function projectGeo(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 800;
  const y = ((90 - lat) / 180) * 400;
  return { x, y };
}

function formatYear(y: number): string {
  return y < 0 ? `MÖ ${Math.abs(y)}` : String(y);
}

export function HistoryAtlasModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('tarih-atlasi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'tarih-atlasi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const allRecords = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'tarih-atlasi' && !r.isArchived && (showDemo || !r.isDemo)
      ),
    [moduleRecords, showDemo]
  );

  // Strict separation: documented historical records vs counterfactual simulations
  const historicalEvents = useMemo(
    () =>
      allRecords.filter((r) => {
        const p = r.payload as { isFictionalSimulation?: boolean; kind?: string };
        return r.entityType !== 'alt_history_scenario' && !p?.isFictionalSimulation && p?.kind !== 'alt_history_scenario';
      }) as Array<ModuleRecord<HistoryEventPayload>>,
    [allRecords]
  );

  const scenarios = useMemo(
    () =>
      allRecords.filter((r) => {
        const p = r.payload as { isFictionalSimulation?: boolean; kind?: string };
        return r.entityType === 'alt_history_scenario' || p?.isFictionalSimulation === true || p?.kind === 'alt_history_scenario';
      }) as Array<ModuleRecord<SimulatorPayload>>,
    [allRecords]
  );

  const paramTab = searchParams.get('tab');
  const paramRecordId = searchParams.get('recordId');

  const [tab, setTab] = useState<HistoryTab>(paramTab === 'simulator' ? 'simulator' : 'atlas');
  const [yearSlider, setYearSlider] = useState<number>(2025);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Dünya Tarihi' | 'Türk Tarihi'>('all');
  const [showNew, setShowNew] = useState(false);
  const [showNewScenario, setShowNewScenario] = useState(false);

  // Sync tab when URL query selects simulator or a scenario record
  useEffect(() => {
    if (paramTab === 'simulator') {
      setTab('simulator');
    } else if (paramRecordId && scenarios.some((s) => s.id === paramRecordId)) {
      setTab('simulator');
    }
  }, [paramTab, paramRecordId, scenarios]);

  const selectedEventId =
    (paramRecordId && historicalEvents.some((e) => e.id === paramRecordId) ? paramRecordId : null) ??
    historicalEvents[0]?.id ??
    null;
  const selectedEvent = historicalEvents.find((e) => e.id === selectedEventId) ?? null;

  const selectedScenarioId =
    (paramRecordId && scenarios.some((s) => s.id === paramRecordId) ? paramRecordId : null) ??
    scenarios[0]?.id ??
    null;
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  // Comparative history second slot
  const [compareRightId, setCompareRightId] = useState<string>('');
  const compareRight =
    historicalEvents.find((e) => e.id === compareRightId) ??
    historicalEvents.find((e) => e.id !== selectedEvent?.id) ??
    selectedEvent;

  // Real history creation form
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<HistoryRecordKind>('event');
  const [scope, setScope] = useState<'Dünya Tarihi' | 'Türk Tarihi'>('Dünya Tarihi');
  const [year, setYear] = useState(1453);
  const [endYear, setEndYear] = useState('');
  const [region, setRegion] = useState('Anadolu ve Akdeniz');
  const [modernPlaceName, setModernPlaceName] = useState('İstanbul');
  const [lat, setLat] = useState(41.01);
  const [lng, setLng] = useState(28.97);
  const [summary, setSummary] = useState('');
  const [bibliography, setBibliography] = useState('');
  const [uncertainty, setUncertainty] = useState<HistoryEventPayload['uncertainty']>('kesin');

  // Simulator state & form
  const [pickedBranchIdx, setPickedBranchIdx] = useState<number | null>(null);
  const [scTitle, setScTitle] = useState('');
  const [anchorEventId, setAnchorEventId] = useState('');
  const [decisionQuestion, setDecisionQuestion] = useState('');
  const [branchALabel, setBranchALabel] = useState('');
  const [branchAOutcome, setBranchAOutcome] = useState('');
  const [branchBLabel, setBranchBLabel] = useState('');
  const [branchBOutcome, setBranchBOutcome] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPickedBranchIdx(null);
  }, [selectedScenario?.id]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const regions = useMemo(
    () => Array.from(new Set(historicalEvents.map((e) => e.payload.region).filter(Boolean))),
    [historicalEvents]
  );

  const visibleEvents = useMemo(() => {
    return historicalEvents
      .filter((e) => {
        if (tab === 'civilizations' && e.payload.kind !== 'civilization' && e.payload.kind !== 'state') {
          return false;
        }
        if (tab === 'cities' && e.payload.kind !== 'city_memory') return false;
        if (tab === 'atlas' && kindFilter !== 'all' && e.payload.kind !== kindFilter) return false;
        if (scopeFilter !== 'all') {
          const itemScope =
            e.payload.scope ??
            (e.payload.kind === 'turkish_history' ||
            e.payload.region.toLocaleLowerCase('tr-TR').includes('anadolu') ||
            e.payload.region.toLocaleLowerCase('tr-TR').includes('orta asya')
              ? 'Türk Tarihi'
              : 'Dünya Tarihi');
          if (itemScope !== scopeFilter) return false;
        }
        if (regionFilter !== 'all' && e.payload.region !== regionFilter) return false;
        if (tab === 'atlas' && e.payload.year > yearSlider) return false;
        return true;
      })
      .sort((a, b) => a.payload.year - b.payload.year);
  }, [historicalEvents, tab, kindFilter, scopeFilter, regionFilter, yearSlider]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    const safeUncertainty: HistoryEventPayload['uncertainty'] =
      !bibliography.trim() && uncertainty === 'kesin' ? 'sinirli_kaynak' : uncertainty;

    const created = await addModuleRecord<HistoryEventPayload>({
      moduleId: 'tarih-atlasi',
      entityType: kind,
      title: title.trim(),
      subtitle: `${formatYear(year)} · ${region}`,
      category: region,
      tags: [KIND_LABELS[kind], scope],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        kind,
        scope,
        year: Number(year),
        endYear: endYear ? Number(endYear) : undefined,
        region,
        modernPlaceName: modernPlaceName.trim() || region,
        lat: Number(lat) || 41,
        lng: Number(lng) || 29,
        summary: summary.trim(),
        bibliography: bibliography.trim(),
        uncertainty: safeUncertainty,
        isFictionalSimulation: false,
      },
    });
    setTitle('');
    setSummary('');
    setBibliography('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
    notify('Belgeli tarih kaydı eklendi.');
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scTitle.trim() || !decisionQuestion.trim()) return;
    const anchor = historicalEvents.find((ev) => ev.id === anchorEventId);

    const created = await addModuleRecord<SimulatorPayload>({
      moduleId: 'tarih-atlasi',
      entityType: 'alt_history_scenario',
      title: scTitle.trim(),
      subtitle: anchor ? `Alternatif Kurgu · ${anchor.title}` : 'Alternatif Tarih Kurgusu',
      category: 'Alternatif Tarih',
      tags: ['Kurgu', 'Simülasyon'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: anchor ? 'tarih-atlasi' : undefined,
      sourceEntityId: anchor?.id,
      sourceLabel: anchor?.title,
      payload: {
        kind: 'alt_history_scenario',
        isFictionalSimulation: true,
        realHistoryFact: anchor
          ? `${formatYear(anchor.payload.year)}: ${anchor.payload.summary}`
          : 'Referans tarih olayı belirtilmedi.',
        anchorEventId: anchor?.id,
        baseEventTitle: anchor?.title,
        pivotYear: anchor?.payload.year,
        hypothesis: decisionQuestion.trim(),
        decisionQuestion: decisionQuestion.trim(),
        stability: 60,
        economy: 60,
        branches: [
          {
            label: branchALabel.trim() || 'Diplomatik Uzlaşı Seçeneği',
            outcome: branchAOutcome.trim() || 'Alternatif gelişme kaydedilmedi.',
            stabilityDelta: 12,
            economyDelta: 6,
          },
          {
            label: branchBLabel.trim() || 'Hızlı Merkezîleşme Seçeneği',
            outcome: branchBOutcome.trim() || 'Alternatif gelişme kaydedilmedi.',
            stabilityDelta: -6,
            economyDelta: 16,
          },
        ],
      },
    });
    setScTitle('');
    setDecisionQuestion('');
    setBranchALabel('');
    setBranchAOutcome('');
    setBranchBLabel('');
    setBranchBOutcome('');
    setShowNewScenario(false);
    setTab('simulator');
    setSearchParams({ tab: 'simulator', recordId: created.id });
    notify('Karşı-olgusal senaryo oluşturuldu.');
  };

  const handleCreateScenarioFromEvent = async (ev: ModuleRecord<HistoryEventPayload>) => {
    const sim = await addModuleRecord<SimulatorPayload>({
      moduleId: 'tarih-atlasi',
      entityType: 'alt_history_scenario',
      title: `Alternatif Akış: ${ev.title}`,
      subtitle: `${formatYear(ev.payload.year)} · Kurgu Senaryo`,
      category: 'Alternatif Tarih',
      tags: ['Kurgu', 'Simülasyon'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'tarih-atlasi',
      sourceEntityId: ev.id,
      sourceLabel: ev.title,
      payload: {
        kind: 'alt_history_scenario',
        isFictionalSimulation: true,
        realHistoryFact: `${formatYear(ev.payload.year)}: ${ev.payload.summary}`,
        anchorEventId: ev.id,
        baseEventTitle: ev.title,
        pivotYear: ev.payload.year,
        hypothesis: `"${ev.title}" dönüm noktasında farklı bir strateji izlenirse sonuçlar nasıl değişirdi?`,
        decisionQuestion: `"${ev.title}" dönüm noktasında farklı bir strateji izlenirse sonuçlar nasıl değişirdi?`,
        stability: 62,
        economy: 58,
        branches: [
          {
            label: 'Diplomatik Uzlaşı Seçeneği',
            outcome: 'Kısa vadede çatışma azalır, ancak bölgesel güç dengesi uzun süre müzakereye bağlı kalır.',
            stabilityDelta: 15,
            economyDelta: 10,
          },
          {
            label: 'Hızlı Merkezîleşme Seçeneği',
            outcome: 'İdari bütünlük güçlenirken taşrada kültürel ve ticari gerilim artar.',
            stabilityDelta: -5,
            economyDelta: 20,
          },
        ],
      },
    });
    setTab('simulator');
    setSearchParams({ tab: 'simulator', recordId: sim.id });
    notify('Kayıt alternatif tarih simülasyonuna aktarıldı.');
  };

  const handleSendToPhilosophy = async (sc: ModuleRecord<SimulatorPayload>) => {
    const question = sc.payload.decisionQuestion || sc.payload.hypothesis || sc.title;
    const fact = sc.payload.realHistoryFact || sc.payload.baseEventTitle || 'Tarih Atlası kaydı';
    const rec = await addModuleRecord({
      moduleId: 'felsefe-meclisi',
      entityType: 'dilemma',
      title: `Tarih Felsefesi: ${sc.title}`,
      subtitle: 'Tarih Atlası kaynaklı etik/siyasi ikilem',
      category: 'Tarih Felsefesi',
      tags: ['Tarih Atlası', 'Kurgu Analizi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'tarih-atlasi',
      sourceEntityId: sc.id,
      sourceLabel: sc.title,
      payload: {
        kind: 'dilemma',
        school: 'Tarih ve Siyaset Felsefesi',
        era: 'Karşı-Olgusal Analiz',
        coreThesis: question,
        socraticQuestions: ['Tarihsel zorunluluk mu yoksa bireysel karar mı baskındır?'],
        body: `Gerçek Tarih: ${fact}\n\nKurgusal Karar Sorusu: ${question}`,
        isFictionalSimulation: false,
      },
    });
    notify('Senaryo Felsefe Meclisi’ne tartışma ikilemi olarak gönderildi.');
    navigate(`/modul/felsefe-meclisi?recordId=${rec.id}`);
  };

  const handleSendToEncyclopedia = async (ev: ModuleRecord<HistoryEventPayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'kendi-ansiklopedim',
      entityType: 'encyclopedia_article',
      title: ev.title,
      subtitle: `${formatYear(ev.payload.year)} · ${ev.payload.region}`,
      category: 'Tarih',
      tags: ['Tarih Atlası', KIND_LABELS[ev.payload.kind]],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'tarih-atlasi',
      sourceEntityId: ev.id,
      sourceLabel: ev.title,
      payload: {
        status: 'taslak',
        verification: ev.payload.uncertainty === 'kesin' ? 'dogrulandi' : 'inceleniyor',
        body: `${ev.payload.summary}\n\nModern Konum: ${ev.payload.modernPlaceName} (${ev.payload.lat}, ${ev.payload.lng})`,
        bibliography: ev.payload.bibliography || 'Tarih Atlası kaydı',
        versions: [
          {
            savedAt: new Date().toISOString(),
            summary: 'Tarih Atlası üzerinden taslak madde olarak aktarıldı',
          },
        ],
      },
    });
    notify('Tarih kaydı Kendi Ansiklopedim’e taslak madde olarak aktarıldı.');
    navigate(`/modul/kendi-ansiklopedim?recordId=${rec.id}`);
  };

  const activeBranch =
    selectedScenario && pickedBranchIdx !== null
      ? selectedScenario.payload.branches?.[pickedBranchIdx] ?? null
      : null;
  const baseStability = selectedScenario?.payload.stability ?? 50;
  const baseEconomy = selectedScenario?.payload.economy ?? 50;
  const stability = Math.max(0, Math.min(100, baseStability + (activeBranch?.stabilityDelta ?? 0)));
  const economy = Math.max(0, Math.min(100, baseEconomy + (activeBranch?.economyDelta ?? 0)));

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="tarih-atlasi"
        recordCount={allRecords.length}
        primaryActionLabel={tab === 'simulator' ? 'Yeni Kurgu Senaryosu' : 'Yeni Tarih Kaydı'}
        onPrimaryAction={() => {
          if (tab === 'simulator') {
            setShowNewScenario((v) => !v);
            setShowNew(false);
          } else {
            setShowNew((v) => !v);
            setShowNewScenario(false);
          }
        }}
        csvRows={historicalEvents.map((e) => ({
          Baslik: e.title,
          Tur: KIND_LABELS[e.payload.kind] ?? e.payload.kind,
          Yil: e.payload.year,
          Bolge: e.payload.region,
          ModernAd: e.payload.modernPlaceName,
          Kesinlik: e.payload.uncertainty,
          Kaynakca: e.payload.bibliography,
        }))}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40">
          {feedback}
        </div>
      )}

      {/* 5 Main Subsections covering all 15 unified Tarih Atlası capabilities */}
      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'atlas', label: `Atlas ve Zaman Çizelgesi (${historicalEvents.length})` },
          { id: 'civilizations', label: 'Medeniyetler ve Devletler' },
          { id: 'cities', label: 'Şehirlerin Hafızası' },
          { id: 'compare', label: 'Karşılaştırmalı Tarih ve Kaynakça' },
          { id: 'simulator', label: `Alternatif Tarih ve Simülatör (${scenarios.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              const nextTab = t.id as HistoryTab;
              setTab(nextTab);
              if (nextTab === 'simulator') {
                setSearchParams({ tab: 'simulator' });
              } else {
                setSearchParams({});
              }
            }}
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

      {/* Create Real Historical Record Form */}
      {showNew && tab !== 'simulator' && (
        <form
          onSubmit={handleCreateEvent}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Kaynakçalı Tarih Kaydı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Olay, devlet, şahsiyet veya şehir adı..."
              required
              className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as HistoryRecordKind)}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="event">Tarihî Olay</option>
              <option value="turkish_history">Türk Tarihi</option>
              <option value="world_history">Dünya Tarihi</option>
              <option value="civilization">Medeniyet</option>
              <option value="state">Devlet / İmparatorluk</option>
              <option value="figure">Tarihî Şahsiyet</option>
              <option value="city_memory">Şehrin Hafızası</option>
            </select>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'Dünya Tarihi' | 'Türk Tarihi')}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="Dünya Tarihi">Kapsam: Dünya Tarihi</option>
              <option value="Türk Tarihi">Kapsam: Türk Tarihi</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              placeholder="Başlangıç yılı (MÖ için -)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
            />
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="Bitiş yılı (isteğe bağlı)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
            />
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Bölge (Anadolu, Orta Asya...)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={modernPlaceName}
              onChange={(e) => setModernPlaceName(e.target.value)}
              placeholder="Günümüz yer adı"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                step="0.1"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                placeholder="Enlem"
                className="h-9 px-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
              <input
                type="number"
                step="0.1"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                placeholder="Boylam"
                className="h-9 px-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </div>
          </div>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tarihsel özet (yalnızca bilinen/belgeli bilgiler)..."
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={bibliography}
              onChange={(e) => setBibliography(e.target.value)}
              placeholder="Kaynakça (ör. Halil İnalcık, TDV İslam Ansiklopedisi)"
              className="sm:col-span-2 h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={uncertainty}
              onChange={(e) => setUncertainty(e.target.value as HistoryEventPayload['uncertainty'])}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="kesin">Kesin Belgeli Kayıt</option>
              <option value="tartismali">Tarihçiler Arası Tartışmalı</option>
              <option value="sinirli_kaynak">Sınırlı Kaynak / Belirsiz Sınır</option>
            </select>
          </div>
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

      {/* SIMULATOR TAB — Strict Separation from Real History */}
      {tab === 'simulator' ? (
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-[#D5B477]/12 border border-[#D5B477]/35 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#D5B477] shrink-0" />
              <span>
                <strong>Gerçek Tarih ile Kurgu Ayrımı:</strong> Bu bölüm Tarih Atlası’ndaki belgeli verilere dayalı karşı-olgusal olasılıkları ve karar ağaçlarını modeller; simülasyon çıktıları yaşanmış tarihî gerçek değildir.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNewScenario((v) => !v)}
              className="h-8 px-3 rounded-lg bg-[#D5B477] text-[#10151E] font-medium inline-flex items-center justify-center whitespace-nowrap shrink-0"
            >
              Senaryo Oluştur
            </button>
          </div>

          {showNewScenario && (
            <form
              onSubmit={handleCreateScenario}
              className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
            >
              <h2 className="text-base font-semibold">Yeni Alternatif Tarih Senaryosu (Kurgu)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={scTitle}
                  onChange={(e) => setScTitle(e.target.value)}
                  placeholder="Senaryo başlığı..."
                  required
                  className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
                <select
                  value={anchorEventId}
                  onChange={(e) => setAnchorEventId(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  <option value="">Referans gerçek tarih kaydı seçin...</option>
                  {historicalEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({formatYear(ev.payload.year)})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={decisionQuestion}
                onChange={(e) => setDecisionQuestion(e.target.value)}
                placeholder="Dönüm noktası karar sorusu..."
                required
                className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={branchALabel}
                    onChange={(e) => setBranchALabel(e.target.value)}
                    placeholder="1. Karar Dalı Başlığı"
                    className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <textarea
                    rows={2}
                    value={branchAOutcome}
                    onChange={(e) => setBranchAOutcome(e.target.value)}
                    placeholder="1. Dalın kurgusal sonucu..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={branchBLabel}
                    onChange={(e) => setBranchBLabel(e.target.value)}
                    placeholder="2. Karar Dalı Başlığı"
                    className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <textarea
                    rows={2}
                    value={branchBOutcome}
                    onChange={(e) => setBranchBOutcome(e.target.value)}
                    placeholder="2. Dalın kurgusal sonucu..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewScenario(false)}
                  className="h-8 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 text-xs font-medium rounded-lg bg-[#D5B477] text-[#10151E] inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Senaryoyu Kaydet
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSearchParams({ tab: 'simulator', recordId: s.id })}
                  className={`w-full text-left p-3.5 rounded-xl border ${
                    s.id === selectedScenario?.id
                      ? 'bg-[#D5B477]/12 border-[#D5B477]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">{s.subtitle}</p>
                </button>
              ))}
              {scenarios.length === 0 && (
                <div className="p-5 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Henüz alternatif tarih senaryosu yok.
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              {selectedScenario ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#D5B477]">Karşı-Olgusal Karar Ağacı (Kurgu)</span>
                      <h2 className="text-2xl font-serif font-semibold mt-0.5">{selectedScenario.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedScenario)}
                      title="Senaryoyu sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-[#93BF90]/10 border border-[#93BF90]/30 space-y-1.5">
                      <p className="font-semibold text-[#2E5A2B] dark:text-[#93BF90]">
                        Gerçek Tarih Referansı (Belgeli)
                      </p>
                      <p className="text-sm">
                        {selectedScenario.payload.realHistoryFact ||
                          selectedScenario.payload.baseEventTitle ||
                          'Tarih Atlası kaydına dayalı kurgu başlangıcı.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#D5B477]/10 border border-[#D5B477]/30 space-y-1.5">
                      <p className="font-semibold text-[#8A692C] dark:text-[#D5B477]">
                        Kurgusal Denge Göstergeleri
                      </p>
                      <div className="space-y-1.5 pt-1 tabular-nums">
                        <div>
                          <div className="flex justify-between">
                            <span>Siyasi İstikrar</span>
                            <span>{stability}/100</span>
                          </div>
                          <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded overflow-hidden mt-1">
                            <div className="h-full bg-[#71C6BD]" style={{ width: `${stability}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <span>Ekonomik / Ticari Akış</span>
                            <span>{economy}/100</span>
                          </div>
                          <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded overflow-hidden mt-1">
                            <div className="h-full bg-[#D5B477]" style={{ width: `${economy}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Split className="w-4 h-4 text-[#D5B477]" />
                        {selectedScenario.payload.decisionQuestion || selectedScenario.payload.hypothesis}
                      </p>
                      {pickedBranchIdx !== null && (
                        <button
                          type="button"
                          onClick={() => setPickedBranchIdx(null)}
                          className="inline-flex items-center gap-1 text-xs text-[#546070] dark:text-[#9BA7B6] hover:underline whitespace-nowrap"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Sıfırla
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(selectedScenario.payload.branches ?? []).map((br, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPickedBranchIdx(idx)}
                          className={`p-4 rounded-xl border text-left transition-colors ${
                            pickedBranchIdx === idx
                              ? 'bg-[#D5B477]/15 border-[#D5B477]'
                              : 'bg-[#F7F5F0] dark:bg-[#10151E] border-black/10 dark:border-white/10 hover:border-[#D5B477]/50'
                          }`}
                        >
                          <p className="text-sm font-semibold">{br.label}</p>
                          <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-1 tabular-nums">
                            İstikrar: {br.stabilityDelta >= 0 ? `+${br.stabilityDelta}` : br.stabilityDelta} · Ekonomi:{' '}
                            {br.economyDelta >= 0 ? `+${br.economyDelta}` : br.economyDelta}
                          </p>
                        </button>
                      ))}
                    </div>

                    {activeBranch && (
                      <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] border border-[#D5B477]/40 space-y-1">
                        <p className="text-xs font-semibold text-[#D5B477]">Simülasyon Çıktısı (Kurgu)</p>
                        <p className="text-sm">{activeBranch.outcome}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendToPhilosophy(selectedScenario)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#D5B477]" />
                      Felsefe Meclisi’nde Tartış
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/modul/kendi-dunyam')}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                      Kendi Dünyam’a İlham Al
                    </button>
                  </div>

                  <RecordActionsBar
                    moduleId="tarih-atlasi"
                    entityId={selectedScenario.id}
                    entityType="alt_history_scenario"
                    entityLabel={selectedScenario.title}
                    privacyDomain="genel"
                  />
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Henüz senaryo seçilmedi. “Senaryo Oluştur” veya gerçek bir tarih kaydından simülasyon başlatabilirsiniz.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Coordinate Map + Timeline Slider */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="w-4 h-4 text-[#D5B477]" />
                <span>Etkileşimli Tarih Haritası — Yalnızca Belgeli Noktalar</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
                  className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  <option value="all">Dünya & Türk Tarihi</option>
                  <option value="Dünya Tarihi">Dünya Tarihi</option>
                  <option value="Türk Tarihi">Türk Tarihi</option>
                </select>
                {tab === 'atlas' && (
                  <select
                    value={kindFilter}
                    onChange={(e) => setKindFilter(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  >
                    <option value="all">Tüm Türler</option>
                    {Object.entries(KIND_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  <option value="all">Tüm Bölgeler</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {tab === 'atlas' && (
                  <label className="flex items-center gap-2 tabular-nums">
                    <span>Üst Yıl: {formatYear(yearSlider)}</span>
                    <input
                      type="range"
                      min={-2000}
                      max={2025}
                      step={25}
                      value={yearSlider}
                      onChange={(e) => setYearSlider(Number(e.target.value))}
                      className="accent-[#D5B477]"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-[#10151E] border border-white/10">
              <svg viewBox="0 0 800 320" className="w-full h-auto block">
                {[-60, -30, 0, 30, 60].map((latLine) => {
                  const y = ((90 - latLine) / 180) * 320;
                  return (
                    <line key={latLine} x1={0} y1={y} x2={800} y2={y} stroke="rgba(255,255,255,0.06)" />
                  );
                })}
                {[-120, -60, 0, 60, 120].map((lngLine) => {
                  const x = ((lngLine + 180) / 360) * 800;
                  return (
                    <line key={lngLine} x1={x} y1={0} x2={x} y2={320} stroke="rgba(255,255,255,0.06)" />
                  );
                })}
                <path
                  d="M360,65 L455,55 L580,68 L610,120 L550,155 L465,145 L440,120 L380,115 Z"
                  fill="rgba(213,180,119,0.08)"
                  stroke="rgba(213,180,119,0.2)"
                />
                <path
                  d="M365,125 L435,130 L455,210 L410,255 L370,195 Z"
                  fill="rgba(213,180,119,0.07)"
                  stroke="rgba(213,180,119,0.18)"
                />
                <path
                  d="M120,75 L240,70 L250,145 L190,155 L155,120 Z"
                  fill="rgba(213,180,119,0.06)"
                  stroke="rgba(213,180,119,0.16)"
                />
                <path
                  d="M210,175 L270,185 L250,275 L210,250 Z"
                  fill="rgba(213,180,119,0.06)"
                  stroke="rgba(213,180,119,0.16)"
                />

                {visibleEvents.map((ev) => {
                  const pt = projectGeo(ev.payload.lat, ev.payload.lng);
                  const scaledY = (pt.y / 400) * 320;
                  const isSelected = ev.id === selectedEvent?.id;
                  return (
                    <g
                      key={ev.id}
                      onClick={() => setSearchParams({ recordId: ev.id })}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pt.x}
                        cy={scaledY}
                        r={isSelected ? 7 : 5}
                        fill={
                          ev.payload.uncertainty === 'kesin'
                            ? '#D5B477'
                            : ev.payload.uncertainty === 'tartismali'
                              ? '#88B4FF'
                              : '#9BA7B6'
                        }
                        stroke="#10151E"
                        strokeWidth={1.5}
                      />
                      <text
                        x={pt.x + 9}
                        y={scaledY + 3}
                        fill="#F1F3F5"
                        fontSize={10}
                        fontFamily="Plus Jakarta Sans"
                      >
                        {ev.title.slice(0, 22)} ({formatYear(ev.payload.year)})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {tab === 'compare' && selectedEvent && (
            <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-sm">Karşılaştırmalı Tarih ve Eski–Yeni Konum Analizi</span>
                <select
                  value={compareRight?.id ?? ''}
                  onChange={(e) => setCompareRightId(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  {historicalEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      Karşılaştır: {ev.title} ({formatYear(ev.payload.year)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1.5">
                  <p className="font-semibold text-sm text-[#D5B477]">
                    {selectedEvent.title} ({formatYear(selectedEvent.payload.year)})
                  </p>
                  <p>
                    {selectedEvent.payload.region} · Modern: {selectedEvent.payload.modernPlaceName}
                  </p>
                  <p>{selectedEvent.payload.summary}</p>
                  <p className="text-[#546070] dark:text-[#9BA7B6]">
                    Kaynakça: {selectedEvent.payload.bibliography || 'Belirtilmedi'}
                  </p>
                </div>
                {compareRight && (
                  <div className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1.5">
                    <p className="font-semibold text-sm text-[#71C6BD]">
                      {compareRight.title} ({formatYear(compareRight.payload.year)})
                    </p>
                    <p>
                      {compareRight.payload.region} · Modern: {compareRight.payload.modernPlaceName}
                    </p>
                    <p>{compareRight.payload.summary}</p>
                    <p className="text-[#546070] dark:text-[#9BA7B6]">
                      Kaynakça: {compareRight.payload.bibliography || 'Belirtilmedi'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {visibleEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSearchParams({ recordId: ev.id })}
                  className={`w-full text-left p-3.5 rounded-xl border ${
                    ev.id === selectedEvent?.id
                      ? 'bg-[#D5B477]/12 border-[#D5B477]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{ev.title}</span>
                    <span className="font-mono text-xs tabular-nums text-[#D5B477]">
                      {formatYear(ev.payload.year)}
                    </span>
                  </div>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                    {KIND_LABELS[ev.payload.kind] ?? ev.payload.kind} · {ev.payload.region} ·{' '}
                    {ev.payload.modernPlaceName}
                  </p>
                </button>
              ))}
              {visibleEvents.length === 0 && (
                <p className="p-4 text-xs rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[#546070] dark:text-[#9BA7B6]">
                  Seçili filtreye uygun belgeli tarih kaydı bulunamadı.
                </p>
              )}
            </div>

            <div className="lg:col-span-7">
              {selectedEvent ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                        <span className="font-mono tabular-nums text-[#D5B477]">
                          {formatYear(selectedEvent.payload.year)}
                          {selectedEvent.payload.endYear ? `–${formatYear(selectedEvent.payload.endYear)}` : ''}
                        </span>
                        <span>·</span>
                        <span>{KIND_LABELS[selectedEvent.payload.kind] ?? selectedEvent.payload.kind}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedEvent.payload.modernPlaceName}
                        </span>
                        <span>·</span>
                        {selectedEvent.payload.uncertainty === 'kesin' ? (
                          <span className="inline-flex items-center gap-1 text-[#2E5A2B] dark:text-[#93BF90]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Belgeli Kayıt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#8A692C] dark:text-[#D5B477]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {selectedEvent.payload.uncertainty === 'tartismali'
                              ? 'Tartışmalı Kaynak'
                              : 'Sınırlı Kaynak'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-serif font-semibold mt-1">{selectedEvent.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedEvent)}
                      title="Kaydı sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed">{selectedEvent.payload.summary}</p>

                  <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs space-y-1">
                    <p>
                      <strong>Kaynakça:</strong>{' '}
                      {selectedEvent.payload.bibliography || 'Kaynakça henüz belirtilmedi.'}
                    </p>
                    <p className="font-mono tabular-nums text-[#546070] dark:text-[#9BA7B6]">
                      Koordinat: {selectedEvent.payload.lat}, {selectedEvent.payload.lng}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateScenarioFromEvent(selectedEvent)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg bg-[#D5B477]/20 text-[#141923] dark:text-[#D5B477] font-medium whitespace-nowrap shrink-0"
                    >
                      <Split className="w-3.5 h-3.5" />
                      Alternatif Tarih Simülasyonu Başlat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendToEncyclopedia(selectedEvent)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#71C6BD]" />
                      Kendi Ansiklopedim’e Aktar
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/modul/karadeniz-asistani')}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#DFA183]" />
                      Bölgesel Gezi Bağlantıları
                    </button>
                  </div>

                  <RecordActionsBar
                    moduleId="tarih-atlasi"
                    entityId={selectedEvent.id}
                    entityType={selectedEvent.entityType}
                    entityLabel={selectedEvent.title}
                    privacyDomain="genel"
                    nodeType="olay"
                    summary={(selectedEvent.payload.summary ?? '').slice(0, 100)}
                  />
                </div>
              ) : (
                <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Ayrıntılarını görmek için soldan bir tarih kaydı seçin veya yeni kayıt ekleyin.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Kaydı Sil"
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
