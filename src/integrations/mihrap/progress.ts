import type { ModuleRecord } from '../../core/types/entities';
import { MODULES } from './data/academyData';
import type { ProgressBackup } from './types/academy';

export const ACADEMY_MODULE_ID = 'mihrap-ve-minber';
export const ACADEMY_PROGRESS_TYPE = 'mihrap_academy_progress';
export const ACADEMY_BACKUP_TYPE = 'mihrap_academy_backup';
export const ACADEMY_ROUTE = '/modul/mihrap-ve-minber/akademi';
export const ACADEMY_SOURCE = 'https://github.com/ahmedozdemir99/Mihrap-ve-mimber/tree/93844a2f81d728a0bee39d65378890c6c83a87bc';

export interface LessonProgress {
  cardId: string;
  completed: boolean;
  note: string;
}

function mapValues<T>(value: unknown, accepts: (item: unknown) => item is T): Record<string, T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] =>
    /^[a-z0-9:-]{1,80}$/i.test(entry[0]) && accepts(entry[1])));
}

export function readAcademyBackup(payload: unknown): ProgressBackup | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, unknown>;
  if (!Number.isInteger(raw.version) || !raw.completed || typeof raw.completed !== 'object' || Array.isArray(raw.completed)) return null;
  return {
    version: Number(raw.version),
    dailyActivity: raw.dailyActivity as ProgressBackup['dailyActivity'],
    quizStats: raw.quizStats as ProgressBackup['quizStats'],
    completed: mapValues(raw.completed, (item): item is boolean => typeof item === 'boolean'),
    practiceChecks: mapValues(raw.practiceChecks, (item): item is boolean => typeof item === 'boolean'),
    notes: mapValues(raw.notes, (item): item is string => typeof item === 'string'),
  };
}

export function combinedAcademyProgress(records: ModuleRecord[]) {
  const source = records
    .filter((entry) => entry.moduleId === ACADEMY_MODULE_ID && !entry.isArchived);
  const backup = source.find((entry) =>
    entry.entityType === ACADEMY_BACKUP_TYPE ||
    (entry.entityType === 'imported_record' && readAcademyBackup(entry.payload)));
  const imported = readAcademyBackup(backup?.payload);
  const notes = { ...imported?.notes };
  const result: ProgressBackup = { ...imported, version: 5, completed: { ...imported?.completed }, notes };
  const local = new Map<string, ModuleRecord<LessonProgress>>();
  for (const entry of source) {
    if (entry.entityType !== ACADEMY_PROGRESS_TYPE) continue;
    const record = entry as ModuleRecord<LessonProgress>;
    const id = record.payload?.cardId;
    if (id && (!local.has(id) || local.get(id)!.updatedAt < record.updatedAt)) local.set(id, record);
  }
  for (const course of MODULES) for (const [index, card] of course.cards.entries()) {
    const entry = local.get(card.id);
    if (!entry) continue;
    result.completed[`${course.index}:${index}`] = entry.payload.completed;
    notes[card.id] = entry.payload.note;
  }
  return { result, local };
}
