import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { RecordActionsBar } from '../components/shared/RecordActionsBar';
import { getModuleById } from '../core/registry/modules';
import { MODULE_STUDIES } from '../core/registry/studies';
import { useAppStore } from '../store/useAppStore';
import type { ModuleDefinition } from '../core/types/entities';

const control = 'min-h-11 rounded-lg border border-current/20 px-3 py-2 text-sm';
const card = 'rounded-2xl border border-current/15 bg-white p-5 dark:bg-[#1C2633]';

function Workspace({ mod }: { mod: ModuleDefinition }) {
  const [params, setParams] = useSearchParams();
  const { moduleRecords, addModuleRecord, updateModuleRecord } = useAppStore();
  const study = MODULE_STUDIES[mod.id];
  const records = moduleRecords.filter((record) =>
    record.moduleId === mod.id && !record.isArchived &&
    ['imported_record', 'module_study'].includes(record.entityType));
  const selected = records.find((record) => record.id === params.get('workspaceId'));
  const editable = selected?.entityType === 'module_study';
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link className="text-sm underline" to={mod.route}>{mod.name}</Link>
        <h1 className="text-3xl font-semibold">Çalışma defteri</h1>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
        <section className={card}>
          {selected?.entityType === 'imported_record' ? (
            <>
              <h2 className="break-words text-xl font-semibold">{selected.title}</h2>
              <p className="mt-1 text-sm">{selected.category}</p>
              <pre className="my-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/5 p-3 text-sm dark:bg-black/20">{JSON.stringify(selected.payload, null, 2)}</pre>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{study.title}</h2>
              <ol className="my-4 list-decimal space-y-2 pl-5">{study.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <form key={selected?.id ?? 'new'} className="mb-4 grid gap-3" onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const title = String(form.get('title')).trim();
                const text = String(form.get('notes')).trim();
                if (!title || !text || busy) return;
                setBusy(true);
                setSaved('');
                try {
                  if (editable && selected) {
                    await updateModuleRecord(selected.id, { title, payload: { text, study: study.title } });
                  } else {
                    const record = await addModuleRecord({
                      moduleId: mod.id, entityType: 'module_study', title, category: 'Çalışma defteri',
                      tags: ['çalışma'], isFavorite: false, isArchived: false,
                      privacyDomain: mod.privacyDomain, payload: { text, study: study.title },
                    });
                    setParams({ workspaceId: record.id }, { replace: true });
                  }
                  setSaved('Çalışma kaydedildi.');
                } catch {
                  setSaved('Çalışma kaydedilemedi.');
                } finally {
                  setBusy(false);
                }
              }}>
                <label className="grid gap-1">Başlık
                  <input className={control + ' bg-transparent'} name="title" defaultValue={selected?.title ?? study.title} maxLength={160} required />
                </label>
                <label className="grid gap-1">Çalışma notu
                  <textarea className={control + ' bg-transparent'} name="notes" defaultValue={(selected?.payload as { text?: string })?.text} rows={7} maxLength={12000} required />
                </label>
                <button className={control + ' justify-self-start bg-[#8C6B32] text-white dark:bg-[#D6B782] dark:text-[#10151E]'} disabled={busy}>Çalışmayı kaydet</button>
              </form>
            </>
          )}
          {saved && <p role="status" className="my-2 text-sm">{saved}</p>}
          {selected && <RecordActionsBar key={selected.id} moduleId={mod.id} entityId={selected.id}
            entityLabel={selected.title} entityType={selected.entityType} privacyDomain={selected.privacyDomain} />}
        </section>
        <aside className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Defter kayıtları</h2>
            <Link className="text-sm underline" to={mod.route + '/calisma'} onClick={() => setSaved('')}>Yeni çalışma</Link>
          </div>
          {records.length === 0 ? <p className="mt-3 text-sm">Henüz kayıt yok.</p> : <ul className="mt-3 space-y-1">
            {records.map((record) => <li key={record.id}>
              <Link aria-current={selected?.id === record.id ? 'page' : undefined} onClick={() => setSaved('')}
                className="block break-words rounded-lg p-2 text-sm hover:bg-black/5 aria-[current=page]:bg-black/10 dark:hover:bg-white/5 dark:aria-[current=page]:bg-white/10"
                to={`?workspaceId=${encodeURIComponent(record.id)}`}>{record.title}</Link>
            </li>)}
          </ul>}
        </aside>
      </div>
    </div>
  );
}

export function ModuleWorkspacePage() {
  const { moduleId = '' } = useParams();
  const mod = getModuleById(moduleId);
  if (!mod || !MODULE_STUDIES[moduleId]) return <p>Çalışma defteri bulunamadı.</p>;
  return <Workspace key={moduleId} mod={mod} />;
}
