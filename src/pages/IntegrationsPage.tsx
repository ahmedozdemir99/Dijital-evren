import { useState } from 'react';
import { Activity, Check, Link2, Power, Upload } from 'lucide-react';
import { getCenterById, getModuleById } from '../core/registry/modules';
import { isSafeHttpUrl, parseCsvBooks } from '../core/services/integrationService';
import type { ExternalAppConfig, IntegrationMethod } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

const METHOD_LABELS: Record<IntegrationMethod, string> = {
  none: 'Yapılandırılmadı',
  external_link: 'Harici Uygulama Bağlantısı',
  api: 'API Entegrasyonu',
  file_import: 'JSON veya CSV İçe Aktarma',
  db_adapter: 'Veri Tabanı Adaptörü',
  gradual_migration: 'Yerel Modüle Aşamalı Taşıma',
};

const STATUS_LABELS: Record<ExternalAppConfig['status'], string> = {
  not_configured: 'Bağlı Değil',
  ready_for_import: 'İçe Aktarmaya Hazır',
  configured: 'Yapılandırıldı',
};

export function IntegrationsPage() {
  const {
    externalApps,
    updateExternalApp,
    importBooksBulk,
    addQuote,
    addModuleRecord,
  } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMethodChange = async (app: ExternalAppConfig, method: IntegrationMethod) => {
    const targetUrl = app.apiUrl || app.liveUrl || app.endpointOrUrl;
    await updateExternalApp({
      ...app,
      method,
      status:
        method === 'none'
          ? 'not_configured'
          : method === 'file_import'
            ? 'ready_for_import'
            : targetUrl.trim()
              ? 'configured'
              : 'not_configured',
    });
  };

  const handleToggleDisabled = async (app: ExternalAppConfig) => {
    await updateExternalApp({
      ...app,
      disabled: !app.disabled,
    });
  };

  const handleSaveEndpoint = async (
    app: ExternalAppConfig,
    patch: {
      endpointOrUrl: string;
      repoUrl: string;
      liveUrl: string;
      apiUrl: string;
      fieldMapping: string;
      notes: string;
    }
  ) => {
    const urlFields = [patch.repoUrl, patch.liveUrl, patch.apiUrl]
      .map((u) => u.trim())
      .filter(Boolean);
    if (urlFields.some((u) => !isSafeHttpUrl(u))) {
      setErrorMsg('Depo, canlı veya API adresleri yalnızca geçerli http:// veya https:// URL biçiminde olabilir.');
      return;
    }

    const primary = (patch.apiUrl || patch.liveUrl || patch.endpointOrUrl).trim();
    await updateExternalApp({
      ...app,
      endpointOrUrl: patch.endpointOrUrl.trim(),
      repoUrl: patch.repoUrl.trim() || undefined,
      liveUrl: patch.liveUrl.trim() || undefined,
      apiUrl: patch.apiUrl.trim() || undefined,
      fieldMapping: patch.fieldMapping.trim() || undefined,
      notes: patch.notes.trim() || undefined,
      status:
        app.method === 'file_import'
          ? 'ready_for_import'
          : primary && app.method !== 'none'
            ? 'configured'
            : 'not_configured',
    });
    setEditingId(null);
    setErrorMsg(null);
    setFeedback(`${app.name} entegrasyon ayarları güncellendi.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTestConnection = async (app: ExternalAppConfig) => {
    const targetUrl = (app.apiUrl || app.liveUrl || app.endpointOrUrl).trim();
    const now = new Date().toISOString();

    if (!targetUrl || !isSafeHttpUrl(targetUrl)) {
      const msg = 'Test edilecek geçerli bir http:// veya https:// URL adresi tanımlı değil.';
      await updateExternalApp({
        ...app,
        lastTestAt: now,
        lastTestMessage: msg,
        errorHistory: [{ timestamp: now, message: msg }, ...(app.errorHistory ?? [])].slice(0, 5),
      });
      setErrorMsg(`${app.name}: ${msg}`);
      return;
    }

    setTestingId(app.appId);
    setErrorMsg(null);
    setFeedback(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(targetUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      const msg = res.ok
        ? `Bağlantı doğrulandı (HTTP ${res.status}).`
        : `Sunucu yanıtı: HTTP ${res.status}.`;
      await updateExternalApp({
        ...app,
        lastTestAt: now,
        lastTestMessage: msg,
        errorHistory: res.ok
          ? app.errorHistory
          : [{ timestamp: now, message: msg }, ...(app.errorHistory ?? [])].slice(0, 5),
      });
      if (res.ok) setFeedback(`${app.name}: ${msg}`);
      else setErrorMsg(`${app.name}: ${msg}`);
    } catch (err) {
      const reason =
        err instanceof Error
          ? `Bağlantı başarısız (${err.message} — CORS veya erişim engeli olabilir).`
          : 'Bağlantı kurulamadı.';
      await updateExternalApp({
        ...app,
        lastTestAt: now,
        lastTestMessage: reason,
        errorHistory: [{ timestamp: now, message: reason }, ...(app.errorHistory ?? [])].slice(0, 5),
      });
      setErrorMsg(`${app.name}: ${reason}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleFileImport = async (app: ExternalAppConfig, file: File) => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      const content = await file.text();
      if (app.appId === 'dijital-kutuphanem') {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const parsed = parseCsvBooks(content);
          if (parsed.length === 0) {
            throw new Error('CSV dosyasında geçerli kitap satırı bulunamadı.');
          }
          const count = await importBooksBulk(parsed);
          await updateExternalApp({ ...app, lastSyncAt: new Date().toISOString() });
          setFeedback(`${count} kitap Dijital Kütüphanem modülüne aktarıldı.`);
        } else {
          const json = JSON.parse(content);
          const list = Array.isArray(json) ? json : Array.isArray(json.books) ? json.books : [];
          const normalized = list
            .filter((b: Record<string, unknown>) => typeof b?.title === 'string')
            .map((b: Record<string, unknown>) => ({
              title: String(b.title),
              author: String(b.author || 'Bilinmeyen Yazar'),
              category: String(b.category || 'Genel'),
              status: 'okunacak' as const,
              totalPages: Math.max(1, Number(b.totalPages) || 200),
              currentPage: Math.max(0, Number(b.currentPage) || 0),
              isDemo: false,
            }));
          if (normalized.length === 0) {
            throw new Error('JSON dosyasında geçerli kitap kaydı bulunamadı.');
          }
          const count = await importBooksBulk(normalized);
          await updateExternalApp({ ...app, lastSyncAt: new Date().toISOString() });
          setFeedback(`${count} kitap JSON dosyasından içe aktarıldı.`);
        }
      } else if (app.appId === 'alinti-defterim') {
        const json = JSON.parse(content);
        const list = Array.isArray(json) ? json : Array.isArray(json.quotes) ? json.quotes : [];
        let imported = 0;
        for (const q of list) {
          if (typeof q?.text === 'string' && q.text.trim()) {
            await addQuote({
              text: q.text.trim(),
              author: String(q.author || 'Bilinmeyen'),
              sourceTitle: String(q.sourceTitle || 'İçe Aktarılan Kayıt'),
              pageNumber: q.pageNumber ? String(q.pageNumber) : undefined,
              tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
              isFavorite: Boolean(q.isFavorite),
              isDemo: false,
            });
            imported++;
          }
        }
        if (imported === 0) {
          throw new Error('JSON dosyasında geçerli alıntı kaydı bulunamadı.');
        }
        await updateExternalApp({ ...app, lastSyncAt: new Date().toISOString() });
        setFeedback(`${imported} alıntı Alıntı Defterim modülüne aktarıldı.`);
      } else {
        const parsed = JSON.parse(content);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const targetDomain = getModuleById(app.targetModuleId)?.privacyDomain ?? 'genel';
        let imported = 0;
        for (const item of list) {
          if (!item || typeof item !== 'object') continue;
          const obj = item as Record<string, unknown>;
          const title = String(obj.title || obj.name || `${app.name} Kaydı`).trim();
          await addModuleRecord({
            moduleId: app.targetModuleId,
            entityType: 'imported_record',
            title,
            subtitle: obj.subtitle ? String(obj.subtitle) : `${app.name} İçe Aktarım`,
            category: String(obj.category || 'Harici Aktarım'),
            tags: Array.isArray(obj.tags) ? obj.tags.map(String) : ['harici-aktarim'],
            isFavorite: false,
            isArchived: false,
            privacyDomain: targetDomain,
            payload: obj,
          });
          imported++;
        }
        if (imported === 0) throw new Error('JSON dosyasında içe aktarılabilir kayıt bulunamadı.');
        await updateExternalApp({ ...app, lastSyncAt: new Date().toISOString() });
        setFeedback(`${imported} kayıt ${app.name} hedef modülüne aktarıldı.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Dosya içe aktarılamadı.';
      const now = new Date().toISOString();
      await updateExternalApp({
        ...app,
        errorHistory: [{ timestamp: now, message: msg }, ...(app.errorHistory ?? [])].slice(0, 5),
      });
      setErrorMsg(msg);
    }
  };

  const handleGitHubOneClickSync = async () => {
    setErrorMsg(null);
    setFeedback(null);
    const repos: Record<string, string> = {
  "dijital-kutuphanem": "https://github.com/ahmedozdemir99/Final-Kutuphanem",
  "alinti-defterim": "https://github.com/ahmedozdemir99/Al-nt-defterim",
  "sohbet-arsivi": "https://github.com/ahmedozdemir99/sohbet-arsivi",
  "siir-deryasi": "https://github.com/ahmedozdemir99/siir-deryasi",
  "automusicpro": "https://github.com/ahmedozdemir99/automusicprofinal",
  "tekamul-yolunda": "https://github.com/ahmedozdemir99/Tek-mul-Yolunda",
  "mihrap-ve-minber": "https://github.com/ahmedozdemir99/Mihrap-ve-mimber",
  "namaz-yolculugum": "https://github.com/ahmedozdemir99/namaz-yolculugum",
  "bizbize-riders": "https://github.com/ahmedozdemir99/Bizbize-Riders",
  "bugun-ne-yesem": "https://github.com/ahmedozdemir99/bugun-ne-yesem",
  "karadeniz-asistani": "https://github.com/ahmedozdemir99/karadeniz-asistani"
};
    try {
      for (const app of externalApps) {
        if (!repos[app.appId]) continue;
        const fake = (url?: string) => Boolean(url && /dijital-evrenim\.(app|org)|github\.com\/dijital-evrenim\//.test(url));
        await updateExternalApp({
          ...app,
          repoUrl: repos[app.appId],
          apiUrl: fake(app.apiUrl) ? '' : app.apiUrl,
          liveUrl: fake(app.liveUrl) ? '' : app.liveUrl,
          endpointOrUrl: fake(app.endpointOrUrl) ? '' : app.endpointOrUrl,
          status: app.method === 'file_import' ? 'ready_for_import' : 'not_configured',
          lastTestMessage: 'Gerçek depo adresi kaydedildi; veri senkronizasyonu henüz yapılmadı.',
        });
      }
      setFeedback('GitHub depo adresleri kaydedildi. Veri aktarımı için gerçek API veya dışa aktarılmış dosya gerekir.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Depo adresleri kaydedilemedi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Mevcut Uygulama Entegrasyonları
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1 max-w-3xl">
            Daha önce geliştirilmiş mevcut projeleriniz için bağlantı, alan eşleme, gerçek zamanlı
            bağlantı testi ve aşamalı veri taşıma yönetim ekranı. Gerçek GitHub depo adreslerini tek tıkla kaydedin.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGitHubOneClickSync}
          className="h-10 inline-flex items-center gap-2 px-4 text-xs font-medium rounded-xl bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 shadow-sm whitespace-nowrap shrink-0"
        >
          <Link2 className="w-4 h-4" />
          <span>GitHub Depolarını Bağla</span>
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {externalApps
          .filter((app) => Boolean(getModuleById(app.targetModuleId)))
          .map((app) => {
          const center = getCenterById(app.centerId);
          const isEditing = editingId === app.appId;

          return (
            <div
              key={app.appId}
              className={`p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4 ${
                app.disabled ? 'opacity-65' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                    <span
                      className="w-2 h-2 rounded-[2px]"
                      style={{ backgroundColor: center?.color ?? '#D6B782' }}
                      aria-hidden="true"
                    />
                    <span>{center?.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{app.disabled ? 'Devre Dışı' : STATUS_LABELS[app.status]}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-1">
                    {app.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleDisabled(app)}
                    title={app.disabled ? 'Entegrasyonu etkinleştir' : 'Entegrasyonu devre dışı bırak'}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5] shrink-0"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <Link2 className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Entegrasyon Yöntemi
                </label>
                <select
                  value={app.method}
                  disabled={app.disabled}
                  onChange={(e) => handleMethodChange(app, e.target.value as IntegrationMethod)}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  {(Object.keys(METHOD_LABELS) as IntegrationMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              {(app.repoUrl || app.liveUrl || app.apiUrl || app.endpointOrUrl) && (
                <div className="text-[11px] text-[#546070] dark:text-[#9BA7B6] space-y-0.5 break-all">
                  {app.repoUrl && <p>Repo: {app.repoUrl}</p>}
                  {app.liveUrl && <p>Canlı: {app.liveUrl}</p>}
                  {(app.apiUrl || app.endpointOrUrl) && <p>API / Yol: {app.apiUrl || app.endpointOrUrl}</p>}
                  {app.fieldMapping && <p>Alan Eşleme: {app.fieldMapping}</p>}
                </div>
              )}

              {app.notes && (
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{app.notes}</p>
              )}

              {isEditing ? (
                <EndpointEditor
                  app={app}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => handleSaveEndpoint(app, patch)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(app.appId)}
                      className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      Yapılandır
                    </button>
                    <button
                      type="button"
                      disabled={app.disabled || testingId === app.appId}
                      onClick={() => handleTestConnection(app)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 whitespace-nowrap shrink-0"
                    >
                      <Activity className="w-3.5 h-3.5 shrink-0" />
                      <span>{testingId === app.appId ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
                    </button>
                  </div>

                  {!app.disabled && app.method === 'file_import' && (
                    <label className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>JSON/CSV İçe Aktar</span>
                      <input
                        type="file"
                        accept=".json,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileImport(app, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="space-y-1 text-[11px] text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                {app.lastSyncAt && (
                  <p>Son aktarım: {new Date(app.lastSyncAt).toLocaleString('tr-TR')}</p>
                )}
                {app.lastTestMessage && (
                  <p>Son test: {app.lastTestMessage}</p>
                )}
                {app.errorHistory && app.errorHistory.length > 0 && (
                  <details className="pt-1">
                    <summary className="cursor-pointer text-amber-600 dark:text-amber-400">
                      Hata / Test Geçmişi ({app.errorHistory.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {app.errorHistory.map((h, i) => (
                        <li key={i}>
                          {new Date(h.timestamp).toLocaleTimeString('tr-TR')}: {h.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EndpointEditor({
  app,
  onSave,
  onCancel,
}: {
  app: ExternalAppConfig;
  onSave: (patch: {
    endpointOrUrl: string;
    repoUrl: string;
    liveUrl: string;
    apiUrl: string;
    fieldMapping: string;
    notes: string;
  }) => void;
  onCancel: () => void;
}) {
  const [endpointOrUrl, setEndpointOrUrl] = useState(app.endpointOrUrl);
  const [repoUrl, setRepoUrl] = useState(app.repoUrl ?? '');
  const [liveUrl, setLiveUrl] = useState(app.liveUrl ?? '');
  const [apiUrl, setApiUrl] = useState(app.apiUrl ?? '');
  const [fieldMapping, setFieldMapping] = useState(app.fieldMapping ?? '');
  const [notes, setNotes] = useState(app.notes ?? '');

  return (
    <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs">
      <input
        type="text"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="Depo (GitHub / Git) bağlantısı"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <input
        type="text"
        value={liveUrl}
        onChange={(e) => setLiveUrl(e.target.value)}
        placeholder="Canlı uygulama URL adresi"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <input
        type="text"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        placeholder="API uç noktası (bağlantı testinde kullanılır)"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <input
        type="text"
        value={endpointOrUrl}
        onChange={(e) => setEndpointOrUrl(e.target.value)}
        placeholder="Adaptör yolu veya yerel uç nokta"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <input
        type="text"
        value={fieldMapping}
        onChange={(e) => setFieldMapping(e.target.value)}
        placeholder="Alan eşleme (ör. title->baslik, author->yazar)"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notlar"
        className="w-full px-3 py-1.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 inline-flex items-center justify-center px-3 rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({ endpointOrUrl, repoUrl, liveUrl, apiUrl, fieldMapping, notes })
          }
          className="h-8 inline-flex items-center justify-center px-3.5 font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] whitespace-nowrap"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
