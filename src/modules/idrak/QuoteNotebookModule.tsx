import { IndependentApplicationLink } from '../../integrations/shared/IndependentApplicationLink';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Network,
  Plus,
  Quote as QuoteIcon,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { findSimilarQuotes, getRelationsForEntity } from '../../core/services/integrationService';
import type { Quote, RelationType } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

export function QuoteNotebookModule() {
  const [searchParams] = useSearchParams();
  const focusedQuoteId = searchParams.get('quoteId');

  const {
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    recordModuleOpen,
    addQuote,
    updateQuote,
    deleteQuote,
    linkQuoteToConcept,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('alinti-defterim');
  }, [recordModuleOpen]);

  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add quote state
  const [text, setText] = useState('');
  const [bookId, setBookId] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualSource, setManualSource] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');

  // Link to concept modal/panel state
  const [linkingQuote, setLinkingQuote] = useState<Quote | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [newConceptTitle, setNewConceptTitle] = useState('');
  const [newConceptSummary, setNewConceptSummary] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('kavramlastirir');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);

  const similarMatches = useMemo(() => findSimilarQuotes(text, quotes), [text, quotes]);

  const conceptNodes = useMemo(
    () => knowledgeNodes.filter((n) => n.nodeType === 'kavram' || n.nodeType === 'dusunce'),
    [knowledgeNodes]
  );

  const filteredQuotes = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return quotes.filter((item) => {
      if (onlyFavorites && !item.isFavorite) return false;
      if (
        q &&
        !item.text.toLocaleLowerCase('tr-TR').includes(q) &&
        !item.author.toLocaleLowerCase('tr-TR').includes(q) &&
        !item.sourceTitle.toLocaleLowerCase('tr-TR').includes(q) &&
        !item.tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [quotes, onlyFavorites, query]);

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const book = books.find((b) => b.id === bookId);
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await addQuote({
      text: text.trim(),
      author: book ? book.author : manualAuthor.trim() || 'Bilinmeyen Yazar',
      bookId: book?.id,
      sourceTitle: book ? book.title : manualSource.trim() || 'Serbest Kaynak',
      pageNumber: pageNumber.trim() || undefined,
      tags,
      isFavorite: false,
      isDemo: false,
    });

    setText('');
    setBookId('');
    setManualAuthor('');
    setManualSource('');
    setPageNumber('');
    setTagsRaw('');
    setShowAddForm(false);
    setFeedback('Alıntı kaydedildi.');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleLinkToConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingQuote) return;
    if (!selectedConceptId && !newConceptTitle.trim()) return;

    const { conceptNode } = await linkQuoteToConcept({
      quote: linkingQuote,
      conceptNodeId: selectedConceptId || undefined,
      newConceptTitle: newConceptTitle.trim() || undefined,
      newConceptSummary: newConceptSummary.trim() || undefined,
      relationType,
    });

    setFeedback(
      `Alıntı "${conceptNode.title}" kavram düğümüyle ilişkilendirildi ve Zihin Atlasına işlendi.`
    );
    setLinkingQuote(null);
    setSelectedConceptId('');
    setNewConceptTitle('');
    setNewConceptSummary('');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#D5B477] font-medium">İdrak · Merkezi Alıntı Arşivi</p>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-0.5">
            Alıntı Defterim
          </h1>
          <Link to="/modul/alinti-defterim/calisma" className="inline-flex min-h-11 items-center text-sm underline">Çalışma defteri</Link>
          <IndependentApplicationLink appId="alinti-defterim" className="ml-3 inline-flex min-h-11 items-center text-sm underline">Ayrı sekmede aç</IndependentApplicationLink>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
            Kitaplardan ve düşüncelerden süzülen alıntılar · Benzer kayıt kontrolü ve Zihin Atlası
            bağlantıları.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{showAddForm ? 'Formu Kapat' : 'Yeni Alıntı Ekle'}</span>
        </button>
      </div>

      {feedback && (
        <div className="px-4 py-3 rounded-xl bg-[#71C6BD]/15 border border-[#71C6BD]/30 text-sm flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <Link
            to="/modul/zihin-atlasi"
            className="text-xs font-medium text-[#71C6BD] hover:underline whitespace-nowrap"
          >
            Zihin Atlasını Aç →
          </Link>
        </div>
      )}

      {/* Add Quote Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddQuote}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <h2 className="text-xl font-semibold">Yeni Alıntı Oluştur</h2>
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
              Alıntı Metni *
            </label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Alıntı cümlesini veya pasajını yazın..."
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            {similarMatches.length > 0 && (
              <p className="mt-1.5 text-xs text-[#D5B477]">
                Benzer kayıt uyarısı: Arşivinizde bu ifadeye benzer {similarMatches.length} alıntı
                zaten kayıtlı.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Dijital Kütüphanemden Kitap Seç (Önerilen)
              </label>
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="">Kitap dışı / manuel kaynak</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Sayfa No
              </label>
              <input
                type="text"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="Örn. 42"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>

            {!bookId && (
              <>
                <div>
                  <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                    Yazar / Konuşmacı
                  </label>
                  <input
                    type="text"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    placeholder="Yazar adı"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                    Kaynak Başlığı
                  </label>
                  <input
                    type="text"
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                    placeholder="Konferans, makale vb."
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
              Etiketler (virgülle ayırın)
            </label>
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="zaman, edebiyat, insan"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-8 inline-flex items-center justify-center px-4 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap"
            >
              Alıntıyı Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
          <button
            type="button"
            onClick={() => setOnlyFavorites(false)}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md whitespace-nowrap ${
              !onlyFavorites
                ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5]'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`}
          >
            Tümü ({quotes.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlyFavorites(true)}
            className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md whitespace-nowrap ${
              onlyFavorites
                ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5]'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`}
          >
            Favoriler ({quotes.filter((q) => q.isFavorite).length})
          </button>
        </div>

        <div className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 w-full sm:w-72">
          <Search className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Alıntı, yazar veya etiket ara..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Link to Concept Drawer/Card */}
      {linkingQuote && (
        <form
          onSubmit={handleLinkToConcept}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-[#71C6BD] space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#71C6BD] font-medium">Zihin Atlası Bağlantısı Kur</p>
              <h2 className="text-lg font-semibold mt-0.5">
                Alıntıyı Kavram Düğümüyle İlişkilendir
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLinkingQuote(null)}
              className="text-xs text-[#546070] hover:underline"
            >
              Kapat
            </button>
          </div>

          <blockquote className="font-serif italic text-base text-[#546070] dark:text-[#C7D0DC]">
            “{linkingQuote.text}”
          </blockquote>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Mevcut Kavram Düğümü Seç
              </label>
              <select
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="">Yeni kavram oluştur...</option>
                {conceptNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Yeni Kavram Adı (Seçili değilse)
              </label>
              <input
                type="text"
                value={newConceptTitle}
                onChange={(e) => setNewConceptTitle(e.target.value)}
                disabled={Boolean(selectedConceptId)}
                placeholder="Örn. Zaman ve Hafıza"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                İlişki Türü
              </label>
              <select
                value={relationType}
                onChange={(e) => setRelationType(e.target.value as RelationType)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="kavramlastirir">Kavramlaştırır</option>
                <option value="iliskilidir">İlişkilidir</option>
                <option value="besler">Besler</option>
                <option value="referans_verir">Referans Verir</option>
              </select>
            </div>
          </div>

          {!selectedConceptId && (
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Yeni Kavram Özeti (Opsiyonel)
              </label>
              <input
                type="text"
                value={newConceptSummary}
                onChange={(e) => setNewConceptSummary(e.target.value)}
                placeholder="Bu kavramın kısa tanımı..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLinkingQuote(null)}
              className="h-8 inline-flex items-center justify-center px-4 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!selectedConceptId && !newConceptTitle.trim()}
              className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] disabled:opacity-40 whitespace-nowrap"
            >
              Bağlantıyı Oluştur
            </button>
          </div>
        </form>
      )}

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-3">
          <QuoteIcon className="w-8 h-8 text-[#D5B477] mx-auto" />
          <h2 className="text-xl font-semibold">Alıntı kaydı bulunamadı</h2>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Kütüphanenizdeki bir kitaptan veya serbest kaynaklardan ilk alıntınızı ekleyin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const rels = getRelationsForEntity(quote.id, entityRelations);
            const conceptLinks = rels.filter((r) => r.toModule === 'zihin-atlasi');
            const isFocused = focusedQuoteId === quote.id;

            return (
              <article
                key={quote.id}
                className={`p-6 rounded-xl bg-white dark:bg-[#1C2633] border transition-colors space-y-4 ${
                  isFocused
                    ? 'border-[#D5B477]'
                    : 'border-black/10 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <blockquote className="font-serif italic text-xl leading-relaxed text-[#141923] dark:text-[#F1F3F5]">
                    “{quote.text}”
                  </blockquote>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuote(quote.id, { isFavorite: !quote.isFavorite })}
                      aria-label="Favori"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          quote.isFavorite
                            ? 'text-[#D5B477] fill-[#D5B477]'
                            : 'text-[#546070] dark:text-[#9BA7B6]'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(quote)}
                      aria-label="Alıntıyı sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-[#546070] dark:text-[#9BA7B6]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#141923] dark:text-[#F1F3F5]">
                      {quote.author}
                    </span>
                    <span aria-hidden="true">·</span>
                    {quote.bookId ? (
                      <Link
                        to={`/modul/dijital-kutuphanem?bookId=${encodeURIComponent(quote.bookId)}`}
                        className="inline-flex items-center gap-1 text-[#71C6BD] hover:underline"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {quote.sourceTitle}
                      </Link>
                    ) : (
                      <span>{quote.sourceTitle}</span>
                    )}
                    {quote.pageNumber && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">s. {quote.pageNumber}</span>
                      </>
                    )}
                    {quote.tags.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{quote.tags.join(' / ')}</span>
                      </>
                    )}
                    {quote.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Demo</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {conceptLinks.length > 0 && (
                      <Link
                        to={`/modul/zihin-atlasi?nodeId=${encodeURIComponent(conceptLinks[0].toEntityId)}`}
                        className="inline-flex items-center gap-1 text-[#71C6BD] hover:underline whitespace-nowrap"
                      >
                        {conceptLinks.length} kavram bağı <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setLinkingQuote(quote);
                        setSelectedConceptId('');
                        setNewConceptTitle('');
                      }}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg border border-black/10 dark:border-white/15 text-[#141923] dark:text-[#F1F3F5] hover:bg-black/5 dark:hover:bg-white/5 font-medium whitespace-nowrap shrink-0"
                    >
                      <Network className="w-3.5 h-3.5 text-[#71C6BD] shrink-0" />
                      <span>Kavram Düğümüyle İlişkilendir</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Alıntıyı Sil"
        description="Bu alıntıyı ve ona bağlı Zihin Atlası ilişkilerini silmek istediğinize emin misiniz?"
        confirmLabel="Evet, Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteQuote(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
