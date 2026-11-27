import type { ModuleRecord } from '../../core/types/entities';

type Row = Record<string, unknown>;

export const asRow = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.map(asRow) : [];
export const asText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.map(asText).filter(Boolean) : [];

function findSourceArchive(records: ModuleRecord[], moduleId: string, matches: (payload: Row) => boolean): Row {
  const matching = records.filter((item) =>
    item.moduleId === moduleId && item.entityType === 'imported_record' && !item.isArchived && matches(asRow(item.payload)));
  matching.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return asRow(matching[0]?.payload);
}

export function readKitchenBackup(records: ModuleRecord[]) {
  const source = findSourceArchive(records, 'bugun-ne-yesem', (payload) => payload.version === 1 && Array.isArray(payload.selected));
  const shopping = asRows(source.shopping).flatMap((item) => {
    const name = asText(item.name);
    return name ? [{ name, checked: item.checked === true }] : [];
  });
  return {
    found: source.version === 1,
    selected: asStrings(source.selected),
    custom: asStrings(source.custom),
    favorites: asStrings(source.favorites),
    shopping,
    staples: source.staples === true,
  };
}

export function readMusicPlaylists(records: ModuleRecord[]) {
  const source = findSourceArchive(records, 'automusicpro', (payload) =>
    Array.isArray(payload.playlists) || Array.isArray(payload.favoriteTracks));
  const lists = asRows(source.playlists);
  if (Array.isArray(source.favoriteTracks) && source.favoriteTracks.length) {
    lists.push({ id: 'favorites', name: 'Favori parçalar', items: source.favoriteTracks });
  }
  return lists.flatMap((list, index) => {
    const title = asText(list.name);
    if (!title) return [];
    const tracks = asRows(list.items).flatMap((track, trackIndex) => {
      const name = asText(track.title);
      if (!name) return [];
      let url = '';
      try {
        const parsed = new URL(asText(track.streamUrl));
        if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) url = parsed.href;
      } catch { /* Local and unavailable tracks remain visible without a player. */ }
      return [{ key: `${asText(track.contentId)}-${trackIndex}`, title: name, artist: asText(track.artistName), url }];
    });
    return [{ key: `${asText(list.id)}-${index}`, title, tracks }];
  });
}

export function readVideoShelf(records: ModuleRecord[]) {
  const saved = findSourceArchive(records, 'sohbet-arsivi', (payload) =>
    Array.isArray(payload.favorites) || Object.keys(asRow(payload.progress)).length > 0 || Object.keys(asRow(payload.notes)).length > 0);
  const favorites = new Set(asStrings(saved.favorites));
  const progress = asRow(saved.progress);
  const notes = asRow(saved.notes);
  return Array.from(new Set([...favorites, ...Object.keys(progress), ...Object.keys(notes)]), (id) => {
    const item = asRow(progress[id]);
    return {
      id, favorite: favorites.has(id),
      percent: item.done ? 100 : typeof item.p === 'number' ? Math.min(100, Math.max(0, item.p)) : 0,
      note: asText(notes[id]),
    };
  });
}

export function readPrayerStudy(records: ModuleRecord[]) {
  const archive = findSourceArchive(records, 'namaz-yolculugum', (payload) => typeof payload.study === 'object' && payload.study !== null);
  if (Array.isArray(archive.study)) {
    return archive.study.filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
      .map((id) => ({ id: String(id), status: 'done' as const }));
  }
  return Object.entries(asRow(archive.study)).flatMap(([id, status]) =>
    status === 'done' || status === 'practice' ? [{ id, status }] : []);
}

export const growthHabits = {
  quran: 'Kur’an-ı Kerim Tilaveti ve Tefsir',
  dhikr: 'Sabah / Akşam Zikirleri ve Vird',
  ethics: 'Günlük Ahlâk ve İrade Muhasebesi',
  family: 'Aile ve Sıla-i Rahim Teması',
  learning: 'İlim ve Okuma Faaliyeti',
};
