import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { CENTERS } from '../core/registry/modules';
import { buildCalendarEvents, localDateIso } from '../core/services/integrationService';
import { useAppStore } from '../store/useAppStore';

export function CalendarPage() {
  const { books, moduleRecords, moduleSettings, preferences } = useAppStore();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [moduleFilter, setModuleFilter] = useState('all');

  const centerColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of CENTERS) map[c.id] = c.color;
    return map;
  }, []);

  const allEvents = useMemo(
    () =>
      buildCalendarEvents({
        books,
        moduleRecords,
        moduleSettings,
        preferences,
        centerColors,
      }),
    [books, moduleRecords, moduleSettings, preferences, centerColors]
  );

  const events = useMemo(
    () =>
      moduleFilter === 'all'
        ? allEvents
        : allEvents.filter((e) => e.moduleId === moduleFilter),
    [allEvents, moduleFilter]
  );

  const uniqueModules = useMemo(
    () => Array.from(new Set(allEvents.map((e) => `${e.moduleId}|${e.moduleName}`))),
    [allEvents]
  );

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstDayPref = preferences.calendarFirstDay ?? 'monday';

  const monthCells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rawDay = firstOfMonth.getDay(); // 0 Sun..6 Sat
    const offset = firstDayPref === 'monday' ? (rawDay + 6) % 7 : rawDay;
    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ dateStr: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ dateStr: `${year}-${mm}-${dd}`, dayNum: d });
    }
    return cells;
  }, [year, month, firstDayPref]);

  const weekDaysHeader =
    firstDayPref === 'monday'
      ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
      : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  const cursorIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(cursorDate.getDate()).padStart(2, '0')}`;

  const weekDates = useMemo(() => {
    const start = new Date(cursorDate);
    const raw = start.getDay();
    const diff = firstDayPref === 'monday' ? (raw + 6) % 7 : raw;
    start.setDate(start.getDate() - diff);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return localDateIso(d);
    });
  }, [cursorDate, firstDayPref]);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursorDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + delta);
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCursorDate(d);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Ortak Ekosistem Takvimi
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
            Modüllerdeki okuma hedefleri, tekrar kartları, ders planları, sürüşler, anılar ve ibadet günleri kopyalanmadan dinamik olarak burada toplanır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
          >
            <option value="all">Tüm Modüller ({allEvents.length})</option>
            {uniqueModules.map((entry) => {
              const [id, name] = entry.split('|');
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>

          <div className="h-10 flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#1C2633] border border-black/10 dark:border-white/10">
            {[
              { id: 'month', label: 'Aylık' },
              { id: 'week', label: 'Haftalık' },
              { id: 'day', label: 'Günlük' },
              { id: 'list', label: 'Liste' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id as typeof viewMode)}
                className={`h-8 inline-flex items-center justify-center px-3 rounded-md whitespace-nowrap ${
                  viewMode === v.id
                    ? 'bg-white dark:bg-[#10151E] font-medium shadow-xs'
                    : 'text-[#546070] dark:text-[#9BA7B6]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center justify-between gap-2 p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Önceki dönem"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-3 font-semibold text-base">
          <span className="inline-flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#D6B782] shrink-0" />
            <span>
              {cursorDate.toLocaleDateString('tr-TR', {
                month: 'long',
                year: 'numeric',
                ...(viewMode === 'day' ? { day: 'numeric' } : {}),
              })}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setCursorDate(new Date())}
            className="h-7 inline-flex items-center justify-center px-2.5 text-xs font-medium rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
          >
            Bugün
          </button>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Sonraki dönem"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {viewMode === 'month' && (
        <div className="rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-black/10 dark:border-white/10 bg-[#F7F5F0] dark:bg-[#10151E] text-xs font-medium text-center py-2">
            {weekDaysHeader.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(96px,auto)]">
            {monthCells.map((cell, idx) => {
              const dayEvents = cell.dateStr
                ? events.filter((e) => e.date === cell.dateStr)
                : [];
              return (
                <div
                  key={idx}
                  className="p-2 border-r border-b border-black/5 dark:border-white/5 space-y-1"
                >
                  {cell.dayNum !== null && (
                    <span className="text-xs font-mono tabular-nums text-[#546070] dark:text-[#9BA7B6]">
                      {cell.dayNum}
                    </span>
                  )}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <Link
                        key={ev.id}
                        to={ev.route}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] bg-[#F7F5F0] dark:bg-[#10151E] hover:opacity-80"
                        title={`${ev.moduleName}: ${ev.title}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                          style={{ backgroundColor: ev.centerColor }}
                        />
                        <span className="truncate">{ev.title}</span>
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-[#546070] dark:text-[#9BA7B6]">
                        +{dayEvents.length - 3} daha
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDates.map((dStr) => {
            const dayEvents = events.filter((e) => e.date === dStr);
            return (
              <div
                key={dStr}
                className="p-3 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2"
              >
                <p className="text-xs font-mono tabular-nums font-semibold">{dStr}</p>
                {dayEvents.length === 0 ? (
                  <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">Kayıt yok</p>
                ) : (
                  dayEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      to={ev.route}
                      className="block p-2 rounded bg-[#F7F5F0] dark:bg-[#10151E] text-xs"
                    >
                      <p className="font-medium truncate">{ev.title}</p>
                      <p className="text-[10px] text-[#546070] dark:text-[#9BA7B6]">{ev.moduleName}</p>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'day' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <h2 className="text-base font-semibold tabular-nums">{cursorIso} Kayıtları</h2>
          {events.filter((e) => e.date === cursorIso).length === 0 ? (
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Bu tarihte kayıt bulunmuyor.</p>
          ) : (
            events
              .filter((e) => e.date === cursorIso)
              .map((ev) => (
                <Link
                  key={ev.id}
                  to={ev.route}
                  className="block p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] hover:opacity-85"
                >
                  <p className="text-xs" style={{ color: ev.centerColor }}>
                    {ev.moduleName}
                  </p>
                  <p className="font-semibold text-sm">{ev.title}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{ev.subtitle}</p>
                </Link>
              ))
          )}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <List className="w-4 h-4 text-[#D6B782]" />
            <span>Kronolojik Liste ({events.length})</span>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Takvim olayı bulunamadı.</p>
          ) : (
            events.map((ev) => (
              <Link
                key={ev.id}
                to={ev.route}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] hover:opacity-85 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono tabular-nums text-[#D6B782] shrink-0">{ev.date}</span>
                  <span className="font-semibold truncate">{ev.title}</span>
                </div>
                <span className="text-[#546070] dark:text-[#9BA7B6]">{ev.moduleName}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
