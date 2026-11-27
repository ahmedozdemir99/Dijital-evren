import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Network,
  Plus,
  Quote as QuoteIcon,
  SlidersHorizontal,
  Star,
  StickyNote,
} from 'lucide-react';
import {
  CENTERS,
  DOMAINS,
  MODULES,
  getCentersByDomain,
  getModuleById,
  getModulesByDomain,
} from '../core/registry/modules';
import { buildCalendarEvents } from '../core/services/integrationService';
import type { BookStatus, DashboardWidgetId } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

const DAILY_THOUGHTS = [
  'Bilgi tek başına hafızada beklediğinde yük, anlam bağlarıyla örüldüğünde hikmete dönüşür.',
  'Bir kitaptan alınan tek bir cümle, doğru soruyla buluştuğunda yeni bir düşünce kıtasının başlangıcı olabilir.',
  'Düzenli tutulan notlar geçmişteki kendinizle gelecekteki kendiniz arasında kurulan sessiz bir köprüdür.',
  'Sormak, cevabı bilmemekten değil; bilineni daha derin bir bağlama yerleştirme arzusundan doğar.',
  'Bilim evrenin yasalarını, edebiyat insanın iç sesini, tefekkür ise ikisinin arasındaki anlamı arar.',
];

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const {
    profile,
    preferences,
    moduleSettings,
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    quickNotes,
    moduleRecords,
    activityLogs,
    addBook,
    updateBook,
    addQuote,
    addQuickNote,
    deleteQuickNote,
    updatePreferences,
    setSearchOpen,
  } = useAppStore();

  const [now, setNow] = useState(() => new Date());
  const [editingWidgets, setEditingWidgets] = useState(false);

  // Quick capture tabs
  const [quickTab, setQuickTab] = useState<'not' | 'alinti' | 'kitap'>('not');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quoteBookId, setQuoteBookId] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('Edebiyat');
  const [bookPages, setBookPages] = useState('250');
  const [bookStatus, setBookStatus] = useState<BookStatus>('okunuyor');
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const enabledMap = useMemo(
    () => new Map(moduleSettings.map((s) => [s.moduleId, s.enabled])),
    [moduleSettings]
  );

  const favoriteModules = useMemo(() => {
    return moduleSettings
      .filter((s) => s.isFavorite && s.enabled)
      .map((s) => getModuleById(s.moduleId))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [moduleSettings]);

  const recentModules = useMemo(() => {
    return [...moduleSettings]
      .filter((s) => s.lastOpenedAt && s.enabled)
      .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
      .slice(0, 4)
      .map((s) => getModuleById(s.moduleId))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [moduleSettings]);

  const activeReadingBook = useMemo(() => {
    return books.find((b) => b.status === 'okunuyor') ?? books[0];
  }, [books]);

  const dailyThought = useMemo(() => {
    if (preferences.dailyThoughtCustom?.trim()) {
      return preferences.dailyThoughtCustom.trim();
    }
    const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    return DAILY_THOUGHTS[dayIndex % DAILY_THOUGHTS.length];
  }, [preferences.dailyThoughtCustom, now]);

  // Real activity metrics (today + last 7 days)
  const activityStats = useMemo(() => {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const todayCount = activityLogs.filter(
      (l) => new Date(l.createdAt).getTime() >= todayStart.getTime()
    ).length;

    const weekCount = activityLogs.filter(
      (l) => new Date(l.createdAt).getTime() >= sevenDaysAgo.getTime()
    ).length;

    const dailyBars: Array<{ label: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const count = activityLogs.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= d.getTime() && t < nextD.getTime();
      }).length;
      dailyBars.push({
        label: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        count,
      });
    }

    return { todayCount, weekCount, dailyBars };
  }, [activityLogs, now]);

  const calendarEvents = useMemo(() => {
    const centerColors: Record<string, string> = {};
    for (const c of CENTERS) centerColors[c.id] = c.color;
    return buildCalendarEvents({
      books,
      moduleRecords,
      moduleSettings,
      preferences,
      centerColors,
    });
  }, [books, moduleRecords, moduleSettings, preferences]);

  const curatedWord = useMemo(
    () => moduleRecords.find((r) => r.moduleId === 'kelime-muzesi' && !r.isArchived),
    [moduleRecords]
  );
  const curatedHistory = useMemo(
    () => moduleRecords.find((r) => r.moduleId === 'tarih-atlasi' && !r.isArchived),
    [moduleRecords]
  );
  const curatedQuestion = useMemo(
    () =>
      moduleRecords.find(
        (r) =>
          (r.moduleId === 'felsefe-meclisi' || r.moduleId === 'mantik-akademisi') &&
          !r.isArchived
      ),
    [moduleRecords]
  );

  const sortedWidgets = useMemo(() => {
    return [...preferences.dashboardWidgets].sort((a, b) => a.order - b.order);
  }, [preferences.dashboardWidgets]);

  const handleToggleWidget = async (id: DashboardWidgetId) => {
    const updated = preferences.dashboardWidgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    await updatePreferences({ dashboardWidgets: updated });
  };

  const handleMoveWidget = async (id: DashboardWidgetId, direction: -1 | 1) => {
    const ordered = [...preferences.dashboardWidgets].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((w) => w.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const temp = ordered[idx];
    ordered[idx] = ordered[swapIdx];
    ordered[swapIdx] = temp;
    const reindexed = ordered.map((w, i) => ({ ...w, order: i + 1 }));
    await updatePreferences({ dashboardWidgets: reindexed });
  };

  const showFeedback = (msg: string) => {
    setCaptureMessage(msg);
    setTimeout(() => setCaptureMessage(null), 3000);
  };

  const handleQuickNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    await addQuickNote(noteTitle, noteContent);
    setNoteTitle('');
    setNoteContent('');
    showFeedback('Hızlı not yerel depolamaya kaydedildi.');
  };

  const handleQuickQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim()) return;
    const selectedBook = books.find((b) => b.id === quoteBookId);
    await addQuote({
      text: quoteText.trim(),
      author: selectedBook ? selectedBook.author : quoteAuthor.trim() || 'Bilinmeyen Kaynak',
      bookId: selectedBook?.id,
      sourceTitle: selectedBook ? selectedBook.title : quoteAuthor.trim() || 'Serbest Kayıt',
      pageNumber: quotePage.trim() || undefined,
      tags: [],
      isFavorite: false,
    });
    setQuoteText('');
    setQuoteBookId('');
    setQuoteAuthor('');
    setQuotePage('');
    showFeedback('Alıntı Alıntı Defterim modülüne eklendi.');
  };

  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || !bookAuthor.trim()) return;
    await addBook({
      title: bookTitle.trim(),
      author: bookAuthor.trim(),
      category: bookCategory.trim() || 'Genel',
      status: bookStatus,
      totalPages: Math.max(1, Number(bookPages) || 200),
      currentPage: 0,
    });
    setBookTitle('');
    setBookAuthor('');
    setBookPages('250');
    showFeedback('Kitap Dijital Kütüphanem arşivine eklendi.');
  };

  const greetingHour = now.getHours();
  const greetingText =
    greetingHour < 12 ? 'Günaydın' : greetingHour < 18 ? 'İyi günler' : 'İyi akşamlar';

  const formattedDate = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderWidget = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      case 'daily_thought':
        return (
          <section
            key="daily_thought"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                Günün Düşüncesi
              </h2>
              <Link
                to="/ayarlar"
                className="text-xs text-[#546070] dark:text-[#9BA7B6] hover:text-[#8C6B32] dark:hover:text-[#D6B782]"
              >
                Özelleştir
              </Link>
            </div>
            <blockquote className="font-serif italic text-xl leading-relaxed text-[#141923] dark:text-[#F1F3F5]">
              “{dailyThought}”
            </blockquote>
          </section>
        );

      case 'daily_curated':
        return (
          <section
            key="daily_curated"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
          >
            <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
              Günün Seçkisi ve Öne Çıkanlar
            </h2>
            <div className="divide-y divide-black/5 dark:divide-white/5 space-y-3">
              <Link
                to="/modul/kelime-muzesi"
                className="pt-3 first:pt-0 block group hover:opacity-85 space-y-1"
              >
                <span className="text-xs font-medium text-[#D5B477]">Günün Kelimesi · Kelime Müzesi</span>
                <h3 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  {curatedWord?.title ?? 'Hikmet'}
                </h3>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] line-clamp-2">
                  {curatedWord?.subtitle ?? 'Derin kavrayış, sebep-sonuç ve değer bilgeliği.'}
                </p>
              </Link>

              <Link
                to="/modul/tarih-atlasi"
                className="pt-3 block group hover:opacity-85 space-y-1"
              >
                <span className="text-xs font-medium text-[#88B4FF]">Tarihte &amp; Mekânda İz</span>
                <h3 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  {curatedHistory?.title ?? 'İpek Yolu ve Anadolu Kervansarayları'}
                </h3>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] line-clamp-2">
                  {curatedHistory?.subtitle ?? 'Tarih Atlasında kaynaklı dönem katmanlarını inceleyin.'}
                </p>
              </Link>

              <Link
                to={curatedQuestion ? `/modul/${curatedQuestion.moduleId}` : '/modul/felsefe-meclisi'}
                className="pt-3 block group hover:opacity-85 space-y-1"
              >
                <span className="text-xs font-medium text-[#D5B477]">Günün Sorusu / Akıl Yürütme</span>
                <h3 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  {curatedQuestion?.title ?? 'Bilginin Sınırı ve Sorumluluk'}
                </h3>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] line-clamp-2">
                  {curatedQuestion?.subtitle ?? 'Felsefe Meclisi ve Mantık Akademisi ile kavramları sınayın.'}
                </p>
              </Link>
            </div>
          </section>
        );

      case 'continue_where_left':
        return (
          <section
            key="continue_where_left"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                Kaldığım Yerden Devam Et
              </h2>
              <Link
                to="/modul/dijital-kutuphanem"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#8C6B32] dark:text-[#D6B782] hover:underline whitespace-nowrap"
              >
                Kütüphaneye Git
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeReadingBook ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                        Dijital Kütüphanem · {activeReadingBook.category}
                        {activeReadingBook.isDemo ? ' · Demo Kayıt' : ''}
                      </p>
                      <h3 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-0.5">
                        {activeReadingBook.title}
                      </h3>
                      <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                        {activeReadingBook.author}
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[#8C6B32] dark:text-[#D6B782]">
                      {activeReadingBook.currentPage} / {activeReadingBook.totalPages} s.
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#71C6BD] transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (activeReadingBook.currentPage /
                              Math.max(1, activeReadingBook.totalPages)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateBook(activeReadingBook.id, {
                          currentPage: Math.min(
                            activeReadingBook.totalPages,
                            activeReadingBook.currentPage + 10
                          ),
                        })
                      }
                      className="h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors tabular-nums whitespace-nowrap shrink-0"
                    >
                      +10 Sayfa İlerle
                    </button>
                    <Link
                      to={`/modul/dijital-kutuphanem?bookId=${encodeURIComponent(activeReadingBook.id)}`}
                      className="h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                    >
                      Kitabı ve Alıntılarını Aç
                    </Link>
                  </div>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-black/10 dark:border-white/10 pt-4 lg:pt-0 lg:pl-6 space-y-2">
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                    Bilgi Ağı Özeti (Gerçek Kayıtlar)
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-1">
                    <div>
                      <div className="text-2xl font-serif font-semibold tabular-nums">
                        {books.length}
                      </div>
                      <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Kitap</div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-semibold tabular-nums">
                        {quotes.length}
                      </div>
                      <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Alıntı</div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-semibold tabular-nums">
                        {knowledgeNodes.length}
                      </div>
                      <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Kavram Düğümü</div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/modul/zihin-atlasi"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71C6BD] hover:underline"
                    >
                      <Network className="w-3.5 h-3.5" />
                      Zihin Atlası Grafiğini Görüntüle ({entityRelations.length} bağlantı)
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Henüz aktif bir okuma kaydınız bulunmuyor. İlk kitabınızı ekleyerek bilgi akışını başlatabilirsiniz.
                </p>
                <Link
                  to="/modul/dijital-kutuphanem"
                  className="h-9 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap shrink-0"
                >
                  İlk Kitabı Ekle
                </Link>
              </div>
            )}
          </section>
        );

      case 'domains_overview':
        return (
          <section key="domains_overview" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  Üç Ana Alan
                </h2>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                  3 ana alan, {CENTERS.length} tematik merkez ve {MODULES.length} işlevsel modülden oluşan kişisel dijital ekosisteminiz
                </p>
              </div>
              <Link
                to="/moduller"
                className="text-xs font-medium text-[#8C6B32] dark:text-[#D6B782] hover:underline whitespace-nowrap"
              >
                Tüm Modüller ({MODULES.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {DOMAINS.map((domain) => {
                const domainCenters = getCentersByDomain(domain.id);
                const domainMods = getModulesByDomain(domain.id);
                const enabledCount = domainMods.filter(
                  (m) => enabledMap.get(m.id) !== false
                ).length;

                return (
                  <Link
                    key={domain.id}
                    to={`/alan/${domain.id}`}
                    className="group p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                            <span
                              className="w-2.5 h-3 rounded-[2px]"
                              style={{ backgroundColor: domain.color }}
                            />
                            <span
                              className="w-2.5 h-3 rounded-[2px]"
                              style={{ backgroundColor: domain.secondaryColor }}
                            />
                          </span>
                          <h3 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5] truncate">
                            {domain.romanNumeral}. {domain.name}
                          </h3>
                        </div>
                        <span className="text-xs tabular-nums text-[#546070] dark:text-[#9BA7B6] whitespace-nowrap shrink-0">
                          {enabledCount}/{domainMods.length} modül
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6] mt-1">
                        {domain.subtitle}
                      </p>
                      <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-2.5 leading-relaxed">
                        {domain.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                      <span className="truncate">
                        {domainCenters.map((c) => c.name).join(' · ')}
                      </span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 group-hover:text-[#141923] dark:group-hover:text-[#F1F3F5]">
                        Alanı Aç <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );

      case 'quick_capture':
        return (
          <section
            key="quick_capture"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                Hızlı Kayıt
              </h2>
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#10151E]">
                <button
                  type="button"
                  onClick={() => setQuickTab('not')}
                  className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    quickTab === 'not'
                      ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                      : 'text-[#546070] dark:text-[#9BA7B6]'
                  }`}
                >
                  <StickyNote className="w-3.5 h-3.5 shrink-0" />
                  <span>Hızlı Not</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTab('alinti')}
                  className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    quickTab === 'alinti'
                      ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                      : 'text-[#546070] dark:text-[#9BA7B6]'
                  }`}
                >
                  <QuoteIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Hızlı Alıntı</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTab('kitap')}
                  className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    quickTab === 'kitap'
                      ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                      : 'text-[#546070] dark:text-[#9BA7B6]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Hızlı Kitap</span>
                </button>
              </div>
            </div>

            {captureMessage && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-[#93BF90]/15 text-[#141923] dark:text-[#F1F3F5] border border-[#93BF90]/30">
                <Check className="w-3.5 h-3.5 text-[#93BF90]" />
                <span>{captureMessage}</span>
              </div>
            )}

            {quickTab === 'not' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <form onSubmit={handleQuickNoteSubmit} className="lg:col-span-3 space-y-3">
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Not başlığı"
                    className="w-full h-9 px-3.5 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 focus:outline-none focus:border-[#8C6B32] dark:focus:border-[#D6B782]"
                  />
                  <textarea
                    required
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Düşünce, gözlem veya çalışma notunuz..."
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 focus:outline-none focus:border-[#8C6B32] dark:focus:border-[#D6B782]"
                  />
                  <button
                    type="submit"
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Notu Kaydet</span>
                  </button>
                </form>

                <div className="lg:col-span-2 space-y-2 border-t lg:border-t-0 lg:border-l border-black/10 dark:border-white/10 pt-4 lg:pt-0 lg:pl-5">
                  <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">
                    Son Hızlı Notlar ({quickNotes.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {quickNotes.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">
                            {n.title}
                            {n.isDemo ? ' · Demo' : ''}
                          </div>
                          <div className="text-[11px] text-[#546070] dark:text-[#9BA7B6] line-clamp-2 mt-0.5">
                            {n.content}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteQuickNote(n.id)}
                          className="text-[11px] text-[#546070] hover:text-red-500 shrink-0"
                        >
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {quickTab === 'alinti' && (
              <form onSubmit={handleQuickQuoteSubmit} className="space-y-3">
                <textarea
                  required
                  rows={2}
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Alıntı metni..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 focus:outline-none focus:border-[#8C6B32] dark:focus:border-[#D6B782]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={quoteBookId}
                    onChange={(e) => setQuoteBookId(e.target.value)}
                    className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 focus:outline-none"
                  >
                    <option value="">Kütüphaneden kitap seç (opsiyonel)</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} — {b.author}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={quoteAuthor}
                    onChange={(e) => setQuoteAuthor(e.target.value)}
                    disabled={Boolean(quoteBookId)}
                    placeholder={quoteBookId ? 'Kitap yazarından alınır' : 'Yazar / Konuşmacı'}
                    className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={quotePage}
                    onChange={(e) => setQuotePage(e.target.value)}
                    placeholder="Sayfa no (ör. 33)"
                    className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Alıntıyı Kaydet</span>
                </button>
              </form>
            )}

            {quickTab === 'kitap' && (
              <form onSubmit={handleQuickBookSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    required
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="Kitap adı"
                    className="lg:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <input
                    type="text"
                    required
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="Yazar"
                    className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <input
                    type="text"
                    value={bookCategory}
                    onChange={(e) => setBookCategory(e.target.value)}
                    placeholder="Kategori"
                    className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={bookPages}
                      onChange={(e) => setBookPages(e.target.value)}
                      placeholder="Sayfa"
                      className="w-24 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
                    />
                    <select
                      value={bookStatus}
                      onChange={(e) => setBookStatus(e.target.value as BookStatus)}
                      className="flex-1 h-9 px-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    >
                      <option value="okunuyor">Okunuyor</option>
                      <option value="okunacak">Okunacak</option>
                      <option value="okundu">Okundu</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Kitabı Kütüphaneye Ekle</span>
                </button>
              </form>
            )}
          </section>
        );

      case 'favorite_and_recent':
        return (
          <section
            key="favorite_and_recent"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  Favori Modüller
                </h2>
                <Link
                  to="/moduller"
                  className="text-xs text-[#546070] dark:text-[#9BA7B6] hover:underline"
                >
                  Yönet
                </Link>
              </div>
              {favoriteModules.length === 0 ? (
                <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Henüz favori modül seçilmedi. Modül Dizininden yıldız simgesiyle ekleyebilirsiniz.
                </p>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {favoriteModules.map((mod) => (
                    <Link
                      key={mod.id}
                      to={mod.route}
                      className="py-2.5 flex items-center justify-between gap-3 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-[#D5B477] fill-[#D5B477] shrink-0" />
                          <span className="text-sm font-medium truncate">{mod.name}</span>
                        </div>
                        <p className="text-xs text-[#546070] dark:text-[#9BA7B6] truncate mt-0.5">
                          {mod.shortDescription}
                        </p>
                      </div>
                      <span className="text-xs text-[#546070] dark:text-[#9BA7B6] whitespace-nowrap shrink-0">
                        {mod.status === 'active' ? 'Aktif' : `Aşama ${mod.stage}`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
              <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                Son Kullanılan Modüller
              </h2>
              {recentModules.length === 0 ? (
                <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Modül kullandıkça son erişim geçmişiniz burada sıralanır.
                </p>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {recentModules.map((mod) => {
                    const setting = moduleSettings.find((s) => s.moduleId === mod.id);
                    return (
                      <Link
                        key={mod.id}
                        to={mod.route}
                        className="py-2.5 flex items-center justify-between gap-3 hover:opacity-80"
                      >
                        <span className="text-sm font-medium truncate">{mod.name}</span>
                        <span className="text-xs tabular-nums text-[#546070] dark:text-[#9BA7B6] whitespace-nowrap">
                          {setting?.lastOpenedAt
                            ? new Date(setting.lastOpenedAt).toLocaleDateString('tr-TR')
                            : ''}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'recent_connections':
        return (
          <section
            key="recent_connections"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                Son Oluşturulan Bilgi Bağlantıları
              </h2>
              <Link
                to="/modul/zihin-atlasi"
                className="text-xs font-medium text-[#71C6BD] hover:underline"
              >
                Zihin Atlasında Aç
              </Link>
            </div>
            {entityRelations.length === 0 ? (
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Henüz modüller arası bağlantı kurulmadı. Bir kitaptan alıntı oluşturduğunuzda veya
                Zihin Atlasında kavram bağladığınızda burada görünür.
              </p>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {entityRelations.slice(0, 5).map((rel) => (
                  <div
                    key={rel.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-medium text-[#141923] dark:text-[#F1F3F5] truncate max-w-[240px]">
                        {rel.fromLabel}
                      </span>
                      <span className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                        → {rel.relationType} →
                      </span>
                      <span className="font-medium text-[#71C6BD] truncate max-w-[240px]">
                        {rel.toLabel}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-[#546070] dark:text-[#9BA7B6]">
                      {new Date(rel.createdAt).toLocaleDateString('tr-TR')}
                      {rel.isDemo ? ' · Demo' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case 'activity_summary': {
        const maxBar = Math.max(1, ...activityStats.dailyBars.map((b) => b.count));
        return (
          <section
            key="activity_summary"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  Günlük ve Haftalık Etkinlik Özeti
                </h2>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Gerçek modül işlemlerinden hesaplanan yerel etkinlik kayıtları
                </p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-xl font-serif font-semibold tabular-nums">
                    {activityStats.todayCount}
                  </div>
                  <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Bugün</div>
                </div>
                <div>
                  <div className="text-xl font-serif font-semibold tabular-nums">
                    {activityStats.weekCount}
                  </div>
                  <div className="text-xs text-[#546070] dark:text-[#9BA7B6]">Son 7 Gün</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-24 pt-2">
              {activityStats.dailyBars.map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className="w-full max-w-[32px] rounded-t-md bg-[#8C6B32]/75 dark:bg-[#D6B782]/75 transition-all"
                      style={{
                        height: `${bar.count === 0 ? 6 : Math.max(14, (bar.count / maxBar) * 100)}%`,
                        opacity: bar.count === 0 ? 0.25 : 1,
                      }}
                      title={`${bar.label}: ${bar.count} işlem`}
                    />
                  </div>
                  <span className="text-[11px] text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            {activityLogs.length > 0 && (
              <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-1.5">
                {activityLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 text-xs text-[#546070] dark:text-[#9BA7B6]"
                  >
                    <span className="truncate">{log.summary}</span>
                    <span className="tabular-nums shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      }
      case 'upcoming_calendar':
        return (
          <section
            key="upcoming_calendar"
            className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D6B782]" />
                <h2 className="text-lg font-semibold text-[#141923] dark:text-[#F1F3F5]">
                  Ortak Takvim ve Planlı Kayıtlar
                </h2>
              </div>
              <Link
                to="/takvim"
                className="text-xs font-medium text-[#8C6B32] dark:text-[#D6B782] hover:underline"
              >
                Takvimi Aç →
              </Link>
            </div>
            {calendarEvents.length === 0 ? (
              <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                Henüz tarih atanmış kitap hedefi, tekrar kartı, ders planı veya sürüş bulunmuyor.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {calendarEvents.slice(0, 6).map((ev) => (
                  <Link
                    key={ev.id}
                    to={ev.route}
                    className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] hover:opacity-85 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono tabular-nums text-[#8C6B32] dark:text-[#D6B782]">
                        {ev.date}
                      </span>
                      <span className="text-[#546070] dark:text-[#9BA7B6] truncate">
                        {ev.moduleName}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#141923] dark:text-[#F1F3F5] truncate">
                      {ev.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
    }
  };

  return (
    <div className="space-y-8">
      {quickNotes.filter((note) => note.id === searchParams.get('noteId')).map((note) => (
        <article key={note.id} className="rounded-2xl border border-current/15 p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="break-words text-xl font-semibold">{note.title}</h2>
            <Link to="/" className="text-sm underline">Kapat</Link>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words">{note.content}</p>
        </article>
      ))}
      {/* Hero Greeting & Date/Time Header */}
      <section className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#10151E]">
        <img
          src="/src/assets/images/atelier_observatory_banner_1795723901308.jpg"
          alt="Dijital Evrenim çalışma odası"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="relative z-10 p-6 md:p-8 bg-gradient-to-r from-[#10151E]/95 via-[#10151E]/85 to-[#10151E]/60 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs text-[#D6B782] tabular-nums">
              {formattedDate} · {formattedTime}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-[#F1F3F5]">
              {greetingText}, {profile.fullName}
            </h1>
            <p className="text-sm text-[#C7D0DC] leading-relaxed">
              Bilgiden düşünceye, düşünceden hayata. {profile.title} çalışma alanınızda aktif bilgi
              akışını sürdürün.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-9 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#D6B782] text-[#10151E] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              Evrensel Arama
            </button>
            <button
              type="button"
              onClick={() => setEditingWidgets((v) => !v)}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg border border-white/20 text-[#F1F3F5] hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>{editingWidgets ? 'Düzenlemeyi Bitir' : 'Widget Düzeni'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Widget Customizer Panel */}
      {editingWidgets && (
        <section className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-[#8C6B32]/40 dark:border-[#D6B782]/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#141923] dark:text-[#F1F3F5]">
              Ana Sayfa Widget Alanlarını Düzenle
            </h2>
            <span className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Görünürlüğü ve sırayı değiştirebilirsiniz
            </span>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {sortedWidgets.map((w, idx) => (
              <div key={w.id} className="py-2 flex items-center justify-between gap-4">
                <span className="text-sm text-[#141923] dark:text-[#F1F3F5]">{w.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveWidget(w.id, -1)}
                    aria-label="Yukarı taşı"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/10 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sortedWidgets.length - 1}
                    onClick={() => handleMoveWidget(w.id, 1)}
                    aria-label="Aşağı taşı"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/10 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleWidget(w.id)}
                    className="h-8 min-w-[88px] inline-flex items-center justify-center gap-1.5 px-2.5 text-xs rounded-md border border-black/10 dark:border-white/10 whitespace-nowrap"
                  >
                    {w.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#93BF90] shrink-0" />
                        <span>Görünür</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#546070] shrink-0" />
                        <span>Gizli</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User-ordered visible widgets */}
      <div className="space-y-8">
        {sortedWidgets.filter((w) => w.visible).map((w) => renderWidget(w.id))}
      </div>
    </div>
  );
}
