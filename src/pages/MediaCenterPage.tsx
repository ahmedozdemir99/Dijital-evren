import { isRetiredReference } from '../core/repositories/ecosystemRepository';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { getModuleById } from '../core/registry/modules';
import { isSafeDataUrl } from '../core/services/integrationService';
import type { AttachmentFile, PrivacyDomain } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

export function MediaCenterPage() {
  const { attachments, retiredEntityIds, addAttachment, deleteAttachment } = useAppStore();
  const [domainFilter, setDomainFilter] = useState<'all' | PrivacyDomain>('all');
  const [uploadDomain, setUploadDomain] = useState<PrivacyDomain>('genel');
  const [deleteTarget, setDeleteTarget] = useState<AttachmentFile | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      attachments.filter(
        (a) => domainFilter === 'all' || a.privacyDomain === domainFilter
      ),
    [attachments, domainFilter]
  );

  const totalBytes = attachments.reduce((s, a) => s + a.sizeBytes, 0);

  const handleUpload = async (file: File) => {
    setErrorMsg(null);
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Tarayıcı yerel depolama kotası nedeniyle dosya boyutu en fazla 2 MB olabilir.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result ?? '');
        if (!isSafeDataUrl(dataUrl)) {
          setErrorMsg(
            'Desteklenmeyen dosya biçimi. Güvenlik nedeniyle yalnızca PNG, JPG, WebP, GIF, PDF, TXT, CSV, JSON ve ses dosyaları yüklenebilir.'
          );
          return;
        }
        await addAttachment({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataUrl,
          privacyDomain: uploadDomain,
        });
        setFeedback(`"${file.name}" Medya Merkezine yüklendi.`);
        setTimeout(() => setFeedback(null), 2600);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Dosya yüklenemedi.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Ortak Dosya ve Medya Merkezi
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1 tabular-nums">
            Modüllere eklenen tüm görsel ve belgeler tek merkezde saklanır (≤ 2 MB/dosya). Toplam: {attachments.length} dosya · {(totalBytes / 1024).toFixed(1)} KB
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={uploadDomain}
            onChange={(e) => setUploadDomain(e.target.value as PrivacyDomain)}
            className="h-9 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
          >
            <option value="genel">Alan: Genel</option>
            <option value="kisisel">Alan: Kişisel</option>
            <option value="egitim">Alan: Eğitim</option>
            <option value="ibadet">Alan: İbadet</option>
          </select>

          <label className="h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] font-medium cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Dosya Yükle</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#93BF90]/15 border border-[#93BF90]/40">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-red-500/15 border border-red-500/40 text-red-400">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {(
          attachments.some((a) => a.privacyDomain === 'saglik')
            ? (['all', 'genel', 'kisisel', 'egitim', 'ibadet', 'saglik'] as const)
            : (['all', 'genel', 'kisisel', 'egitim', 'ibadet'] as const)
        ).map((dom) => (
          <button
            key={dom}
            type="button"
            onClick={() => setDomainFilter(dom)}
            className={`h-8 inline-flex items-center justify-center px-3 rounded-lg whitespace-nowrap ${
              domainFilter === dom
                ? 'bg-[#D6B782] text-[#10151E] font-medium'
                : 'bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10'
            }`}
          >
            {dom === 'all' ? 'Tümü' : dom}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-dashed border-black/15 dark:border-white/15 text-sm text-[#546070] dark:text-[#9BA7B6]">
          Henüz dosya yüklenmedi. Buradan veya herhangi bir modülün "Dosyalar" çubuğundan belge ekleyebilirsiniz.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((file) => {
            const safeUrl = isSafeDataUrl(file.dataUrl);
            const isImage = safeUrl && file.mimeType.startsWith('image/');
            return (
              <div
                key={file.id}
                className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
              >
                {isImage && (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-full h-36 object-cover rounded-lg border border-black/10 dark:border-white/10"
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1.5 truncate">
                      {isImage ? (
                        <ImageIcon className="w-4 h-4 text-[#88B4FF] shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#D6B782] shrink-0" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </p>
                    <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                      {Math.round(file.sizeBytes / 1024)} KB · Alan: {file.privacyDomain}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {safeUrl && (
                      <a
                        href={file.dataUrl}
                        download={file.name}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                        title="İndir"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(file)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {file.linkedRefs.some((ref) => !isRetiredReference(ref.moduleId, ref.entityId, retiredEntityIds)) && (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1 text-[11px]">
                    <p className="text-[#546070] dark:text-[#9BA7B6] flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Bağlı Kayıtlar:
                    </p>
                    {file.linkedRefs.filter((ref) => !isRetiredReference(ref.moduleId, ref.entityId, retiredEntityIds)).map((ref) => (
                      <Link
                        key={ref.entityId}
                        to={`/modul/${ref.moduleId}?recordId=${ref.entityId}`}
                        className="block text-[#71C6BD] hover:underline truncate"
                      >
                        {ref.label} ({getModuleById(ref.moduleId)?.name ?? ref.moduleId})
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dosyayı Sil"
        description={`"${deleteTarget?.name}" dosyasını Medya Merkezinden kalıcı olarak silmek istiyor musunuz?`}
        confirmLabel="Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteAttachment(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
