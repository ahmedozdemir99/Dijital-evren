import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  FileText,
  Filter,
  Network,
  Quote as QuoteIcon,
  Search,
  StickyNote,
  X,
} from 'lucide-react';
import { MODULES } from '../../core/registry/modules';
import { searchEcosystem, type SearchResultItem } from '../../core/services/integrationService';
import { useAppStore } from '../../store/useAppStore';

export function UniversalSearchModal() {
  const navigate = useNavigate();
  const {
    searchOpen,
    setSearchOpen,
    books,
    quotes,
    knowledgeNodes,
    quickNotes,
    moduleRecords,
    moduleSettings,
    preferences,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setModuleFilter('all');
      setKindFilter('all');
      setTagFilter('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    return searchEcosystem(
      query,
      {
        books,
        quotes,
        knowledgeNodes,
        quickNotes,
        moduleRecords,
        moduleSettings,
        preferences,
      },
      {
        moduleId: moduleFilter,
        kind: kindFilter,
        tag: tagFilter.trim() || undefined,
      }
    );
  }, [
    query,
    books,
    quotes,
    knowledgeNodes,
    quickNotes,
    moduleRecords,
    moduleSettings,
    preferences,
    moduleFilter,
    kindFilter,
    tagFilter,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, moduleFilter, kindFilter, tagFilter]);

  if (!searchOpen) return null;

  const handleSelect = (item: SearchResultItem) => {
    setSearchOpen(false);
    navigate(item.route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length === 0 ? 0 : (prev - 1 + results.length) % results.length
      );
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const kindLabel: Record<SearchResultItem['kind'], string> = {
    module: 'Modül',
    book: 'Kitap',
    quote: 'Alıntı',
    knowledge_node: 'Zihin Atlası',
    quick_note: 'Not',
    record: 'Kayıt',
  };

  const renderIcon = (kind: SearchResultItem['kind']) => {
    switch (kind) {
      case 'book':
        return <BookOpen className="w-4 h-4 text-[#71C6BD] shrink-0" />;
      case 'quote':
        return <QuoteIcon className="w-4 h-4 text-[#D5B477] shrink-0" />;
      case 'knowledge_node':
        return <Network className="w-4 h-4 text-[#88B4FF] shrink-0" />;
      case 'quick_note':
        return <StickyNote className="w-4 h-4 text-[#93BF90] shrink-0" />;
      case 'record':
        return <FileText className="w-4 h-4 text-[#DFA183] shrink-0" />;
      default:
        return <Compass className="w-4 h-4 text-[#B5A2EC] shrink-0" />;
    }
  };

  const hasActiveFilter =
    moduleFilter !== 'all' || kindFilter !== 'all' || tagFilter.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Evrensel Arama"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/10 dark:border-white/10">
          <Search className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Modül, kitap, şiir, kavram, tarif, deney veya kayıt ara..."
            className="w-full bg-transparent text-sm text-[#141923] dark:text-[#F1F3F5] placeholder:text-[#546070]/70 dark:placeholder:text-[#9BA7B6]/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
              showFilters || hasActiveFilter
                ? 'border-[#8C6B32] dark:border-[#D6B782] text-[#8C6B32] dark:text-[#D6B782]'
                : 'border-black/10 dark:border-white/10 text-[#546070] dark:text-[#9BA7B6]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrele</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Aramayı kapat"
            className="p-1.5 rounded-lg text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(showFilters || hasActiveFilter) && (
          <div className="px-4 py-2.5 bg-[#F7F5F0] dark:bg-[#10151E]/80 border-b border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              aria-label="Modül filtresi"
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="all">Tüm Modüller</option>
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              aria-label="Tür filtresi"
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="all">Tüm Türler</option>
              <option value="module">Modüller</option>
              <option value="book">Kitaplar</option>
              <option value="quote">Alıntılar</option>
              <option value="knowledge_node">Zihin Atlası</option>
              <option value="record">Modül Kayıtları</option>
              <option value="quick_note">Hızlı Notlar</option>
            </select>

            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Etiket ile süz (ör. şiir)..."
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            />
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
          {query.trim() === '' && !hasActiveFilter ? (
            <div className="p-6 text-center space-y-1.5">
              <p className="text-sm text-[#141923] dark:text-[#F1F3F5]">
                {MODULES.length} modüllü kişisel bilgi evreninizde arama yapın
              </p>
              <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                Yalnızca etkinleştirilmiş ve erişim izni verilen modül kayıtları taranır; gizli kayıtlar dışarıda tutulur.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#546070] dark:text-[#9BA7B6]">
              Seçili kriterler için eşleşen kayıt bulunamadı.
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  idx === selectedIndex
                    ? 'bg-[#8C6B32]/10 dark:bg-[#D6B782]/10'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="mt-0.5">{renderIcon(item.kind)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#141923] dark:text-[#F1F3F5] truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-[#546070] dark:text-[#9BA7B6] whitespace-nowrap shrink-0">
                      {kindLabel[item.kind]}
                      {item.isDemo ? ' · Demo' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#EFECE5]/60 dark:bg-[#10151E]/60 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-[#546070] dark:text-[#9BA7B6]">
          <span>Yukarı/Aşağı: Seç · Enter: Git · Esc: Kapat</span>
          <span className="tabular-nums">{results.length} sonuç</span>
        </div>
      </div>
    </div>
  );
}
