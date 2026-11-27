import { useMemo } from 'react';
import { useAppStore } from './useAppStore';

export function useModuleStore() {
  const state = useAppStore();
  const moduleRecords = useMemo(() => state.moduleRecords.filter((record) =>
    record.entityType !== 'imported_record' && record.entityType !== 'module_study'), [state.moduleRecords]);
  return { ...state, moduleRecords };
}
