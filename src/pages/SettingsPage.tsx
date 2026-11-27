import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { CloudBackupPanel } from '../components/shared/CloudBackupPanel';
import { localDateIso } from '../core/services/integrationService';
import type { ExportBundle } from '../core/types/entities';
import { ApplicationBackupSettings } from '../integrations/shared/ApplicationBackupSettings';
import { useAppStore } from '../store/useAppStore';

const panel = 'rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C2633] sm:p-5';
const field = 'mt-1 block min-h-11 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm';
const button = 'inline-flex min-h-11 items-center rounded-lg border border-current/20 px-4 py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50';

export function SettingsPage() {
  const { hash } = useLocation();
  const { profile, updateProfile, exportBundle, importBundle } = useAppStore();
  const [pendingRestore, setPendingRestore] = useState<ExportBundle | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (hash === '#profil' || hash === '#yedekleme') document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const run = async (action: () => Promise<void>) => {
    setNotice('');
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const download = (scope: 'full' | 'legacy_archive') => run(async () => {
    const bundle = await exportBundle(scope);
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dijital-evrenim-${scope}-v${bundle.schemaVersion}-${localDateIso()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Yedek indirildi.');
  });

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold underline underline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-4" /> Uygulamalara dön
      </Link>
      {notice && <p role="status" className="rounded-lg border border-green-700/30 bg-green-500/10 p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-700/30 bg-red-500/10 p-3 text-sm">{error}</p>}

      <form id="profil" key={profile.updatedAt} className={panel + ' scroll-mt-20 space-y-4'} onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void run(async () => {
          await updateProfile({
            fullName: String(data.get('fullName')).trim() || 'Kullanıcı',
            title: String(data.get('title')).trim(),
            bio: String(data.get('bio')).trim(),
          });
          setNotice('Kişisel bilgiler kaydedildi.');
        });
      }}>
        <h1 className="text-2xl font-semibold">Kişisel bilgiler</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Ad soyad
            <input name="fullName" defaultValue={profile.fullName} autoComplete="name" maxLength={120} className={field} />
          </label>
          <label className="text-sm font-medium">Unvan
            <input name="title" defaultValue={profile.title} maxLength={120} className={field} />
          </label>
        </div>
        <label className="block text-sm font-medium">Hakkımda
          <textarea name="bio" defaultValue={profile.bio} rows={2} maxLength={2000} className={field} />
        </label>
        <button type="submit" disabled={busy} className={button}>Kaydet</button>
      </form>

      <div id="yedekleme" className="scroll-mt-20 space-y-3">
        <CloudBackupPanel />
        <details className={panel} open={hash === '#uygulama-yedekleri' || undefined}>
          <summary className="cursor-pointer py-2 font-semibold">Dosya yedekleri</summary>
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} disabled={busy} onClick={() => void download('full')}>Tam yedeği indir</button>
              <button type="button" className={button} disabled={busy} onClick={() => void download('legacy_archive')}>Kapsam dışı modül arşivi</button>
            </div>
            <label className="block text-sm font-medium">Dijital Evren JSON yedeğini aç
              <input type="file" accept=".json" disabled={busy} className={field} onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setPendingRestore(null);
                setRestoreMode('merge');
                void run(async () => {
                  const bundle = JSON.parse(await file.text()) as ExportBundle;
                  if (bundle?.app !== 'Dijital Evrenim' || !bundle.data) throw new Error('Geçerli bir Dijital Evren yedeği seçin.');
                  setPendingRestore(bundle);
                });
              }} />
            </label>
            {pendingRestore && <div className="space-y-3 rounded-lg border border-current/20 p-3">
              <p className="text-sm">Yedek hazır · {pendingRestore.data.books?.length ?? 0} kitap · {pendingRestore.data.quotes?.length ?? 0} alıntı · {pendingRestore.data.moduleRecords?.length ?? 0} modül kaydı</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={restoreMode === 'replace'}
                  onChange={(event) => setRestoreMode(event.target.checked ? 'replace' : 'merge')} />
                Bu cihazdaki verileri yedekle değiştir
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={button} onClick={() => void run(async () => {
                  await importBundle(pendingRestore, restoreMode);
                  setPendingRestore(null);
                  setNotice('Yedek geri yüklendi.');
                })}>{restoreMode === 'replace' ? 'Verileri değiştir' : 'Kayıtları birleştir'}</button>
                <button type="button" disabled={busy} className={button} onClick={() => setPendingRestore(null)}>Vazgeç</button>
              </div>
            </div>}
            <ApplicationBackupSettings />
          </div>
        </details>
      </div>
    </div>
  );
}
