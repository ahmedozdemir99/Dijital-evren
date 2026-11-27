import { useEffect, useState } from 'react';
import { ExternalLink, FileUp, FolderGit2, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ACADEMY_MODULE_ID, ACADEMY_ROUTE } from '../integrations/mihrap/progress';
import { EXISTING_APPS_LIST, getCenterById, getModuleById } from '../core/registry/modules';
import { fetchExternalJson, MAX_IMPORT_BYTES, prepareExternalImport, SOURCE_IMPORTS, type ExternalImport } from '../core/services/externalImports';
import { getRecordRoute } from '../core/services/integrationService';
import type { ExternalAppConfig } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

const button = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40';

function safeLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

function IntegrationCard({ app }: { app: ExternalAppConfig }) {
  const { updateExternalApp, importExternal } = useAppStore();
  const source = SOURCE_IMPORTS[app.appId];
  const registry = EXISTING_APPS_LIST.find((entry) => entry.appId === app.appId);
  const target = getModuleById(app.targetModuleId);
  const repo = safeLink(app.repoUrl) ?? safeLink(registry?.repoUrl);
  const live = safeLink(app.liveUrl) ?? source.live;
  const [api, setApi] = useState(app.apiUrl ?? '');
  const [preview, setPreview] = useState<ExternalImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastRoute, setLastRoute] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktarım tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const count = preview ? preview.books.length + preview.quotes.length + preview.records.length : 0;
  return (
    <article id={app.appId} className="scroll-mt-24 min-w-0 space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1C2633]">
      <div>
        <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">{getCenterById(app.centerId)?.name}</p>
        <h2 className="mt-1 text-xl font-semibold">{app.name}</h2>
      </div>
      <p className="text-sm leading-relaxed">{source.hint}</p>
      <div className="flex flex-wrap gap-2">
        {repo && <a className={button} href={repo} target="_blank" rel="noreferrer"><FolderGit2 size={16} /> GitHub deposu</a>}
        {live && <a className={button} href={live} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Uygulamayı aç</a>}
        {app.appId === ACADEMY_MODULE_ID && <Link className={button} to={ACADEMY_ROUTE}>Gömülü Akademiyi aç</Link>}
        {target && <Link className={button} to={target.route + '/calisma'}>Çalışma defteri</Link>}
      </div>
      {source.file && <div className="space-y-2 border-t border-current/10 pt-3">
        {app.disabled ? <button type="button" className={button} disabled={busy}
          onClick={() => run(() => updateExternalApp({ ...app, disabled: false }))}>Aktarımı etkinleştir</button> : (
          <>
            <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <FileUp size={16} /> Dosyadan önizle
              <input type="file" className="max-w-full text-sm" disabled={busy}
                accept={app.appId === 'dijital-kutuphanem' ? '.json,.csv' : '.json'}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setPreview(null);
                  setLastRoute('');
                  void run(async () => {
                    if (file.size > MAX_IMPORT_BYTES) throw new Error('Aktarım dosyası 5 MB sınırını aşıyor.');
                    setPreview(await prepareExternalImport(app, await file.text(), file.name.toLowerCase().endsWith('.csv')));
                  });
                }} />
            </label>
            <details>
              <summary className="cursor-pointer py-2 text-sm">HTTPS JSON kaynağından aktar</summary>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                event.preventDefault();
                setPreview(null);
                setLastRoute('');
                void run(async () => {
                  const address = api.trim();
                  const prepared = await prepareExternalImport(app, await fetchExternalJson(address));
                  // Preserve saved configuration and avoid storing temporary URLs or query credentials.
                  setPreview(prepared);
                });
              }}>
                <label className="min-w-0 grow text-sm">JSON API adresi
                  <input className="mt-1 block min-h-11 w-full rounded-lg border border-current/20 bg-transparent px-3"
                    type="url" value={api} required onChange={(event) => setApi(event.target.value)} />
                </label>
                <button disabled={busy} className={button}><RefreshCw size={16} /> Veriyi önizle</button>
              </form>
              <p className="mt-2 text-sm text-[#546070] dark:text-[#9BA7B6]">Uç nokta tarayıcı erişimine izin vermeli ve yukarıdaki yedek biçimini döndürmelidir.</p>
            </details>
          </>
        )}
      </div>}
      {preview && <div className="space-y-2 rounded-xl border border-current/15 p-3">
        <p className="text-sm">{count} kayıt hazır. Aynı kaynak kimliğine sahip yerel kayıtlar korunur.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy} onClick={() => run(async () => {
            const added = await importExternal(preview);
            setMessage(`${added} yeni kayıt eklendi.`);
            const record = preview.records[0];
            if (record) setLastRoute(getRecordRoute(record.moduleId, record.id, record.entityType));
            else if (preview.books[0]) setLastRoute(getRecordRoute('dijital-kutuphanem', preview.books[0].id));
            else if (preview.quotes[0]) setLastRoute(getRecordRoute('alinti-defterim', preview.quotes[0].id));
            setPreview(null);
            if (added) await updateExternalApp({ ...app, lastSyncAt: new Date().toISOString() });
          })}>Kayıtları içe aktar</button>
          <button type="button" className={button} disabled={busy} onClick={() => setPreview(null)}>Vazgeç</button>
        </div>
      </div>}
      {app.lastSyncAt && <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
        Son veri aktarımı {new Date(app.lastSyncAt).toLocaleString('tr-TR')}
      </p>}
      {busy && <p className="text-sm" role="status">Veri işleniyor…</p>}
      {message && <p className="text-sm" role="status">{message} {lastRoute && <Link className="underline" to={lastRoute}>Kaydı aç</Link>}</p>}
      {error && <p className="break-words text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
    </article>
  );
}

export function IntegrationsPage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const externalApps = useAppStore((state) => state.externalApps);
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Bağımsız uygulamalar</h1>
        <p className="max-w-2xl text-sm text-[#546070] dark:text-[#9BA7B6]">Uygulamanızı açın veya desteklenen yedeği Dijital Evrenim’e aktarın.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {EXISTING_APPS_LIST.map((base) => <IntegrationCard key={base.appId}
          app={externalApps.find((app) => app.appId === base.appId) ?? base} />)}
      </div>
    </div>
  );
}
