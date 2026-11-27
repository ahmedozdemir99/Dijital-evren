import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderHeart,
  Grid2X2,
  Home,
  Link2,
  Monitor,
  Moon,
  Network,
  Paperclip,
  Quote,
  Search,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { CENTERS, DOMAINS, MODULES, getCentersByDomain } from '../../core/registry/modules';
import { useAppStore } from '../../store/useAppStore';
import { OfflineIndicator, PWAInstallButton } from '../pwa/PWAInstallButton';

interface AppShellProps {
  children: React.ReactNode;
}

const CORE_FLOW_IDS = new Set([
  'dijital-kutuphanem',
  'alinti-defterim',
  'zihin-atlasi',
  'kendi-ansiklopedim',
]);

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const {
    preferences,
    moduleSettings,
    notifications,
    toggleSidebarCollapsed,
    setTheme,
    setSearchOpen,
    setAiDrawerOpen,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppStore();

  const [notifOpen, setNotifOpen] = useState(false);

  const collapsed = preferences.sidebarCollapsed;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const enabledMap = new Map(moduleSettings.map((s) => [s.moduleId, s.enabled]));
  const favoriteSet = new Set(
    moduleSettings.filter((s) => s.isFavorite && s.enabled).map((s) => s.moduleId)
  );

  const quickModules = MODULES.filter(
    (m) =>
      enabledMap.get(m.id) !== false &&
      (CORE_FLOW_IDS.has(m.id) || favoriteSet.has(m.id))
  ).slice(0, 7);

  const cycleTheme = () => {
    const next =
      preferences.theme === 'dark'
        ? 'light'
        : preferences.theme === 'light'
          ? 'system'
          : 'dark';
    setTheme(next);
  };

  const currentBreadcrumb = (() => {
    if (location.pathname === '/') return 'Ana Kontrol Paneli';
    if (location.pathname === '/moduller') return `Modül Dizini (${MODULES.length} Modül)`;
    if (location.pathname === '/takvim') return 'Ortak Ekosistem Takvimi';
    if (location.pathname === '/koleksiyonlar') return 'Koleksiyonlar ve Favoriler';
    if (location.pathname === '/medya') return 'Dosya ve Medya Merkezi';
    if (location.pathname === '/entegrasyonlar') return 'Bağımsız uygulamalar';
    if (location.pathname.startsWith('/entegrasyonlar/')) {
      const app = MODULES.find((module) => module.id === location.pathname.split('/')[2]);
      return app ? `Bağımsız uygulamalar / ${app.name}` : 'Bağımsız uygulamalar';
    }
    if (location.pathname === '/ayarlar') return 'Ayarlar ve Veri Güvenliği';
    if (location.pathname.startsWith('/alan/')) {
      const id = location.pathname.replace('/alan/', '');
      const domain = DOMAINS.find((d) => d.id === id);
      return domain ? `${domain.romanNumeral}. ${domain.name} · ${domain.subtitle}` : 'Ana Alan';
    }
    if (location.pathname.startsWith('/merkez/')) {
      const id = location.pathname.replace('/merkez/', '');
      const center = CENTERS.find((c) => c.id === id);
      const domain = center ? DOMAINS.find((d) => d.id === center.domainId) : undefined;
      return center
        ? `${domain ? `${domain.romanNumeral}. ${domain.name} / ` : ''}${center.name} · ${center.subtitle}`
        : 'Merkez';
    }
    if (location.pathname.startsWith('/modul/')) {
      const [id] = location.pathname.slice('/modul/'.length).split('/');
      const mod = MODULES.find((m) => m.id === id);
      return mod ? mod.name : 'Modül';
    }
    return 'Dijital Evrenim';
  })();

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-[#8C6B32]/12 dark:bg-[#D6B782]/14 text-[#8C6B32] dark:text-[#D6B782] font-medium'
        : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#141923] dark:hover:text-[#F1F3F5]'
    }`;

  return (
    <div className="min-h-screen flex bg-[#F7F5F0] dark:bg-[#10151E] text-[#141923] dark:text-[#F1F3F5]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-black/10 dark:border-white/10 bg-[#EFECE5]/65 dark:bg-[#141B26] transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-black/10 dark:border-white/10">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/src/assets/images/scholar_emblem_avatar_1795723901578.jpg"
              alt="Dijital Evrenim"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover border border-[#D6B782]/40 shrink-0"
            />
            {!collapsed && (
              <span className="font-serif text-xl font-semibold tracking-tight text-[#141923] dark:text-[#F1F3F5] whitespace-nowrap truncate">
                Dijital Evrenim
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5" aria-label="Ana menü">
          <div className="space-y-1">
            <NavLink to="/" end className={navLinkCls}>
              <Home className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap truncate">Ana Kontrol Paneli</span>}
            </NavLink>

            <NavLink to="/moduller" className={navLinkCls}>
              <Grid2X2 className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap truncate">Modül Dizini</span>}
            </NavLink>

            <NavLink to="/takvim" className={navLinkCls}>
              <Calendar className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap truncate">Ortak Takvim</span>}
            </NavLink>

            <NavLink to="/koleksiyonlar" className={navLinkCls}>
              <FolderHeart className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap truncate">Koleksiyonlar</span>}
            </NavLink>

            <NavLink to="/medya" className={navLinkCls}>
              <Paperclip className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap truncate">Medya Merkezi</span>}
            </NavLink>
          </div>

          {/* 3 Ana Alan ve 6 Tematik Merkez */}
          <div className="space-y-3">
            {DOMAINS.map((domain) => {
              const domainCenters = getCentersByDomain(domain.id);
              return (
                <div key={domain.id} className="space-y-1">
                  {!collapsed && (
                    <NavLink
                      to={`/alan/${domain.id}`}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 pb-0.5 pt-1 text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                          isActive
                            ? 'text-[#8C6B32] dark:text-[#D6B782]'
                            : 'text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5]'
                        }`
                      }
                    >
                      <span>
                        {domain.romanNumeral}. {domain.name}
                      </span>
                    </NavLink>
                  )}
                  {domainCenters.map((center) => {
                    const centerMods = MODULES.filter(
                      (m) => m.centerId === center.id && enabledMap.get(m.id) !== false
                    );
                    return (
                      <NavLink
                        key={center.id}
                        to={`/merkez/${center.id}`}
                        title={`${domain.romanNumeral}. ${domain.name} / ${center.name} — ${center.subtitle}`}
                        className={({ isActive }) =>
                          `flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] font-medium border border-black/10 dark:border-white/10'
                              : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#141923] dark:hover:text-[#F1F3F5]'
                          }`
                        }
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                            style={{ backgroundColor: center.color }}
                            aria-hidden="true"
                          />
                          {!collapsed && <span className="truncate">{center.name}</span>}
                        </span>
                        {!collapsed && (
                          <span className="text-xs tabular-nums opacity-70 shrink-0">
                            {centerMods.length}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Favori & Çekirdek Bilgi Akışı Kısayolları */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-xs font-medium text-[#546070] dark:text-[#9BA7B6]">
                Hızlı Erişim
              </p>
            )}
            {quickModules.map((mod) => (
              <NavLink
                key={mod.id}
                to={mod.route}
                title={mod.name}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#71C6BD]/15 text-[#141923] dark:text-[#71C6BD] font-medium'
                      : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#141923] dark:hover:text-[#F1F3F5]'
                  }`
                }
              >
                {mod.id === 'dijital-kutuphanem' ? (
                  <BookOpen className="w-4 h-4 shrink-0" />
                ) : mod.id === 'alinti-defterim' ? (
                  <Quote className="w-4 h-4 shrink-0" />
                ) : (
                  <Network className="w-4 h-4 shrink-0" />
                )}
                {!collapsed && <span className="truncate">{mod.name}</span>}
              </NavLink>
            ))}
          </div>

          <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
            <NavLink to="/entegrasyonlar" className={navLinkCls}>
              <Link2 className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Entegrasyonlar</span>}
            </NavLink>

            <NavLink to="/ayarlar" className={navLinkCls}>
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Ayarlar</span>}
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 h-14 md:h-16 px-4 md:px-8 flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 bg-[#F7F5F0]/90 dark:bg-[#10151E]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="md:hidden font-serif text-lg font-semibold whitespace-nowrap">
              Dijital Evrenim
            </Link>
            <span className="hidden md:inline-block text-sm font-medium text-[#141923] dark:text-[#F1F3F5] truncate">
              {currentBreadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-9 inline-flex items-center justify-center gap-2 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5] transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Evrensel Ara</span>
              <span className="hidden lg:inline font-mono text-[11px] opacity-70">Ctrl+K</span>
            </button>

            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] hover:border-[#8C6B32] dark:hover:border-[#D6B782] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8C6B32] dark:text-[#D6B782] shrink-0" />
              <span className="hidden sm:inline">Evren Asistanı</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Bildirimler"
                className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5] transition-colors shrink-0"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] text-[10px] font-mono flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 shadow-xl p-3 space-y-2 z-50">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#141923] dark:text-[#F1F3F5]">
                      Bildirimler
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        className="text-[11px] text-[#8C6B32] dark:text-[#D6B782] hover:underline"
                      >
                        Tümünü okundu işaretle
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                        Bildirim bulunmuyor.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                            n.read
                              ? 'opacity-70 hover:bg-black/5 dark:hover:bg-white/5'
                              : 'bg-[#8C6B32]/8 dark:bg-[#D6B782]/8 hover:bg-[#8C6B32]/12'
                          }`}
                        >
                          <div className="text-xs font-medium text-[#141923] dark:text-[#F1F3F5]">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                            {n.message}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={cycleTheme}
              title={`Tema: ${
                preferences.theme === 'dark'
                  ? 'Koyu'
                  : preferences.theme === 'light'
                    ? 'Açık'
                    : 'Sistem'
              }`}
              aria-label="Tema değiştir"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5] transition-colors shrink-0"
            >
              {preferences.theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : preferences.theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main id="main-content" className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 md:px-8 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>

      <OfflineIndicator />

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 min-h-[calc(3.75rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#141B26]/95 backdrop-blur-md border-t border-black/10 dark:border-white/10 grid grid-cols-5"
        aria-label="Mobil navigasyon"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] whitespace-nowrap ${
              isActive
                ? 'text-[#8C6B32] dark:text-[#D6B782] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Panel</span>
        </NavLink>

        <NavLink
          to="/moduller"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] whitespace-nowrap ${
              isActive
                ? 'text-[#8C6B32] dark:text-[#D6B782] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`
          }
        >
          <Compass className="w-4 h-4" />
          <span>Modüller</span>
        </NavLink>

        <NavLink
          to="/takvim"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] whitespace-nowrap ${
              isActive
                ? 'text-[#8C6B32] dark:text-[#D6B782] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`
          }
        >
          <Calendar className="w-4 h-4" />
          <span>Takvim</span>
        </NavLink>

        <NavLink
          to="/entegrasyonlar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] whitespace-nowrap ${
              isActive
                ? 'text-[#8C6B32] dark:text-[#D6B782] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`
          }
        >
          <Link2 className="w-4 h-4" />
          <span>Uygulamalar</span>
        </NavLink>

        <NavLink
          to="/ayarlar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] whitespace-nowrap ${
              isActive
                ? 'text-[#8C6B32] dark:text-[#D6B782] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6]'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Ayarlar</span>
        </NavLink>
      </nav>
    </div>
  );
}
