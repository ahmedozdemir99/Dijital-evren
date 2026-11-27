import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ExternalDataPanel } from './ExternalDataPanel';
import { independentSourceUrl } from './liveApplications';

const AutoMusicPro = lazy(() => import('../../modules/atolye/AutoMusicProModule').then((module) => ({ default: module.AutoMusicProModule })));
const SelfGrowth = lazy(() => import('../../modules/tekamul/SelfGrowthModule').then((module) => ({ default: module.SelfGrowthModule })));

export function IndependentWorkspacePage() {
  const { appId = '' } = useParams();
  const sourceUrl = independentSourceUrl(appId);
  const isMusic = appId === 'automusicpro';
  useEffect(() => {
    const previous = document.title;
    if (isMusic || appId === 'tekamul-yolunda') {
      document.title = isMusic ? 'AutoMusicPro | Çalışma alanı' : 'Tekâmül Yolunda | Çalışma alanı';
    }
    return () => { document.title = previous; };
  }, [appId, isMusic]);
  if (!sourceUrl && !isMusic && appId !== 'tekamul-yolunda') return <Navigate to="/entegrasyonlar" replace />;
  if (sourceUrl) return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Bağımsız uygulama</h1>
      <a href={sourceUrl} rel="noreferrer" className="block underline">Uygulama sitesine git</a>
      <Link to="/entegrasyonlar" className="block text-sm underline">Uygulama listesine dön</Link>
    </main>
  );

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-6 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap gap-3 border-b border-current/15 pb-3 text-sm">
        <Link to="/entegrasyonlar" className="underline">Uygulama listesi</Link>
        <Link to={`/ayarlar?uygulama=${appId}#uygulama-yedekleri`} className="underline">Yedek aktarımı</Link>
      </header>
      {isMusic && <ExternalDataPanel appId={appId} moduleRoute="/modul/automusicpro" />}
      <Suspense fallback={<p role="status">Uygulama açılıyor…</p>}>
        {isMusic ? <AutoMusicPro /> : <SelfGrowth />}
      </Suspense>
    </main>
  );
}
