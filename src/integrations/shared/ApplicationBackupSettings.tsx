import { useEffect, useState } from 'react';
import { FileUp, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../../core/registry/modules';
import { fetchExternalJson, MAX_IMPORT_BYTES, prepareExternalImport, SOURCE_IMPORTS, type ExternalImport } from '../../core/services/externalImports';
import { summarizeApplicationProgress } from '../../core/services/applicationProgress';
import { getRecordRoute } from '../../core/services/integrationService';
import type { ExternalAppConfig } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

const button = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40';
const supportedApps = EXISTING_APPS_LIST.filter(({ appId }) => SOURCE_IMPORTS[appId]?.file);
const sectionId = 'uygulama-yedekleri';

function ApplicationBackupImport({ app }: { app: ExternalAppConfig }) {
  const { updateExternalApp, importExternal } = useAppStore();
  const source = SOURCE_IMPORTS[app.appId];
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
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">{source.hint}</p>
      <div className="space-y-2">
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
      </div>
      {preview && <div className="space-y-2 rounded-xl border border-current/15 p-3">
        <p className="text-sm">{count} kayıt hazır. Aynı kaynak kimliğine sahip yerel kayıtlar korunur.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy} onClick={() => run(async () => {
            const added = await importExternal(preview);
            await updateExternalApp({
              ...app,
              lastSyncAt: new Date().toISOString(),
              sourceProgress: summarizeApplicationProgress(app.appId, preview),
            });
            setMessage(`${added} yeni kayıt eklendi.`);
            const record = preview.records[0];
            if (record?.entityType === 'imported_record' && ['sohbet-arsivi', 'namaz-yolculugum', 'bugun-ne-yesem', 'automusicpro'].includes(app.appId)) {
              setLastRoute(`/entegrasyonlar/${app.appId}#aktarilan-veri`);
            } else if (record) setLastRoute(getRecordRoute(record.moduleId, record.id, record.entityType));
            else if (preview.books[0]) setLastRoute(getRecordRoute('dijital-kutuphanem', preview.books[0].id));
            else if (preview.quotes[0]) setLastRoute(getRecordRoute('alinti-defterim', preview.quotes[0].id));
            setPreview(null);
          })}>Kayıtları içe aktar</button>
          <button type="button" className={button} disabled={busy} onClick={() => setPreview(null)}>Vazgeç</button>
        </div>
      </div>}
      {app.lastSyncAt && <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
        Son veri aktarımı {new Date(app.lastSyncAt).toLocaleString('tr-TR')}
      </p>}
      <Link className="text-sm underline" to={`/entegrasyonlar/${app.appId}#aktarilan-veri`}>Aktarılan kayıtlar</Link>
      {busy && <p className="text-sm" role="status">Veri işleniyor…</p>}
      {message && <p className="text-sm" role="status">{message} {lastRoute && <Link className="underline" to={lastRoute}>Kaydı aç</Link>}</p>}
      {error && <p className="break-words text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
    </div>
  );
}

export function ApplicationBackupSettings() {
  const { hash, search } = useLocation();
  const requestedId = new URLSearchParams(search).get('uygulama');
  const requestedApp = supportedApps.find(({ appId }) => appId === requestedId);
  const [selectedId, setSelectedId] = useState(requestedApp?.appId ?? '');
  const externalApps = useAppStore((state) => state.externalApps);
  const sourceApp = supportedApps.find(({ appId }) => appId === selectedId);
  const app = externalApps.find(({ appId }) => appId === sourceApp?.appId) ?? sourceApp;

  useEffect(() => {
    setSelectedId(requestedApp?.appId ?? '');
    if (hash === '#' + sectionId) document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
  }, [hash, requestedApp]);

  return (
    <details key={requestedApp?.appId} id={sectionId} open={Boolean(requestedApp) || undefined}
      className="scroll-mt-24 border-t border-black/10 pt-3 dark:border-white/10">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Uygulama yedeği içe aktar</summary>
      <div className="space-y-4 pt-1">
        <label className="block text-sm font-medium">
          Kaynak uygulama
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1 block min-h-11 w-full max-w-sm rounded-lg border border-current/20 bg-transparent px-3">
            <option value="">Uygulama seçin</option>
            {supportedApps.map(({ appId, name }) => <option key={appId} value={appId}>{name}</option>)}
          </select>
        </label>
        {app && <ApplicationBackupImport key={app.appId} app={app} />}
      </div>
    </details>
  );
}
