import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Compass, Pause, Play, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface PlanetInfo {
  name: string;
  au: number;
  periodDays: number;
  radiusKm: number;
  moons: number;
  color: string;
  orbitR: number;
  speed: number;
  size: number;
  note: string;
}

const PLANETS: PlanetInfo[] = [
  { name: 'Merkür', au: 0.39, periodDays: 88, radiusKm: 2440, moons: 0, color: '#9BA7B6', orbitR: 38, speed: 4.1, size: 3.5, note: 'Güneş’e en yakın kayalık gezegen.' },
  { name: 'Venüs', au: 0.72, periodDays: 225, radiusKm: 6052, moons: 0, color: '#D6B782', orbitR: 58, speed: 1.6, size: 5.5, note: 'Yoğun karbondioksit atmosferiyle en sıcak gezegen.' },
  { name: 'Dünya', au: 1.0, periodDays: 365.25, radiusKm: 6371, moons: 1, color: '#88B4FF', orbitR: 82, speed: 1.0, size: 6, note: 'Sıvı suya ve yaşama elverişli atmosfer dengesine sahip gezegen.' },
  { name: 'Mars', au: 1.52, periodDays: 687, radiusKm: 3390, moons: 2, color: '#DFA183', orbitR: 108, speed: 0.53, size: 4.5, note: 'Demir oksit yüzeyi sebebiyle Kızıl Gezegen.' },
  { name: 'Jüpiter', au: 5.2, periodDays: 4333, radiusKm: 69911, moons: 95, color: '#D5B477', orbitR: 142, speed: 0.084, size: 11, note: 'Güneş sisteminin en büyük gaz devi.' },
  { name: 'Satürn', au: 9.54, periodDays: 10759, radiusKm: 58232, moons: 146, color: '#E8D5A7', orbitR: 176, speed: 0.034, size: 9.5, note: 'Buz ve kaya parçalarından oluşan görkemli halka sistemi.' },
];

const CONSTELLATIONS = [
  { name: 'Büyük Ayı (Ursa Major)', season: 'İlkbahar / Yıl Boyu', star: 'Dubhe & Merak (Kutup Yıldızı göstergesi)' },
  { name: 'Avcı (Orion)', season: 'Kış', star: 'Betelgeuse ve Rigel' },
  { name: 'Çalgı (Lyra)', season: 'Yaz', star: 'Vega' },
  { name: 'Kuğu (Cygnus)', season: 'Yaz / Sonbahar', star: 'Deneb' },
];

export function SkyAtlasModule() {
  const navigate = useNavigate();
  const { moduleRecords, recordModuleOpen, addModuleRecord, deleteModuleRecord } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('gokyuzu-atlasi');
  }, [recordModuleOpen]);

  const observations = useMemo(
    () => moduleRecords.filter((r) => r.moduleId === 'gokyuzu-atlasi' && !r.isArchived),
    [moduleRecords]
  );

  const [playing, setPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo>(PLANETS[2]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord | null>(null);
  const angleRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;

          ctx.fillStyle = '#10151E';
          ctx.fillRect(0, 0, w, h);

          // Sun
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#D6B782';
          ctx.fill();

          for (const pl of PLANETS) {
            ctx.beginPath();
            ctx.arc(cx, cy, pl.orbitR, 0, Math.PI * 2);
            ctx.strokeStyle =
              pl.name === selectedPlanet.name ? 'rgba(136,180,255,0.5)' : 'rgba(255,255,255,0.12)';
            ctx.stroke();

            const theta = angleRef.current * pl.speed;
            const px = cx + Math.cos(theta) * pl.orbitR;
            const py = cy + Math.sin(theta) * pl.orbitR;

            ctx.beginPath();
            ctx.arc(px, py, pl.size, 0, Math.PI * 2);
            ctx.fillStyle = pl.color;
            ctx.fill();

            ctx.fillStyle = '#9BA7B6';
            ctx.font = '10px Plus Jakarta Sans';
            ctx.fillText(pl.name, px + pl.size + 4, py + 3);
          }
        }
      }
      if (playing) {
        angleRef.current += 0.015 * speedMultiplier;
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [playing, speedMultiplier, selectedPlanet]);

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addModuleRecord({
      moduleId: 'gokyuzu-atlasi',
      entityType: 'sky_observation',
      title: title.trim(),
      subtitle: selectedPlanet.name,
      category: 'Gözlem Notu',
      tags: [selectedPlanet.name],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: localDateIso(),
      payload: { targetObject: selectedPlanet.name, note: note.trim() },
    });
    setTitle('');
    setNote('');
  };

  const handleSendToWorldbuilder = async () => {
    const world = await addModuleRecord({
      moduleId: 'kendi-dunyam',
      entityType: 'fictional_world',
      title: `Astronomik İlham: ${selectedPlanet.name} Benzeri Dünya`,
      subtitle: `${selectedPlanet.au} AU · ${selectedPlanet.periodDays} gün yörünge`,
      category: 'Kurgusal Dünya',
      tags: ['Kurgu', 'Gökyüzü Atlası'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      sourceModule: 'gokyuzu-atlasi',
      sourceEntityId: `planet-${selectedPlanet.name}`,
      sourceLabel: selectedPlanet.name,
      payload: {
        worldName: `${selectedPlanet.name} Esinli Kurgusal Gezegen`,
        eraLabel: 'Kozmik Çağ',
        cultures: `Fiziksel referans: ${selectedPlanet.note} (${selectedPlanet.au} AU, yarıçap ${selectedPlanet.radiusKm} km, uydu sayısı ${selectedPlanet.moons}).`,
        conlangNotes: '',
        characters: '',
        timelineText: `Yörünge yılı: ${selectedPlanet.periodDays} gün döngüsüne göre mevsim kurgusu.`,
        pins: [{ id: 'pin-1', name: 'Gözlemevi Şehri', kind: 'city', x: 240, y: 120 }],
      },
    });
    navigate(`/modul/kendi-dunyam?recordId=${world.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader moduleId="gokyuzu-atlasi" recordCount={observations.length} />

      <div className="p-3.5 rounded-xl bg-[#88B4FF]/12 border border-[#88B4FF]/35 flex items-center gap-2.5 text-xs">
        <AlertCircle className="w-4 h-4 text-[#88B4FF] shrink-0" />
        <span>
          <strong>Şeffaf Simülasyon Notu:</strong> Yörünge animasyonu göreceli periyotlara dayalı eğitsel bir modeldir; gerçek zamanlı teleskop ephemeris verisi değildir.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#88B4FF]" />
              Etkileşimli Güneş Sistemi Yörünge Modeli
            </h2>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="h-8 inline-flex items-center justify-center gap-1 px-2.5 rounded-lg bg-[#88B4FF] text-[#10151E] font-medium whitespace-nowrap shrink-0"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Duraklat' : 'Oynat'}
              </button>
              <label className="flex items-center gap-1.5">
                Hız: {speedMultiplier}×
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                  className="accent-[#88B4FF]"
                />
              </label>
            </div>
          </div>

          <canvas ref={canvasRef} width={440} height={390} className="w-full max-w-[460px] mx-auto rounded-xl border border-white/10 block" />

          <div className="flex flex-wrap gap-2">
            {PLANETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelectedPlanet(p)}
                className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border whitespace-nowrap ${
                  selectedPlanet.name === p.name
                    ? 'border-[#88B4FF] bg-[#88B4FF]/15 font-medium'
                    : 'border-black/10 dark:border-white/10'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h3 className="text-xl font-serif font-semibold">{selectedPlanet.name}</h3>
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{selectedPlanet.note}</p>
            <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
              <div className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                Uzaklık: {selectedPlanet.au} AU
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                Yörünge: {selectedPlanet.periodDays} gün
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                Yarıçap: {selectedPlanet.radiusKm.toLocaleString('tr-TR')} km
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                Bilinen Uydu: {selectedPlanet.moons}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendToWorldbuilder}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#A78BFA] text-[#10151E] whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Kendi Dünyam’a Gezegen İlhamı Aktar
            </button>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2.5">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D6B782]" />
              Başlıca Takımyıldızları
            </h3>
            {CONSTELLATIONS.map((c) => (
              <div key={c.name} className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs">
                <p className="font-semibold">{c.name}</p>
                <p className="text-[#546070] dark:text-[#9BA7B6]">
                  {c.season} · {c.star}
                </p>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSaveObservation}
            className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2.5"
          >
            <h3 className="text-sm font-semibold">Gözlem Notu Ekle</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gözlem başlığı..."
              required
              className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notlarınız..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <button
              type="submit"
              className="h-8 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#88B4FF] text-[#10151E] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Gözlemi Kaydet
            </button>
          </form>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
        <h3 className="text-sm font-semibold">Kayıtlı Gözlemler ({observations.length})</h3>
        {observations.length === 0 ? (
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
            Henüz gözlem kaydı eklenmedi. Yukarıdaki formdan seçili gök cismi için ilk gözleminizi kaydedebilirsiniz.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {observations.map((obs) => (
              <div key={obs.id} className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{obs.title}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(obs)}
                    aria-label="Gözlemi sil"
                    className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p>{String((obs.payload as { note?: string }).note ?? '')}</p>
                <RecordActionsBar
                  moduleId="gokyuzu-atlasi"
                  entityId={obs.id}
                  entityType="sky_observation"
                  entityLabel={obs.title}
                  privacyDomain="genel"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Gözlem Kaydını Sil"
        description={`"${deleteTarget?.title}" gözlem notunu silmek istiyor musunuz?`}
        confirmLabel="Sil"
        destructive
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
