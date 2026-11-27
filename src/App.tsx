import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EvrenAssistantDrawer } from './components/common/EvrenAssistantDrawer';
import { ModuleErrorBoundary } from './components/common/ModuleErrorBoundary';
import { UniversalSearchModal } from './components/common/UniversalSearchModal';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { useAppStore } from './store/useAppStore';

// Core Ecosystem Pages
const DomainDetailPage = lazy(() =>
  import('./pages/DomainDetailPage').then((m) => ({ default: m.DomainDetailPage }))
);
const CenterDetailPage = lazy(() =>
  import('./pages/CenterDetailPage').then((m) => ({ default: m.CenterDetailPage }))
);
const ModulesDirectoryPage = lazy(() =>
  import('./pages/ModulesDirectoryPage').then((m) => ({ default: m.ModulesDirectoryPage }))
);
const PlannedModulePage = lazy(() =>
  import('./pages/PlannedModulePage').then((m) => ({ default: m.PlannedModulePage }))
);
const IndependentWorkspacePage = lazy(() =>
  import('./integrations/shared/IndependentWorkspacePage').then((m) => ({ default: m.IndependentWorkspacePage }))
);
const IntegratedApplicationPage = lazy(() =>
  import('./integrations/shared/IntegratedApplicationPage').then((m) => ({ default: m.IntegratedApplicationPage }))
);
const IntegrationsPage = lazy(() =>
  import('./pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const CollectionsPage = lazy(() =>
  import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage }))
);
const MediaCenterPage = lazy(() =>
  import('./pages/MediaCenterPage').then((m) => ({ default: m.MediaCenterPage }))
);

const ModuleWorkspacePage = lazy(() =>
  import('./pages/ModuleWorkspacePage').then((m) => ({ default: m.ModuleWorkspacePage }))
);

// I. ZİHİN -> İrfan (6 Modül)
const PoetrySeaModule = lazy(() =>
  import('./modules/irfan/PoetrySeaModule').then((m) => ({ default: m.PoetrySeaModule }))
);
const WordMuseumModule = lazy(() =>
  import('./modules/irfan/WordMuseumModule').then((m) => ({ default: m.WordMuseumModule }))
);
const LiteratureWorkshopModule = lazy(() =>
  import('./modules/irfan/LiteratureWorkshopModule').then((m) => ({
    default: m.LiteratureWorkshopModule,
  }))
);
const PhilosophyCouncilModule = lazy(() =>
  import('./modules/irfan/PhilosophyCouncilModule').then((m) => ({
    default: m.PhilosophyCouncilModule,
  }))
);
const LogicAcademyModule = lazy(() =>
  import('./modules/irfan/LogicAcademyModule').then((m) => ({ default: m.LogicAcademyModule }))
);
const HistoryAtlasModule = lazy(() =>
  import('./modules/irfan/HistoryAtlasModule').then((m) => ({ default: m.HistoryAtlasModule }))
);

// I. ZİHİN -> İdrak (6 Modül)
const DigitalLibraryModule = lazy(() =>
  import('./modules/idrak/DigitalLibraryModule').then((m) => ({ default: m.DigitalLibraryModule }))
);
const QuoteNotebookModule = lazy(() =>
  import('./modules/idrak/QuoteNotebookModule').then((m) => ({ default: m.QuoteNotebookModule }))
);
const ChatArchiveModule = lazy(() =>
  import('./modules/idrak/ChatArchiveModule').then((m) => ({ default: m.ChatArchiveModule }))
);
const MindAtlasModule = lazy(() =>
  import('./modules/idrak/MindAtlasModule').then((m) => ({ default: m.MindAtlasModule }))
);
const MemoryPalaceModule = lazy(() =>
  import('./modules/idrak/MemoryPalaceModule').then((m) => ({ default: m.MemoryPalaceModule }))
);
const EncyclopediaModule = lazy(() =>
  import('./modules/idrak/EncyclopediaModule').then((m) => ({ default: m.EncyclopediaModule }))
);

// II. KEŞİF -> Kozmos (3 Modül)
const MathLabModule = lazy(() =>
  import('./modules/kozmos/MathLabModule').then((m) => ({ default: m.MathLabModule }))
);
const SkyAtlasModule = lazy(() =>
  import('./modules/kozmos/SkyAtlasModule').then((m) => ({ default: m.SkyAtlasModule }))
);
const ScienceMuseumModule = lazy(() =>
  import('./modules/kozmos/ScienceMuseumModule').then((m) => ({ default: m.ScienceMuseumModule }))
);

// II. KEŞİF -> Atölye (2 Modül)
const AutoMusicProModule = lazy(() =>
  import('./modules/atolye/AutoMusicProModule').then((m) => ({ default: m.AutoMusicProModule }))
);
const WorldbuilderModule = lazy(() =>
  import('./modules/atolye/WorldbuilderModule').then((m) => ({ default: m.WorldbuilderModule }))
);

// Tekâmül (3 Modules)
const SelfGrowthModule = lazy(() =>
  import('./modules/tekamul/SelfGrowthModule').then((m) => ({ default: m.SelfGrowthModule }))
);
const MihrapAcademyPage = lazy(() =>
  import('./integrations/mihrap/MihrapAcademyPage').then((m) => ({ default: m.MihrapAcademyPage }))
);
const MihrapMinberModule = lazy(() =>
  import('./modules/tekamul/MihrapMinberModule').then((m) => ({ default: m.MihrapMinberModule }))
);
const PrayerJourneyModule = lazy(() =>
  import('./modules/tekamul/PrayerJourneyModule').then((m) => ({ default: m.PrayerJourneyModule }))
);

// Hayat (2 Modules)
const KaradenizAssistantModule = lazy(() =>
  import('./modules/hayat/KaradenizAssistantModule').then((m) => ({
    default: m.KaradenizAssistantModule,
  }))
);
const WhatToEatModule = lazy(() =>
  import('./modules/hayat/WhatToEatModule').then((m) => ({ default: m.WhatToEatModule }))
);

function RouteLoader() {
  return (
    <div className="py-12 space-y-4 animate-pulse">
      <div className="h-7 w-56 rounded-lg bg-black/10 dark:bg-white/10" />
      <div className="h-32 w-full rounded-xl bg-black/5 dark:bg-white/5" />
    </div>
  );
}

export default function App() {
  const { initialized, loading, error, preferences, init } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  // Synchronize dark/light/system theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    const apply = (isDark: boolean) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    if (preferences.theme === 'dark') {
      apply(true);
      return;
    }
    if (preferences.theme === 'light') {
      apply(false);
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preferences.theme]);

  // Synchronize accessibility preferences on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('font-large', preferences.fontScale === 'large');
    root.classList.toggle('high-contrast', Boolean(preferences.highContrast));
    root.classList.toggle('reduced-motion', Boolean(preferences.reducedMotion));
  }, [preferences.fontScale, preferences.highContrast, preferences.reducedMotion]);

  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#10151E] text-[#F1F3F5] p-6">
        <p className="font-serif text-2xl font-semibold text-[#D6B782]">Dijital Evrenim</p>
        <p className="text-xs text-[#9BA7B6] mt-2">Yerel bilgi katmanı hazırlanıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#10151E] text-[#F1F3F5] p-6">
        <div className="max-w-md p-6 rounded-xl bg-[#1C2633] border border-red-500/30 space-y-3">
          <h1 className="text-xl font-semibold">Başlatma Hatası</h1>
          <p className="text-sm text-[#9BA7B6]">{error}</p>
          <button
            type="button"
            onClick={() => init()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#D6B782] text-[#10151E]"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const wrap = (name: string, node: React.ReactNode) => (
    <ModuleErrorBoundary moduleName={name}>{node}</ModuleErrorBoundary>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/uygulamalar/:appId" element={<Suspense fallback={<RouteLoader />}>
          {wrap('Uygulama', <IndependentWorkspacePage />)}
        </Suspense>} />
        <Route path="*" element={<>
      <AppShell>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={wrap('Ana Kontrol Paneli', <DashboardPage />)} />
            <Route path="/moduller" element={wrap('Modül Dizini', <ModulesDirectoryPage />)} />
            <Route path="/alan/:domainId" element={wrap('Ana Alan', <DomainDetailPage />)} />
            <Route path="/merkez/:centerId" element={wrap('Tematik Merkez', <CenterDetailPage />)} />
            <Route path="/takvim" element={wrap('Ortak Takvim', <CalendarPage />)} />
            <Route path="/koleksiyonlar" element={wrap('Koleksiyonlar', <CollectionsPage />)} />
            <Route path="/medya" element={wrap('Dosya ve Medya Merkezi', <MediaCenterPage />)} />
            <Route path="/entegrasyonlar/:appId" element={wrap('Bağımsız uygulama', <IntegratedApplicationPage />)} />
            <Route path="/entegrasyonlar" element={wrap('Entegrasyonlar', <IntegrationsPage />)} />
            <Route path="/ayarlar" element={wrap('Ayarlar', <SettingsPage />)} />

            {/* I. ZİHİN -> İrfan (6 Modül) */}
            <Route path="/modul/siir-deryasi" element={wrap('Şiir Deryası', <PoetrySeaModule />)} />
            <Route path="/modul/kelime-muzesi" element={wrap('Kelime Müzesi', <WordMuseumModule />)} />
            <Route path="/modul/edebiyat-atolyesi" element={wrap('Edebiyat Atölyesi', <LiteratureWorkshopModule />)} />
            <Route path="/modul/felsefe-meclisi" element={wrap('Felsefe Meclisi', <PhilosophyCouncilModule />)} />
            <Route path="/modul/mantik-akademisi" element={wrap('Mantık Akademisi', <LogicAcademyModule />)} />
            <Route path="/modul/tarih-atlasi" element={wrap('Tarih Atlası', <HistoryAtlasModule />)} />
            <Route
              path="/modul/tarih-simulatoru"
              element={<Navigate to="/modul/tarih-atlasi?tab=simulator" replace />}
            />

            {/* I. ZİHİN -> İdrak (6 Modül) */}
            <Route path="/modul/dijital-kutuphanem" element={wrap('Dijital Kütüphanem', <DigitalLibraryModule />)} />
            <Route path="/modul/alinti-defterim" element={wrap('Alıntı Defterim', <QuoteNotebookModule />)} />
            <Route path="/modul/sohbet-arsivi" element={wrap('Sohbet Arşivi', <ChatArchiveModule />)} />
            <Route path="/modul/zihin-atlasi" element={wrap('Zihin Atlası', <MindAtlasModule />)} />
            <Route path="/modul/hafiza-sarayi" element={wrap('Hafıza Sarayı', <MemoryPalaceModule />)} />
            <Route path="/modul/kendi-ansiklopedim" element={wrap('Kendi Ansiklopedim', <EncyclopediaModule />)} />

            {/* II. KEŞİF -> Kozmos (3 Modül) */}
            <Route path="/modul/matematik-laboratuvari" element={wrap('Matematik Laboratuvarı', <MathLabModule />)} />
            <Route path="/modul/gokyuzu-atlasi" element={wrap('Gökyüzü Atlası', <SkyAtlasModule />)} />
            <Route path="/modul/bilim-muzesi" element={wrap('Bilim Müzesi', <ScienceMuseumModule />)} />

            {/* II. KEŞİF -> Atölye (2 Modül) */}
            <Route path="/modul/automusicpro" element={wrap('AutoMusicPro', <AutoMusicProModule />)} />
            <Route path="/modul/kendi-dunyam" element={wrap('Kendi Dünyam', <WorldbuilderModule />)} />

            {/* III. YAŞAM -> Tekâmül (3 Modül) */}
            <Route path="/modul/tekamul-yolunda" element={wrap('Tekâmül Yolunda', <SelfGrowthModule />)} />
            <Route path="/modul/mihrap-ve-minber/akademi" element={wrap('Mihrap ve Minber Akademisi', <MihrapAcademyPage />)} />
            <Route path="/modul/mihrap-ve-minber" element={wrap('Mihrap ve Minber', <MihrapMinberModule />)} />
            <Route path="/modul/namaz-yolculugum" element={wrap('Namaz Yolculuğum', <PrayerJourneyModule />)} />

            {/* III. YAŞAM -> Hayat (2 Modül) */}
            <Route path="/modul/karadeniz-asistani" element={wrap('Karadeniz Asistanı', <KaradenizAssistantModule />)} />
            <Route path="/modul/bugun-ne-yesem" element={wrap('Bugün Ne Yesem', <WhatToEatModule />)} />

            <Route path="/modul/:moduleId/calisma" element={wrap('Çalışma defteri', <ModuleWorkspacePage />)} />
            <Route path="/modul/:moduleId" element={wrap('Modül', <PlannedModulePage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>

      <UniversalSearchModal />
      <EvrenAssistantDrawer />
        </>} />
      </Routes>
    </BrowserRouter>
  );
}
