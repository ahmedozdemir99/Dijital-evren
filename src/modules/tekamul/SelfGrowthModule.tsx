import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Flame, Lock, Plus, Sprout, Target, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface GrowthPayload {
  kind: 'habit' | 'goal' | 'reflection';
  targetValue?: number;
  currentValue?: number;
  completedDates?: string[];
  reflectionNote?: string;
}

export function SelfGrowthModule() {
  const {
    moduleRecords,
    preferences,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('tekamul-yolunda');
  }, [recordModuleOpen]);

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'tekamul-yolunda' && !r.isArchived
      ) as Array<ModuleRecord<GrowthPayload>>,
    [moduleRecords]
  );

  // Privacy-gated summary ONLY (never duplicates prayer logs)
  const prayerSummaryCount = useMemo(() => {
    if (!preferences.crossModuleSharing.allowPersonalFromPrayerSummary) return null;
    return moduleRecords.filter((r) => r.moduleId === 'namaz-yolculugum' && !r.isArchived).length;
  }, [moduleRecords, preferences.crossModuleSharing.allowPersonalFromPrayerSummary]);

  const today = localDateIso();
  const [kind, setKind] = useState<GrowthPayload['kind']>('habit');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<GrowthPayload> | null>(null);

  const habits = records.filter((r) => r.payload.kind === 'habit');
  const goals = records.filter((r) => r.payload.kind === 'goal');
  const reflections = records.filter((r) => r.payload.kind === 'reflection');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addModuleRecord<GrowthPayload>({
      moduleId: 'tekamul-yolunda',
      entityType: kind,
      title: title.trim(),
      subtitle: kind === 'habit' ? 'Günlük Alışkanlık' : kind === 'goal' ? 'Gelişim Hedefi' : 'Tefekkür',
      category: 'Kişisel Tekâmül',
      tags: ['Tekâmül'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      date: today,
      payload: {
        kind,
        completedDates: [],
        targetValue: kind === 'goal' ? 100 : undefined,
        currentValue: kind === 'goal' ? 0 : undefined,
        reflectionNote: note.trim(),
      },
    });
    setTitle('');
    setNote('');
  };

  const toggleHabitToday = async (rec: ModuleRecord<GrowthPayload>) => {
    const dates = rec.payload.completedDates ?? [];
    const done = dates.includes(today);
    const next = done ? dates.filter((d) => d !== today) : [...dates, today];
    await updateModuleRecord<GrowthPayload>(rec.id, {
      payload: { ...rec.payload, completedDates: next },
    });
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader moduleId="tekamul-yolunda" recordCount={records.length} />

      {/* Privacy-Gated Summary Widget */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#93BF90]" />
          <span>
            <strong>Alışkanlıklar:</strong> {habits.length} · <strong>Hedefler:</strong> {goals.length} ·{' '}
            <strong>Tefekkür Notları:</strong> {reflections.length}
          </span>
        </div>
        {prayerSummaryCount !== null ? (
          <span className="text-[#93BF90] tabular-nums">
            İbadet Özeti (İzinli): {prayerSummaryCount} günlük takip kaydı mevcut
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[#546070] dark:text-[#9BA7B6]">
            <Lock className="w-3.5 h-3.5" />
            Namaz Yolculuğum özeti gizlilik ayarı gereği kapalı
          </span>
        )}
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
      >
        <h2 className="text-base font-semibold">Yeni Alışkanlık, Hedef veya Tefekkür Notu</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as GrowthPayload['kind'])}
            className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          >
            <option value="habit">Günlük Alışkanlık</option>
            <option value="goal">Kişisel Hedef</option>
            <option value="reflection">Tefekkür / Öz Değerlendirme</option>
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık (ör. Her gün 30 dk okuma, Sabah tefekkürü)..."
            required
            className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <button
            type="submit"
            className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#93BF90] text-[#10151E] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Ekle
          </button>
        </div>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Niyet, değerlendirme veya tefekkür notu..."
          className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
        />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Habits */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#93BF90]" />
            Alışkanlık Takibi (Bugün: {today})
          </h2>
          {habits.length === 0 ? (
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Henüz alışkanlık eklenmedi.</p>
          ) : (
            <div className="space-y-2">
              {habits.map((h) => {
                const done = (h.payload.completedDates ?? []).includes(today);
                return (
                  <div key={h.id} className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHabitToday(h)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-[#93BF90] shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${done ? 'line-through opacity-75' : ''}`}>
                          {h.title}
                        </p>
                        <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                          Toplam tamamlanan gün: {(h.payload.completedDates ?? []).length}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(h)}
                      title="Alışkanlığı sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-[#D6B782]" />
            Kişisel Hedefler
          </h2>
          {goals.length === 0 ? (
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Henüz hedef tanımlanmadı.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const val = g.payload.currentValue ?? 0;
                return (
                  <div key={g.id} className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{g.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tabular-nums text-[#93BF90]">%{val}</span>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(g)}
                          title="Hedefi sil"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={val}
                      onChange={(e) =>
                        updateModuleRecord<GrowthPayload>(g.id, {
                          payload: { ...g.payload, currentValue: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-[#93BF90]"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reflections */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
        <h2 className="text-base font-semibold">Tefekkür ve Muhasebe Günlüğü</h2>
        {reflections.length === 0 ? (
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Henüz tefekkür notu eklenmedi.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reflections.map((ref) => (
              <div key={ref.id} className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{ref.title}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ref)}
                    title="Notu sil"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm">{ref.payload.reflectionNote}</p>
                <RecordActionsBar
                  moduleId="tekamul-yolunda"
                  entityId={ref.id}
                  entityType="reflection"
                  entityLabel={ref.title}
                  privacyDomain="kisisel"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Tekâmül Kaydını Sil"
        description={`"${deleteTarget?.title}" kaydını silmek istiyor musunuz?`}
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
