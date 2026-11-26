import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, Quote, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface MihrapPayload {
  kind: 'kaynak_metin' | 'hutbe_sohbet' | 'kavram_notu';
  sourceCitation: string;
  verification: 'dogrulandi' | 'kaynak_bekliyor';
  arabicOrOriginal?: string;
  body: string;
}

export function MihrapMinberModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
    addQuote,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('mihrap-ve-minber');
  }, [recordModuleOpen]);

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'mihrap-ve-minber' && !r.isArchived
      ) as Array<ModuleRecord<MihrapPayload>>,
    [moduleRecords]
  );

  const selectedId = searchParams.get('recordId') || records[0]?.id || null;
  const selected = records.find((r) => r.id === selectedId) ?? null;

  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MihrapPayload['kind']>('kaynak_metin');
  const [category, setCategory] = useState('Ahlak ve Adab');
  const [sourceCitation, setSourceCitation] = useState('');
  const [verification, setVerification] = useState<MihrapPayload['verification']>('dogrulandi');
  const [body, setBody] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<MihrapPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return records.filter(
      (r) =>
        !q ||
        r.title.toLocaleLowerCase('tr-TR').includes(q) ||
        r.payload.body.toLocaleLowerCase('tr-TR').includes(q) ||
        r.payload.sourceCitation.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [records, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const safeVerif: MihrapPayload['verification'] =
      !sourceCitation.trim() ? 'kaynak_bekliyor' : verification;

    const created = await addModuleRecord<MihrapPayload>({
      moduleId: 'mihrap-ve-minber',
      entityType: kind,
      title: title.trim(),
      subtitle: `${category} · ${sourceCitation.trim() || 'Kaynak belirtilmedi'}`,
      category,
      tags: ['Mihrap ve Minber', category],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'ibadet',
      payload: {
        kind,
        sourceCitation: sourceCitation.trim(),
        verification: safeVerif,
        body: body.trim(),
      },
    });
    setTitle('');
    setSourceCitation('');
    setBody('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleSendToQuotes = async (item: ModuleRecord<MihrapPayload>) => {
    await addQuote({
      text: item.payload.body,
      author: item.payload.sourceCitation || 'Kaynak Belirtilmemiş',
      sourceModule: 'mihrap-ve-minber',
      sourceEntityId: item.id,
      sourceTitle: item.title,
      category: 'Maneviyat ve Hikmet',
      tags: ['Mihrap ve Minber'],
      isFavorite: false,
      isArchived: false,
      isDemo: false,
    });
    setFeedback('Metin Alıntı Defterim modülüne kaynakçasıyla eklendi.');
    setTimeout(() => setFeedback(null), 2600);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="mihrap-ve-minber"
        recordCount={records.length}
        primaryActionLabel="Yeni Kaynak / Hutbe"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      <div className="p-3.5 rounded-xl bg-[#93BF90]/12 border border-[#93BF90]/35 flex items-center gap-2.5 text-xs">
        <BookOpen className="w-4 h-4 text-[#93BF90] shrink-0" />
        <span>
          <strong>Kaynak Bütünlüğü İlkesi:</strong> Dinî metinlerde, ayet meallerinde ve hadis rivayetlerinde kesin kaynakça (Sure/Ayet no, Kitap/Bab) esastır; kaynağı girilmemiş metinler otomatik olarak "Kaynak Doğrulaması Bekliyor" şeklinde işaretlenir.
        </span>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#93BF90]/15 border border-[#93BF90]/40">
          {feedback}
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Kaynaklı Metin veya Hutbe Taslağı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Başlık..."
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as MihrapPayload['kind'])}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="kaynak_metin">Kaynaklı Ayet / Hadis Notu</option>
              <option value="hutbe_sohbet">Hutbe / Sohbet Metni</option>
              <option value="kavram_notu">Kavram ve Tefsir Notu</option>
            </select>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Konu / Koleksiyon..."
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={sourceCitation}
              onChange={(e) => setSourceCitation(e.target.value)}
              placeholder="Kesin Kaynak (ör. Bakara 2/286, Diyanet Meali)"
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value as MihrapPayload['verification'])}
              className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="dogrulandi">Kaynakça İle Doğrulandı</option>
              <option value="kaynak_bekliyor">Kaynak Doğrulaması Bekliyor</option>
            </select>
          </div>
          <textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Metin veya hutbe içeriği..."
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">Vazgeç</button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#93BF90] text-[#10151E] whitespace-nowrap shrink-0">Kaydet</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546070] dark:text-[#9BA7B6]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Başlık, konu veya kaynak ara..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            />
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSearchParams({ recordId: item.id })}
                className={`w-full text-left p-3.5 rounded-xl border ${
                  item.id === selected?.id
                    ? 'bg-[#93BF90]/12 border-[#93BF90]'
                    : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                }`}
              >
                <p className="font-semibold text-sm truncate">{item.title}</p>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 truncate">
                  {item.payload.sourceCitation || 'Kaynak belirtilmemiş'}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-4 text-xs rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[#546070] dark:text-[#9BA7B6]">
                Henüz kayıt bulunmuyor.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#93BF90]">{selected.category}</span>
                    <span>·</span>
                    {selected.payload.verification === 'dogrulandi' && selected.payload.sourceCitation ? (
                      <span className="inline-flex items-center gap-1 text-[#93BF90]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Doğrulanmış Kaynak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#D6B782]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Kaynak Doğrulaması Bekliyor
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-serif font-semibold mt-1">{selected.title}</h2>
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

              <p className="text-sm leading-relaxed whitespace-pre-line">{selected.payload.body}</p>

              <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs">
                <strong>Kaynakça:</strong> {selected.payload.sourceCitation || 'Henüz girilmemiş'}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleSendToQuotes(selected)}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0"
                >
                  <Quote className="w-3.5 h-3.5" />
                  Alıntı Defterim’e Gönder
                </button>
              </div>

              <RecordActionsBar
                moduleId="mihrap-ve-minber"
                entityId={selected.id}
                entityType={selected.entityType}
                entityLabel={selected.title}
                privacyDomain="ibadet"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <BookOpen className="w-7 h-7 text-[#93BF90] mx-auto" />
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir metin seçin veya yeni kayıt oluşturun.
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
