import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Globe, MapPin, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface KaradenizPayload {
  province: string;
  spotType: 'Doğa / Yayla' | 'Tarihî Mekân' | 'Yerel Lezzet' | 'Rota Durağı';
  lat: number;
  lng: number;
  bestSeason: string;
  localDish?: string;
  description: string;
}

const PROVINCES = ['Trabzon', 'Rize', 'Artvin', 'Ordu', 'Giresun', 'Samsun', 'Sinop', 'Amasya'];

export function KaradenizAssistantModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { moduleRecords, moduleSettings, recordModuleOpen, addModuleRecord, deleteModuleRecord } =
    useModuleStore();

  useEffect(() => {
    recordModuleOpen('karadeniz-asistani');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'karadeniz-asistani')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const spots = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'karadeniz-asistani' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<KaradenizPayload>>,
    [moduleRecords, showDemo]
  );

  const selectedId = searchParams.get('recordId') || spots[0]?.id || null;
  const selected = spots.find((s) => s.id === selectedId) ?? null;

  const [provinceFilter, setProvinceFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [province, setProvince] = useState('Trabzon');
  const [spotType, setSpotType] = useState<KaradenizPayload['spotType']>('Doğa / Yayla');
  const [bestSeason, setBestSeason] = useState('Haziran – Eylül');
  const [localDish, setLocalDish] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<KaradenizPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2600);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return spots.filter((s) => {
      if (provinceFilter !== 'all' && s.payload.province !== provinceFilter) return false;
      if (!q) return true;
      const prov = (s.payload.province ?? '').toLocaleLowerCase('tr-TR');
      const desc = (s.payload.description ?? (s.payload as { notes?: string }).notes ?? '').toLocaleLowerCase('tr-TR');
      return (
        s.title.toLocaleLowerCase('tr-TR').includes(q) ||
        prov.includes(q) ||
        desc.includes(q)
      );
    });
  }, [spots, provinceFilter, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const created = await addModuleRecord<KaradenizPayload>({
      moduleId: 'karadeniz-asistani',
      entityType: 'karadeniz_spot',
      title: title.trim(),
      subtitle: `${province} · ${spotType}`,
      category: province,
      tags: ['Karadeniz', province],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        province,
        spotType,
        lat: 40.95,
        lng: 39.7,
        bestSeason,
        localDish: localDish.trim(),
        description: description.trim(),
      },
    });
    setTitle('');
    setLocalDish('');
    setDescription('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleSendDishToKitchen = async (spot: ModuleRecord<KaradenizPayload>) => {
    const dishName = spot.payload.localDish || `${spot.payload.province} Yöresel Lezzeti`;
    const rec = await addModuleRecord({
      moduleId: 'bugun-ne-yesem',
      entityType: 'recipe',
      title: dishName,
      subtitle: `${spot.payload.province} Mutfağı · Karadeniz Asistanı`,
      category: 'Karadeniz Mutfağı',
      tags: ['Yöresel Tarif', spot.payload.province],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'karadeniz-asistani',
      sourceEntityId: spot.id,
      sourceLabel: spot.title,
      payload: {
        kind: 'recipe',
        ingredients: ['mısır unu', 'tereyağı', 'yöresel peynir'],
        prepMinutes: 25,
        instructions: `${spot.title} (${spot.payload.province}) yöresi için kaydedilen lezzet notu.`,
      },
    });
    notify('Yöresel lezzet Bugün Ne Yesem tarif defterine gönderildi.');
    navigate(`/modul/bugun-ne-yesem?recordId=${rec.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="karadeniz-asistani"
        recordCount={spots.length}
        primaryActionLabel="Yeni Gezi Noktası"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#DFA183]/15 border border-[#DFA183]/40">
          {feedback}
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Karadeniz Gezi / Kültür Noktası</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Yer adı (ör. Pokut Yaylası, Sümela)"
              required
              className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={spotType}
              onChange={(e) => setSpotType(e.target.value as KaradenizPayload['spotType'])}
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="Doğa / Yayla">Doğa / Yayla</option>
              <option value="Tarihî Mekân">Tarihî Mekân</option>
              <option value="Yerel Lezzet">Yerel Lezzet</option>
              <option value="Rota Durağı">Rota Durağı</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              value={bestSeason}
              onChange={(e) => setBestSeason(e.target.value)}
              placeholder="En uygun dönem..."
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={localDish}
              onChange={(e) => setLocalDish(e.target.value)}
              placeholder="Yakındaki yöresel yemek (ör. Hamsiköy Sütlacı)"
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ulaşım, rakım, tarihçe ve gözlemler..."
            required
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">Vazgeç</button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#DFA183] text-[#10151E] whitespace-nowrap shrink-0">Kaydet</button>
          </div>
        </form>
      )}

      {/* Black Sea Coastal Schematic SVG Map */}
      <div className="p-4 rounded-xl bg-[#10151E] border border-white/10 space-y-2">
        <p className="text-xs font-medium text-[#DFA183]">Karadeniz Kıyı Şeridi Noktaları (Şematik Konum)</p>
        <svg viewBox="0 0 700 130" className="w-full h-auto block">
          <path d="M20,65 Q180,95 360,72 T680,45" fill="none" stroke="rgba(136,180,255,0.35)" strokeWidth={3} />
          {filtered.map((s) => {
            const normX = Math.max(40, Math.min(650, ((s.payload.lng - 35) / 7) * 600 + 40));
            const normY = Math.max(25, Math.min(105, (42 - s.payload.lat) * 45 + 35));
            const active = s.id === selected?.id;
            return (
              <g key={s.id} onClick={() => setSearchParams({ recordId: s.id })} className="cursor-pointer">
                <circle cx={normX} cy={normY} r={active ? 7 : 5} fill={active ? '#DFA183' : '#93BF90'} />
                <text x={normX + 8} y={normY + 4} fill="#F1F3F5" fontSize={10}>
                  {s.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Yayla, il veya lezzet ara..."
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
              />
            </div>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="h-9 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="all">Tüm İller</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                Arama veya il filtresine uygun gezi noktası bulunamadı.
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSearchParams({ recordId: s.id })}
                  className={`w-full text-left p-3.5 rounded-xl border ${
                    s.id === selected?.id
                      ? 'bg-[#DFA183]/12 border-[#DFA183]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                    {s.payload.province} · {s.payload.spotType}
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
                  <p className="text-xs text-[#DFA183]">
                    {selected.payload.province} · {selected.payload.spotType} · En iyi dönem: {selected.payload.bestSeason}
                  </p>
                  <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selected)}
                  aria-label="Gezi noktasını sil"
                  className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm leading-relaxed">{selected.payload.description}</p>

              {selected.payload.localDish && (
                <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#DFA183]" />
                  <span>
                    <strong>Yöresel Lezzet:</strong> {selected.payload.localDish}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSendDishToKitchen(selected)}
                  className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#DFA183]" />
                  Bugün Ne Yesem’e Gönder
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/modul/tarih-atlasi')}
                  className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-[#D5B477]" />
                  Tarih Atlası Bağlamı
                </button>
              </div>

              <RecordActionsBar
                moduleId="karadeniz-asistani"
                entityId={selected.id}
                entityType="karadeniz_spot"
                entityLabel={selected.title}
                privacyDomain="genel"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <MapPin className="w-7 h-7 text-[#DFA183] mx-auto" />
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan veya kıyı şeridinden bir nokta seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Noktayı Sil"
        message={`"${deleteTarget?.title}" gezi noktasını silmek istiyor musunuz?`}
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
