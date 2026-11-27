import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Brain, Check, Plus, RotateCw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface MemoryCardPayload {
  palace: string;
  room: string;
  locus?: string;
  front: string;
  back: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  lastScore: number | null;
}

export function MemoryPalaceModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    quotes,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('hafiza-sarayi');
  }, [recordModuleOpen]);

  const cards = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'hafiza-sarayi' && !r.isArchived
      ) as Array<ModuleRecord<MemoryCardPayload>>,
    [moduleRecords]
  );

  const words = useMemo(
    () => moduleRecords.filter((r) => r.moduleId === 'kelime-muzesi'),
    [moduleRecords]
  );
  const articles = useMemo(
    () => moduleRecords.filter((r) => r.moduleId === 'kendi-ansiklopedim'),
    [moduleRecords]
  );

  const todayStr = localDateIso();
  const dueCards = useMemo(
    () => cards.filter((c) => c.payload.nextReviewDate <= todayStr),
    [cards, todayStr]
  );

  const [activeTab, setActiveTab] = useState<'study' | 'palaces' | 'import'>('study');
  const [palaceFilter, setPalaceFilter] = useState('all');
  const focusedCard = cards.find((card) => card.id === searchParams.get('recordId'));
  const tab = focusedCard ? 'palaces' : activeTab;
  const selectedPalace = focusedCard?.payload.palace ?? palaceFilter;
  const setTab = (value: typeof activeTab) => {
    setActiveTab(value);
    if (focusedCard) setSearchParams({}, { replace: true });
  };
  const setSelectedPalace = (value: string) => {
    setPalaceFilter(value);
    setTab('palaces');
  };
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [palace, setPalace] = useState('İrfan Konağı');
  const [room, setRoom] = useState('Kavramlar Salonu');
  const [locus, setLocus] = useState('Doğu Penceresi');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<MemoryCardPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const palaces = useMemo(() => Array.from(new Set(cards.map((c) => c.payload.palace))), [cards]);

  const activeStudyCard = dueCards[0] ?? null;

  const handleGradeCard = async (quality: 1 | 3 | 4 | 5) => {
    if (!activeStudyCard) return;
    const p = activeStudyCard.payload;
    let reps = p.repetitions;
    let interval = p.intervalDays;
    let ef = p.easeFactor;

    if (quality < 3) {
      reps = 0;
      interval = 1;
    } else {
      if (reps === 0) interval = 1;
      else if (reps === 1) interval = 6;
      else interval = Math.round(interval * ef);
      reps += 1;
    }
    ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    const nextStr = localDateIso(nextDate);

    await updateModuleRecord<MemoryCardPayload>(activeStudyCard.id, {
      date: nextStr,
      payload: {
        ...p,
        repetitions: reps,
        intervalDays: interval,
        easeFactor: Number(ef.toFixed(2)),
        nextReviewDate: nextStr,
        lastScore: quality,
      },
    });
    setFlipped(false);
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    await addModuleRecord<MemoryCardPayload>({
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: front.trim().slice(0, 60),
      subtitle: `${palace} · ${room}`,
      category: palace,
      tags: [room.toLocaleLowerCase('tr-TR')],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: todayStr,
      payload: {
        palace: palace.trim() || 'Ana Saray',
        room: room.trim() || 'Genel Oda',
        locus: locus.trim() || undefined,
        front: front.trim(),
        back: back.trim(),
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr,
        lastScore: null,
      },
    });
    setFront('');
    setBack('');
    setShowAdd(false);
  };

  const createFromReference = async (params: {
    sourceModule: string;
    sourceEntityId: string;
    sourceLabel: string;
    frontText: string;
    backText: string;
    roomName: string;
  }) => {
    await addModuleRecord<MemoryCardPayload>({
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: params.sourceLabel,
      subtitle: `İrfan Konağı · ${params.roomName}`,
      category: 'İrfan Konağı',
      tags: [params.sourceModule],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: todayStr,
      sourceModule: params.sourceModule,
      sourceEntityId: params.sourceEntityId,
      sourceLabel: params.sourceLabel,
      payload: {
        palace: 'İrfan Konağı',
        room: params.roomName,
        front: params.frontText,
        back: params.backText,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr,
        lastScore: null,
      },
    });
    setFeedback(`"${params.sourceLabel}" bilgi kartı olarak Hafıza Sarayına eklendi.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const visibleCards =
    selectedPalace === 'all' ? cards : cards.filter((c) => c.payload.palace === selectedPalace);

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="hafiza-sarayi"
        recordCount={cards.length}
        primaryActionLabel={showAdd ? 'Formu Kapat' : 'Yeni Bilgi Kartı'}
        onPrimaryAction={() => setShowAdd((v) => !v)}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg bg-[#93BF90]/15 border border-[#93BF90]/30 text-xs flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#93BF90]" />
          <span>{feedback}</span>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreateCard}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-lg font-semibold">Yeni Hafıza Noktası & Kartı</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={palace}
              onChange={(e) => setPalace(e.target.value)}
              placeholder="Saray adı"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Oda adı"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={locus}
              onChange={(e) => setLocus(e.target.value)}
              placeholder="Bilgi noktası (ör. Kütüphane rafı)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea
              required
              rows={2}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Soru / Hatırlatıcı ipucu (Ön yüz)"
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <textarea
              required
              rows={2}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Bilgi / Cevap (Arka yüz)"
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">
              Vazgeç
            </button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0">
              Kartı Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
          <button
            type="button"
            onClick={() => setTab('study')}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-md whitespace-nowrap shrink-0 ${tab === 'study' ? 'bg-white dark:bg-[#1C2633] font-medium' : 'text-[#546070]'}`}
          >
            Tekrar Oturumu ({dueCards.length} bekleyen)
          </button>
          <button
            type="button"
            onClick={() => setTab('palaces')}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-md whitespace-nowrap shrink-0 ${tab === 'palaces' ? 'bg-white dark:bg-[#1C2633] font-medium' : 'text-[#546070]'}`}
          >
            Saraylar ve Kartlar ({cards.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-md whitespace-nowrap shrink-0 ${tab === 'import' ? 'bg-white dark:bg-[#1C2633] font-medium' : 'text-[#546070]'}`}
          >
            Diğer Modüllerden Üret
          </button>
        </div>
      </div>

      {tab === 'study' && (
        <div className="max-w-2xl mx-auto">
          {activeStudyCard ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-6">
              <div className="flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
                <span>
                  {activeStudyCard.payload.palace} · {activeStudyCard.payload.room}
                  {activeStudyCard.payload.locus ? ` · ${activeStudyCard.payload.locus}` : ''}
                </span>
                <span className="tabular-nums">
                  Tekrar: {activeStudyCard.payload.repetitions} · Aralığı: {activeStudyCard.payload.intervalDays} gün
                </span>
              </div>

              <div className="py-6 text-center space-y-4">
                <h2 className="text-2xl font-serif font-semibold">
                  {activeStudyCard.payload.front}
                </h2>

                {flipped ? (
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 text-base leading-relaxed text-[#546070] dark:text-[#C7D0DC]">
                    {activeStudyCard.payload.back}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="h-9 inline-flex items-center justify-center gap-2 px-5 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Cevabı Göster
                  </button>
                )}
              </div>

              {flipped && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleGradeCard(1)}
                    className="h-9 inline-flex items-center justify-center px-2 text-xs rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 whitespace-nowrap"
                  >
                    Tekrar (1 gün)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGradeCard(3)}
                    className="h-9 inline-flex items-center justify-center px-2 text-xs rounded-lg border border-[#D5B477]/40 hover:bg-[#D5B477]/10 whitespace-nowrap"
                  >
                    Zor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGradeCard(4)}
                    className="h-9 inline-flex items-center justify-center px-2 text-xs rounded-lg border border-[#71C6BD]/40 hover:bg-[#71C6BD]/10 whitespace-nowrap"
                  >
                    İyi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGradeCard(5)}
                    className="h-9 inline-flex items-center justify-center px-2 text-xs font-medium rounded-lg bg-[#93BF90] text-[#10151E] whitespace-nowrap"
                  >
                    Kolay
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <Brain className="w-8 h-8 text-[#93BF90] mx-auto" />
              <h2 className="text-xl font-semibold">Bugün için bekleyen tekrar yok</h2>
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Tüm bilgi kartlarınızı gözden geçirdiniz. Yeni kart ekleyebilir veya diğer modüllerden kart üretebilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'palaces' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPalace('all')}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border whitespace-nowrap ${selectedPalace === 'all' ? 'border-[#71C6BD] font-medium' : 'border-black/10 dark:border-white/10'}`}
            >
              Tüm Saraylar
            </button>
            {palaces.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPalace(p)}
                className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border whitespace-nowrap ${selectedPalace === p ? 'border-[#71C6BD] font-medium' : 'border-black/10 dark:border-white/10'}`}
              >
                {p}
              </button>
            ))}
          </div>

          {visibleCards.length === 0 ? (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <Brain className="w-7 h-7 text-[#71C6BD] mx-auto" />
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Bu saray görünümünde henüz bilgi kartı bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(focusedCard ? [focusedCard, ...visibleCards.filter((card) => card.id !== focusedCard.id)] : visibleCards).map((c) => (
                <div
                  key={c.id}
                  aria-current={c.id === focusedCard?.id ? 'true' : undefined}
                  className="aria-[current=true]:ring-2 aria-[current=true]:ring-[#71C6BD] p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                        {c.payload.palace} · {c.payload.room} · Sonraki: {c.payload.nextReviewDate}
                      </p>
                      <h3 className="text-base font-semibold mt-0.5">{c.payload.front}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      aria-label="Kartı sil"
                      className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">{c.payload.back}</p>
                  <RecordActionsBar
                    moduleId="hafiza-sarayi"
                    entityId={c.id}
                    entityType="memory_card"
                    entityLabel={c.title}
                    privacyDomain="genel"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h3 className="text-lg font-semibold">Kelime Müzesinden</h3>
            {words.length === 0 ? (
              <p className="text-xs text-[#546070]">Kelime kaydı yok.</p>
            ) : (
              words.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-black/5 dark:border-white/5">
                  <span className="truncate">{w.title}</span>
                  <button
                    type="button"
                    onClick={() =>
                      createFromReference({
                        sourceModule: 'kelime-muzesi',
                        sourceEntityId: w.id,
                        sourceLabel: w.title,
                        frontText: `"${w.title}" kelimesinin kökeni ve anlamı nedir?`,
                        backText: String((w.payload as { meaning?: string }).meaning ?? w.subtitle ?? ''),
                        roomName: 'Kelimeler Odası',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[#71C6BD] hover:underline shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Kart Yap
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h3 className="text-lg font-semibold">Kendi Ansiklopedimden</h3>
            {articles.length === 0 ? (
              <p className="text-xs text-[#546070]">Ansiklopedi maddesi yok.</p>
            ) : (
              articles.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-black/5 dark:border-white/5">
                  <span className="truncate">{a.title}</span>
                  <button
                    type="button"
                    onClick={() =>
                      createFromReference({
                        sourceModule: 'kendi-ansiklopedim',
                        sourceEntityId: a.id,
                        sourceLabel: a.title,
                        frontText: `${a.title} maddesinin temel tanımı nedir?`,
                        backText: String((a.payload as { body?: string }).body ?? '').slice(0, 220),
                        roomName: 'Ansiklopedi Salonu',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[#71C6BD] hover:underline shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Kart Yap
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h3 className="text-lg font-semibold">Alıntı Defterimden</h3>
            {quotes.length === 0 ? (
              <p className="text-xs text-[#546070]">Alıntı kaydı yok.</p>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-black/5 dark:border-white/5">
                  <span className="truncate">{q.text.slice(0, 40)}…</span>
                  <button
                    type="button"
                    onClick={() =>
                      createFromReference({
                        sourceModule: 'alinti-defterim',
                        sourceEntityId: q.id,
                        sourceLabel: q.sourceTitle,
                        frontText: `"${q.text.slice(0, 80)}…" sözü kime ve hangi esere aittir?`,
                        backText: `${q.author} — ${q.sourceTitle}`,
                        roomName: 'Alıntılar Galerisi',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[#71C6BD] hover:underline shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Kart Yap
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Kartı Sil"
        description="Bu bilgi kartını Hafıza Sarayından silmek istediğinize emin misiniz?"
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
