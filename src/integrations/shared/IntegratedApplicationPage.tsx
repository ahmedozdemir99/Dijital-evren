import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { EXISTING_APPS_LIST, getModuleById } from '../../core/registry/modules';
import { IndependentApplicationLink } from './IndependentApplicationLink';
import { ACADEMY_MODULE_ID, ACADEMY_ROUTE } from '../mihrap/progress';
import { ExternalDataPanel } from './ExternalDataPanel';

const action = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5';

export function IntegratedApplicationPage() {
  const { appId = '' } = useParams();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#aktarilan-veri') document.getElementById('aktarilan-veri')?.scrollIntoView({ block: 'start' });
  }, [appId, hash]);

  if (appId === ACADEMY_MODULE_ID) return <Navigate to={ACADEMY_ROUTE} replace />;
  const app = EXISTING_APPS_LIST.find((item) => item.appId === appId);
  const module = app ? getModuleById(app.targetModuleId) : undefined;
  if (!app || !module) return <Navigate to="/entegrasyonlar" replace />;


  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link to="/entegrasyonlar" className="text-sm underline">Bağımsız uygulamalar</Link>
        <h1 className="text-3xl font-semibold">{app.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Link className={action} to={module.route}>{module.name} modülü</Link>
          <IndependentApplicationLink appId={appId} className={action}>
            <ExternalLink size={16} /> Ayrı sekmede aç
          </IndependentApplicationLink>
          {appId !== 'karadeniz-asistani' && <Link className={action} to={`/entegrasyonlar#${appId}`}>Yedek içe aktar</Link>}
        </div>
      </header>
      <div id="aktarilan-veri" className="scroll-mt-24">
        <ExternalDataPanel key={appId} appId={appId} moduleRoute={module.route} />
      </div>
    </div>
  );
}
