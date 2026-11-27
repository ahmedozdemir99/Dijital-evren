import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { CloudBackupPanel } from '../components/shared/CloudBackupPanel';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ApplicationBackupSettings } from '../integrations/shared/ApplicationBackupSettings';
import {
  CURRENT_SCHEMA_VERSION,
} from '../core/repositories/ecosystemRepository';
import { MODULES } from '../core/registry/modules';
import { localDateIso } from '../core/services/integrationService';
import type { ExportBundle, PrivacyDomain, ThemePreference } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const {
    profile,
    preferences,
    moduleSettings,
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    quickNotes,
    moduleRecords,
    retiredEntityIds,
    collections,
    attachments,
    activityLogs,
    updateProfile,
    updatePreferences,
    setTheme,
    toggleModuleEnabled,
    reorderModule,
    exportBundle,
    importBundle,
    clearDemoData,
    resetAllData,
  } = useAppStore();

  const [fullName, setFullName] = useState(profile.fullName);
  const [title, setTitle] = useState(profile.title);
  const [bio, setBio] = useState(profile.bio);
  const [dailyThought, setDailyThought] = useState(preferences.dailyThoughtCustom ?? '');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'clear_demo' | 'reset_all' | null>(null);
  const [pendingRestore, setPendingRestore] = useState<ExportBundle | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [exportScope, setExportScope] = useState<string>('full');
  const [serverStatus, setServerStatus] = useState<{ status: string; aiConfigured: boolean } | null>(
    null
  );

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerStatus({ status: d.status, aiConfigured: Boolean(d.aiConfigured) }))
      .catch(() => setServerStatus(null));
  }, []);

  const notify = (msg: string) => {
    setErrorMsg(null);
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      fullName: fullName.trim() || 'Kullanıcı',
      title: title.trim(),
      bio: bio.trim(),
    });
    await updatePreferences({ dailyThoughtCustom: dailyThought.trim() || undefined });
    notify('Profil ve kişisel ayarlar kaydedildi.');
  };

  const handleExport = async (overrideScope?: string) => {
    const scopeToUse = overrideScope ?? exportScope;
    const bundle = await exportBundle(scopeToUse);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dijital-evrenim-${scopeToUse}-v${bundle.schemaVersion}-${localDateIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const label =
      scopeToUse === 'full'
        ? 'Tam Ekosistem'
        : scopeToUse === 'legacy_archive'
          ? 'Kapsam Dışı Modül Arşivi'
          : scopeToUse;
    notify(`Şema v${bundle.schemaVersion} yedeği (${label}) dışa aktarıldı.`);
  };

  const handlePrepareRestore = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as ExportBundle;
      if (parsed.app !== 'Dijital Evrenim' || !parsed.data) {
        throw new Error('Geçersiz Dijital Evrenim yedek dosyası.');
      }
      setPendingRestore(parsed);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Yedek dosyası okunamadı.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    try {
      await importBundle(pendingRestore, restoreMode);
      const schemaVer = pendingRestore.schemaVersion;
      setPendingRestore(null);
      notify(
        `Yedek ${restoreMode === 'replace' ? 'üzerine yazılarak' : 'mevcut verilerle birleştirilerek'} geri yüklendi (Şema v${schemaVer}).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Yedek geri yüklenemedi.');
    }
  };

  const orderedModules = [...MODULES].sort((a, b) => {
    const sa = moduleSettings.find((s) => s.moduleId === a.id);
    const sb = moduleSettings.find((s) => s.moduleId === b.id);
    return (sa?.sortOrder ?? 999) - (sb?.sortOrder ?? 999);
  });

  const handleMoveModule = async (moduleId: string, dir: -1 | 1) => {
    await reorderModule(moduleId, dir);
    const modName = MODULES.find((m) => m.id === moduleId)?.name ?? moduleId;
    notify(`${modName} sıralama önceliği güncellendi.`);
  };

  const demoCount =
    books.filter((b) => b.isDemo).length +
    quotes.filter((q) => q.isDemo).length +
    knowledgeNodes.filter((n) => n.isDemo).length +
    moduleRecords.filter((r) => r.isDemo).length;

  const legacyRecordsCount = retiredEntityIds.size;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
          Ayarlar, Erişilebilirlik ve Veri Güvenliği
        </h1>
        <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
          Profil, görünüm, erişilebilirlik, takvim tercihi, gizlilik sınırları, yedekleme ve sistem durumu.
        </p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#93BF90]/15 border border-[#93BF90]/30 text-sm">
          <Check className="w-4 h-4 text-[#93BF90] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* 1. Profil ve Günün Düşüncesi */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4"
      >
        <h2 className="text-xl font-semibold">Profil ve Kişisel Tercihler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
              Ad Soyad / Hitap
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
              Unvan / Odak Alanı
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
            Kısa Tanıtım
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
        </div>
        <div>
          <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1">
            Sabit Günün Düşüncesi (Boş bırakılırsa günlük otomatik seçilir)
          </label>
          <input
            type="text"
            value={dailyThought}
            onChange={(e) => setDailyThought(e.target.value)}
            placeholder="Kendi seçtiğiniz bir ilke veya cümle..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="h-9 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap"
          >
            Profili Kaydet
          </button>
        </div>
      </form>

      {/* 2. Görünüm, Erişilebilirlik ve Takvim */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
        <h2 className="text-xl font-semibold">Görünüm, Erişilebilirlik ve Takvim</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1.5">
              Tema Seçimi
            </label>
            <div className="h-10 flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#10151E]">
              {(['dark', 'light', 'system'] as ThemePreference[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex-1 h-8 inline-flex items-center justify-center text-xs font-medium rounded-md whitespace-nowrap ${
                    preferences.theme === t
                      ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                      : 'text-[#546070] dark:text-[#9BA7B6]'
                  }`}
                >
                  {t === 'dark' ? 'Koyu' : t === 'light' ? 'Açık' : 'Sistem'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1.5">
              Yazı Boyutu
            </label>
            <div className="h-10 flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#10151E]">
              {(['normal', 'large'] as const).map((fs) => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => updatePreferences({ fontScale: fs })}
                  className={`flex-1 h-8 inline-flex items-center justify-center text-xs font-medium rounded-md whitespace-nowrap ${
                    (preferences.fontScale ?? 'normal') === fs
                      ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                      : 'text-[#546070] dark:text-[#9BA7B6]'
                  }`}
                >
                  {fs === 'normal' ? 'Standart' : 'Büyük'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#546070] dark:text-[#9BA7B6] mb-1.5">
              Takvim Haftanın İlk Günü
            </label>
            <select
              value={preferences.calendarFirstDay ?? 'monday'}
              onChange={(e) =>
                updatePreferences({ calendarFirstDay: e.target.value as 'monday' | 'sunday' })
              }
              className="w-full h-10 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="monday">Pazartesi</option>
              <option value="sunday">Pazar</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(preferences.highContrast)}
              onChange={(e) => updatePreferences({ highContrast: e.target.checked })}
            />
            <span>Yüksek kontrast modu</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(preferences.reducedMotion)}
              onChange={(e) => updatePreferences({ reducedMotion: e.target.checked })}
            />
            <span>Hareketi azalt (Reduced Motion)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
            />
            <span>Sistem bildirimlerini göster</span>
          </label>
        </div>
      </section>

      {/* 3. Veri Paylaşım İzinleri & Yapay Zekâ Sınırları */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Veri Paylaşım İzinleri ve Yapay Zekâ</h2>
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
            Kişisel, eğitim ve ibadet alanları arasında kesin erişim sınırları tanımlayın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.crossModuleSharing.allowSearchInPrivateDomains}
              onChange={(e) =>
                updatePreferences({
                  crossModuleSharing: {
                    ...preferences.crossModuleSharing,
                    allowSearchInPrivateDomains: e.target.checked,
                  },
                })
              }
              className="mt-1"
            />
            <span>Evrensel aramada kişisel alan kayıtlarını dahil et</span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.crossModuleSharing.allowPersonalFromPrayerSummary}
              onChange={(e) =>
                updatePreferences({
                  crossModuleSharing: {
                    ...preferences.crossModuleSharing,
                    allowPersonalFromPrayerSummary: e.target.checked,
                  },
                })
              }
              className="mt-1"
            />
            <span>Namaz Yolculuğum özetlerini Şahsiyet ve Tekâmül’e yansıt</span>
          </label>
        </div>

        <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.aiAssistantEnabled}
                onChange={(e) => updatePreferences({ aiAssistantEnabled: e.target.checked })}
              />
              <span>Evren Asistanı (Yapay Zekâ Paneli) Etkin</span>
            </label>
            <span className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Sunucu AI durumu:{' '}
              {serverStatus?.aiConfigured ? 'Yapılandırılmış' : 'Yapılandırılmamış (İsteğe Bağlı)'}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#546070] dark:text-[#9BA7B6]">
            {(['genel', 'kisisel', 'egitim', 'ibadet'] as PrivacyDomain[]).map((dom) => (
              <label key={dom} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.aiPermittedDomains[dom]}
                  onChange={(e) =>
                    updatePreferences({
                      aiPermittedDomains: {
                        ...preferences.aiPermittedDomains,
                        [dom]: e.target.checked,
                      },
                    })
                  }
                />
                <span>Asistan erişimi: {dom}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Modül Görünürlüğü ve Sıralaması */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Modül Görünürlüğü ({MODULES.length} Modül)</h2>
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Kullanmadığınız modülleri devre dışı bırakarak menüyü sadeleştirebilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {orderedModules.map((m, idx) => {
            const enabled = moduleSettings.find((s) => s.moduleId === m.id)?.enabled ?? true;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs"
              >
                <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleModuleEnabled(m.id)}
                  />
                  <span className="truncate">{m.name}</span>
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveModule(m.id, -1)}
                    aria-label={`${m.name} yukarı`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedModules.length - 1}
                    onClick={() => handleMoveModule(m.id, 1)}
                    aria-label={`${m.name} aşağı`}
                    className="h-7 w-7 inline-flex items-center justify-center rounded opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CloudBackupPanel />

      {/* 5. Yedekleme, Geri Yükleme ve Veri Silme */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Yedekleme, Geri Yükleme ve Sistem Durumu</h2>
          <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 tabular-nums">
            Depolama: IndexedDB (Yerel) · Şema Sürümü: v{CURRENT_SCHEMA_VERSION} · Kayıtlar:{' '}
            {books.length} kitap, {quotes.length} alıntı, {knowledgeNodes.length} düğüm,{' '}
            {moduleRecords.length} modül kaydı
            {legacyRecordsCount > 0 ? ` (+${legacyRecordsCount} kapsam dışı arşiv)` : ''},{' '}
            {collections.length} koleksiyon, {attachments.length} dosya,{' '}
            {entityRelations.length} ilişki, {quickNotes.length} not, {activityLogs.length} etkinlik
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value)}
            aria-label="Dışa aktarma kapsamı"
            className="h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          >
            <option value="full">Tam Ekosistem Yedeği</option>
            <option value="legacy_archive">Kapsam Dışı Modül Arşivi</option>
            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                Sadece: {m.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleExport()}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Yedeği İndir (JSON)</span>
          </button>

          {legacyRecordsCount > 0 && (
            <button
              type="button"
              onClick={() => handleExport('legacy_archive')}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Eski Modül Arşivini İndir ({legacyRecordsCount})</span>
            </button>
          )}

          <label className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Yedekten Geri Yükle</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePrepareRestore(f);
                e.target.value = '';
              }}
            />
          </label>

          {demoCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmAction('clear_demo')}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Örnek Demo Kayıtlarını Temizle ({demoCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmAction('reset_all')}
            className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 sm:ml-auto whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Tüm Verileri Sıfırla</span>
          </button>
        </div>

        <ApplicationBackupSettings />

        {/* Restore Preview Panel */}
        {pendingRestore && (
          <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] border border-[#8C6B32]/40 dark:border-[#D6B782]/40 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm">Yedek Geri Yükleme Önizlemesi</strong>
              <span className="font-mono">
                Şema v{pendingRestore.schemaVersion} · {new Date(pendingRestore.exportedAt).toLocaleString('tr-TR')}
              </span>
            </div>
            <p className="text-[#546070] dark:text-[#9BA7B6] tabular-nums">
              İçerik: {pendingRestore.data.books?.length ?? 0} kitap · {pendingRestore.data.quotes?.length ?? 0} alıntı ·{' '}
              {pendingRestore.data.knowledgeNodes?.length ?? 0} bilgi ağı düğümü ·{' '}
              {pendingRestore.data.moduleRecords?.length ?? 0} modül kaydı ·{' '}
              {pendingRestore.data.collections?.length ?? 0} koleksiyon
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                />
                <span>Mevcut verilerle birleştir (önerilen)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'replace'}
                  onChange={() => setRestoreMode('replace')}
                />
                <span>Mevcut verilerin tamamını değiştir</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="h-8 inline-flex items-center justify-center px-3 rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="h-8 inline-flex items-center justify-center px-4 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] font-medium whitespace-nowrap"
              >
                Geri Yüklemeyi Onayla
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-black/10 dark:border-white/10 text-xs text-[#546070] dark:text-[#9BA7B6] space-y-1">
          <p className="font-semibold text-[#141923] dark:text-[#F1F3F5]">Sistem Bilgisi ve Sürüm Notları</p>
          <p>
            {MODULES.length} entegre modül. Kapsam dışı kayıtları arşiv yedeği olarak indirebilirsiniz.
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={confirmAction === 'clear_demo'}
        title="Demo Verilerini Temizle"
        description="Başlangıçta eklenen örnek demo kitap, alıntı, düğüm ve modül kayıtları silinecek; sizin oluşturduğunuz gerçek kayıtlar korunacaktır."
        confirmLabel="Demo Kayıtları Sil"
        destructive
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          await clearDemoData();
          setConfirmAction(null);
          notify('Örnek demo kayıtları temizlendi.');
        }}
      />

      <ConfirmDialog
        open={confirmAction === 'reset_all'}
        title="Tüm Verileri Kalıcı Olarak Sıfırla"
        description="Yerel depodaki tüm kitaplar, alıntılar, modül kayıtları, bilgi ağı düğümleri ve ayarlar kalıcı olarak silinecektir. Bu işlem geri alınamaz."
        confirmLabel="Evet, Her Şeyi Sıfırla"
        destructive
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          await resetAllData();
          setConfirmAction(null);
          notify('Tüm yerel veriler sıfırlandı.');
        }}
      />
    </div>
  );
}
