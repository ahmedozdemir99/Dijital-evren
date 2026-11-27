import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud } from 'lucide-react';
import { listBackups, readBackup, supabase, writeBackup, type CloudBackup } from '../../core/services/supabaseAdapter';
import { useAppStore } from '../../store/useAppStore';

const button = 'min-h-11 rounded-lg border border-current/20 px-4 py-2 text-sm font-medium disabled:opacity-50';

export function CloudBackupPanel() {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<CloudBackup[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const { exportBundle, mergeCloudBackup } = useAppStore();

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  const userId = session?.user.id;
  useEffect(() => {
    let active = true;
    setHistory([]);
    setSelected(0);
    if (userId) listBackups().then((backups) => {
      if (active) setHistory(backups);
    }).catch((err: Error) => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [userId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulut işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#1C2633]" aria-labelledby="cloud-backup-heading">
      <h2 id="cloud-backup-heading" className="flex items-center gap-2 text-xl font-semibold"><Cloud size={20} /> Bulut yedekleri ve eşitleme</h2>
      {!client ? <p className="mt-2 text-sm">Supabase yapılandırması bekleniyor. Dosya yedekleri aşağıdan kullanılabilir.</p> :
        !ready ? <p className="mt-2 text-sm">Oturum kontrol ediliyor…</p> : session ? (
          <div className="mt-3 space-y-4">
            <p className="break-all text-sm">{session.user.email}</p>
            <p className="max-w-3xl text-sm">
              Eşitleme, bu tarayıcıdaki kişisel kayıtlar ve ekler dâhil tüm arşivi hesabınıza yükler.
              Son bulut sürümündeki yeni kayıtlar ve daha yeni düzenlemeler bu cihaza alınır.
              Yerel silmeler ve ayarlar cihazlar arasında eşitlenmez.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} disabled={busy} onClick={() => run(async () => {
                const backups = await listBackups();
                const revision = backups[0]?.revision ?? 0;
                if (revision) await mergeCloudBackup(await readBackup(revision));
                await writeBackup(await exportBundle('full'), revision);
                setHistory(await listBackups());
                setFeedback(`Bulut sürümü ${revision + 1} kaydedildi.`);
              })}>Arşivi eşitle ve yedekle</button>
              <button type="button" className={button} disabled={busy} onClick={() => run(async () => {
                const result = await client.auth.signOut({ scope: 'local' });
                if (result.error) throw new Error('Oturum kapatılamadı.');
              })}>Çıkış yap</button>
            </div>
            {history.length > 0 && <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">Bulut yedek sürümü
                <select className="mt-1 block min-h-11 max-w-full rounded-lg border border-current/20 bg-transparent px-3" value={selected} disabled={busy}
                  onChange={(event) => setSelected(Number(event.target.value))}>
                  <option value={0}>Sürüm seçin</option>
                  {history.map((backup) => <option key={backup.revision} value={backup.revision}>
                    {backup.revision} · {new Date(backup.created_at).toLocaleString('tr-TR')}
                  </option>)}
                </select>
              </label>
              <button type="button" className={button} disabled={!selected || busy} onClick={() => run(async () => {
                const bundle = await readBackup(selected);
                const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = `dijital-evrenim-bulut-${selected}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setFeedback('Bulut yedeği indirildi.');
              })}>JSON indir</button>
            </div>}
          </div>
        ) : <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          void run(async () => {
            const result = await client.auth.signInWithPassword({
              email: String(data.get('email')).trim(), password: String(data.get('password')),
            });
            if (result.error) throw new Error('Oturum açılamadı. E-posta, parola ve hesap durumunu kontrol edin.');
            form.reset();
          });
        }}>
          <label className="text-sm">E-posta
            <input className="mt-1 block min-h-11 w-full rounded-lg border border-current/20 bg-transparent px-3" name="email" type="email" autoComplete="username" required />
          </label>
          <label className="text-sm">Parola
            <input className="mt-1 block min-h-11 w-full rounded-lg border border-current/20 bg-transparent px-3" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className={button} disabled={busy}>Oturum aç</button>
        </form>}
      {busy && <p className="mt-2 text-sm" role="status">Bulut işlemi sürüyor…</p>}
      {feedback && <p className="mt-2 text-sm" role="status">{feedback}</p>}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
    </section>
  );
}
