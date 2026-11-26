import { useState, useMemo } from 'react';
import {
  Activity,
  Heart,
  Moon,
  Footprints,
  Flame,
  Plus,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';

interface SmartBandPayload {
  kind: 'daily_metrics' | 'workout';
  steps: number;
  heartRateAvg: number;
  sleepHours: number;
  calories: number;
  stressLevel: 'Düşük' | 'Normal' | 'Yüksek';
  notes: string;
}

export function AkilliBileklikModule() {
  const { moduleRecords, addModuleRecord, deleteModuleRecord, recordModuleOpen } = useAppStore();

  useMemo(() => {
    recordModuleOpen('akilli-bileklik');
  }, [recordModuleOpen]);

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'akilli-bileklik' && !r.isArchived
      ) as Array<ModuleRecord<SmartBandPayload>>,
    [moduleRecords]
  );

  const [showNew, setShowNew] = useState(false);
  const [steps, setSteps] = useState('8420');
  const [heartRate, setHeartRate] = useState('72');
  const [sleepHours, setSleepHours] = useState('7.5');
  const [calories, setCalories] = useState('2150');
  const [stress, setStress] = useState<'Düşük' | 'Normal' | 'Yüksek'>('Normal');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => localDateIso());
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addModuleRecord<SmartBandPayload>({
      moduleId: 'akilli-bileklik',
      entityType: 'daily_metrics',
      title: `${date} Sağlık ve Aktivite Özeti`,
      subtitle: `${steps} adım · ${sleepHours} saat uyku`,
      category: 'Bileklik Verileri',
      tags: ['sağlık', 'aktivite', 'bileklik'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'saglik',
      date,
      isDemo: false,
      payload: {
        kind: 'daily_metrics',
        steps: Number(steps) || 0,
        heartRateAvg: Number(heartRate) || 70,
        sleepHours: Number(sleepHours) || 7,
        calories: Number(calories) || 2000,
        stressLevel: stress,
        notes: notes.trim(),
      },
    });
    setSteps('8000');
    setNotes('');
    setShowNew(false);
    notify('Sağlık ve bileklik verisi kaydedildi.');
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          await addModuleRecord<SmartBandPayload>({
            moduleId: 'akilli-bileklik',
            entityType: 'daily_metrics',
            title: `${cols[0] || localDateIso()} İçe Aktarılan Ölçüm`,
            subtitle: `${cols[1] || '0'} adım`,
            category: 'CSV İçe Aktarım',
            tags: ['aktarim', 'saglik'],
            isFavorite: false,
            isArchived: false,
            privacyDomain: 'saglik',
            date: cols[0] || localDateIso(),
            isDemo: false,
            payload: {
              kind: 'daily_metrics',
              steps: Number(cols[1]) || 5000,
              heartRateAvg: Number(cols[2]) || 72,
              sleepHours: Number(cols[3]) || 7,
              calories: 2000,
              stressLevel: 'Normal',
              notes: 'CSV dosyasından içe aktarıldı.',
            },
          });
          count++;
        }
      }
      notify(`${count} sağlık kaydı CSV dosyasından içe aktarıldı.`);
    } catch {
      notify('CSV dosyası okunamadı.');
    }
    e.target.value = '';
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', 'akilli-bileklik-saglik-verileri.json');
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const latest = records[0]?.payload;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span>Hayat Merkezi</span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              Gizlilik: Sağlık (Özel)
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-1">
            Akıllı Bileklik &amp; Sağlık Asistanı
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-0.5">
            Adım, nabız, uyku ve kalori ölçümleri. Donanım senkronizasyonu için mobil eşlik uygulaması veya Web Bluetooth API gerektirir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>CSV İçe Aktar</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button
            type="button"
            onClick={exportJson}
            className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Dışa Aktar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="h-9 inline-flex items-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manuel Ölçüm Ekle</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#93BF90]/15 border border-[#93BF90]/30 text-sm">
          <Check className="w-4 h-4 text-[#93BF90] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Hardware Connection Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-700 dark:text-amber-300">Donanım ve Bluetooth Eşleşme Bilgisi:</span>
          <p className="text-amber-600/90 dark:text-amber-400/90 mt-0.5">
            Web tarayıcı güvenlik kısıtlamaları nedeniyle doğrudan arka plan bileklik eşleşmesi için akıllı telefonunuzdaki mobil eşlik uygulaması veya Web Bluetooth destekli tarayıcı oturumu gereklidir. Bu modül üzerinden ölçümlerinizi manuel olarak girebilir veya CSV ile toplu aktarabilirsiniz.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span>Günlük Adım</span>
            <Footprints className="w-4 h-4 text-[#8C6B32]" />
          </div>
          <div className="text-2xl font-serif font-semibold tabular-nums">
            {latest?.steps ?? 8420}
          </div>
          <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">Hedef: 10,000 adım (%84)</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span>Ortalama Nabız</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-serif font-semibold tabular-nums">
            {latest?.heartRateAvg ?? 72} <span className="text-xs font-normal">bpm</span>
          </div>
          <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">Dinlenik nabız normal aralıkta</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span>Uyku Süresi</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-serif font-semibold tabular-nums">
            {latest?.sleepHours ?? 7.5} <span className="text-xs font-normal">saat</span>
          </div>
          <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">Kalite: İyi (Derin uyku %32)</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span>Yakılan Kalori</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-serif font-semibold tabular-nums">
            {latest?.calories ?? 2150} <span className="text-xs font-normal">kcal</span>
          </div>
          <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">Aktif kalori: 640 kcal</p>
        </div>
      </div>

      {/* New Record Modal Form */}
      {showNew && (
        <form onSubmit={handleCreate} className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold">Yeni Sağlık ve Aktivite Ölçümü</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Tarih</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Adım Sayısı</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Ort. Nabız (bpm)</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Uyku (Saat)</label>
              <input
                type="number"
                step="0.1"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Kalori (kcal)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Stres Seviyesi</label>
              <select
                value={stress}
                onChange={(e) => setStress(e.target.value as typeof stress)}
                className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="Düşük">Düşük</option>
                <option value="Normal">Normal</option>
                <option value="Yüksek">Yüksek</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">Notlar / Gözlemler</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Sabah koşusu yapıldı, uyku kalitesi iyi."
              className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="h-9 px-4 text-xs rounded-lg border border-black/10 dark:border-white/10"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="h-9 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E]"
            >
              Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Records List */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
        <h2 className="text-lg font-semibold">Geçmiş Ölçüm Kayıtları ({records.length})</h2>
        {records.length === 0 ? (
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Henüz sağlık ve aktivite kaydı bulunmuyor. Manuel ölçüm ekleyebilir veya CSV içe aktarabilirsiniz.
          </p>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {records.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.date}</span>
                    <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                      Stres: {r.payload.stressLevel}
                    </span>
                  </div>
                  <p className="text-[#546070] dark:text-[#9BA7B6]">
                    Adım: {r.payload.steps} · Nabız: {r.payload.heartRateAvg} bpm · Uyku: {r.payload.sleepHours} sa · Kalori: {r.payload.calories} kcal
                  </p>
                  {r.payload.notes && <p className="italic text-[11px] text-[#546070]">{r.payload.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteModuleRecord(r.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                  title="Kaydı sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
