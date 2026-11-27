import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecordRoute } from '../../core/services/integrationService';
import { useAppStore } from '../../store/useAppStore';
import { asRow, asText, readKitchenBackup, readMusicPlaylists, readPrayerStudy, readVideoShelf } from './importedData';

const panel = 'min-w-0 space-y-3 rounded-2xl border border-current/15 bg-white p-4 sm:p-5 dark:bg-[#1C2633]';
const control = 'min-h-11 rounded-lg border border-current/20 px-3 py-2 text-sm';

function MusicPanel() {
  const records = useAppStore((state) => state.moduleRecords);
  const lists = readMusicPlaylists(records);
  const [playing, setPlaying] = useState<{ key: string; title: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  return <section className={panel}>
    <h2 className="text-xl font-semibold">AutoMusic Pro 4 çalma listeleri</h2>
    {lists.length === 0 ? <p className="text-sm">Çalma listelerini açmak için AutoMusic Pro 4 JSON yedeğinizi içe aktarın.</p> :
      lists.map((list) => <details key={list.key} className="rounded-lg border border-current/15 p-3">
        <summary className="cursor-pointer font-medium">{list.title} ({list.tracks.length} parça)</summary>
        <ul className="mt-2 divide-y divide-current/10">
          {list.tracks.map((track) => <li key={track.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="break-words">{track.title}{track.artist ? ` · ${track.artist}` : ''}</span>
            {track.url ? <button type="button" className={control} onClick={() => {
              setFailed(false);
              setPlaying({ ...track, key: `${list.key}/${track.key}` });
            }}>Oynatıcıya yükle</button> : <span>Kaynak akışı bu yedekte yok</span>}
          </li>)}
        </ul>
      </details>)}
    {playing && <div className="space-y-2">
      <p className="text-sm font-medium">{playing.title}</p>
      <audio key={playing.key} controls preload="none" src={playing.url} onError={() => setFailed(true)}
        aria-label={playing.title} className="w-full max-w-lg" />
      {failed && <p role="status" className="text-sm">Bu parça kaynak sunucudan oynatılamadı.</p>}
    </div>}
  </section>;
}

function KitchenPanel() {
  const records = useAppStore((state) => state.moduleRecords);
  const backup = readKitchenBackup(records);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!backup.found) return null;
  return <section className={panel}>
    <h2 className="text-xl font-semibold">İçe aktarılan mutfak listesi</h2>
    {backup.selected.length > 0 && <div>
      <h3 className="font-medium">Eldeki malzemeler</h3>
      <p className="mb-2 text-sm">{backup.selected.join(', ')}</p>
      <Link className="text-sm underline" to="/modul/bugun-ne-yesem?mutfak=aktarim">Bu malzemelerle tarif eşleştir</Link>
    </div>}
    {backup.shopping.length > 0 && <div className="space-y-1">
      <h3 className="font-medium">Alışveriş listesi</h3>
      {backup.shopping.map((item) => <label key={item.name} className="flex min-h-9 items-center gap-2 text-sm">
        <input type="checkbox" checked={checked[item.name] ?? item.checked}
          onChange={(event) => setChecked((next) => ({ ...next, [item.name]: event.target.checked }))} /> {item.name}
      </label>)}
    </div>}
    <button type="button" className={control} onClick={() => {
      const data = {
        version: 1, selected: backup.selected, custom: backup.custom, staples: backup.staples, favorites: backup.favorites,
        shopping: backup.shopping.map((item) => ({ ...item, checked: checked[item.name] ?? item.checked })),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bugun-ne-yesem-yedek.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>Mutfak yedeğini indir</button>
  </section>;
}

export function ExternalDataPanel({ appId, moduleRoute }: { appId: string; moduleRoute: string }) {
  const { moduleRecords, books, quotes } = useAppStore();
  if (appId === 'automusicpro') return <MusicPanel />;
  if (appId === 'bugun-ne-yesem') return <KitchenPanel />;
  if (appId === 'karadeniz-asistani') return null;

  if (appId === 'sohbet-arsivi') {
    const items = readVideoShelf(moduleRecords);
    if (!items.length) return null;
    return <section className={panel}>
      <h2 className="text-xl font-semibold">İçe aktarılan izleme defteri</h2>
      <ul className="space-y-2">
        {items.map((item) => <li key={item.id} className="space-y-1 rounded-lg border border-current/15 p-3">
          <h3 className="break-words font-medium">Sohbet {item.id}{item.favorite ? ' · Favori' : ''}</h3>
          <progress aria-label="İzleme ilerlemesi" value={item.percent} max={100} className="w-full" />
          {item.note && <p className="whitespace-pre-wrap break-words text-sm">{item.note}</p>}
        </li>)}
      </ul>
    </section>;
  }
  if (appId === 'namaz-yolculugum') {
    const items = readPrayerStudy(moduleRecords);
    if (!items.length) return null;
    return <section className={panel}>
      <h2 className="text-xl font-semibold">İçe aktarılan ezber çizelgesi</h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => <div key={item.id} className="rounded-lg border border-current/15 p-2 text-sm">
          <dt className="break-words font-medium">{item.id.replaceAll('-', ' ')}</dt>
          <dd>{item.status === 'done' ? 'Ezberlendi' : 'Çalışılıyor'}</dd>
        </div>)}
      </dl>
    </section>;
  }
  const records = moduleRecords.filter((record) =>
    record.id.startsWith(`ext-${appId}-`) && !record.isArchived && record.entityType !== 'imported_record');
  const entries = appId === 'dijital-kutuphanem'
    ? books.filter((book) => book.id.startsWith('ext-dijital-kutuphanem-book-') && !book.isArchived)
        .map((book) => ({ id: book.id, title: book.title, detail: book.author, path: getRecordRoute(appId, book.id) }))
    : appId === 'alinti-defterim'
      ? [...quotes.filter((quote) => quote.id.startsWith('ext-alinti-defterim-quote-') && !quote.isArchived)
          .map((quote) => ({ id: quote.id, title: quote.text, detail: quote.author, path: getRecordRoute(appId, quote.id) })),
        ...records.map((record) => ({ id: record.id, title: record.title,
          detail: asText(asRow(record.payload).meaningToday) || record.category,
          path: record.entityType === 'word_entry' ? undefined : getRecordRoute(record.moduleId, record.id, record.entityType),
        }))]
      : records.map((record) => ({
          id: record.id, title: record.title,
          detail: asText(asRow(record.payload).poetName) || record.subtitle || record.category,
          path: appId === 'tekamul-yolunda' ? `${moduleRoute}?recordId=${encodeURIComponent(record.id)}`
            : getRecordRoute(record.moduleId, record.id, record.entityType),
        }));
  return <section className={panel}>
    <h2 className="text-xl font-semibold">
      {appId === 'siir-deryasi' ? 'İçe aktarılan şiir defteri' : appId === 'tekamul-yolunda' ? 'İçe aktarılan günlük ve alışkanlıklar' : 'Dijital Evrenim’e bağlanan kayıtlar'}
    </h2>
    {!entries.length ? <p className="text-sm">Bağımsız uygulamadaki kayıtları görmek için kendi yedeğinizi içe aktarın.</p> : <ul className="divide-y divide-current/10">
      {entries.map((entry) => {
        const content = <>
          <span className="line-clamp-2 text-sm font-semibold">{entry.title}</span>
          <span className="text-sm">{entry.detail}</span>
        </>;
        return <li key={entry.id} id={entry.id} className="scroll-mt-24 break-words">
          {entry.path ? <Link className="block py-2 hover:underline" to={entry.path}>{content}</Link>
            : <div className="py-2">{content}</div>}
        </li>;
      })}
    </ul>}
  </section>;
}
