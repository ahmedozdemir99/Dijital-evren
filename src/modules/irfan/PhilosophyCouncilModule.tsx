import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  HelpCircle,
  MessageSquare,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface PhilosophyPayload {
  kind: 'philosopher' | 'dilemma' | 'thought_experiment' | 'fictional_letter';
  school: string;
  era: string;
  coreThesis: string;
  socraticQuestions: string[];
  body: string;
  isFictionalSimulation: boolean;
}

export function PhilosophyCouncilModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    moduleSettings,
    preferences,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('felsefe-meclisi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'felsefe-meclisi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'felsefe-meclisi' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<PhilosophyPayload>>,
    [moduleRecords, showDemo]
  );

  const [tab, setTab] = useState<'council' | 'compare' | 'socratic'>('council');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [showNew, setShowNew] = useState(false);

  const selectedId = searchParams.get('recordId') || records[0]?.id || null;
  const selected = records.find((r) => r.id === selectedId) ?? null;

  // Socratic workspace
  const [socraticTopic, setSocraticTopic] = useState('');
  const [socraticPrompt, setSocraticPrompt] = useState('');
  const [socraticLog, setSocraticLog] = useState<Array<{ q: string; a: string }>>([]);
  const [aiBusy, setAiBusy] = useState(false);

  // Compare
  const [cmpA, setCmpA] = useState(records[0]?.id ?? '');
  const [cmpB, setCmpB] = useState(records[1]?.id ?? records[0]?.id ?? '');

  // Form
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PhilosophyPayload['kind']>('philosopher');
  const [school, setSchool] = useState('Ahlak Felsefesi / Stoacılık');
  const [era, setEra] = useState('Antik Çağ');
  const [coreThesis, setCoreThesis] = useState('');
  const [body, setBody] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<PhilosophyPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const filtered = records.filter((r) => kindFilter === 'all' || r.payload.kind === kindFilter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const isFictional = kind === 'fictional_letter';
    const created = await addModuleRecord<PhilosophyPayload>({
      moduleId: 'felsefe-meclisi',
      entityType: kind,
      title: title.trim(),
      subtitle: `${school} · ${era}`,
      category: school,
      tags: isFictional ? ['Kurgusal Mektup'] : [school],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        kind,
        school,
        era,
        coreThesis: coreThesis.trim(),
        socraticQuestions: ['Bu önermenin dayandığı örtük varsayım nedir?'],
        body: body.trim(),
        isFictionalSimulation: isFictional,
      },
    });
    setTitle('');
    setCoreThesis('');
    setBody('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleAskSocratic = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = socraticPrompt.trim();
    if (!question) return;

    if (preferences.aiAssistantEnabled && preferences.aiPermittedDomains.genel) {
      setAiBusy(true);
      try {
        const res = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Sokratik yöntemle aşağıdaki felsefi soruya karşı sorular sor ve kavramları netleştir. Kurgusal bir filozof sesi takınıyorsan bunun hayalî simülasyon olduğunu açıkça belirt.\nKonu: ${socraticTopic || 'Genel Felsefe'}\nSoru: ${question}`,
            contextSummary: 'Felsefe Meclisi Sokratik Çalışma Alanı',
          }),
        });
        const data = await res.json();
        setSocraticLog((prev) => [
          ...prev,
          {
            q: question,
            a: res.ok ? (data.reply ?? data.text ?? 'Sokratik yanıt üretilemedi.') : (data.error ?? 'Yapay zekâ servisi kullanılamıyor.'),
          },
        ]);
      } catch {
        setSocraticLog((prev) => [
          ...prev,
          {
            q: question,
            a: 'Sunucuya erişilemedi. Yerel Sokratik İnceleme Soruları: 1) Kullandığınız temel kavramın tanımı evrensel mi? 2) Karşıt örnek ne olurdu?',
          },
        ]);
      } finally {
        setAiBusy(false);
      }
    } else {
      setSocraticLog((prev) => [
        ...prev,
        {
          q: question,
          a: 'Yerel Sokratik Rehber (Yapay Zekâ Kapalı): Bu iddianın zorunlu koşulu nedir? Aksi durumda ortaya çıkacak ahlaki sonuçlar tutarlı mıdır?',
        },
      ]);
    }
    setSocraticPrompt('');
  };

  const handleSendToChatArchive = async (item: ModuleRecord<PhilosophyPayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'sohbet-arsivi',
      entityType: 'chat_thread',
      title: `Felsefe Tartışması: ${item.title}`,
      subtitle: 'Felsefe Meclisi kaynaklı diyalog',
      category: 'Felsefi Tartışma',
      tags: ['Felsefe Meclisi', item.payload.school],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      sourceModule: 'felsefe-meclisi',
      sourceEntityId: item.id,
      sourceLabel: item.title,
      date: localDateIso(),
      payload: {
        channel: item.payload.isFictionalSimulation ? 'Kurgusal Felsefe Diyaloğu' : 'Felsefi Not',
        messages: [
          { sender: 'Kullanıcı', text: item.payload.coreThesis || item.title },
          { sender: 'Not / Meclis', text: item.payload.body },
        ],
      },
    });
    notify('Tartışma Sohbet Arşivi modülüne gönderildi.');
    navigate(`/modul/sohbet-arsivi?recordId=${rec.id}`);
  };

  const handleSendToLogic = async (item: ModuleRecord<PhilosophyPayload>) => {
    const rec = await addModuleRecord({
      moduleId: 'mantik-akademisi',
      entityType: 'argument_map',
      title: `Argüman Analizi: ${item.title}`,
      subtitle: 'Felsefe Meclisi tezi',
      category: 'Argüman Haritası',
      tags: ['Felsefe Meclisi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'felsefe-meclisi',
      sourceEntityId: item.id,
      sourceLabel: item.title,
      payload: {
        kind: 'argument',
        premises: [item.payload.coreThesis || item.title],
        conclusion: 'Bu öncüllerden zorunlu sonuç çıkarılabilir mi?',
        formula: 'p -> q',
        isValidNote: 'İncelenmeyi bekliyor',
      },
    });
    notify('Argüman Mantık Akademisi modülüne gönderildi.');
    navigate(`/modul/mantik-akademisi?recordId=${rec.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="felsefe-meclisi"
        recordCount={records.length}
        primaryActionLabel="Yeni Felsefe Kaydı"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'council', label: `Meclis Arşivi (${records.length})` },
          { id: 'socratic', label: 'Sokratik Sorgulama' },
          { id: 'compare', label: 'Karşılaştırmalı Felsefe' },
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
          <h2 className="text-base font-semibold">Yeni Felsefi Kayıt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Filozof, ikilem veya mektup başlığı..."
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as PhilosophyPayload['kind'])}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="philosopher">Filozof / Düşünce Ekolü</option>
              <option value="dilemma">Ahlaki İkilem</option>
              <option value="thought_experiment">Düşünce Deneyi</option>
              <option value="fictional_letter">Asırlar Arası Hayalî Mektup (Kurgu)</option>
            </select>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Ekol / Alan..."
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          {kind === 'fictional_letter' && (
            <p className="text-xs text-[#D5B477]">
              Not: Asırlar arası mektuplaşmalar kurgusal simülasyon olarak işaretlenir ve tarihî belge yerine geçmez.
            </p>
          )}
          <input
            type="text"
            value={coreThesis}
            onChange={(e) => setCoreThesis(e.target.value)}
            placeholder="Temel tez veya merkez soru..."
            className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Açıklama, tartışma veya mektup metni..."
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
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

      {tab === 'socratic' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HelpCircle className="w-4 h-4 text-[#D5B477]" />
            <span>Sokratik Sorgulama Atölyesi</span>
          </div>
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
            {preferences.aiAssistantEnabled
              ? 'Evren Asistanı etkin: Sokratik karşı sorular yapay zekâ destekli (kurgusal/yardımcı) üretilir.'
              : 'Evren Asistanı kapalı: Yerel Sokratik sorgulama şablonu kullanılır.'}
          </p>
          <form onSubmit={handleAskSocratic} className="space-y-2">
            <input
              type="text"
              value={socraticTopic}
              onChange={(e) => setSocraticTopic(e.target.value)}
              placeholder="Sorgulama konusu (ör. Adalet ve Liyakat)"
              className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={socraticPrompt}
                onChange={(e) => setSocraticPrompt(e.target.value)}
                placeholder="Tezinizi veya sorunuzu yazın..."
                className="flex-1 min-w-[200px] h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
              <button
                type="submit"
                disabled={aiBusy}
                className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#D5B477] text-[#10151E] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiBusy ? 'Düşünülüyor...' : 'Sorgula'}
              </button>
            </div>
          </form>
          {socraticLog.length === 0 ? (
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Henüz sorgulama yapılmadı. Bir felsefi tez veya ikilem yazarak başlayabilirsiniz.
            </p>
          ) : (
            <div className="space-y-3">
              {socraticLog.map((entry, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1.5 text-xs">
                  <p className="font-semibold">Tez: {entry.q}</p>
                  <p className="whitespace-pre-line text-[#546070] dark:text-[#9BA7B6]">{entry.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'compare' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeftRight className="w-4 h-4 text-[#D5B477]" />
            <span>Karşılaştırmalı Felsefe Masası</span>
          </div>
          {records.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Karşılaştırma için henüz felsefe kaydı bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { val: cmpA, set: setCmpA },
                { val: cmpB, set: setCmpB },
              ].map((slot, idx) => {
                const rec = records.find((r) => r.id === slot.val);
                return (
                  <div key={idx} className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                    <select
                      value={slot.val}
                      onChange={(e) => slot.set(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                    >
                      <option value="">Kayıt seç...</option>
                      {records.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                    {rec && (
                      <div className="space-y-1.5 pt-2">
                        <p className="font-serif text-base font-semibold">{rec.title}</p>
                        <p className="text-[#D5B477]">
                          {rec.payload.school} · {rec.payload.era}
                        </p>
                        <p>
                          <strong>Merkez Tez:</strong> {rec.payload.coreThesis || '—'}
                        </p>
                        <p>{rec.payload.body}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'council' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="all">Tüm Türler</option>
              <option value="philosopher">Filozof ve Ekoller</option>
              <option value="dilemma">Ahlaki İkilemler</option>
              <option value="thought_experiment">Düşünce Deneyleri</option>
              <option value="fictional_letter">Hayalî Mektuplar (Kurgu)</option>
            </select>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSearchParams({ recordId: item.id })}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    item.id === selected?.id
                      ? 'bg-[#D5B477]/12 border-[#D5B477]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{item.title}</span>
                    {item.payload.isFictionalSimulation && (
                      <span className="text-[11px] text-[#D5B477] shrink-0">Kurgu</span>
                    )}
                  </div>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 truncate">
                    {item.payload.school} · {item.payload.era}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Seçili türe uygun felsefe kaydı bulunamadı.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#D5B477]">
                      {selected.payload.school} · {selected.payload.era}
                    </p>
                    <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    title="Kaydı sil"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {selected.payload.isFictionalSimulation && (
                  <div className="p-3 rounded-lg bg-[#D5B477]/15 border border-[#D5B477]/40 text-xs">
                    <strong>Kurgu / Simülasyon Bildirimi:</strong> Bu mektuplaşma düşünsel egzersiz amaçlı bir kurgudur; tarihî bir belge veya gerçek alıntı değildir.
                  </div>
                )}

                {selected.payload.coreThesis && (
                  <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-sm">
                    <strong>Merkez Tez / Soru:</strong> {selected.payload.coreThesis}
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-line">{selected.payload.body}</p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendToChatArchive(selected)}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#71C6BD]" />
                    Sohbet Arşivi’ne Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToLogic(selected)}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                  >
                    <Scale className="w-3.5 h-3.5 text-[#D5B477]" />
                    Mantık Akademisi’nde İncele
                  </button>
                </div>

                <RecordActionsBar
                  moduleId="felsefe-meclisi"
                  entityId={selected.id}
                  entityType={selected.entityType}
                  entityLabel={selected.title}
                  privacyDomain="genel"
                  nodeType="dusunce"
                  summary={selected.payload.coreThesis}
                />
              </div>
            ) : (
              <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                Felsefe kaydı seçin veya oluşturun.
              </div>
            )}
          </div>
        </div>
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
