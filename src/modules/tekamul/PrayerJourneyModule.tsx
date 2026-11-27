import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Lock } from 'lucide-react';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface PrayerDayPayload {
  date: string;
  prayers: {
    sabah: boolean;
    ogle: boolean;
    ikindi: boolean;
    aksam: boolean;
    yatsi: boolean;
  };
  note?: string;
}

const PRAYER_NAMES: Array<{ key: keyof PrayerDayPayload['prayers']; label: string }> = [
  { key: 'sabah', label: 'Sabah' },
  { key: 'ogle', label: 'Öğle' },
  { key: 'ikindi', label: 'İkindi' },
  { key: 'aksam', label: 'Akşam' },
  { key: 'yatsi', label: 'Yatsı' },
];

// Transparent solar declination & sunrise/sunset estimator (not an authoritative official calendar)
export function computeSolarReferenceTimes(dateStr: string, lat: number, lng: number) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const declRad = (23.44 * Math.PI / 180) * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const cosH = Math.max(-0.99, Math.min(0.99, -Math.tan(latRad) * Math.tan(declRad)));
  const halfDayHours = (Math.acos(cosH) * 180) / Math.PI / 15;
  // Turkey UTC+3 reference noon offset
  const solarNoonUtc3 = 12 + (45 - lng) / 15;
  const formatHr = (h: number) => {
    const norm = ((h % 24) + 24) % 24;
    const totalMinutes = Math.round(norm * 60) % 1440;
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  const sunrise = solarNoonUtc3 - halfDayHours;
  const sunset = solarNoonUtc3 + halfDayHours;
  return {
    imsakYaklasik: formatHr(sunrise - 1.35),
    gunes: formatHr(sunrise),
    ogle: formatHr(solarNoonUtc3 + 0.08),
    ikindiYaklasik: formatHr(solarNoonUtc3 + halfDayHours * 0.55),
    aksam: formatHr(sunset),
    yatsiYaklasik: formatHr(sunset + 1.35),
  };
}

export function PrayerJourneyModule() {
  const { moduleRecords, recordModuleOpen, addModuleRecord, updateModuleRecord } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('namaz-yolculugum');
  }, [recordModuleOpen]);

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'namaz-yolculugum' && !r.isArchived
      ) as Array<ModuleRecord<PrayerDayPayload>>,
    [moduleRecords]
  );

  const [selectedDate, setSelectedDate] = useState(() => localDateIso());
  const [cityPreset, setCityPreset] = useState<'trabzon' | 'istanbul' | 'ankara'>('trabzon');

  const coords =
    cityPreset === 'trabzon'
      ? { lat: 41.0, lng: 39.72, label: 'Trabzon (41.0°K, 39.7°D)' }
      : cityPreset === 'istanbul'
        ? { lat: 41.01, lng: 28.97, label: 'İstanbul (41.0°K, 29.0°D)' }
        : { lat: 39.93, lng: 32.85, label: 'Ankara (39.9°K, 32.8°D)' };

  const solarTimes = useMemo(
    () => computeSolarReferenceTimes(selectedDate, coords.lat, coords.lng),
    [selectedDate, coords.lat, coords.lng]
  );

  const currentDayRecord = records.find((r) => r.payload.date === selectedDate);
  const prayers = currentDayRecord?.payload.prayers ?? {
    sabah: false,
    ogle: false,
    ikindi: false,
    aksam: false,
    yatsi: false,
  };

  const togglePrayer = async (key: keyof PrayerDayPayload['prayers']) => {
    const nextPrayers = { ...prayers, [key]: !prayers[key] };
    const completedCount = Object.values(nextPrayers).filter(Boolean).length;

    if (currentDayRecord) {
      await updateModuleRecord<PrayerDayPayload>(currentDayRecord.id, {
        subtitle: `${completedCount}/5 Vakit`,
        payload: { ...currentDayRecord.payload, prayers: nextPrayers },
      });
    } else {
      await addModuleRecord<PrayerDayPayload>({
        moduleId: 'namaz-yolculugum',
        entityType: 'prayer_day',
        title: `İbadet Takibi · ${selectedDate}`,
        subtitle: `${completedCount}/5 Vakit`,
        category: 'Günlük Takip',
        tags: ['İbadet'],
        isFavorite: false,
        isArchived: false,
        privacyDomain: 'ibadet',
        date: selectedDate,
        payload: { date: selectedDate, prayers: nextPrayers },
      });
    }
  };

  const totalCompletedPrayers = records.reduce(
    (sum, r) => sum + Object.values(r.payload.prayers).filter(Boolean).length,
    0
  );

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader moduleId="namaz-yolculugum" recordCount={records.length} />

      <div className="p-3.5 rounded-xl bg-[#93BF90]/12 border border-[#93BF90]/35 flex items-center gap-2.5 text-xs">
        <Lock className="w-4 h-4 text-[#93BF90] shrink-0" />
        <span>
          <strong>Özel İbadet Alanı:</strong> Bu modül `ibadet` gizlilik katmanındadır. Kayıtlarınız yalnızca sizin cihazınızda saklanır ve izniniz olmadan Tekâmül Yolunda veya genel aramayla paylaşılmaz.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#93BF90]" />
              Günlük Vakit Takibi
            </h2>
            <div className="flex items-center gap-2">
              {selectedDate !== localDateIso() && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(localDateIso())}
                  className="h-8 px-2.5 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Bugün
                </button>
              )}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {PRAYER_NAMES.map((p) => {
              const done = prayers[p.key];
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePrayer(p.key)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors ${
                    done
                      ? 'bg-[#93BF90]/20 border-[#93BF90]'
                      : 'bg-[#F7F5F0] dark:bg-[#10151E] border-black/10 dark:border-white/10'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-6 h-6 text-[#93BF90]" />
                  ) : (
                    <Circle className="w-6 h-6 text-[#546070] dark:text-[#9BA7B6]" />
                  )}
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-xs text-[#546070] dark:text-[#9BA7B6] tabular-nums">
            Toplam takip edilen gün: <strong>{records.length}</strong> · Toplam eda edilen vakit:{' '}
            <strong>{totalCompletedPrayers}</strong>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D6B782]" />
              Astronomik Vakit Referansı
            </h3>
            <select
              value={cityPreset}
              onChange={(e) => setCityPreset(e.target.value as typeof cityPreset)}
              className="h-8 px-2.5 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="trabzon">Trabzon</option>
              <option value="istanbul">İstanbul</option>
              <option value="ankara">Ankara</option>
            </select>
          </div>
          <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">
            {coords.label} için güneş açısı formülüyle yaklaşık hesaplanmıştır; resmî vakitler için Diyanet takvimini esas alınız.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">İmsak ~ {solarTimes.imsakYaklasik}</div>
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Güneş ~ {solarTimes.gunes}</div>
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Öğle ~ {solarTimes.ogle}</div>
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">İkindi ~ {solarTimes.ikindiYaklasik}</div>
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Akşam ~ {solarTimes.aksam}</div>
            <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Yatsı ~ {solarTimes.yatsiYaklasik}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
