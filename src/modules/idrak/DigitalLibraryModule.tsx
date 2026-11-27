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
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { findSimilarQuotes, getRelationsForEntity } from '../../core/services/integrationService';
import type { Book, BookStatus } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

const STATUS_LABELS: Record<BookStatus, string> = {
  okunuyor: 'Okunuyor',
  okunacak: 'Okunacak',
  okundu: 'Okundu',
  beklemede: 'Beklemede',
};

export function DigitalLibraryModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    recordModuleOpen,
    addBook,
    updateBook,
    deleteBook,
    addQuote,
    ensureEntityNode,
    linkQuoteToConcept,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('dijital-kutuphanem');
  }, [recordModuleOpen]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookStatus>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const selectedBookId = searchParams.get('bookId') || books[0]?.id || null;
  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null;

  // Add book form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Edebiyat');
  const [status, setStatus] = useState<BookStatus>('okunuyor');
  const [totalPages, setTotalPages] = useState('250');
  const [currentPage, setCurrentPage] = useState('0');
  const [publishYear, setPublishYear] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  // Quick Quote from selected book
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [quoteTags, setQuoteTags] = useState('');
  const [linkConceptTitle, setLinkConceptTitle] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [flowFeedback, setFlowFeedback] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return books.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (
        q &&
        !b.title.toLocaleLowerCase('tr-TR').includes(q) &&
        !b.author.toLocaleLowerCase('tr-TR').includes(q) &&
        !b.category.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [books, statusFilter, query]);

  const bookQuotes = useMemo(() => {
    if (!selectedBook) return [];
    return quotes.filter((q) => q.bookId === selectedBook.id);
  }, [quotes, selectedBook]);

  const bookRelations = useMemo(() => {
    if (!selectedBook) return [];
    return getRelationsForEntity(selectedBook.id, entityRelations);
  }, [entityRelations, selectedBook]);

  const conceptNodes = useMemo(
    () => knowledgeNodes.filter((n) => n.nodeType === 'kavram' || n.nodeType === 'dusunce'),
    [knowledgeNodes]
  );

  const similarQuotes = useMemo(
    () => findSimilarQuotes(quoteText, quotes),
    [quoteText, quotes]
  );

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    const total = Math.max(1, Number(totalPages) || 200);
    const curr = Math.min(total, Math.max(0, Number(currentPage) || 0));
    const created = await addBook({
      title: title.trim(),
      author: author.trim(),
      category: category.trim() || 'Genel',
      status,
      totalPages: total,
      currentPage: curr,
      publishYear: publishYear.trim() || undefined,
      targetDate: targetDate || undefined,
      notes: notes.trim() || undefined,
      isDemo: false,
    });
    setTitle('');
    setAuthor('');
    setPublishYear('');
    setTargetDate('');
    setNotes('');
    setCurrentPage('0');
    setShowAddForm(false);
    setSearchParams({ bookId: created.id });
    setFlowFeedback(`"${created.title}" kütüphaneye eklendi.`);
    setTimeout(() => setFlowFeedback(null), 3500);
  };

  const handleCreateQuoteFromBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !quoteText.trim()) return;

    const tags = quoteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const createdQuote = await addQuote({
      text: quoteText.trim(),
      author: selectedBook.author,
      bookId: selectedBook.id,
      sourceTitle: selectedBook.title,
      pageNumber: quotePage.trim() || undefined,
      tags,
      isFavorite: false,
      isDemo: false,
    });

    if (selectedConceptId || linkConceptTitle.trim()) {
      await linkQuoteToConcept({
        quote: createdQuote,
        conceptNodeId: selectedConceptId || undefined,
        newConceptTitle: linkConceptTitle.trim() || undefined,
      });
      setFlowFeedback(
        'Alıntı oluşturuldu, kitaba bağlandı ve Zihin Atlası kavram düğümüyle ilişkilendirildi.'
      );
    } else {
      setFlowFeedback('Alıntı Alıntı Defterim modülüne kaydedildi ve kitapla ilişkilendirildi.');
    }

    setQuoteText('');
    setQuotePage('');
    setQuoteTags('');
    setLinkConceptTitle('');
    setSelectedConceptId('');
    setShowQuoteForm(false);
    setTimeout(() => setFlowFeedback(null), 4000);
  };

  const handleSendBookToAtlas = async (book: Book) => {
    await ensureEntityNode({
      title: book.title,
      nodeType: 'kitap',
      summary: `${book.author} · ${book.category} · Dijital Kütüphanem`,
      sourceModule: 'dijital-kutuphanem',
      sourceEntityId: book.id,
      tags: [book.category],
    });
    setFlowFeedback(`"${book.title}" Zihin Atlası grafiğine düğüm olarak eklendi.`);
    setTimeout(() => setFlowFeedback(null), 3500);
  };

  const totalReadPages = books.reduce((sum, b) => sum + b.currentPage, 0);
  const completedBooksCount = books.filter((b) => b.status === 'okundu').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#71C6BD] font-medium">İdrak · Veri Sahibi Modül</p>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-0.5">
            Dijital Kütüphanem
          </h1>
          <Link to="/modul/dijital-kutuphanem/calisma" className="inline-flex min-h-11 items-center text-sm underline">Çalışma defteri</Link>
          <Link to="/entegrasyonlar/dijital-kutuphanem" className="ml-3 inline-flex min-h-11 items-center text-sm underline">Bağımsız uygulamayı aç</Link>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
            Merkezi kitap arşivi, okuma ilerlemesi ve Alıntı Defterim / Zihin Atlası kaynak noktası.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right pr-2 hidden sm:block">
            <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Arşiv Özeti</div>
            <div className="text-sm font-medium tabular-nums">
              {books.length} kitap · {completedBooksCount} tamamlandı · {totalReadPages} s. okundu
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{showAddForm ? 'Formu Kapat' : 'Yeni Kitap Ekle'}</span>
          </button>
        </div>
      </div>

      {flowFeedback && (
        <div className="px-4 py-3 rounded-xl bg-[#71C6BD]/15 border border-[#71C6BD]/30 text-sm text-[#141923] dark:text-[#F1F3F5] flex items-center justify-between gap-3">
          <span>{flowFeedback}</span>
          <Link
            to="/modul/zihin-atlasi"
            className="text-xs font-medium text-[#71C6BD] hover:underline whitespace-nowrap"
          >
            Zihin Atlasında Gör →
          </Link>
        </div>
      )}

      {/* Add Book Panel */}
      {showAddForm && (
        <form
          onSubmit={handleAddBook}
          className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Yeni Kitap Kaydı
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Kitap Adı *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn. İnce Memed"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Yazar *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Örn. Yaşar Kemal"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Kategori
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Okuma Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                <option value="okunuyor">Okunuyor</option>
                <option value="okunacak">Okunacak</option>
                <option value="okundu">Okundu</option>
                <option value="beklemede">Beklemede</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                  Toplam Sayfa
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                  Mevcut Sayfa
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Yayın Yılı
              </label>
              <input
                type="text"
                value={publishYear}
                onChange={(e) => setPublishYear(e.target.value)}
                placeholder="Örn. 1955"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
                Hedef Okuma Tarihi (Ortak Takvim)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
              Kişisel Not / Değerlendirme
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kitapla ilgili temel gözlem veya okuma amacı..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-8 inline-flex items-center justify-center px-4 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
            >
              İptal
            </button>
            <button
              type="submit"
              className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap"
            >
              Kitabı Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
          {(['all', 'okunuyor', 'okunacak', 'okundu', 'beklemede'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                  : 'text-[#546070] dark:text-[#9BA7B6]'
              }`}
            >
              {st === 'all' ? 'Tümü' : STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 w-full sm:w-64">
          <Search className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kitap veya yazar ara..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Main Split: Book List + Detail Inspector */}
      {books.length === 0 ? (
        <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#71C6BD] mx-auto" />
          <h2 className="text-xl font-semibold">Kütüphaneniz henüz boş</h2>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] max-w-md mx-auto">
            İlk kitabınızı ekleyerek okuma takibini, alıntı üretimini ve Zihin Atlası kavram
            bağlantılarını başlatabilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="h-9 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap"
          >
            İlk Kitabı Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Book List */}
          <div className="lg:col-span-5 space-y-2.5">
            {filteredBooks.length === 0 ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                Filtreye uygun kitap bulunamadı.
              </div>
            ) : (
              filteredBooks.map((book) => {
                const isSelected = selectedBook?.id === book.id;
                const pct = Math.min(
                  100,
                  Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100)
                );
                const quoteCount = quotes.filter((q) => q.bookId === book.id).length;

                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setSearchParams({ bookId: book.id })}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      isSelected
                        ? 'bg-white dark:bg-[#1C2633] border-[#71C6BD]'
                        : 'bg-white/70 dark:bg-[#1C2633]/70 border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                          {STATUS_LABELS[book.status]} · {book.category}
                          {book.isDemo ? ' · Demo' : ''}
                        </p>
                        <h3 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5] truncate mt-0.5">
                          {book.title}
                        </h3>
                        <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{book.author}</p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#546070] dark:text-[#9BA7B6] shrink-0">
                        %{pct}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                      <span>
                        {book.currentPage}/{book.totalPages} sayfa
                      </span>
                      <span>{quoteCount} alıntı</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Book Detail & Integration Actions */}
          <div className="lg:col-span-7">
            {selectedBook ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                      {selectedBook.category}
                      {selectedBook.publishYear ? ` · ${selectedBook.publishYear}` : ''}
                      {selectedBook.isDemo ? ' · Demo Kayıt' : ''}
                    </p>
                    <h2 className="text-2xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-1">
                      {selectedBook.title}
                    </h2>
                    <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                      {selectedBook.author}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateBook(selectedBook.id, { isFavorite: !selectedBook.isFavorite })
                      }
                      aria-label="Favori yap"
                      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ${
                        selectedBook.isFavorite
                          ? 'text-[#D5B477]'
                          : 'text-[#546070] hover:text-[#D5B477]'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${selectedBook.isFavorite ? 'fill-[#D5B477]' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedBook)}
                      aria-label="Kitabı sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress & Rating Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-black/10 dark:border-white/10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#546070] dark:text-[#9BA7B6]">Okuma İlerlemesi</span>
                      <span className="font-mono tabular-nums">
                        {selectedBook.currentPage} / {selectedBook.totalPages} s.
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#71C6BD]"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (selectedBook.currentPage / Math.max(1, selectedBook.totalPages)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateBook(selectedBook.id, {
                            currentPage: Math.min(
                              selectedBook.totalPages,
                              selectedBook.currentPage + 10
                            ),
                          })
                        }
                        className="h-8 inline-flex items-center justify-center px-2.5 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 tabular-nums whitespace-nowrap shrink-0"
                      >
                        +10 s.
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateBook(selectedBook.id, {
                            currentPage: Math.min(
                              selectedBook.totalPages,
                              selectedBook.currentPage + 25
                            ),
                          })
                        }
                        className="h-8 inline-flex items-center justify-center px-2.5 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 tabular-nums whitespace-nowrap shrink-0"
                      >
                        +25 s.
                      </button>
                      <select
                        value={selectedBook.status}
                        onChange={(e) =>
                          updateBook(selectedBook.id, { status: e.target.value as BookStatus })
                        }
                        className="sm:ml-auto h-8 px-2.5 text-xs rounded-md bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                      >
                        <option value="okunuyor">Okunuyor</option>
                        <option value="okunacak">Okunacak</option>
                        <option value="okundu">Okundu</option>
                        <option value="beklemede">Beklemede</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                      Kişisel Değerlendirme
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => updateBook(selectedBook.id, { rating: star })}
                          aria-label={`${star} yıldız`}
                          className="p-1"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              (selectedBook.rating ?? 0) >= star
                                ? 'text-[#D5B477] fill-[#D5B477]'
                                : 'text-[#546070]/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {selectedBook.notes && (
                      <p className="text-xs text-[#546070] dark:text-[#9BA7B6] leading-relaxed">
                        {selectedBook.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cross-Module Integration Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm((v) => !v)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
                  >
                    <QuoteIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Bu Kitaptan Alıntı Oluştur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendBookToAtlas(selectedBook)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                  >
                    <Network className="w-3.5 h-3.5 text-[#71C6BD] shrink-0" />
                    <span>Zihin Atlasına Kitap Düğümü Ekle</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#546070] dark:text-[#9BA7B6]">
                    <span className="whitespace-nowrap">Hedef Tarih:</span>
                    <input
                      type="date"
                      value={selectedBook.targetDate ?? ''}
                      onChange={(e) =>
                        updateBook(selectedBook.id, { targetDate: e.target.value || undefined })
                      }
                      className="h-9 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    />
                  </label>
                </div>

                <RecordActionsBar
                  moduleId="dijital-kutuphanem"
                  entityId={selectedBook.id}
                  entityType="book"
                  entityLabel={selectedBook.title}
                  privacyDomain="genel"
                  nodeType="kitap"
                  summary={`${selectedBook.author} · ${selectedBook.category}`}
                />

                {/* Inline Quote Creation + Concept Link Form */}
                {showQuoteForm && (
                  <form
                    onSubmit={handleCreateQuoteFromBook}
                    className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 space-y-3"
                  >
                    <h3 className="text-sm font-semibold">
                      “{selectedBook.title}” Kitabından Alıntı Oluştur
                    </h3>
                    <textarea
                      required
                      rows={3}
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value)}
                      placeholder="Kitaptan seçilen cümle veya paragraf..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                    />
                    {similarQuotes.length > 0 && (
                      <p className="text-xs text-[#D5B477]">
                        Benzer kayıt uyarısı: Alıntı Defterimde buna yakın {similarQuotes.length} kayıt
                        bulundu.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={quotePage}
                        onChange={(e) => setQuotePage(e.target.value)}
                        placeholder="Sayfa numarası (ör. 45)"
                        className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                      />
                      <input
                        type="text"
                        value={quoteTags}
                        onChange={(e) => setQuoteTags(e.target.value)}
                        placeholder="Etiketler (virgülle ayırın)"
                        className="px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                      />
                    </div>

                    <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                      <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">
                        Doğrudan Zihin Atlası Kavramıyla İlişkilendir (İsteğe Bağlı)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={selectedConceptId}
                          onChange={(e) => setSelectedConceptId(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
                        >
                          <option value="">Mevcut kavram düğümü seç...</option>
                          {conceptNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={linkConceptTitle}
                          onChange={(e) => setLinkConceptTitle(e.target.value)}
                          disabled={Boolean(selectedConceptId)}
                          placeholder="Veya yeni kavram düğümü adı yaz..."
                          className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuoteForm(false)}
                        className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap"
                      >
                        Alıntıyı Kaydet ve Bağla
                      </button>
                    </div>
                  </form>
                )}

                {/* Linked Quotes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      Bu Kitaba Bağlı Alıntılar ({bookQuotes.length})
                    </h3>
                    <Link
                      to="/modul/alinti-defterim"
                      className="inline-flex items-center gap-1 text-xs text-[#8C6B32] dark:text-[#D6B782] hover:underline"
                    >
                      Alıntı Defterim <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {bookQuotes.length === 0 ? (
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                      Bu kitaptan henüz alıntı çıkarılmadı.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {bookQuotes.map((q) => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/5 dark:border-white/5"
                        >
                          <p className="font-serif italic text-base text-[#141923] dark:text-[#F1F3F5]">
                            “{q.text}”
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
                            <span>{q.pageNumber ? `Sayfa ${q.pageNumber}` : 'Sayfa belirtilmedi'}</span>
                            <Link
                              to={`/modul/alinti-defterim?quoteId=${encodeURIComponent(q.id)}`}
                              className="text-[#71C6BD] hover:underline"
                            >
                              Kavrama Bağla →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relations */}
                {bookRelations.length > 0 && (
                  <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-2">
                    <h3 className="text-sm font-semibold">Bilgi Bağlantıları</h3>
                    <div className="space-y-1">
                      {bookRelations.map((r) => (
                        <div key={r.id} className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                          {r.fromLabel} → <span className="text-[#71C6BD]">{r.relationType}</span> →{' '}
                          {r.toLabel}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir kitap seçin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Kitabı Sil"
        description={`"${deleteTarget?.title}" kitabını silmek istediğinize emin misiniz? Bu kitaba bağlı alıntı kayıtları korunur ancak kitap bağlantısı kaldırılır.`}
        confirmLabel="Evet, Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteBook(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
