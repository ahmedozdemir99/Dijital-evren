import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpenCheck, Check, History, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface EncyclopediaPayload {
  status: 'taslak' | 'yayinda';
  verification: 'dogrulandi' | 'inceleniyor' | 'kaynak_bekliyor';
  body: string;
  bibliography: string;
  versions: Array<{ savedAt: string; summary: string; bodySnapshot?: string }>;
}

export function EncyclopediaModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('kendi-ansiklopedim');
  }, [recordModuleOpen]);

  const articles = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'kendi-ansiklopedim' && !r.isArchived
      ) as Array<ModuleRecord<EncyclopediaPayload>>,
    [moduleRecords]
  );

  const selectedId = searchParams.get('recordId') || articles[0]?.id || null;
  const selected = articles.find((a) => a.id === selectedId) ?? null;

  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Kavramlar');
  const [body, setBody] = useState('');
  const [bibliography, setBibliography] = useState('');
  const [verification, setVerification] = useState<EncyclopediaPayload['verification']>('inceleniyor');
  const [status, setStatus] = useState<EncyclopediaPayload['status']>('taslak');

  const [showVersions, setShowVersions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<EncyclopediaPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return articles.filter(
      (a) =>
        !q ||
        a.title.toLocaleLowerCase('tr-TR').includes(q) ||
        a.payload.body.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [articles, query]);

  // Detect [[Article]] wiki-links or mentions of other article titles
  const relatedArticles = useMemo(() => {
    if (!selected) return [];
    const text = selected.payload.body.toLocaleLowerCase('tr-TR');
    return articles.filter(
      (other) =>
        other.id !== selected.id &&
        (text.includes(`[[${other.title.toLocaleLowerCase('tr-TR')}]]`) ||
          text.includes(other.title.toLocaleLowerCase('tr-TR')))
    );
  }, [articles, selected]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const created = await addModuleRecord<EncyclopediaPayload>({
      moduleId: 'kendi-ansiklopedim',
      entityType: 'encyclopedia_article',
      title: title.trim(),
      subtitle: verification === 'dogrulandi' ? 'Doğrulanmış Madde' : 'İnceleniyor',
      category: category.trim() || 'Genel',
      tags: [],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        status,
        verification,
        body: body.trim(),
        bibliography: bibliography.trim(),
        versions: [
          {
            savedAt: new Date().toISOString(),
            summary: 'İlk sürüm oluşturuldu',
            bodySnapshot: body.trim(),
          },
        ],
      },
    });
    setTitle('');
    setBody('');
    setBibliography('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const nextVersions = [
      {
        savedAt: new Date().toISOString(),
        summary: `Düzenleme (${status})`,
        bodySnapshot: body,
      },
      ...selected.payload.versions,
    ].slice(0, 15);

    await updateModuleRecord<EncyclopediaPayload>(selected.id, {
      title: title.trim() || selected.title,
      category: category.trim() || selected.category,
      subtitle: verification === 'dogrulandi' ? 'Doğrulanmış Madde' : 'İnceleniyor',
      payload: {
        status,
        verification,
        body,
        bibliography,
        versions: nextVersions,
      },
    });
    setEditing(false);
    setFeedback('Madde ve sürüm geçmişi kaydedildi.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSendToMemory = async () => {
    if (!selected) return;
    await addModuleRecord({
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: selected.title,
      subtitle: 'İrfan Konağı · Ansiklopedi Salonu',
      category: 'İrfan Konağı',
      tags: ['ansiklopedi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      date: localDateIso(),
      sourceModule: 'kendi-ansiklopedim',
      sourceEntityId: selected.id,
      sourceLabel: selected.title,
      payload: {
        palace: 'İrfan Konağı',
        room: 'Ansiklopedi Salonu',
        front: `${selected.title} maddesinin temel özeti nedir?`,
        back: selected.payload.body.slice(0, 260),
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: localDateIso(),
        lastScore: null,
      },
    });
    setFeedback('Hafıza Sarayına bilgi kartı olarak gönderildi.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="kendi-ansiklopedim"
        recordCount={articles.length}
        primaryActionLabel={showNew ? 'Formu Kapat' : 'Yeni Madde Yaz'}
        onPrimaryAction={() => {
          setShowNew((v) => !v);
          setEditing(false);
          setTitle('');
          setBody('');
          setBibliography('');
        }}
      />

      {feedback && (
        <div className="px-4 py-2 rounded-lg bg-[#93BF90]/15 border border-[#93BF90]/30 text-xs flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#93BF90]" />
          <span>{feedback}</span>
        </div>
      )}

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <h2 className="text-lg font-semibold">Yeni Ansiklopedi Maddesi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Madde başlığı"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategori"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value as EncyclopediaPayload['verification'])}
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="inceleniyor">Doğrulama: İnceleniyor</option>
              <option value="dogrulandi">Doğrulama: Doğrulandı</option>
              <option value="kaynak_bekliyor">Doğrulama: Kaynak Bekliyor</option>
            </select>
          </div>
          <textarea
            required
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="İşlenmiş bilgi metni (diğer maddelere [[Madde Adı]] biçiminde bağ verebilirsiniz)..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <input
            type="text"
            value={bibliography}
            onChange={(e) => setBibliography(e.target.value)}
            placeholder="Kaynakça"
            className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">
              Vazgeç
            </button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0">
              Maddeyi Kaydet
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 w-full max-w-sm">
        <Search className="w-4 h-4 text-[#546070] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ansiklopedi maddelerinde ara..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
          <BookOpenCheck className="w-8 h-8 text-[#71C6BD] mx-auto" />
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Henüz ansiklopedi maddesi yok. İşlenmiş bilgi üretmek için ilk maddenizi yazın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-2">
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSearchParams({ recordId: a.id });
                  setEditing(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selected?.id === a.id
                    ? 'bg-white dark:bg-[#1C2633] border-[#71C6BD]'
                    : 'bg-white/70 dark:bg-[#1C2633]/70 border-black/10 dark:border-white/10'
                }`}
              >
                <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                  {a.category} · {a.payload.status === 'yayinda' ? 'Yayında' : 'Taslak'} ·{' '}
                  {a.payload.verification}
                </div>
                <div className="font-semibold mt-0.5 truncate">{a.title}</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
                {editing ? (
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                      />
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as EncyclopediaPayload['status'])}
                        className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                      >
                        <option value="taslak">Taslak</option>
                        <option value="yayinda">Yayında</option>
                      </select>
                      <select
                        value={verification}
                        onChange={(e) =>
                          setVerification(e.target.value as EncyclopediaPayload['verification'])
                        }
                        className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                      >
                        <option value="dogrulandi">Doğrulandı</option>
                        <option value="inceleniyor">İnceleniyor</option>
                        <option value="kaynak_bekliyor">Kaynak Bekliyor</option>
                      </select>
                    </div>
                    <textarea
                      rows={8}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    />
                    <input
                      type="text"
                      value={bibliography}
                      onChange={(e) => setBibliography(e.target.value)}
                      placeholder="Kaynakça"
                      className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">
                        Vazgeç
                      </button>
                      <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0">
                        Değişiklikleri Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                          {selected.category} · {selected.payload.status} · Doğrulama:{' '}
                          {selected.payload.verification}
                        </p>
                        <h2 className="text-2xl font-semibold mt-0.5">{selected.title}</h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendToMemory}
                          className="h-8 inline-flex items-center justify-center gap-1 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#71C6BD]" />
                          Hafıza Kartı Üret
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVersions((v) => !v)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/15 shrink-0"
                          title="Sürüm geçmişi"
                          aria-label="Sürüm geçmişi"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle(selected.title);
                            setCategory(selected.category);
                            setBody(selected.payload.body);
                            setBibliography(selected.payload.bibliography);
                            setStatus(selected.payload.status);
                            setVerification(selected.payload.verification);
                            setEditing(true);
                          }}
                          className="h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap shrink-0"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(selected)}
                          aria-label="Maddeyi sil"
                          className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      {selected.payload.body}
                    </div>

                    {selected.payload.bibliography && (
                      <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs text-[#546070] dark:text-[#9BA7B6]">
                        <strong>Kaynakça:</strong> {selected.payload.bibliography}
                      </div>
                    )}

                    {relatedArticles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-[#546070] dark:text-[#9BA7B6]">
                          Otomatik Algılanan Madde Bağlantıları
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {relatedArticles.map((other) => (
                            <button
                              key={other.id}
                              type="button"
                              onClick={() => setSearchParams({ recordId: other.id })}
                              className="h-7 inline-flex items-center justify-center px-2.5 text-xs rounded-md border border-[#71C6BD]/40 text-[#71C6BD] whitespace-nowrap"
                            >
                              → {other.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showVersions && (
                      <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                        <p className="font-semibold">Sürüm Geçmişi ({selected.payload.versions.length})</p>
                        {selected.payload.versions.map((v, i) => (
                          <div key={`${v.savedAt}-${i}`} className="flex items-center justify-between gap-2">
                            <span>{v.summary}</span>
                            <span className="tabular-nums text-[#546070]">
                              {new Date(v.savedAt).toLocaleString('tr-TR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <RecordActionsBar
                      moduleId="kendi-ansiklopedim"
                      entityId={selected.id}
                      entityType="encyclopedia_article"
                      entityLabel={selected.title}
                      privacyDomain="genel"
                      nodeType="kavram"
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir ansiklopedi maddesi seçin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Maddeyi Sil"
        description={`"${deleteTarget?.title}" ansiklopedi maddesini silmek istediğinize emin misiniz?`}
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
