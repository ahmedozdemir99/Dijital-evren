import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Loader2, Send, Sparkles, X } from 'lucide-react';
import { MODULES } from '../../core/registry/modules';
import { requestAssistant } from '../../core/services/supabaseAdapter';
import { useAppStore } from '../../store/useAppStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  generatedNotice?: string;
}

type AssistantStatus = 'checking' | 'ready' | 'unconfigured' | 'offline';
const statusText: Record<AssistantStatus, string> = {
  checking: 'Asistanın sunucusu denetleniyor.',
  ready: 'Yanıtlar onayınızla notlara kaydedilir.',
  unconfigured: 'Evren Asistanı için sunucu kurulumu gerekiyor.',
  offline: 'Asistan sunucusuna ulaşılamadı.',
};

export function EvrenAssistantDrawer() {
  const location = useLocation();
  const {
    aiDrawerOpen,
    setAiDrawerOpen,
    preferences,
    books,
    quotes,
    moduleRecords,
    addQuickNote,
  } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [shareContext, setShareContext] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>('checking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const activeModule = MODULES.find((m) => location.pathname.includes(m.id));
  const canAsk = preferences.aiAssistantEnabled && status === 'ready' && !sending;

  useEffect(() => {
    if (!aiDrawerOpen) return;
    const controller = new AbortController();
    setStatus('checking');
    fetch('/api/health', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Health check failed');
        const health = await response.json();
        if (!controller.signal.aborted) setStatus(health.aiConfigured === true ? 'ready' : 'unconfigured');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('offline');
      });
    return () => controller.abort();
  }, [aiDrawerOpen]);

  if (!aiDrawerOpen) return null;

  const buildPermittedContextSummary = () => {
    const domain = activeModule?.privacyDomain ?? 'genel';
    if (!preferences.aiPermittedDomains[domain]) return '';
    const generalAllowed = preferences.aiPermittedDomains.genel;
    const recentBooks = generalAllowed ? books.filter((book) => !book.isArchived)
      .slice(0, 4).map((book) => `Kitap: ${book.title} (${book.author})`) : [];
    const recentQuotes = generalAllowed ? quotes.filter((quote) => !quote.isArchived)
      .slice(0, 3).map((quote) => `Alıntı: ${quote.text.slice(0, 100)}`) : [];
    const permittedRecords = moduleRecords
      .filter((record) => !record.isArchived && record.moduleId === activeModule?.id &&
        preferences.aiPermittedDomains[record.privacyDomain] &&
        !(record.payload as { hideFromGlobalSearch?: boolean })?.hideFromGlobalSearch)
      .slice(0, 5).map((record) => `Modül kaydı: ${record.title}`);
    return [...recentBooks, ...recentQuotes, ...permittedRecords].join('\n').slice(0, 8000);
  };

  const quickPrompts = activeModule?.id === 'siir-deryasi'
    ? ['Bu şiirdeki imgeleri yorumlamama yardım et.', 'Türk şiirinde hece ölçüsü ve redif çözümlemesi yaparken nelere dikkat etmeliyim?']
    : ['Okuma ve not alma sürecimi derinleştirmek için bir soru öner.', 'Alıntı Defterim ve Şiir Deryası arasında tematik bir çalışma planı öner.'];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAsk || !prompt.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt.trim(),
    };
    const currentPrompt = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await requestAssistant({
        prompt: currentPrompt,
        activeModule: activeModule?.name,
        contextSummary: shareContext ? buildPermittedContextSummary() : undefined,
        history: shareContext ? messages.slice(-6).map((message) => ({
          role: message.role, text: message.text.slice(0, 1500),
        })) : undefined,
      });
      setShareContext(false);
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: data.error || 'Sunucu yanıtı alınamadı.',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: data.reply,
            generatedNotice: data.generatedNotice,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: error instanceof Error ? error.message : 'Yapay zekâ servisine bağlanılamadı.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleApproveSaveAsNote = async (msg: ChatMessage) => {
    await addQuickNote(
      `Evren Asistanı Önerisi (${new Date().toLocaleDateString('tr-TR')})`,
      `${msg.text}\n\n[Not: Yapay zekâ tarafından üretilmiş içerik — kullanıcı onayı ile kaydedildi]`,
      ['asistan-oneri']
    );
    setSavedFeedback('Onayınızla Hızlı Notlara kaydedildi.');
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#1C2633] border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col"
      aria-label="Evren Asistanı"
    >
      <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Evren Asistanı
          </h2>
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
            {activeModule ? `Bağlam: ${activeModule.name} (${activeModule.privacyDomain})` : 'Bağlam: Ana Kontrol Paneli'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAiDrawerOpen(false)}
          aria-label="Evren Asistanını Kapat"
          className="p-2 rounded-lg text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div role="status" className="px-5 py-2.5 bg-[#EFECE5]/60 dark:bg-[#10151E]/60 border-b border-black/10 dark:border-white/10 text-xs text-[#546070] dark:text-[#9BA7B6]">
        {preferences.aiAssistantEnabled ? statusText[status] : 'Asistan Ayarlardan devre dışı bırakıldı.'}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3 text-sm text-[#546070] dark:text-[#9BA7B6]">
            <p>
              Evren Asistanı ile kitaplarınız, alıntılarınız ve izin verdiğiniz modül
              kayıtları arasında bağlantı önerileri veya Sokratik sorular talep edebilirsiniz.
            </p>
            <div className="space-y-2 pt-2">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!canAsk}
                  onClick={() => setPrompt(qp)}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#141923] dark:text-[#F1F3F5] disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#8C6B32]/12 dark:bg-[#D6B782]/12 text-[#141923] dark:text-[#F1F3F5] ml-6'
                  : 'bg-[#EFECE5]/80 dark:bg-[#10151E]/80 border border-black/10 dark:border-white/10 text-[#141923] dark:text-[#F1F3F5] mr-3'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.generatedNotice && (
                <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                  <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">
                    {msg.generatedNotice}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveSaveAsNote(msg)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Check className="w-3 h-3" />
                      Onayla ve Notlara Kaydet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {savedFeedback && (
        <div className="mx-5 mb-2 px-3 py-2 text-xs rounded-lg bg-[#93BF90]/20 text-[#141923] dark:text-[#F1F3F5] border border-[#93BF90]/40">
          {savedFeedback}
        </div>
      )}

      <div className="px-4 pt-2 text-sm">
        <p>Sorunuz, yanıt üretmek için Gemini’ye gönderilir. <Link to="/ayarlar" onClick={() => setAiDrawerOpen(false)} className="underline">Oturum ve izin ayarları</Link></p>
        <label className="my-2 flex min-h-8 items-center gap-2">
          <input type="checkbox" checked={shareContext} disabled={!canAsk} onChange={(event) => setShareContext(event.target.checked)} />
          Bu soruya izinli kayıt özetlerini ve son konuşmayı ekle
        </label>
      </div>
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-black/10 dark:border-white/10 flex items-center gap-2"
      >
        <input
          type="text"
          value={prompt}
          maxLength={4000}
          aria-label="Asistana soru"
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!canAsk}
          placeholder={
            status === 'ready' && preferences.aiAssistantEnabled
              ? 'Düşünsel soru veya özet isteği yazın...'
              : 'Asistan şu anda kullanılamıyor'
          }
          className="min-w-0 flex-1 px-3 py-2 text-sm rounded-lg bg-[#EFECE5] dark:bg-[#10151E] border border-black/10 dark:border-white/10 text-[#141923] dark:text-[#F1F3F5] focus:outline-none focus:border-[#8C6B32] dark:focus:border-[#D6B782]"
        />
        <button
          type="submit"
          disabled={!canAsk || !prompt.trim()}
          className="p-2.5 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] disabled:opacity-40 hover:opacity-90 transition-opacity"
          aria-label="Gönder"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </aside>
  );
}
