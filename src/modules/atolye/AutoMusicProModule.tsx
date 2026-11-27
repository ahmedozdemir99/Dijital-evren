import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Feather, Link2, Music, Play, Plus, Save, Square, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface MusicPayload {
  bpm: number;
  scale: string;
  lyrics?: string;
  steps: number[];
  melodyNotes: string[];
}

const SCALE_FREQS: Record<string, Record<string, number>> = {
  'Pentatonik Minör': { A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880 },
  'Hicaz / Minör': { A4: 440, Bb4: 466.16, 'C#5': 554.37, D5: 587.33, E5: 659.25, F5: 698.46 },
  'Do Majör': { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440 },
};

export function AutoMusicProModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { moduleRecords, recordModuleOpen, addModuleRecord, updateModuleRecord, deleteModuleRecord } =
    useModuleStore();

  useEffect(() => {
    recordModuleOpen('automusicpro');
  }, [recordModuleOpen]);

  const projects = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'automusicpro' && !r.isArchived
      ) as Array<ModuleRecord<MusicPayload>>,
    [moduleRecords]
  );

  const personalPoems = useMemo(
    () =>
      moduleRecords.filter(
        (r) =>
          r.moduleId === 'siir-deryasi' &&
          !r.isArchived &&
          Boolean((r.payload as { isPersonal?: boolean }).isPersonal)
      ),
    [moduleRecords]
  );

  const selectedId = searchParams.get('recordId') || projects[0]?.id || null;
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const [title, setTitle] = useState('Yeni Kompozisyon');
  const [bpm, setBpm] = useState(96);
  const [scale, setScale] = useState<string>('Pentatonik Minör');
  const [steps, setSteps] = useState<number[]>([1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0]);
  const [melodyIdx, setMelodyIdx] = useState<number[]>([0, 1, 2, 4, 2, 1, 0, 3]);
  const [lyrics, setLyrics] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<MusicPayload> | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setBpm(selected.payload.bpm || 96);
      setScale(SCALE_FREQS[selected.payload.scale] ? selected.payload.scale : 'Pentatonik Minör');
      if (Array.isArray(selected.payload.steps) && selected.payload.steps.length === 16) {
        setSteps(selected.payload.steps);
      }
      setLyrics(selected.payload.lyrics ?? '');
    }
  }, [selected?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playTone = (freq: number, isDrum = false) => {
    if (typeof window === 'undefined') return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isDrum ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(isDrum ? 0.12 : 0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
  };

  const togglePlay = () => {
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setPlaying(false);
      setCurrentStep(-1);
      return;
    }

    setPlaying(true);
    let step = 0;
    const intervalMs = Math.max(80, Math.round((60 / bpm / 2) * 1000));
    const scaleFreqs = Object.values(SCALE_FREQS[scale] ?? SCALE_FREQS['Pentatonik Minör']);

    timerRef.current = window.setInterval(() => {
      setCurrentStep(step);
      if (steps[step]) {
        playTone(110, true);
        const noteFreq = scaleFreqs[melodyIdx[step % melodyIdx.length] % scaleFreqs.length];
        playTone(noteFreq, false);
      }
      step = (step + 1) % 16;
    }, intervalMs);
  };

  const handleSaveProject = async () => {
    const scaleNotes = Object.keys(SCALE_FREQS[scale] ?? SCALE_FREQS['Pentatonik Minör']);
    const melodyNotes = melodyIdx.map((i) => scaleNotes[i % scaleNotes.length]);
    if (selected) {
      await updateModuleRecord<MusicPayload>(selected.id, {
        title,
        subtitle: `${bpm} BPM · ${scale}`,
        payload: { bpm, scale, lyrics, steps, melodyNotes },
      });
    } else {
      const created = await addModuleRecord<MusicPayload>({
        moduleId: 'automusicpro',
        entityType: 'composition',
        title,
        subtitle: `${bpm} BPM · ${scale}`,
        category: 'Kompozisyon',
        tags: [scale],
        isFavorite: false,
        isArchived: false,
        privacyDomain: 'genel',
        payload: { bpm, scale, lyrics, steps, melodyNotes },
      });
      setSearchParams({ recordId: created.id });
    }
  };

  const handleImportPoem = (poemId: string) => {
    const poem = personalPoems.find((p) => p.id === poemId);
    if (!poem) return;
    const body = poem.payload as { lines?: string; text?: string };
    setTitle(`${poem.title} — Beste`);
    setLyrics(String(body.lines ?? body.text ?? ''));
  };

  const noteNames = Object.keys(SCALE_FREQS[scale] ?? SCALE_FREQS['Pentatonik Minör']);

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="automusicpro"
        recordCount={projects.length}
        primaryActionLabel="Yeni Kompozisyon"
        onPrimaryAction={async () => {
          const created = await addModuleRecord<MusicPayload>({
            moduleId: 'automusicpro',
            entityType: 'composition',
            title: `Kompozisyon #${projects.length + 1}`,
            subtitle: `${bpm} BPM · ${scale}`,
            category: 'Kompozisyon',
            tags: [scale],
            isFavorite: false,
            isArchived: false,
            privacyDomain: 'genel',
            payload: { bpm: 96, scale: 'Pentatonik Minör', steps, melodyNotes: noteNames },
          });
          setSearchParams({ recordId: created.id });
        }}
        extraActions={
          <Link
            to="/entegrasyonlar"
            className="h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5 text-[#88B4FF]" />
            Harici AutoMusicPro Bağlantısı
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Feather className="w-3.5 h-3.5 text-[#D5B477]" />
              Şiir Deryası’ndan Özgün Şiir Aktar
            </p>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleImportPoem(e.target.value);
              }}
              className="w-full h-9 px-2.5 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            >
              <option value="">Kişisel şiir seç...</option>
              {personalPoems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                Henüz beste kaydı yok. Yeni bir kompozisyon oluşturabilirsiniz.
              </div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                    p.id === selected?.id
                      ? 'bg-[#88B4FF]/12 border-[#88B4FF]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSearchParams({ recordId: p.id })}
                    className="text-left flex-1 min-w-0"
                  >
                    <p className="font-semibold text-sm truncate">{p.title}</p>
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{p.subtitle}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    aria-label="Besteyi sil"
                    className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 flex-1 min-w-[200px] text-xl font-serif font-semibold bg-transparent border-b border-black/10 dark:border-white/10 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="h-9 inline-flex items-center justify-center gap-1.5 px-4 text-xs font-medium rounded-lg bg-[#88B4FF] text-[#10151E] whitespace-nowrap shrink-0"
              >
                {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Durdur' : 'Web Audio ile Çal'}
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Kaydet
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs tabular-nums">
            <label className="space-y-1">
              <span>Tempo (BPM): {bpm}</span>
              <input
                type="range"
                min={60}
                max={150}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-[#88B4FF]"
              />
            </label>
            <label className="space-y-1">
              <span>Dizi / Makam Seçimi</span>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              >
                {Object.keys(SCALE_FREQS).map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 16-Step Sequencer Grid */}
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#88B4FF]" />
              16 Adımlı Matematiksel Ritim & Melodi Izgarası
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
              {steps.map((active, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setSteps((prev) => prev.map((v, i) => (i === idx ? (v ? 0 : 1) : v)))
                  }
                  className={`h-11 rounded border text-[11px] font-mono tabular-nums transition-colors ${
                    currentStep === idx
                      ? 'ring-2 ring-[#D6B782]'
                      : ''
                  } ${
                    active
                      ? 'bg-[#88B4FF] text-[#10151E] border-[#88B4FF] font-semibold'
                      : 'bg-[#F7F5F0] dark:bg-[#10151E] border-black/10 dark:border-white/10'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Melody Notes Bar */}
          <div className="space-y-2">
            <p className="text-xs font-semibold">Melodi Motif Notaları (Tıklayarak Değiştir)</p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {melodyIdx.map((nIdx, slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    const nextIdx = (nIdx + 1) % noteNames.length;
                    setMelodyIdx((prev) => prev.map((v, i) => (i === slot ? nextIdx : v)));
                    const freqs = Object.values(SCALE_FREQS[scale] ?? SCALE_FREQS['Pentatonik Minör']);
                    playTone(freqs[nextIdx], false);
                  }}
                  className="h-9 inline-flex items-center justify-center rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 font-mono text-xs"
                >
                  {noteNames[nIdx % noteNames.length]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Şiir / Güfte Notları</p>
            <textarea
              rows={4}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Bestelenecek özgün şiir dizeleri..."
              className="w-full px-3 py-2 text-sm font-serif rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>

          {selected && (
            <RecordActionsBar
              moduleId="automusicpro"
              entityId={selected.id}
              entityType="composition"
              entityLabel={selected.title}
              privacyDomain="genel"
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Kompozisyonu Sil"
        description={`"${deleteTarget?.title}" beste kaydını silmek istiyor musunuz?`}
        confirmLabel="Sil"
        destructive
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
