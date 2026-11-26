import { useState } from 'react';
import {
  Download,
  HelpCircle,
  History,
  Settings2,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { getCenterById, getModuleById } from '../../core/registry/modules';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface ModuleWorkbenchHeaderProps {
  moduleId: string;
  recordCount: number;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onImportRecords?: (records: Array<Partial<ModuleRecord>>) => Promise<void>;
  csvRows?: Array<Record<string, string | number>>;
  extraActions?: React.ReactNode;
}

export function ModuleWorkbenchHeader({
  moduleId,
  recordCount,
  primaryActionLabel,
  onPrimaryAction,
  onImportRecords,
  csvRows,
  extraActions,
}: ModuleWorkbenchHeaderProps) {
  const {
    moduleSettings,
    activityLogs,
    toggleModuleFavorite,
    updateModuleCustomSetting,
    exportBundle,
  } = useAppStore();

  const mod = getModuleById(moduleId);
  const center = mod ? getCenterById(mod.centerId) : undefined;
  const setting = moduleSettings.find((s) => s.moduleId === moduleId);
  const isFav = setting?.isFavorite ?? false;

  const [panel, setPanel] = useState<'none' | 'help' | 'history' | 'settings'>('none');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!mod) return null;

  const moduleLogs = activityLogs.filter((l) => l.moduleId === moduleId).slice(0, 15);
  const showDemo = (setting?.customSettings?.showDemo as boolean | undefined) ?? true;
  const compactView = (setting?.customSettings?.compactView as boolean | undefined) ?? false;

  const handleExportJson = async () => {
    const bundle = await exportBundle(moduleId);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}-yedek-${localDateIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Modül JSON yedeği indirildi.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleExportCsv = () => {
    if (!csvRows || csvRows.length === 0) return;
    const headers = Object.keys(csvRows[0]);
    const lines = [
      headers.join(','),
      ...csvRows.map((row) =>
        headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}-${localDateIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('CSV dosyası dışa aktarıldı.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleImportJson = async (file: File) => {
    if (!onImportRecords) return;
    try {
      const parsed = JSON.parse(await file.text());
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data?.moduleRecords)
          ? parsed.data.moduleRecords
          : [];
      if (items.length === 0) {
        setFeedback('İçe aktarılacak kayıt bulunamadı.');
        return;
      }
      await onImportRecords(items);
      setFeedback(`${items.length} kayıt içe aktarıldı.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('JSON dosyası okunamadı.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
            <span
              className="w-2.5 h-2.5 rounded-[2px] shrink-0"
              style={{ backgroundColor: center?.color ?? '#D6B782' }}
              aria-hidden="true"
            />
            <span className="font-medium" style={{ color: center?.color }}>
              {center?.name}
            </span>
            {mod.isDataOwner && (
              <>
                <span aria-hidden="true">·</span>
                <span>Veri Sahibi: {mod.isDataOwner}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{recordCount} kayıt</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            {mod.name}
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] max-w-2xl">
            {mod.shortDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {extraActions}

          <button
            type="button"
            onClick={() => toggleModuleFavorite(moduleId)}
            title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <Star
              className={`w-4 h-4 ${
                isFav ? 'text-[#D5B477] fill-[#D5B477]' : 'text-[#546070] dark:text-[#9BA7B6]'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setPanel((p) => (p === 'history' ? 'none' : 'history'))}
            title="Geçmiş işlemler"
            aria-label="Geçmiş işlemler"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <History className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6]" />
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            title="Modülü JSON olarak dışa aktar"
            aria-label="Modülü JSON olarak dışa aktar"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <Download className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6]" />
          </button>

          {csvRows && csvRows.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              CSV
            </button>
          )}

          {onImportRecords && (
            <label
              title="JSON içe aktar"
              aria-label="JSON içe aktar"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6]" />
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportJson(f);
                  e.target.value = '';
                }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => setPanel((p) => (p === 'settings' ? 'none' : 'settings'))}
            title="Modül ayarları"
            aria-label="Modül ayarları"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <Settings2 className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6]" />
          </button>

          <button
            type="button"
            onClick={() => setPanel((p) => (p === 'help' ? 'none' : 'help'))}
            title="Yardım ve kullanım rehberi"
            aria-label="Yardım ve kullanım rehberi"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C2633] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <HelpCircle className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6]" />
          </button>

          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="h-9 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="px-3.5 py-2 rounded-lg text-xs bg-[#93BF90]/15 border border-[#93BF90]/30">
          {feedback}
        </div>
      )}

      {panel !== 'none' && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {panel === 'help'
                ? `${mod.name} — Yardım ve Entegrasyon Rehberi`
                : panel === 'history'
                  ? 'Son Modül İşlemleri'
                  : 'Modül Görünüm Ayarları'}
            </h2>
            <button
              type="button"
              onClick={() => setPanel('none')}
              aria-label="Paneli kapat"
              className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {panel === 'help' && (
            <div className="text-xs text-[#546070] dark:text-[#9BA7B6] space-y-1.5">
              <p>
                <strong>Asli Görev:</strong> {mod.shortDescription}
              </p>
              <p>
                <strong>Gizlilik Alanı:</strong> {mod.privacyDomain} ·{' '}
                <strong>Beslediği Modüller:</strong>{' '}
                {mod.feedsInto.length > 0
                  ? mod.feedsInto.map((id) => getModuleById(id)?.name ?? id).join(', ')
                  : 'Yok'}
              </p>
              <p>
                <strong>Planlı Özellikler:</strong> {mod.plannedFeatures.join(' · ')}
              </p>
            </div>
          )}

          {panel === 'history' && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs text-[#546070] dark:text-[#9BA7B6]">
              {moduleLogs.length === 0 ? (
                <p>Bu modülde henüz işlem kaydı yok.</p>
              ) : (
                moduleLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{log.summary}</span>
                    <span className="tabular-nums shrink-0">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {panel === 'settings' && (
            <div className="flex flex-wrap gap-5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDemo}
                  onChange={(e) =>
                    updateModuleCustomSetting(moduleId, { showDemo: e.target.checked })
                  }
                />
                <span>Demo başlangıç kayıtlarını göster</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compactView}
                  onChange={(e) =>
                    updateModuleCustomSetting(moduleId, { compactView: e.target.checked })
                  }
                />
                <span>Sıkışık liste görünümü</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
