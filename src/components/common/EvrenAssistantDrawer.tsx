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
  suggestedConceptTitle?: string;
}

export function EvrenAssistantDrawer() {
  const location = useLocation();
  const {
    aiDrawerOpen,
    setAiDrawerOpen,
    preferences,
    books,
    quotes,
    knowledgeNodes,
    moduleRecords,
    addKnowledgeNode,
    addQuickNote,
  } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [shareContext, setShareContext] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiServerConfigured, setAiServerConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const activeModule = MODULES.find((m) => location.pathname.includes(m.id));

  useEffect(() => {
    if (!aiDrawerOpen) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setAiServerConfigured(Boolean(d.aiConfigured)))
      .catch(() => setAiServerConfigured(false));
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
    const recentNodes = generalAllowed ? knowledgeNodes.filter((node) =>
      node.sourceModule === 'zihin-atlasi' && !node.sourceEntityId)
      .slice(0, 5).map((node) => `Kavram: ${node.title}`) : [];
    const permittedRecords = moduleRecords
      .filter((record) => !record.isArchived && record.moduleId === activeModule?.id &&
        preferences.aiPermittedDomains[record.privacyDomain] &&
        !(record.payload as { hideFromGlobalSearch?: boolean })?.hideFromGlobalSearch)
      .slice(0, 5).map((record) => `Modül kaydı: ${record.title}`);
    return [...recentBooks, ...recentQuotes, ...recentNodes, ...permittedRecords].join('\n').slice(0, 8000);
  };

  const quickPrompts = (() => {
    if (activeModule?.id === 'siir-deryasi') {
      return [
        'Bu şiirdeki imgeler ile Zihin Atlası kavramları arasında bağ kurmama yardım et.',
        'Türk şiirinde hece ölçüsü ve redif çözümlemesi yaparken nelere dikkat etmeliyim?',
      ];
    }
    if (activeModule?.id === 'felsefe-meclisi') {
      return [
        'Seçili felsefi soruya karşıt iki ekolden Sokratik sorular üret.',
        'Bu düşünce deneyinin etik ve epistemolojik sonuçlarını tartışmaya aç.',
      ];
    }
    if (activeModule?.id === 'matematik-laboratuvari' || activeModule?.id === 'bilim-muzesi') {
      return [
        'Bu konuyu öğrencilere sezgisel bir benzetmeyle nasıl anlatabilirim?',
        'Matematiksel veya bilimsel bir kavramın tarihsel gelişim bağlamını özetle.',
      ];
    }
    if (activeModule?.id === 'tarih-atlasi') {
      return [
        'Bu tarihsel dönemdeki medeniyetler arası etkileşimleri karşılaştırmalı olarak özetle.',
        'Gerçek tarihten ayrılan bir alternatif tarih senaryosu için tutarlı kırılma noktaları öner.',
      ];
    }
    if (activeModule?.id === 'automusicpro' || activeModule?.id === 'kendi-dunyam') {
      return [
        'Kurgusal dünya veya besteleme çalışmam için tematik ilham ve yapısal tutarlılık önerileri ver.',
        'Tarih Atlası veya Kelime Müzesinden yaratıcı atölye üretimine nasıl köprü kurabilirim?',
      ];
    }
    return [
      'Kütüphanemdeki kitaplar ile Zihin Atlasındaki kavramlar arasında nasıl bağlantılar kurulabilir?',
      'Okuma ve not alma sürecimi derinleştirmek için Sokratik bir soru öner.',
      'Kelime Müzesi ve Şiir Deryası arasında tematik bir çalışma planı öner.',
    ];
  })();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || sending || !preferences.aiAssistantEnabled) return;

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
            suggestedConceptTitle: currentPrompt.slice(0, 44),
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

  const handleApproveSaveAsConcept = async (msg: ChatMessage) => {
    await addKnowledgeNode({
      title: msg.suggestedConceptTitle || 'Asistan Kavram Önerisi',
      nodeType: 'dusunce',
      summary: `${msg.text.slice(0, 220)} [Yapay zekâ önerisi]`,
      sourceModule: 'zihin-atlasi',
      tags: ['asistan-onerisi'],
      x: 240 + (knowledgeNodes.length * 47) % 240,
      y: 140 + (knowledgeNodes.length * 53) % 180,
      isDemo: false,
    });
    setSavedFeedback('Onayınızla Zihin Atlası\'na düşünce düğümü olarak eklendi.');
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

      <div className="px-5 py-2.5 bg-[#EFECE5]/60 dark:bg-[#10151E]/60 border-b border-black/10 dark:border-white/10 text-xs text-[#546070] dark:text-[#9BA7B6]">
        {!preferences.aiAssistantEnabled
          ? 'Asistan Ayarlardan devre dışı bırakıldı.'
          : aiServerConfigured === false
            ? 'Sunucu yapılandırması bekleniyor.'
            : 'Üretilen yanıtlar kaynaklı kayıtlarınızdan ayrıdır ve onayınız olmadan kaydedilmez.'}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3 text-sm text-[#546070] dark:text-[#9BA7B6]">
            <p>
              Evren Asistanı ile kitaplarınız, alıntılarınız, kavramlarınız ve izin verdiğiniz modül
              kayıtları arasında bağlantı önerileri veya Sokratik sorular talep edebilirsiniz.
            </p>
            <div className="space-y-2 pt-2">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#141923] dark:text-[#F1F3F5]"
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
                    <button
                      type="button"
                      onClick={() => handleApproveSaveAsConcept(msg)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Sparkles className="w-3 h-3" />
                      Zihin Atlası Düğümü Yap
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
          <input type="checkbox" checked={shareContext} disabled={sending} onChange={(event) => setShareContext(event.target.checked)} />
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
          disabled={!preferences.aiAssistantEnabled || sending}
          placeholder={
            preferences.aiAssistantEnabled
              ? 'Düşünsel soru veya özet isteği yazın...'
              : 'Asistan devre dışı'
          }
          className="min-w-0 flex-1 px-3 py-2 text-sm rounded-lg bg-[#EFECE5] dark:bg-[#10151E] border border-black/10 dark:border-white/10 text-[#141923] dark:text-[#F1F3F5] focus:outline-none focus:border-[#8C6B32] dark:focus:border-[#D6B782]"
        />
        <button
          type="submit"
          disabled={!preferences.aiAssistantEnabled || sending || !prompt.trim()}
          className="p-2.5 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] disabled:opacity-40 hover:opacity-90 transition-opacity"
          aria-label="Gönder"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </aside>
  );
}
