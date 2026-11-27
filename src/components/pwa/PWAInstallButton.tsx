import { useEffect, useState } from 'react';
import { Download, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Uygulamayı Kur</span>
      </button>
    );
  }

  {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Ana Ekrana Ekle</span>
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 p-6 space-y-3">
              <h3 className="text-lg font-semibold">Uygulama Kurulum Rehberi</h3>
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                {isIOS ? 'Safari araç çubuğundaki Paylaş simgesine dokunun.' : 'Tarayıcınızın menüsünü açın.'}
                <br />
                {isIOS ? 'Ana Ekrana Ekle seçeneğini seçin.' : 'Uygulamayı yükle veya Ana ekrana ekle seçeneğini seçin. Desteklenmiyorsa Chrome veya Edge kullanın.'}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-9 inline-flex items-center justify-center text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E]"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#1C2633] border border-[#D5B477]/40 px-3 py-1.5 text-xs font-medium text-[#F1F3F5] shadow-lg">
      <WifiOff className="w-3.5 h-3.5 text-[#D5B477]" />
      <span>Çevrimdışı Mod — Yerel IndexedDB verileri kullanılıyor</span>
    </div>
  );
}
