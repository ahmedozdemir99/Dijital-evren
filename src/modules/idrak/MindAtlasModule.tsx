import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Link2,
  Maximize2,
  Network,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { KnowledgeNode, KnowledgeNodeType, RelationType } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

const NODE_COLORS: Record<KnowledgeNodeType, string> = {
  kavram: '#71C6BD',
  kitap: '#D5B477',
  alinti: '#88B4FF',
  dusunce: '#B5A2EC',
  siir: '#93BF90',
  olay: '#DFA183',
};

const NODE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  kavram: 'Kavram',
  kitap: 'Kitap',
  alinti: 'Alıntı',
  dusunce: 'Düşünce',
  siir: 'Şiir',
  olay: 'Tarihî Olay',
};

export function MindAtlasModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    books,
    quotes,
    knowledgeNodes,
    entityRelations,
    recordModuleOpen,
    addKnowledgeNode,
    updateKnowledgeNode,
    deleteKnowledgeNode,
    linkEntities,
    deleteRelation,
    ensureEntityNode,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('zihin-atlasi');
  }, [recordModuleOpen]);

  const selectedNodeId = searchParams.get('nodeId') || knowledgeNodes[0]?.id || null;
  const selectedNode = knowledgeNodes.find((n) => n.id === selectedNodeId) ?? null;

  const [zoom, setZoom] = useState(1);
  const [filterType, setFilterType] = useState<'all' | KnowledgeNodeType>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Create node form
  const [showNewNode, setShowNewNode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<KnowledgeNodeType>('kavram');
  const [newSummary, setNewSummary] = useState('');
  const [newTags, setNewTags] = useState('');

  // Create relation form
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('iliskilidir');
  const [relationNote, setRelationNote] = useState('');

  // Import existing entity to graph
  const [entityToImport, setEntityToImport] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<KnowledgeNode | null>(null);

  const visibleNodes = useMemo(() => {
    if (filterType === 'all') return knowledgeNodes;
    return knowledgeNodes.filter((n) => n.nodeType === filterType);
  }, [knowledgeNodes, filterType]);

  // Map entityIds (both node.id and sourceEntityId) to graph node for edge rendering
  const nodeLookupByAnyId = useMemo(() => {
    const map = new Map<string, KnowledgeNode>();
    for (const node of knowledgeNodes) {
      map.set(node.id, node);
      if (node.sourceEntityId) {
        map.set(node.sourceEntityId, node);
      }
    }
    return map;
  }, [knowledgeNodes]);

  const renderedEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return entityRelations
      .map((rel) => {
        const fromNode = nodeLookupByAnyId.get(rel.fromEntityId);
        const toNode = nodeLookupByAnyId.get(rel.toEntityId);
        if (!fromNode || !toNode || fromNode.id === toNode.id) return null;
        if (!visibleIds.has(fromNode.id) || !visibleIds.has(toNode.id)) return null;
        return { rel, fromNode, toNode };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [entityRelations, nodeLookupByAnyId, visibleNodes]);

  const selectedRelations = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set([selectedNode.id, selectedNode.sourceEntityId].filter(Boolean) as string[]);
    return entityRelations.filter((r) => ids.has(r.fromEntityId) || ids.has(r.toEntityId));
  }, [selectedNode, entityRelations]);

  const getNodeCoords = (node: KnowledgeNode) => {
    if (draggingId === node.id && dragPos) return dragPos;
    return { x: node.x, y: node.y };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const viewWidth = 720 / zoom;
    const viewHeight = 460 / zoom;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * viewWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * viewHeight);
    setDragPos({
      x: Math.max(40, Math.min(viewWidth - 40, x)),
      y: Math.max(30, Math.min(viewHeight - 30, y)),
    });
  };

  const handlePointerUp = async () => {
    if (draggingId && dragPos) {
      await updateKnowledgeNode(draggingId, { x: dragPos.x, y: dragPos.y });
    }
    setDraggingId(null);
    setDragPos(null);
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const count = knowledgeNodes.length;
    const created = await addKnowledgeNode({
      title: newTitle.trim(),
      nodeType: newType,
      summary: newSummary.trim() || `${NODE_TYPE_LABELS[newType]} düğümü`,
      sourceModule: 'zihin-atlasi',
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      x: 160 + ((count * 97) % 400),
      y: 110 + ((count * 67) % 240),
      isDemo: false,
    });
    setNewTitle('');
    setNewSummary('');
    setNewTags('');
    setShowNewNode(false);
    setSearchParams({ nodeId: created.id });
  };

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !targetNodeId || targetNodeId === selectedNode.id) return;
    const target = knowledgeNodes.find((n) => n.id === targetNodeId);
    if (!target) return;

    await linkEntities({
      fromModule: selectedNode.sourceModule,
      fromEntityId: selectedNode.sourceEntityId ?? selectedNode.id,
      fromEntityType: selectedNode.nodeType,
      fromLabel: selectedNode.title,
      toModule: target.sourceModule,
      toEntityId: target.sourceEntityId ?? target.id,
      toEntityType: target.nodeType,
      toLabel: target.title,
      relationType,
      note: relationNote.trim() || undefined,
    });

    setTargetNodeId('');
    setRelationNote('');
  };

  const handleImportExistingEntity = async () => {
    if (!entityToImport) return;
    const [kind, id] = entityToImport.split(':');
    if (kind === 'book') {
      const book = books.find((b) => b.id === id);
      if (book) {
        const node = await ensureEntityNode({
          title: book.title,
          nodeType: 'kitap',
          summary: `${book.author} · Dijital Kütüphanem`,
          sourceModule: 'dijital-kutuphanem',
          sourceEntityId: book.id,
          tags: [book.category],
        });
        setSearchParams({ nodeId: node.id });
      }
    } else if (kind === 'quote') {
      const quote = quotes.find((q) => q.id === id);
      if (quote) {
        const node = await ensureEntityNode({
          title: quote.text.length > 48 ? `${quote.text.slice(0, 48)}…` : quote.text,
          nodeType: 'alinti',
          summary: `${quote.sourceTitle} · Alıntı Defterim`,
          sourceModule: 'alinti-defterim',
          sourceEntityId: quote.id,
          tags: quote.tags,
        });
        setSearchParams({ nodeId: node.id });
      }
    }
    setEntityToImport('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#71C6BD] font-medium">İdrak · Etkileşimli Bilgi Grafiği</p>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-0.5">
            Zihin Atlası
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
            Kitap, alıntı ve kavram düğümlerini kaynak kimlikleriyle birbirine bağlayın. Düğümleri
            sürükleyerek konumlandırabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewNode((v) => !v)}
          className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          {showNewNode ? 'Formu Kapat' : 'Yeni Kavram Düğümü'}
        </button>
      </div>

      {/* Add Node Form */}
      {showNewNode && (
        <form
          onSubmit={handleCreateNode}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-lg font-semibold">Yeni Bilgi / Kavram Düğümü</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Kavram veya başlık..."
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as KnowledgeNodeType)}
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="kavram">Kavram</option>
              <option value="dusunce">Düşünce</option>
              <option value="olay">Tarihî Olay</option>
              <option value="siir">Şiir</option>
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Etiketler (virgülle)"
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <input
            type="text"
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Kısa açıklama veya tanım..."
            className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewNode(false)}
              className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#71C6BD] text-[#10151E] whitespace-nowrap shrink-0"
            >
              Düğümü Ekle
            </button>
          </div>
        </form>
      )}

      {/* Toolbar: Filter + Import Book/Quote reference */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
          {(['all', 'kavram', 'kitap', 'alinti', 'dusunce'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                filterType === t
                  ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5]'
                  : 'text-[#546070] dark:text-[#9BA7B6]'
              }`}
            >
              {t === 'all' ? `Tümü (${knowledgeNodes.length})` : NODE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={entityToImport}
            onChange={(e) => setEntityToImport(e.target.value)}
            className="h-8 max-w-[260px] w-full sm:w-auto px-3 text-xs rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10"
          >
            <option value="">Kütüphane veya Alıntı referansı ekle...</option>
            {books.map((b) => (
              <option key={b.id} value={`book:${b.id}`}>
                Kitap: {b.title}
              </option>
            ))}
            {quotes.map((q) => (
              <option key={q.id} value={`quote:${q.id}`}>
                Alıntı: {q.text.slice(0, 42)}…
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!entityToImport}
            onClick={handleImportExistingEntity}
            className="h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
          >
            Grafiğe Al
          </button>
        </div>
      </div>

      {/* Interactive Graph + Side Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#546070] dark:text-[#9BA7B6]">
            <div className="flex flex-wrap items-center gap-4">
              {(['kavram', 'kitap', 'alinti', 'dusunce'] as KnowledgeNodeType[]).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[t] }}
                    aria-hidden="true"
                  />
                  {NODE_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
                aria-label="Uzaklaştır"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono tabular-nums px-1">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                aria-label="Yakınlaştır"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                aria-label="Sıfırla"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-[#F7F5F0] dark:bg-[#10151E] relative select-none">
            {visibleNodes.length === 0 ? (
              <div className="h-[420px] flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Network className="w-8 h-8 text-[#71C6BD]" />
                <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                  Bu görünümde henüz düğüm bulunmuyor.
                </p>
              </div>
            ) : (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${720 / zoom} ${460 / zoom}`}
                className="w-full h-[440px] cursor-grab active:cursor-grabbing"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {/* Subtle grid pattern */}
                <defs>
                  <pattern id="atlas-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.06"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#atlas-grid)" />

                {/* Edges */}
                {renderedEdges.map(({ rel, fromNode, toNode }) => {
                  const p1 = getNodeCoords(fromNode);
                  const p2 = getNodeCoords(toNode);
                  const mx = (p1.x + p2.x) / 2;
                  const my = (p1.y + p2.y) / 2;
                  const highlighted =
                    selectedNode &&
                    (fromNode.id === selectedNode.id || toNode.id === selectedNode.id);

                  return (
                    <g key={rel.id}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={highlighted ? '#D6B782' : '#71C6BD'}
                        strokeOpacity={highlighted ? 0.9 : 0.38}
                        strokeWidth={highlighted ? 2 : 1.3}
                      />
                      <text
                        x={mx}
                        y={my - 5}
                        textAnchor="middle"
                        fontSize="10"
                        className="fill-[#546070] dark:fill-[#9BA7B6]"
                      >
                        {rel.relationType}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map((node) => {
                  const pos = getNodeCoords(node);
                  const isSelected = selectedNode?.id === node.id;
                  const color = NODE_COLORS[node.nodeType] ?? '#71C6BD';
                  const shortTitle =
                    node.title.length > 26 ? `${node.title.slice(0, 26)}…` : node.title;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSearchParams({ nodeId: node.id });
                        setDraggingId(node.id);
                        setDragPos({ x: node.x, y: node.y });
                      }}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <circle r="24" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.6" />
                      )}
                      <circle r="15" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
                      <circle r="5" fill={color} />
                      <text
                        y="30"
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight={isSelected ? '600' : '500'}
                        className="fill-[#141923] dark:fill-[#F1F3F5]"
                      >
                        {shortTitle}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Node Inspector & Linking */}
        <div className="xl:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: NODE_COLORS[selectedNode.nodeType] }}
                  >
                    {NODE_TYPE_LABELS[selectedNode.nodeType]}
                    {selectedNode.isDemo ? ' · Demo' : ''}
                  </span>
                  <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-0.5">
                    {selectedNode.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedNode)}
                  aria-label="Düğümü sil"
                  className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-[#546070] dark:text-[#9BA7B6] leading-relaxed">
                {selectedNode.summary}
              </p>

              {/* Jump to Source Record */}
              {selectedNode.sourceEntityId && (
                <Link
                  to={
                    selectedNode.sourceModule === 'dijital-kutuphanem'
                      ? `/modul/dijital-kutuphanem?bookId=${encodeURIComponent(selectedNode.sourceEntityId)}`
                      : selectedNode.sourceModule === 'alinti-defterim'
                        ? `/modul/alinti-defterim?quoteId=${encodeURIComponent(selectedNode.sourceEntityId)}`
                        : '/modul/zihin-atlasi'
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71C6BD] hover:underline"
                >
                  Kaynak Kayda Git <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Existing Relations */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-2">
                <h3 className="text-xs font-semibold text-[#546070] dark:text-[#9BA7B6]">
                  İlişkili Bağlantılar ({selectedRelations.length})
                </h3>
                {selectedRelations.length === 0 ? (
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                    Bu düğümün henüz bağlantısı yok.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedRelations.map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate">
                          {r.fromLabel} → <span className="text-[#71C6BD]">{r.relationType}</span> →{' '}
                          {r.toLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteRelation(r.id)}
                          className="text-[#546070] hover:text-red-500 shrink-0"
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new connection from selected node */}
              <form
                onSubmit={handleCreateRelation}
                className="pt-3 border-t border-black/10 dark:border-white/10 space-y-2.5"
              >
                <h3 className="text-xs font-semibold text-[#141923] dark:text-[#F1F3F5] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#71C6BD]" />
                  Yeni Bağlantı Kur
                </h3>
                <select
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  <option value="">Hedef düğüm seçin...</option>
                  {knowledgeNodes
                    .filter((n) => n.id !== selectedNode.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({NODE_TYPE_LABELS[n.nodeType]})
                      </option>
                    ))}
                </select>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as RelationType)}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                >
                  <option value="iliskilidir">İlişkilidir</option>
                  <option value="kavramlastirir">Kavramlaştırır</option>
                  <option value="besler">Besler</option>
                  <option value="kaynaklidir">Kaynaklıdır</option>
                  <option value="referans_verir">Referans Verir</option>
                </select>
                <input
                  type="text"
                  value={relationNote}
                  onChange={(e) => setRelationNote(e.target.value)}
                  placeholder="Bağlantı notu (opsiyonel)"
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
                <button
                  type="submit"
                  disabled={!targetNodeId}
                  className="w-full h-9 inline-flex items-center justify-center text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] disabled:opacity-40"
                >
                  Bağlantıyı Kaydet
                </button>
              </form>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
              Grafik üzerinden bir düğüm seçerek ayrıntılarını ve bağlantılarını yönetebilirsiniz.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Düğümü Kaldır"
        description={`"${deleteTarget?.title}" düğümünü Zihin Atlasından kaldırmak istediğinize emin misiniz? Kaynak kitap veya alıntı silinmez, yalnızca atlas düğümü ve ilişkileri kaldırılır.`}
        confirmLabel="Evet, Kaldır"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteKnowledgeNode(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
