import { Cloud, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OfflineIndicator } from '../pwa/PWAInstallButton';

const utilityLink = 'inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 sm:px-3 sm:text-sm';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#141923] dark:bg-[#10151E] dark:text-[#F1F3F5]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#F7F5F0]/95 backdrop-blur-md dark:border-white/10 dark:bg-[#10151E]/95">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-1 px-3 sm:gap-4 sm:px-6">
          <Link to="/" className="min-w-0 truncate font-serif text-xl font-semibold sm:text-2xl">Dijital Evrenim</Link>
          <div className="flex shrink-0 items-center gap-0.5" aria-label="Hesap ve yedekleme">
            <Link to="/ayarlar#profil" className={utilityLink}><UserRound aria-hidden="true" className="size-4 shrink-0" /> Profil</Link>
            <Link to="/ayarlar#yedekleme" className={utilityLink}><Cloud aria-hidden="true" className="size-4 shrink-0" /> Yedekleme</Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-9">
        {children}
      </main>
      <OfflineIndicator />
    </div>
  );
}
