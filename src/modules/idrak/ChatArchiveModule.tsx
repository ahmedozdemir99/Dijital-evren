import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookPlus, MessageSquare, Plus, Quote as QuoteIcon, Search, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface ChatPayload {
  channel: string;
  participants: string;
  messages: Array<{ id: string; sender: string; text: string; timestamp?: string }>;
  summary?: string;
}

export function ChatArchiveModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
    addQuote,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('sohbet-arsivi');
  }, [recordModuleOpen]);

  const chats = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'sohbet-arsivi' && !r.isArchived
      ) as Array<ModuleRecord<ChatPayload>>,
    [moduleRecords]
  );

  const selectedId = searchParams.get('recordId') || chats[0]?.id || null;
  const selected = chats.find((c) => c.id === selectedId) ?? null;

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Felsefi Tartışma');
  const [category, setCategory] = useState('Düşünce');
  const [participants, setParticipants] = useState('Kullanıcı, Muhatap');
  const [date, setDate] = useState(() => localDateIso());
  const [rawTranscript, setRawTranscript] = useState('');

  const [newSender, setNewSender] = useState('Kullanıcı');
  const [newMsgText, setNewMsgText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<ChatPayload> | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(chats.map((c) => c.category))),
    [chats]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return chats.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        c.title.toLocaleLowerCase('tr-TR').includes(q) ||
        c.payload.messages.some((m) => m.text.toLocaleLowerCase('tr-TR').includes(q))
      );
    });
  }, [chats, categoryFilter, query]);

  const parseTranscript = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 28) {
          return {
            id: `msg-${Date.now()}-${i}`,
            sender: line.slice(0, colonIdx).trim(),
            text: line.slice(colonIdx + 1).trim(),
          };
        }
        return {
          id: `msg-${Date.now()}-${i}`,
          sender: 'Kayıt',
          text: line,
        };
      });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const msgs = parseTranscript(rawTranscript);
    const created = await addModuleRecord<ChatPayload>({
      moduleId: 'sohbet-arsivi',
      entityType: 'conversation',
      title: title.trim(),
      subtitle: `${channel} · ${msgs.length} mesaj`,
      category: category.trim() || 'Genel',
      tags: [channel.toLocaleLowerCase('tr-TR')],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      date,
      payload: {
        channel,
        participants,
        messages: msgs,
        summary: msgs[0]?.text.slice(0, 140) ?? '',
      },
    });
    setTitle('');
    setRawTranscript('');
    setShowForm(false);
    setSearchParams({ recordId: created.id });
  };

  const handleImportTxt = async (file: File) => {
    const text = await file.text();
    const msgs = parseTranscript(text);
    const created = await addModuleRecord<ChatPayload>({
      moduleId: 'sohbet-arsivi',
      entityType: 'conversation',
      title: file.name.replace(/\.(txt|json)$/i, ''),
      subtitle: `İçe aktarılan · ${msgs.length} mesaj`,
      category: 'İçe Aktarılan',
      tags: ['içe-aktarma'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      date: localDateIso(),
      payload: {
        channel: 'Dosya İçe Aktarma',
        participants: 'Belirtilmedi',
        messages: msgs,
      },
    });
    setSearchParams({ recordId: created.id });
    setFeedback(`"${file.name}" içe aktarıldı.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAppendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newMsgText.trim()) return;
    const nextMsgs = [
      ...selected.payload.messages,
      {
        id: `msg-${Date.now()}`,
        sender: newSender.trim() || 'Kullanıcı',
        text: newMsgText.trim(),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    await updateModuleRecord<ChatPayload>(selected.id, {
      subtitle: `${selected.payload.channel} · ${nextMsgs.length} mesaj`,
      payload: { ...selected.payload, messages: nextMsgs },
    });
    setNewMsgText('');
  };

  const handleExtractQuote = async (msgText: string, sender: string) => {
    if (!selected) return;
    await addQuote({
      text: msgText,
      author: sender,
      sourceModule: 'sohbet-arsivi',
      sourceEntityId: selected.id,
      sourceTitle: selected.title,
      tags: ['sohbet'],
      isFavorite: false,
    });
    setFeedback('Seçilen mesaj Alıntı Defterim modülüne gönderildi.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSendToEncyclopedia = async () => {
    if (!selected) return;
    const compiled = selected.payload.messages
      .map((m) => `**${m.sender}:** ${m.text}`)
      .join('\n\n');
    await addModuleRecord({
      moduleId: 'kendi-ansiklopedim',
      entityType: 'encyclopedia_article',
      title: selected.title,
      subtitle: 'Sohbet Arşivinden işlenmiş taslak',
      category: selected.category,
      tags: [...selected.tags, 'sohbet-kaynaklı'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'sohbet-arsivi',
      sourceEntityId: selected.id,
      sourceLabel: selected.title,
      payload: {
        status: 'taslak',
        verification: 'inceleniyor',
        body: selected.payload.summary
          ? `${selected.payload.summary}\n\n${compiled}`
          : compiled,
        bibliography: `Kaynak Sohbet: ${selected.title} (${selected.date ?? ''})`,
        versions: [{ savedAt: new Date().toISOString(), summary: 'Sohbet Arşivinden oluşturuldu' }],
      },
    });
    setFeedback('Sohbet işlenmiş madde taslağı olarak Kendi Ansiklopedime aktarıldı.');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="sohbet-arsivi"
        recordCount={chats.length}
        primaryActionLabel={showForm ? 'Formu Kapat' : 'Yeni Sohbet Ekle'}
        onPrimaryAction={() => setShowForm((v) => !v)}
        extraActions={
          <label className="h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>TXT İçe Aktar</span>
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportTxt(f);
                e.target.value = '';
              }}
            />
          </label>
        }
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg bg-[#71C6BD]/15 border border-[#71C6BD]/30 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <Link to="/modul/kendi-ansiklopedim" className="text-[#71C6BD] hover:underline">
            Ansiklopediye Git →
          </Link>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <h2 className="text-lg font-semibold">Yeni Konuşma Kaydı</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sohbet başlığı"
              className="md:col-span-2 px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Tür (ör. AI Sohbet, Felsefi)"
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Konu kategorisi"
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Katılımcılar"
              className="px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <textarea
            rows={4}
            value={rawTranscript}
            onChange={(e) => setRawTranscript(e.target.value)}
            placeholder="Her satırı 'Konuşmacı: Mesaj' biçiminde girebilirsiniz..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap">
              Vazgeç
            </button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap">
              Sohbeti Kaydet
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-md whitespace-nowrap ${categoryFilter === 'all' ? 'bg-white dark:bg-[#1C2633] font-medium' : 'text-[#546070]'}`}
          >
            Tümü ({chats.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs rounded-md whitespace-nowrap ${categoryFilter === cat ? 'bg-white dark:bg-[#1C2633] font-medium' : 'text-[#546070]'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 w-full sm:w-64">
          <Search className="w-4 h-4 text-[#546070] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sohbetlerde ara..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-[#71C6BD] mx-auto" />
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Henüz sohbet kaydı bulunmuyor. Felsefe Meclisinden veya yeni kayıt formundan sohbet ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSearchParams({ recordId: c.id })}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selected?.id === c.id
                    ? 'bg-white dark:bg-[#1C2633] border-[#71C6BD]'
                    : 'bg-white/70 dark:bg-[#1C2633]/70 border-black/10 dark:border-white/10'
                }`}
              >
                <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                  {c.category} · {c.date ?? c.createdAt.slice(0, 10)}
                </div>
                <div className="font-semibold mt-0.5 truncate">{c.title}</div>
                <div className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-1">
                  {c.payload.messages.length} mesaj
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                      {selected.payload.channel} · {selected.payload.participants}
                    </p>
                    <h2 className="text-2xl font-semibold mt-0.5">{selected.title}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSendToEncyclopedia}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      <BookPlus className="w-3.5 h-3.5 text-[#71C6BD] shrink-0" />
                      <span>Ansiklopedi Taslağı Oluştur</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      aria-label="Sohbeti sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {selected.payload.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/5 dark:border-white/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#71C6BD]">{m.sender}</span>
                        <button
                          type="button"
                          onClick={() => handleExtractQuote(m.text, m.sender)}
                          className="inline-flex items-center gap-1 text-[#546070] hover:text-[#D5B477] whitespace-nowrap shrink-0"
                        >
                          <QuoteIcon className="w-3 h-3 shrink-0" />
                          <span>Alıntı Çıkar</span>
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAppendMessage} className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newSender}
                    onChange={(e) => setNewSender(e.target.value)}
                    placeholder="Konuşmacı"
                    className="w-full sm:w-36 h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <input
                    type="text"
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    placeholder="Konuşmaya yeni mesaj ekle..."
                    className="flex-1 min-w-[180px] h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <button
                    type="submit"
                    className="h-9 inline-flex items-center justify-center gap-1 px-3.5 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Ekle</span>
                  </button>
                </form>

                <RecordActionsBar
                  moduleId="sohbet-arsivi"
                  entityId={selected.id}
                  entityType="conversation"
                  entityLabel={selected.title}
                  privacyDomain="kisisel"
                  nodeType="dusunce"
                />
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir sohbet seçin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Sohbeti Sil"
        description={`"${deleteTarget?.title}" konuşma kaydını silmek istediğinize emin misiniz?`}
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
