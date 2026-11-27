import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Globe2, Languages, MapPin, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface WorldPin {
  id: string;
  name: string;
  kind: 'country' | 'city' | 'landmark';
  x: number;
  y: number;
}

interface WorldPayload {
  worldName: string;
  eraLabel: string;
  cultures: string;
  conlangNotes: string;
  characters: string;
  timelineText: string;
  pins: WorldPin[];
}

export function WorldbuilderModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    recordModuleOpen,
    addModuleRecord,
    updateModuleRecord,
    deleteModuleRecord,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('kendi-dunyam');
  }, [recordModuleOpen]);

  const worlds = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'kendi-dunyam' && !r.isArchived
      ) as Array<ModuleRecord<WorldPayload>>,
    [moduleRecords]
  );

  const selectedId = searchParams.get('recordId') || worlds[0]?.id || null;
  const selected = worlds.find((w) => w.id === selectedId) ?? null;

  const [showNew, setShowNew] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [eraLabel, setEraLabel] = useState('Birinci Çağ');
  const [cultures, setCultures] = useState('');
  const [conlangNotes, setConlangNotes] = useState('');
  const [characters, setCharacters] = useState('');
  const [timelineText, setTimelineText] = useState('');

  // Interactive Map Pin creation
  const [newPinName, setNewPinName] = useState('');
  const [newPinKind, setNewPinKind] = useState<WorldPin['kind']>('city');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<WorldPayload> | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worldName.trim()) return;
    const created = await addModuleRecord<WorldPayload>({
      moduleId: 'kendi-dunyam',
      entityType: 'fictional_world',
      title: worldName.trim(),
      subtitle: `${eraLabel} · Kurgusal Evren`,
      category: 'Kurgusal Dünya',
      tags: ['Kurgu', 'Kendi Dünyam'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'kisisel',
      payload: {
        worldName: worldName.trim(),
        eraLabel,
        cultures: cultures.trim(),
        conlangNotes: conlangNotes.trim(),
        characters: characters.trim(),
        timelineText: timelineText.trim(),
        pins: [{ id: 'pin-1', name: 'Başkent', kind: 'city', x: 240, y: 120 }],
      },
    });
    setWorldName('');
    setCultures('');
    setConlangNotes('');
    setCharacters('');
    setTimelineText('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  const handleMapClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selected) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 520);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 260);
    const pinLabel = newPinName.trim() || `Yerleşim ${(selected.payload.pins?.length ?? 0) + 1}`;
    const nextPins: WorldPin[] = [
      ...(selected.payload.pins ?? []),
      { id: `pin-${Date.now()}`, name: pinLabel, kind: newPinKind, x, y },
    ];
    await updateModuleRecord<WorldPayload>(selected.id, {
      payload: { ...selected.payload, pins: nextPins },
    });
    setNewPinName('');
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="kendi-dunyam"
        recordCount={worlds.length}
        primaryActionLabel="Yeni Dünya Kur"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      <div className="p-3.5 rounded-xl bg-[#88B4FF]/12 border border-[#88B4FF]/35 flex items-center gap-2.5 text-xs">
        <AlertCircle className="w-4 h-4 text-[#88B4FF] shrink-0" />
        <span>
          <strong>Kurgusal Yalıtım:</strong> Bu stüdyodaki bütün haritalar, diller, ülkeler ve karakterler tamamen kurgusaldır ve Tarih Atlası gibi gerçek dünya modüllerinden ayrı tutulur.
        </span>
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Kurgusal Dünya Oluştur</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              placeholder="Dünya / Evren adı..."
              required
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            <input
              type="text"
              value={eraLabel}
              onChange={(e) => setEraLabel(e.target.value)}
              placeholder="Çağ / Dönem adı..."
              className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea rows={2} value={cultures} onChange={(e) => setCultures(e.target.value)} placeholder="Ülkeler, şehirler ve kültürler..." className="px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
            <textarea rows={2} value={conlangNotes} onChange={(e) => setConlangNotes(e.target.value)} placeholder="Yapay dil kuralları ve sözcükler..." className="px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
            <textarea rows={2} value={characters} onChange={(e) => setCharacters(e.target.value)} placeholder="Başlıca karakterler..." className="px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
            <textarea rows={2} value={timelineText} onChange={(e) => setTimelineText(e.target.value)} placeholder="Kurgusal olay örgüsü / zaman çizgisi..." className="px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap shrink-0">Vazgeç</button>
            <button type="submit" className="h-8 inline-flex items-center justify-center px-4 text-xs font-medium rounded-lg bg-[#88B4FF] text-[#10151E] whitespace-nowrap shrink-0">Oluştur</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          {worlds.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSearchParams({ recordId: w.id })}
              className={`w-full text-left p-3.5 rounded-xl border ${
                w.id === selected?.id
                  ? 'bg-[#88B4FF]/12 border-[#88B4FF]'
                  : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
              }`}
            >
              <p className="font-semibold text-sm">{w.title}</p>
              <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{w.subtitle}</p>
            </button>
          ))}
          {worlds.length === 0 && (
            <p className="p-4 text-xs rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[#546070] dark:text-[#9BA7B6]">
              Henüz kurgusal dünya yok. "Yeni Dünya Kur" ile stüdyoyu başlatın.
            </p>
          )}
        </div>

        <div className="lg:col-span-8">
          {selected ? (
            <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-[#88B4FF]">{selected.payload.eraLabel} · Kurgusal Evren</span>
                  <h2 className="text-2xl font-serif font-semibold">{selected.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selected)}
                  aria-label="Dünyayı sil"
                  className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Fictional Map Editor */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-[#88B4FF]" />
                    Harita Editörü (Konum eklemek için haritaya tıklayın)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={newPinName}
                      onChange={(e) => setNewPinName(e.target.value)}
                      placeholder="Sonraki yer adı..."
                      className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    />
                    <select
                      value={newPinKind}
                      onChange={(e) => setNewPinKind(e.target.value as WorldPin['kind'])}
                      className="h-8 px-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                    >
                      <option value="city">Şehir</option>
                      <option value="country">Ülke</option>
                      <option value="landmark">Doğa / Anıt</option>
                    </select>
                  </div>
                </div>

                <svg
                  viewBox="0 0 520 260"
                  onClick={handleMapClick}
                  className="w-full h-auto rounded-xl bg-[#10151E] border border-white/10 cursor-crosshair"
                >
                  <path
                    d="M65,70 Q150,30 260,65 T440,85 L430,200 Q290,235 170,195 T65,150 Z"
                    fill="rgba(136,180,255,0.12)"
                    stroke="rgba(136,180,255,0.35)"
                  />
                  {(selected.payload.pins ?? []).map((pin) => (
                    <g key={pin.id}>
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={pin.kind === 'country' ? 7 : 5}
                        fill={pin.kind === 'country' ? '#D6B782' : pin.kind === 'city' ? '#88B4FF' : '#93BF90'}
                      />
                      <text x={pin.x + 8} y={pin.y + 4} fill="#F1F3F5" fontSize={11}>
                        {pin.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#88B4FF]" />
                    Ülkeler ve Kültürler
                  </p>
                  <p className="whitespace-pre-line">{selected.payload.cultures || 'Henüz eklenmedi.'}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-[#D6B782]" />
                    Kurgusal Dil Sözlüğü
                  </p>
                  <p className="whitespace-pre-line">{selected.payload.conlangNotes || 'Henüz eklenmedi.'}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#71C6BD]" />
                    Karakterler
                  </p>
                  <p className="whitespace-pre-line">{selected.payload.characters || 'Henüz eklenmedi.'}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B5A2EC]" />
                    Zaman Çizgisi ve Olay Örgüsü
                  </p>
                  <p className="whitespace-pre-line">{selected.payload.timelineText || 'Henüz eklenmedi.'}</p>
                </div>
              </div>

              <RecordActionsBar
                moduleId="kendi-dunyam"
                entityId={selected.id}
                entityType="fictional_world"
                entityLabel={selected.title}
                privacyDomain="kisisel"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center space-y-2">
              <Globe2 className="w-7 h-7 text-[#88B4FF] mx-auto" />
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Ayrıntılarını görmek için soldan bir kurgusal dünya seçin veya yeni bir dünya oluşturun.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dünyayı Sil"
        message={`"${deleteTarget?.title}" kurgusal dünyasını silmek istiyor musunuz?`}
        danger
        confirmLabel="Sil"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteModuleRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
