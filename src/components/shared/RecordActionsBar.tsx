import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Link2, Network, Paperclip, X } from 'lucide-react';
import { MODULES } from '../../core/registry/modules';
import { getRecordRoute, getRelationsForEntity, isSafeDataUrl } from '../../core/services/integrationService';
import type { KnowledgeNodeType, PrivacyDomain, RelationType } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface RecordActionsBarProps {
  moduleId: string;
  entityId: string;
  entityType: string;
  entityLabel: string;
  privacyDomain: PrivacyDomain;
  nodeType?: KnowledgeNodeType;
  summary?: string;
}

export function RecordActionsBar({
  moduleId,
  entityId,
  entityType,
  entityLabel,
  privacyDomain,
  nodeType = 'kavram',
  summary = '',
}: RecordActionsBarProps) {
  const {
    entityRelations,
    moduleRecords,
    collections,
    attachments,
    knowledgeNodes,
    ensureEntityNode,
    linkEntities,
    deleteRelation,
    addItemToCollection,
    addAttachment,
    linkAttachmentToRef,
  } = useAppStore();

  const [openDrawer, setOpenDrawer] = useState<'none' | 'relation' | 'collection' | 'file'>('none');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('iliskilidir');
  const [feedback, setFeedback] = useState<string | null>(null);

  const relations = getRelationsForEntity(entityId, entityRelations);
  const atlasNode = knowledgeNodes.find((node) => node.sourceModule === moduleId && node.sourceEntityId === entityId);
  const targets = knowledgeNodes.filter((node) => (node.sourceEntityId ?? node.id) !== entityId);
  const linkedAttachments = attachments.filter((a) =>
    a.linkedRefs.some((r) => r.entityId === entityId)
  );

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSendToAtlas = async () => {
    await ensureEntityNode({
      title: entityLabel,
      nodeType,
      summary: summary || `${entityType} · ${MODULES.find((m) => m.id === moduleId)?.name ?? moduleId}`,
      sourceModule: moduleId,
      sourceEntityId: entityId,
    });
    notify('Bilgi ağına eklendi.');
  };

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = targets.find((node) => node.id === targetNodeId);
    if (!target || relations.some((relation) =>
      relation.fromEntityId === entityId && relation.toEntityId === (target.sourceEntityId ?? target.id) &&
      relation.relationType === relationType)) return;
    await linkEntities({
      fromModule: moduleId,
      fromEntityId: entityId,
      fromEntityType: entityType,
      fromLabel: entityLabel,
      toModule: target.sourceModule,
      toEntityId: target.sourceEntityId ?? target.id,
      toEntityType: target.nodeType,
      toLabel: target.title,
      relationType,
    });
    setTargetNodeId('');
    notify('Modüller arası ilişki oluşturuldu.');
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      notify('Dosya en fazla 2 MB olabilir.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result ?? '');
        if (!isSafeDataUrl(dataUrl)) {
          notify('Desteklenmeyen dosya biçimi (yalnızca PNG/JPG/WebP/GIF, PDF, TXT, CSV, JSON veya ses).');
          return;
        }
        await addAttachment({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataUrl,
          privacyDomain,
          initialRef: { moduleId, entityId, label: entityLabel },
        });
        notify(`"${file.name}" dosyası eklendi.`);
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Dosya eklenemedi.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!atlasNode && <button
          type="button"
          onClick={handleSendToAtlas}
          className="h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
        >
          <Network className="w-3.5 h-3.5 text-[#71C6BD] shrink-0" />
          <span>Bilgi Ağına Ekle</span>
        </button>}

        <button
          type="button"
          onClick={() => setOpenDrawer((d) => (d === 'relation' ? 'none' : 'relation'))}
          className="h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
        >
          <Link2 className="w-3.5 h-3.5 text-[#88B4FF] shrink-0" />
          <span className="tabular-nums">İlişkiler ({relations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setOpenDrawer((d) => (d === 'collection' ? 'none' : 'collection'))}
          className="h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#D5B477] shrink-0" />
          <span>Koleksiyona Ekle</span>
        </button>

        <button
          type="button"
          onClick={() => setOpenDrawer((d) => (d === 'file' ? 'none' : 'file'))}
          className="h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
        >
          <Paperclip className="w-3.5 h-3.5 text-[#93BF90] shrink-0" />
          <span className="tabular-nums">Dosyalar ({linkedAttachments.length})</span>
        </button>
      </div>

      {feedback && (
        <p className="text-xs text-[#71C6BD]">{feedback}</p>
      )}

      {openDrawer === 'relation' && (
        <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Bağlı Kayıtlar ve Yeni İlişki</span>
            <button type="button" onClick={() => setOpenDrawer('none')}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {relations.map((relation) => {
            const incoming = relation.toEntityId === entityId;
            const id = incoming ? relation.fromEntityId : relation.toEntityId;
            const targetModule = incoming ? relation.fromModule : relation.toModule;
            const label = incoming ? relation.fromLabel : relation.toLabel;
            const record = moduleRecords.find((entry) => entry.id === id && entry.moduleId === targetModule);
            const isConcept = knowledgeNodes.some((node) => node.id === id && !node.sourceEntityId);
            const route = !isConcept && MODULES.some((module) => module.id === targetModule)
              ? getRecordRoute(targetModule, id, record?.entityType) : null;
            return <div key={relation.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0 break-words">
                <span className="text-[#546070] dark:text-[#9BA7B6]">{incoming ? 'Gelen' : 'Giden'} · {relation.relationType.replaceAll('_', ' ')} · </span>
                {route ? <Link className="underline" to={route}>{record?.title ?? label}</Link> : label}
              </div>
              <button type="button" onClick={() => deleteRelation(relation.id)} className="shrink-0 text-red-600 hover:underline dark:text-red-400">Kaldır</button>
            </div>;
          })}
          <form onSubmit={handleCreateRelation} className="flex flex-wrap items-center gap-2">
            <select
              value={targetNodeId}
              onChange={(e) => setTargetNodeId(e.target.value)}
              className="flex-1 min-w-[160px] h-8 px-2.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="">Bilgi ağından hedef seçin</option>
              {targets.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title} ({n.nodeType})
                </option>
              ))}
            </select>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
            >
              <option value="iliskilidir">İlişkilidir</option>
              <option value="kaynaklidir">Kaynaklıdır</option>
              <option value="besler">Besler</option>
              <option value="kavramlastirir">Kavramlaştırır</option>
              <option value="icerir">İçerir</option>
            </select>
            <button
              type="submit"
              disabled={!targetNodeId}
              className="h-8 inline-flex items-center justify-center px-3 rounded-lg bg-[#71C6BD] text-[#10151E] font-medium disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              Bağla
            </button>
          </form>
        </div>
      )}

      {openDrawer === 'collection' && (
        <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Koleksiyona Ekle</span>
            <Link to="/koleksiyonlar" className="text-[#8C6B32] dark:text-[#D6B782] hover:underline">
              Koleksiyonları Yönet
            </Link>
          </div>
          {collections.length === 0 ? (
            <p className="text-[#546070] dark:text-[#9BA7B6]">
              Henüz koleksiyon yok. Koleksiyonlar sayfasından oluşturabilirsiniz.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={async () => {
                    await addItemToCollection(c.id, {
                      moduleId,
                      entityId,
                      entityType,
                      label: entityLabel,
                    });
                    notify(`"${c.title}" koleksiyonuna eklendi.`);
                  }}
                  className="h-8 inline-flex items-center justify-center px-2.5 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                >
                  + {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openDrawer === 'file' && (
        <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold">İlişkili Dosya ve Medya</span>
            <Link to="/medya" className="text-[#8C6B32] dark:text-[#D6B782] hover:underline">
              Medya Merkezi
            </Link>
          </div>
          {linkedAttachments.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2">
              {isSafeDataUrl(f.dataUrl) ? (
                <a
                  href={f.dataUrl}
                  download={f.name}
                  className="text-[#71C6BD] hover:underline truncate"
                >
                  {f.name} ({Math.round(f.sizeBytes / 1024)} KB)
                </a>
              ) : (
                <span className="text-[#546070] truncate">{f.name}</span>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <label className="h-8 inline-flex items-center justify-center px-3 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] font-medium cursor-pointer whitespace-nowrap shrink-0">
              Yeni Dosya Ekle (≤ 2 MB)
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            {attachments.length > 0 && (
              <select
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await linkAttachmentToRef(e.target.value, {
                    moduleId,
                    entityId,
                    label: entityLabel,
                  });
                  notify('Mevcut dosya bu kayda bağlandı.');
                  e.target.value = '';
                }}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
              >
                <option value="">Mevcut dosyayı bağla...</option>
                {attachments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
