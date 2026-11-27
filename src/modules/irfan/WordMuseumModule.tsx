import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Brain,
  CheckCircle2,
  GitBranch,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface WordPayload {
  originLanguage: string;
  rootForm: string;
  etymologyNote: string;
  etymologyVerification: 'dogrulandi' | 'inceleniyor' | 'kaynak_belirtilmedi';
  sourceRef: string;
  meaningToday: string;
  semanticShifts: string;
  synonyms: string[];
  antonyms: string[];
  literaryExample: string;
  isForgotten: boolean;
  cognates: string[];
}

export function WordMuseumModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQueryWord = searchParams.get('word') ?? '';

  const {
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('kelime-muzesi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'kelime-muzesi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const words = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'kelime-muzesi' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<WordPayload>>,
    [moduleRecords, showDemo]
  );

  const [tab, setTab] = useState<'lexicon' | 'compare' | 'learn'>('lexicon');
  const [query, setQuery] = useState(initialQueryWord);
  const [originFilter, setOriginFilter] = useState('all');
  const [onlyForgotten, setOnlyForgotten] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const selectedId = searchParams.get('recordId') || words[0]?.id || null;
  const selected = words.find((w) => w.id === selectedId) ?? null;

  const [cmpA, setCmpA] = useState(words[0]?.id ?? '');
  const [cmpB, setCmpB] = useState(words[1]?.id ?? words[0]?.id ?? '');
  const [learnIndex, setLearnIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);

  // Form
  const [title, setTitle] = useState(initialQueryWord);
  const [originLanguage, setOriginLanguage] = useState('Eski Türkçe');
  const [rootForm, setRootForm] = useState('');
  const [etymologyNote, setEtymologyNote] = useState('');
  const [etymologyVerification, setEtymologyVerification] =
    useState<WordPayload['etymologyVerification']>('inceleniyor');
  const [sourceRef, setSourceRef] = useState('');
  const [meaningToday, setMeaningToday] = useState('');
  const [semanticShifts, setSemanticShifts] = useState('');
  const [synonymsInput, setSynonymsInput] = useState('');
  const [antonymsInput, setAntonymsInput] = useState('');
  const [literaryExample, setLiteraryExample] = useState('');
  const [cognatesInput, setCognatesInput] = useState('');
  const [isForgotten, setIsForgotten] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<WordPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  useEffect(() => {
    if (initialQueryWord) {
      setQuery(initialQueryWord);
      const exact = words.find(
        (w) => w.title.toLocaleLowerCase('tr-TR') === initialQueryWord.toLocaleLowerCase('tr-TR')
      );
      if (exact) setSearchParams({ recordId: exact.id });
    }
  }, [initialQueryWord, words, setSearchParams]);

  const origins = useMemo(
    () => Array.from(new Set(words.map((w) => w.payload.originLanguage).filter(Boolean))),
    [words]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return words.filter((w) => {
      if (originFilter !== 'all' && w.payload.originLanguage !== originFilter) return false;
      if (onlyForgotten && !w.payload.isForgotten) return false;
      if (!q) return true;
      const meaning = (w.payload.meaningToday ?? (w.payload as { meaning?: string }).meaning ?? '').toLocaleLowerCase('tr-TR');
      const root = (w.payload.rootForm ?? '').toLocaleLowerCase('tr-TR');
      return (
        w.title.toLocaleLowerCase('tr-TR').includes(q) ||
        meaning.includes(q) ||
        root.includes(q)
      );
    });
  }, [words, query, originFilter, onlyForgotten]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meaningToday.trim()) return;
    const verification: WordPayload['etymologyVerification'] =
      !sourceRef.trim() && etymologyVerification === 'dogrulandi'
        ? 'inceleniyor'
        : etymologyVerification;
    const created = await addModuleRecord<WordPayload>({
      moduleId: 'kelime-muzesi',
      entityType: 'word_entry',
      title: title.trim(),
      subtitle: `${originLanguage} · ${rootForm.trim() || 'Kök inceleniyor'}`,
      category: originLanguage,
      tags: isForgotten ? ['Unutulmuş Kelime'] : [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        originLanguage,
        rootForm: rootForm.trim(),
        etymologyNote: etymologyNote.trim(),
        etymologyVerification: verification,
        sourceRef: sourceRef.trim(),
        meaningToday: meaningToday.trim(),
        semanticShifts: semanticShifts.trim(),
        synonyms: synonymsInput.split(',').map((s) => s.trim()).filter(Boolean),
        antonyms: antonymsInput.split(',').map((s) => s.trim()).filter(Boolean),
        literaryExample: literaryExample.trim(),
        isForgotten,
        cognates: cognatesInput.split(',').map((s) => s.trim()).filter(Boolean),
      },
    });
    setTitle('');
    setRootForm('');
    setEtymologyNote('');
    setSourceRef('');
    setMeaningToday('');
    setSemanticShifts('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
    notify('Kelime müzeye eklendi.');
  };

  const handleSendToMemoryPalace = async (word: ModuleRecord<WordPayload>) => {
    const card = await addModuleRecord({
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: `${word.title} — Kelime Kartı`,
      subtitle: `${word.payload.originLanguage} köken · Kelime Müzesi`,
      category: 'Kelime Hazinesi',
      tags: ['Kelime Müzesi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'kelime-muzesi',
      sourceEntityId: word.id,
      sourceLabel: word.title,
      date: localDateIso(),
      payload: {
        room: 'Kelime Salonu',
        front: `${word.title} (${word.payload.originLanguage}) ne anlama gelir?`,
        back: `${word.payload.meaningToday}${word.payload.rootForm ? ` · Kök: ${word.payload.rootForm}` : ''}`,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: localDateIso(),
      },
    });
    notify('Kelime Hafıza Sarayı bilgi kartı olarak gönderildi.');
    navigate(`/modul/hafiza-sarayi?recordId=${card.id}`);
  };

  const handleSendToWorldbuilder = async (word: ModuleRecord<WordPayload>) => {
    const world = await addModuleRecord({
      moduleId: 'kendi-dunyam',
      entityType: 'fictional_world',
      title: `Kurgusal Dil İlhamı: ${word.title}`,
      subtitle: `${word.payload.originLanguage} kök esinli yapay dil taslağı`,
      category: 'Yapay Dil İlhamı',
      tags: ['Kurgu', 'Kelime Müzesi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      sourceModule: 'kelime-muzesi',
      sourceEntityId: word.id,
      sourceLabel: word.title,
      payload: {
        worldName: `Kurgusal Dil Taslağı (${word.title})`,
        eraLabel: 'Yapay Dil Çalışması',
        cultures: '',
        conlangNotes: `Esin Kaynağı: ${word.title} (${word.payload.originLanguage}, kök: ${word.payload.rootForm || 'belirtilmedi'})\nAnlam Çekirdeği: ${word.payload.meaningToday}`,
        characters: '',
        timelineText: '',
        pins: [{ id: 'pin-1', name: 'Dil Merkezi', kind: 'city', x: 240, y: 120 }],
      },
    });
    notify('Kelime kökü Kendi Dünyam yapay dil taslağına aktarıldı.');
    navigate(`/modul/kendi-dunyam?recordId=${world.id}`);
  };

  const wordA = words.find((w) => w.id === cmpA);
  const wordB = words.find((w) => w.id === cmpB);
  const learnWord = words[learnIndex % Math.max(1, words.length)];

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="kelime-muzesi"
        recordCount={words.length}
        primaryActionLabel="Yeni Kelime"
        onPrimaryAction={() => setShowNew((v) => !v)}
        csvRows={words.map((w) => ({
          Kelime: w.title,
          Koken: w.payload.originLanguage,
          Kok: w.payload.rootForm,
          Anlam: w.payload.meaningToday,
          Dogrulama: w.payload.etymologyVerification,
        }))}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'lexicon', label: `Kelime Sözlüğü (${words.length})` },
          { id: 'compare', label: 'Kelime Karşılaştırma' },
          { id: 'learn', label: 'Kelime Öğrenme Pratiği' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
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

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Kelime Kaydı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kelime..."
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={originLanguage}
              onChange={(e) => setOriginLanguage(e.target.value)}
              placeholder="Köken Dili (Eski Türkçe, Arapça, Farsça...)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={rootForm}
              onChange={(e) => setRootForm(e.target.value)}
              placeholder="Kök biçimi (ör. *bil-, hikmet...)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <input
            type="text"
            value={meaningToday}
            onChange={(e) => setMeaningToday(e.target.value)}
            placeholder="Günümüzdeki anlamı..."
            required
            className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              rows={2}
              value={etymologyNote}
              onChange={(e) => setEtymologyNote(e.target.value)}
              placeholder="Etimolojik açıklama..."
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <textarea
              rows={2}
              value={semanticShifts}
              onChange={(e) => setSemanticShifts(e.target.value)}
              placeholder="Tarihsel anlam değişimleri..."
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={etymologyVerification}
              onChange={(e) =>
                setEtymologyVerification(e.target.value as WordPayload['etymologyVerification'])
              }
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="dogrulandi">Etimoloji: Kaynakça ile Doğrulandı</option>
              <option value="inceleniyor">Etimoloji: İnceleniyor / Tahminî</option>
              <option value="kaynak_belirtilmedi">Etimoloji: Kaynak Belirtilmedi</option>
            </select>
            <input
              type="text"
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="Sözlük / Etimoloji kaynağı (ör. TDK, Nişanyan)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={cognatesInput}
              onChange={(e) => setCognatesInput(e.target.value)}
              placeholder="Akraba / türev kelimeler (virgülle)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={synonymsInput}
              onChange={(e) => setSynonymsInput(e.target.value)}
              placeholder="Eş anlamlılar (virgülle)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={antonymsInput}
              onChange={(e) => setAntonymsInput(e.target.value)}
              placeholder="Zıt anlamlılar (virgülle)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <input
            type="text"
            value={literaryExample}
            onChange={(e) => setLiteraryExample(e.target.value)}
            placeholder="Edebî kullanım örneği veya cümle..."
            className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isForgotten}
                onChange={(e) => setIsForgotten(e.target.checked)}
              />
              <span>Unutulmuş / Arkaik kelime koleksiyonuna ekle</span>
            </label>
            <div className="flex gap-2">
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
          </div>
        </form>
      )}

      {tab === 'compare' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeftRight className="w-4 h-4 text-[#D5B477]" />
            <span>İki Kelimeyi Köken ve Anlam Açısından Karşılaştır</span>
          </div>
          {words.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Karşılaştırma için henüz kelime eklenmedi.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { val: cmpA, set: setCmpA, word: wordA },
                { val: cmpB, set: setCmpB, word: wordB },
              ].map((slot, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                  <select
                    value={slot.val}
                    onChange={(e) => slot.set(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                  >
                    <option value="">Kelime seç...</option>
                    {words.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                  {slot.word && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-base font-serif font-semibold">{slot.word.title}</p>
                      <p>
                        <strong>Köken:</strong> {slot.word.payload.originLanguage} ({slot.word.payload.rootForm || 'Belirsiz'})
                      </p>
                      <p>
                        <strong>Anlam:</strong> {slot.word.payload.meaningToday}
                      </p>
                      <p>
                        <strong>Anlam Değişimi:</strong> {slot.word.payload.semanticShifts || 'Kayıt yok'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'learn' && (
        learnWord ? (
          <div className="max-w-xl mx-auto p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4 text-center">
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Kelime Öğrenme Kartı · {learnWord.payload.originLanguage}
            </p>
            <h2 className="text-3xl font-serif font-semibold">{learnWord.title}</h2>
            {revealAnswer ? (
              <div className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-sm space-y-2">
                <p>{learnWord.payload.meaningToday}</p>
                {learnWord.payload.literaryExample && (
                  <p className="text-xs italic text-[#546070] dark:text-[#9BA7B6]">
                    “{learnWord.payload.literaryExample}”
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealAnswer(true)}
                className="h-9 px-4 text-xs rounded-lg bg-[#D5B477] text-[#10151E] font-medium inline-flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Anlamı Göster
              </button>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRevealAnswer(false);
                  setLearnIndex((i) => i + 1);
                }}
                className="h-9 px-4 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Sonraki Kelime
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
            Öğrenme pratiği için önce müzeye kelime ekleyin.
          </div>
        )
      )}

      {tab === 'lexicon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kelime, kök veya anlam ara..."
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                />
              </div>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
              >
                <option value="all">Tüm Kökenler</option>
                {origins.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlyForgotten}
                onChange={(e) => setOnlyForgotten(e.target.checked)}
              />
              <span>Sadece Unutulmuş Kelimeler</span>
            </label>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSearchParams({ recordId: w.id })}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    w.id === selected?.id
                      ? 'bg-[#D5B477]/12 border-[#D5B477]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-base font-semibold">{w.title}</span>
                    <span className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">
                      {w.payload.originLanguage}
                    </span>
                  </div>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] line-clamp-1 mt-0.5">
                    {w.payload.meaningToday}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Filtreye uygun kelime bulunamadı.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                      <span>{selected.payload.originLanguage}</span>
                      {selected.payload.isForgotten && <span>· Unutulmuş Kelime</span>}
                      <span>·</span>
                      {selected.payload.etymologyVerification === 'dogrulandi' && selected.payload.sourceRef ? (
                        <span className="inline-flex items-center gap-1 text-[#93BF90]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Doğrulanmış Etimoloji
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#D5B477]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Kesinleşmemiş / Kaynak Bekleyen Etimoloji
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl font-serif font-semibold mt-1">{selected.title}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateModuleRecord(selected.id, { isFavorite: !selected.isFavorite })}
                      className="h-8 px-2.5 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                    >
                      {selected.isFavorite ? 'Favori ★' : 'Favorile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      title="Kelimeyi sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selected.payload.etymologyVerification !== 'dogrulandi' && (
                  <div className="p-3 rounded-lg bg-[#D5B477]/12 border border-[#D5B477]/30 text-xs">
                    Doğrulanmış akademik sözlük kaynağı belirtilmeden bu etimolojik bilgi kesin tarihî gerçek olarak kabul edilmez.
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">Günümüz Anlamı</p>
                    <p>{selected.payload.meaningToday}</p>
                  </div>

                  {/* Köken Ağacı */}
                  <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      <GitBranch className="w-4 h-4 text-[#D5B477]" />
                      <span>Köken Ağacı ve Etimoloji</span>
                    </div>
                    <p>
                      <strong>Kök Biçim:</strong> {selected.payload.rootForm || 'Belirtilmedi'}
                    </p>
                    {selected.payload.etymologyNote && <p>{selected.payload.etymologyNote}</p>}
                    {selected.payload.cognates.length > 0 && (
                      <p>
                        <strong>Akraba / Türev Kelimeler:</strong> {selected.payload.cognates.join(' → ')}
                      </p>
                    )}
                    <p className="text-[#546070] dark:text-[#9BA7B6]">
                      <strong>Kaynak:</strong> {selected.payload.sourceRef || 'Kaynak belirtilmemiş'}
                    </p>
                  </div>

                  {selected.payload.semanticShifts && (
                    <div>
                      <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">Anlam Değişimleri</p>
                      <p className="text-sm">{selected.payload.semanticShifts}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                      <strong>Eş Anlamlılar:</strong>{' '}
                      {selected.payload.synonyms.length > 0 ? selected.payload.synonyms.join(', ') : '—'}
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]">
                      <strong>Zıt Anlamlılar:</strong>{' '}
                      {selected.payload.antonyms.length > 0 ? selected.payload.antonyms.join(', ') : '—'}
                    </div>
                  </div>

                  {selected.payload.literaryExample && (
                    <blockquote className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-serif italic text-sm">
                      “{selected.payload.literaryExample}”
                    </blockquote>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendToMemoryPalace(selected)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <Brain className="w-4 h-4" />
                    Hafıza Sarayı’na Bilgi Kartı Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToWorldbuilder(selected)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#A78BFA] text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    Kendi Dünyam’a Dil İlhamı Aktar
                  </button>
                </div>

                <RecordActionsBar
                  moduleId="kelime-muzesi"
                  entityId={selected.id}
                  entityType={selected.entityType}
                  entityLabel={selected.title}
                  privacyDomain="genel"
                  nodeType="kavram"
                  summary={`${selected.payload.originLanguage} kökenli kelime · Kelime Müzesi`}
                />
              </div>
            ) : (
              <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                Kelime seçin veya yeni kayıt ekleyin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Kelimeyi Sil"
        message={`"${deleteTarget?.title}" kelimesini müzeden kaldırmak istiyor musunuz?`}
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
