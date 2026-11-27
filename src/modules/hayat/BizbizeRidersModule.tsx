import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, Compass, MapPin, Plus, Route, Trash2, Wrench } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface RiderPayload {
  kind: 'bike' | 'ride' | 'maintenance';
  bikeModel: string;
  odometerKm: number;
  distanceKm?: number;
  routeStops?: string;
  maintenanceCost?: string;
  notes: string;
}

export function BizbizeRidersModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { moduleRecords, recordModuleOpen, addModuleRecord, deleteModuleRecord } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('bizbize-riders');
  }, [recordModuleOpen]);

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'bizbize-riders' && !r.isArchived
      ) as Array<ModuleRecord<RiderPayload>>,
    [moduleRecords]
  );

  const karadenizSpots = useMemo(
    () => moduleRecords.filter((r) => r.moduleId === 'karadeniz-asistani' && !r.isArchived),
    [moduleRecords]
  );

  const [tab, setTab] = useState<'all' | 'ride' | 'bike' | 'maintenance'>('all');
  const [showNew, setShowNew] = useState(false);

  const selectedId = searchParams.get('recordId') || records[0]?.id || null;
  const selected = records.find((r) => r.id === selectedId) ?? null;

  // Form
  const [kind, setKind] = useState<RiderPayload['kind']>('ride');
  const [title, setTitle] = useState('');
  const [bikeModel, setBikeModel] = useState('Touring / Adventure');
  const [odometerKm, setOdometerKm] = useState(12500);
  const [distanceKm, setDistanceKm] = useState(180);
  const [routeStops, setRouteStops] = useState('');
  const [rideDate, setRideDate] = useState(localDateIso());
  const [notes, setNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<RiderPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = records.filter((r) => tab === 'all' || r.payload.kind === tab);
  const totalDistance = records
    .filter((r) => r.payload.kind === 'ride')
    .reduce((sum, r) => sum + (r.payload.distanceKm ?? 0), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const created = await addModuleRecord<RiderPayload>({
      moduleId: 'bizbize-riders',
      entityType: kind,
      title: title.trim(),
      subtitle: `${bikeModel} · ${kind === 'ride' ? `${distanceKm} km` : `${odometerKm} km`}`,
      category: kind === 'ride' ? 'Sürüş Kaydı' : kind === 'bike' ? 'Motosiklet' : 'Bakım',
      tags: ['Bizbize Riders'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: rideDate,
      payload: {
        kind,
        bikeModel,
        odometerKm: Number(odometerKm),
        distanceKm: kind === 'ride' ? Number(distanceKm) : undefined,
        routeStops: routeStops.trim(),
        notes: notes.trim(),
      },
    });
    setTitle('');
    setRouteStops('');
    setNotes('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleExportToTekamul = async (ride: ModuleRecord<RiderPayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'tekamul-yolunda',
      entityType: 'reflection',
      title: `Yol Tefekkürü: ${ride.title}`,
      subtitle: `${ride.date ?? ''} · Bizbize Riders`,
      category: 'Tefekkür ve Yol Notu',
      tags: ['Yol Notu', 'Motosiklet'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      sourceModule: 'bizbize-riders',
      sourceEntityId: ride.id,
      sourceLabel: ride.title,
      date: ride.date ?? localDateIso(),
      payload: {
        kind: 'reflection',
        progress: 100,
        body: `Motosiklet: ${ride.payload.bikeModel}\nRota: ${ride.payload.routeStops || '-'}\nMesafe: ${ride.payload.distanceKm ?? 0} km\n\n${ride.payload.notes}`,
      },
    });
    setFeedback('Sürüş günlüğü Tekâmül Yolunda tefekkür notu olarak aktarıldı.');
    setTimeout(() => setFeedback(null), 2600);
    navigate(`/modul/tekamul-yolunda?recordId=${rec.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="bizbize-riders"
        recordCount={records.length}
        primaryActionLabel="Yeni Sürüş / Bakım"
        onPrimaryAction={() => setShowNew((v) => !v)}
        csvRows={records.map((r) => ({
          Baslik: r.title,
          Tur: r.payload.kind,
          Model: r.payload.bikeModel,
          Km: r.payload.distanceKm ?? r.payload.odometerKm,
          Tarih: r.date ?? '',
        }))}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#DFA183]/15 border border-[#DFA183]/40">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10">
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Toplam Sürüş Mesafesi</p>
          <p className="text-2xl font-semibold mt-1 text-[#DFA183]">{totalDistance} km</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10">
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Sürüş Sayısı</p>
          <p className="text-2xl font-semibold mt-1">{records.filter((r) => r.payload.kind === 'ride').length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10">
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Bakım Kaydı</p>
          <p className="text-2xl font-semibold mt-1">{records.filter((r) => r.payload.kind === 'maintenance').length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'all', label: `Tümü (${records.length})` },
          { id: 'ride', label: 'Sürüş Kayıtları' },
          { id: 'bike', label: 'Motosiklet Profilleri' },
          { id: 'maintenance', label: 'Bakım Geçmişi' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg whitespace-nowrap shrink-0 ${
              tab === t.id
                ? 'bg-[#DFA183] text-[#10151E] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Sürüş, Motosiklet veya Bakım Kaydı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RiderPayload['kind'])}
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="ride">Sürüş ve Rota</option>
              <option value="bike">Motosiklet Profili</option>
              <option value="maintenance">Bakım / Servis</option>
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rota veya kayıt başlığı..."
              required
              className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              value={bikeModel}
              onChange={(e) => setBikeModel(e.target.value)}
              placeholder="Motosiklet modeli..."
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="number"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              placeholder="Mesafe (km)"
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
            />
            <input
              type="number"
              value={odometerKm}
              onChange={(e) => setOdometerKm(Number(e.target.value))}
              placeholder="Kilometre sayacı (km)"
              className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <input
              type="text"
              value={routeStops}
              onChange={(e) => setRouteStops(e.target.value)}
              placeholder="Duraklar (ör. Trabzon - Zigana - Torul)"
              className="flex-1 min-w-[220px] h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            {karadenizSpots.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setRouteStops((prev) => (prev ? `${prev} → ${e.target.value}` : e.target.value));
                  e.target.value = '';
                }}
                className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="">Karadeniz Asistanı’ndan durak ekle...</option>
                {karadenizSpots.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Yol koşulları, bakım detayı veya gezi notları..."
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">Vazgeç</button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#DFA183] text-[#10151E] whitespace-nowrap shrink-0">Kaydet</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2 max-h-[540px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Bu kategoride henüz sürüş, motosiklet veya bakım kaydı bulunmuyor.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSearchParams({ recordId: item.id })}
                className={`w-full text-left p-3.5 rounded-xl border ${
                  item.id === selected?.id
                    ? 'bg-[#DFA183]/12 border-[#DFA183]'
                    : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{item.title}</span>
                  <span className="text-xs font-mono tabular-nums text-[#DFA183]">
                    {item.payload.kind === 'ride' ? `${item.payload.distanceKm ?? 0} km` : `${item.payload.odometerKm} km`}
                  </span>
                </div>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                  {item.payload.bikeModel} · {item.date ?? ''}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-[#DFA183] inline-flex items-center gap-1">
                    {selected.payload.kind === 'maintenance' ? <Wrench className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                    {selected.payload.bikeModel} · {selected.date ?? ''}
                  </span>
                  <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selected)}
                  aria-label="Kaydı sil"
                  className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {selected.payload.routeStops && (
                <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs flex items-center gap-2">
                  <Route className="w-4 h-4 text-[#DFA183] shrink-0" />
                  <span>
                    <strong>Rota:</strong> {selected.payload.routeStops}
                  </span>
                </div>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-line">{selected.payload.notes || 'Not yok.'}</p>

              {selected.payload.kind === 'ride' && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleExportToTekamul(selected)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#93BF90] text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Tekâmül Yolunda’ya Yol Tefekkürü Gönder
                  </button>
                </div>
              )}

              <RecordActionsBar
                moduleId="bizbize-riders"
                entityId={selected.id}
                entityType={selected.entityType}
                entityLabel={selected.title}
                privacyDomain="genel"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <Bike className="w-7 h-7 text-[#DFA183] mx-auto" />
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir kayıt seçin veya yeni sürüş ekleyin.
              </p>
            </div>
          )}
        </div>
      </div>

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
