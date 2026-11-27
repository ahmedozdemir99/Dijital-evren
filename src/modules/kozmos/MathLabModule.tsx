import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Compass, Dices, FunctionSquare, Music, Save, Sparkles, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface MathExperimentPayload {
  kind: 'function_plot' | 'fractal' | 'statistics' | 'geometry';
  expression: string;
  paramA: number;
  paramB: number;
  notes: string;
}

// Safe recursive-descent parser for real-valued math expressions (no eval/Function)
export function evaluateMathExpression(expr: string, x: number, a = 1, b = 0): number {
  const s = expr.replace(/\s+/g, '').toLowerCase();
  if (!s) return NaN;
  let pos = 0;

  const parseExpr = (): number => {
    let left = parseTerm();
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parsePower();
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
      const op = s[pos++];
      const right = parsePower();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (pos < s.length && s[pos] === '^') {
      pos++;
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  };

  const parseUnary = (): number => {
    if (s[pos] === '-') {
      pos++;
      return -parseUnary();
    }
    if (s[pos] === '+') {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    if (s[pos] === '(') {
      pos++;
      const val = parseExpr();
      if (s[pos] !== ')') return NaN;
      pos++;
      return val;
    }
    if (/[0-9.]/.test(s[pos] ?? '')) {
      let numStr = '';
      while (pos < s.length && /[0-9.]/.test(s[pos])) {
        numStr += s[pos++];
      }
      const n = Number(numStr);
      return Number.isFinite(n) ? n : NaN;
    }
    if (/[a-z]/.test(s[pos] ?? '')) {
      let ident = '';
      while (pos < s.length && /[a-z]/.test(s[pos])) {
        ident += s[pos++];
      }
      if (ident === 'x') return x;
      if (ident === 'a') return a;
      if (ident === 'b') return b;
      if (ident === 'pi') return Math.PI;
      if (ident === 'e') return Math.E;
      if (s[pos] === '(') {
        pos++;
        const arg = parseExpr();
        if (s[pos] !== ')') return NaN;
        pos++;
        if (ident === 'sin') return Math.sin(arg);
        if (ident === 'cos') return Math.cos(arg);
        if (ident === 'tan') return Math.tan(arg);
        if (ident === 'sqrt') return Math.sqrt(arg);
        if (ident === 'abs') return Math.abs(arg);
        if (ident === 'ln') return Math.log(arg);
        if (ident === 'log') return Math.log10(arg);
      }
    }
    return NaN;
  };

  const result = parseExpr();
  if (pos !== s.length) return NaN;
  return Number.isFinite(result) ? result : NaN;
}

export function MathLabModule() {
  const navigate = useNavigate();
  const {
    moduleRecords,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useModuleStore();

  useEffect(() => {
    recordModuleOpen('matematik-laboratuvari');
  }, [recordModuleOpen]);

  const savedExperiments = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'matematik-laboratuvari' && !r.isArchived
      ) as Array<ModuleRecord<MathExperimentPayload>>,
    [moduleRecords]
  );

  const [tab, setTab] = useState<
    'plot' | 'equations' | 'geometry' | 'probability' | 'stats' | 'aesthetics'
  >('plot');

  // Function plotter state
  const [expr1, setExpr1] = useState('a * sin(x) + b');
  const [expr2, setExpr2] = useState('0.2 * x^2 - 2');
  const [paramA, setParamA] = useState(2);
  const [paramB, setParamB] = useState(0);
  const [xRange, setXRange] = useState(8);

  // Quadratic solver state
  const [qa, setQa] = useState(1);
  const [qb, setQb] = useState(-5);
  const [qc, setQc] = useState(6);

  // Geometry triangle state
  const [triAx, setTriAx] = useState(80);
  const [triAy, setTriAy] = useState(220);
  const [triBx, setTriBx] = useState(320);
  const [triBy, setTriBy] = useState(220);
  const [triCx, setTriCx] = useState(190);
  const [triCy, setTriCy] = useState(70);

  // Probability Monte Carlo
  const [diceCounts, setDiceCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [totalRolls, setTotalRolls] = useState(0);

  // Stats & 2x2 Matrix
  const [statsInput, setStatsInput] = useState('12, 18, 21, 24, 24, 30, 35');
  const [mat, setMat] = useState<[number, number, number, number]>([2, 1, 1, 3]);

  // Mandelbrot Canvas & Fibonacci
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maxIter, setMaxIter] = useState(40);
  const [fibCount, setFibCount] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<MathExperimentPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2600);
  };

  // Plot SVG paths
  const plotData = useMemo(() => {
    const W = 640;
    const H = 320;
    const buildPath = (expr: string) => {
      if (!expr.trim()) return '';
      const pts: string[] = [];
      for (let px = 0; px <= W; px += 4) {
        const x = ((px / W) * 2 - 1) * xRange;
        const y = evaluateMathExpression(expr, x, paramA, paramB);
        if (!Number.isFinite(y) || Math.abs(y) > 40) continue;
        const py = H / 2 - (y / xRange) * (H / 2);
        pts.push(`${pts.length === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
      }
      return pts.join(' ');
    };
    return { p1: buildPath(expr1), p2: buildPath(expr2), W, H };
  }, [expr1, expr2, paramA, paramB, xRange]);

  // Quadratic solver
  const quadSolution = useMemo(() => {
    if (qa === 0) {
      return qb === 0
        ? 'Denklem geçersiz (a=0, b=0).'
        : `Doğrusal Kök: x = ${(-qc / qb).toFixed(3)}`;
    }
    const delta = qb * qb - 4 * qa * qc;
    if (delta > 0) {
      const r1 = (-qb + Math.sqrt(delta)) / (2 * qa);
      const r2 = (-qb - Math.sqrt(delta)) / (2 * qa);
      return `Δ = ${delta.toFixed(2)} > 0 · İki gerçek kök: x₁ = ${r1.toFixed(3)}, x₂ = ${r2.toFixed(3)}`;
    }
    if (delta === 0) {
      return `Δ = 0 · Çift katlı kök: x = ${(-qb / (2 * qa)).toFixed(3)}`;
    }
    const real = (-qb / (2 * qa)).toFixed(3);
    const imag = (Math.sqrt(-delta) / (2 * qa)).toFixed(3);
    return `Δ = ${delta.toFixed(2)} < 0 · Karmaşık kökler: ${real} ± ${imag}i`;
  }, [qa, qb, qc]);

  // Triangle geometry calculations
  const triStats = useMemo(() => {
    const dist = (x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1) / 20;
    const ab = dist(triAx, triAy, triBx, triBy);
    const bc = dist(triBx, triBy, triCx, triCy);
    const ca = dist(triCx, triCy, triAx, triAy);
    const s = (ab + bc + ca) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - ab) * (s - bc) * (s - ca)));
    return { ab, bc, ca, perimeter: ab + bc + ca, area };
  }, [triAx, triAy, triBx, triBy, triCx, triCy]);

  // Statistics
  const stats = useMemo(() => {
    const nums = statsInput
      .split(/[\s,;]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    if (nums.length === 0) return null;
    const sum = nums.reduce((acc, v) => acc + v, 0);
    const mean = sum / nums.length;
    const mid = Math.floor(nums.length / 2);
    const median = nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
    const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length;
    return { count: nums.length, mean, median, stdDev: Math.sqrt(variance), min: nums[0], max: nums[nums.length - 1] };
  }, [statsInput]);

  // Mandelbrot rendering
  useEffect(() => {
    if (tab !== 'aesthetics') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.createImageData(w, h);
    for (let px = 0; px < w; px++) {
      for (let py = 0; py < h; py++) {
        const x0 = (px / w) * 3.2 - 2.2;
        const y0 = (py / h) * 2.2 - 1.1;
        let x = 0;
        let y = 0;
        let iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xt = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xt;
          iter++;
        }
        const idx = (py * w + px) * 4;
        if (iter === maxIter) {
          img.data[idx] = 16;
          img.data[idx + 1] = 21;
          img.data[idx + 2] = 30;
          img.data[idx + 3] = 255;
        } else {
          const ratio = iter / maxIter;
          img.data[idx] = Math.round(40 + ratio * 96);
          img.data[idx + 1] = Math.round(70 + ratio * 120);
          img.data[idx + 2] = Math.round(140 + ratio * 115);
          img.data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [tab, maxIter]);

  const fibNumbers = useMemo(() => {
    const arr = [1, 1];
    for (let i = 2; i < fibCount; i++) {
      arr.push(arr[i - 1] + arr[i - 2]);
    }
    return arr;
  }, [fibCount]);

  const rollDice = (n: number) => {
    const next = [...diceCounts];
    for (let i = 0; i < n; i++) {
      const face = Math.floor(Math.random() * 6);
      next[face]++;
    }
    setDiceCounts(next);
    setTotalRolls((t) => t + n);
  };

  const handleSaveExperiment = async () => {
    await addModuleRecord<MathExperimentPayload>({
      moduleId: 'matematik-laboratuvari',
      entityType: 'math_experiment',
      title: `Fonksiyon: ${expr1}`,
      subtitle: `a=${paramA}, b=${paramB} · Aralık ±${xRange}`,
      category: 'Matematik Deneyi',
      tags: ['Fonksiyon', 'Grafik'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        kind: 'function_plot',
        expression: expr1,
        paramA,
        paramB,
        notes: `İkinci eğri: ${expr2}`,
      },
    });
    notify('Matematik deneyi kaydedildi.');
  };

  const handleExportToAutoMusicPro = async (exp: ModuleRecord<MathExperimentPayload>) => {
    const steps = Array.from({ length: 16 }, (_, idx) => {
      const y = evaluateMathExpression(exp.payload.expression, idx - 7, exp.payload.paramA, exp.payload.paramB);
      if (!Number.isFinite(y)) return idx % 4 === 0 ? 1 : 0;
      return Math.abs(Math.round(y)) % 2 === 0 ? 1 : 0;
    });
    const created = await addModuleRecord({
      moduleId: 'automusicpro',
      entityType: 'composition',
      title: `Matematiksel Ritim: ${exp.title}`,
      subtitle: 'Matematik Laboratuvarı oran aktarımı',
      category: 'Matematiksel Ritim',
      tags: ['Matematik Laboratuvarı', 'AutoMusicPro'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'matematik-laboratuvari',
      sourceEntityId: exp.id,
      sourceLabel: exp.title,
      payload: {
        bpm: Math.max(72, Math.min(138, 96 + Math.round(exp.payload.paramA * 6))),
        scale: 'Pentatonik Minör',
        lyrics: `Matematiksel Ritim Kaynağı: ${exp.payload.expression} (a=${exp.payload.paramA}, b=${exp.payload.paramB})`,
        steps,
        melodyNotes: ['A4', 'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5'],
      },
    });
    notify('Deney AutoMusicPro 16 adımlı ritim taslağına aktarıldı.');
    navigate(`/modul/automusicpro?recordId=${created.id}`);
  };

  const det = mat[0] * mat[3] - mat[1] * mat[2];

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="matematik-laboratuvari"
        recordCount={savedExperiments.length}
        primaryActionLabel="Mevcut Deneyi Kaydet"
        onPrimaryAction={handleSaveExperiment}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#88B4FF]/15 border border-[#88B4FF]/40">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'plot', label: 'Fonksiyon Grafikleri', icon: FunctionSquare },
          { id: 'equations', label: 'Denklem Çözücü', icon: Calculator },
          { id: 'geometry', label: 'Etkileşimli Geometri', icon: Compass },
          { id: 'probability', label: 'Olasılık Simülasyonu', icon: Dices },
          { id: 'stats', label: 'İstatistik ve Matris', icon: Calculator },
          { id: 'aesthetics', label: 'Fraktallar ve Sayıların Estetiği', icon: Sparkles },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg whitespace-nowrap shrink-0 ${
              tab === t.id
                ? 'bg-[#88B4FF] text-[#10151E] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="text-[#88B4FF] font-medium">f(x) — Mavi Eğri</span>
                <input
                  type="text"
                  value={expr1}
                  onChange={(e) => setExpr1(e.target.value)}
                  className="w-full h-9 px-3 font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[#D6B782] font-medium">g(x) — Altın Eğri</span>
                <input
                  type="text"
                  value={expr2}
                  onChange={(e) => setExpr2(e.target.value)}
                  className="w-full h-9 px-3 font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs tabular-nums">
              <label className="space-y-1">
                <span>Parametre a = {paramA}</span>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={paramA}
                  onChange={(e) => setParamA(Number(e.target.value))}
                  className="w-full accent-[#88B4FF]"
                />
              </label>
              <label className="space-y-1">
                <span>Parametre b = {paramB}</span>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={paramB}
                  onChange={(e) => setParamB(Number(e.target.value))}
                  className="w-full accent-[#88B4FF]"
                />
              </label>
              <label className="space-y-1">
                <span>Aralık: ±{xRange}</span>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={2}
                  value={xRange}
                  onChange={(e) => setXRange(Number(e.target.value))}
                  className="w-full accent-[#88B4FF]"
                />
              </label>
            </div>

            <div className="rounded-xl overflow-hidden bg-[#10151E] border border-white/10">
              <svg viewBox={`0 0 ${plotData.W} ${plotData.H}`} className="w-full h-auto block">
                <line x1={0} y1={plotData.H / 2} x2={plotData.W} y2={plotData.H / 2} stroke="rgba(255,255,255,0.2)" />
                <line x1={plotData.W / 2} y1={0} x2={plotData.W / 2} y2={plotData.H} stroke="rgba(255,255,255,0.2)" />
                {plotData.p1 && <path d={plotData.p1} fill="none" stroke="#88B4FF" strokeWidth={2.2} />}
                {plotData.p2 && <path d={plotData.p2} fill="none" stroke="#D6B782" strokeWidth={2} />}
              </svg>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveExperiment}
                className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-medium rounded-lg bg-[#88B4FF] text-[#10151E] whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Grafiği Deney Olarak Kaydet
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-semibold">Kayıtlı Deneyler ({savedExperiments.length})</h2>
            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {savedExperiments.length === 0 ? (
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] py-4 text-center">
                  Henüz kaydedilmiş deney yok. Sol taraftaki grafiği deney olarak kaydedebilirsiniz.
                </p>
              ) : (
                savedExperiments.map((exp) => (
                  <div key={exp.id} className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpr1(exp.payload.expression);
                          setParamA(exp.payload.paramA);
                          setParamB(exp.payload.paramB);
                        }}
                        className="font-semibold text-left hover:underline"
                      >
                        {exp.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(exp)}
                        aria-label="Deneyi sil"
                        className="h-7 w-7 inline-flex items-center justify-center shrink-0 rounded-md text-[#546070] hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[#546070] dark:text-[#9BA7B6]">{exp.subtitle}</p>
                    <button
                      type="button"
                      onClick={() => handleExportToAutoMusicPro(exp)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-[#A78BFA]/30 text-[#A78BFA] hover:bg-[#A78BFA]/10 whitespace-nowrap"
                    >
                      <Music className="w-3.5 h-3.5" />
                      AutoMusicPro’ya Ritim Aktar
                    </button>
                    <RecordActionsBar
                      moduleId="matematik-laboratuvari"
                      entityId={exp.id}
                      entityType="math_experiment"
                      entityLabel={exp.title}
                      privacyDomain="genel"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'equations' && (
        <div className="max-w-xl p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <h2 className="text-lg font-semibold">İkinci Dereceden Denklem Çözücü (ax² + bx + c = 0)</h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span>a katsayısı</span>
              <input
                type="number"
                value={qa}
                onChange={(e) => setQa(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span>b katsayısı</span>
              <input
                type="number"
                value={qb}
                onChange={(e) => setQb(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span>c sabiti</span>
              <input
                type="number"
                value={qc}
                onChange={(e) => setQc(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
              />
            </label>
          </div>
          <div className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] font-mono text-sm tabular-nums">
            {quadSolution}
          </div>
        </div>
      )}

      {tab === 'geometry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#10151E] border border-white/10">
            <svg viewBox="0 0 420 280" className="w-full h-auto block">
              <polygon
                points={`${triAx},${triAy} ${triBx},${triBy} ${triCx},${triCy}`}
                fill="rgba(136,180,255,0.18)"
                stroke="#88B4FF"
                strokeWidth={2}
              />
              {[
                { x: triAx, y: triAy, lbl: 'A' },
                { x: triBx, y: triBy, lbl: 'B' },
                { x: triCx, y: triCy, lbl: 'C' },
              ].map((pt) => (
                <g key={pt.lbl}>
                  <circle cx={pt.x} cy={pt.y} r={5} fill="#D6B782" />
                  <text x={pt.x + 8} y={pt.y - 6} fill="#F1F3F5" fontSize={12}>
                    {pt.lbl}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3 text-xs tabular-nums">
            <h2 className="text-base font-semibold">Köşe Koordinatları ve Ölçümler</h2>
            <div className="grid grid-cols-2 gap-2">
              <label>
                C(x): {triCx}
                <input type="range" min={30} max={380} value={triCx} onChange={(e) => setTriCx(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
              </label>
              <label>
                C(y): {triCy}
                <input type="range" min={30} max={240} value={triCy} onChange={(e) => setTriCy(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
              </label>
              <label>
                A(x): {triAx}
                <input type="range" min={20} max={200} value={triAx} onChange={(e) => setTriAx(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
              </label>
              <label>
                B(x): {triBx}
                <input type="range" min={200} max={390} value={triBx} onChange={(e) => setTriBx(Number(e.target.value))} className="w-full accent-[#88B4FF]" />
              </label>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1 font-mono">
              <p>|AB| = {triStats.ab.toFixed(2)} br</p>
              <p>|BC| = {triStats.bc.toFixed(2)} br</p>
              <p>|CA| = {triStats.ca.toFixed(2)} br</p>
              <p>Çevre = {triStats.perimeter.toFixed(2)} br</p>
              <p className="text-[#88B4FF] font-semibold">Alan = {triStats.area.toFixed(2)} br²</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'probability' && (
        <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Monte Carlo Zar Simülasyonu</h2>
              <p className="text-xs text-[#546070] dark:text-[#9BA7B6] tabular-nums">
                Toplam Deneme: {totalRolls} · Beklenen Teorik Oran: %16,67
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => rollDice(10)} className="h-8 inline-flex items-center justify-center px-3 rounded-lg bg-[#88B4FF] text-[#10151E] font-medium whitespace-nowrap shrink-0">
                10 Atış
              </button>
              <button type="button" onClick={() => rollDice(500)} className="h-8 inline-flex items-center justify-center px-3 rounded-lg bg-[#88B4FF] text-[#10151E] font-medium whitespace-nowrap shrink-0">
                500 Atış
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiceCounts([0, 0, 0, 0, 0, 0]);
                  setTotalRolls(0);
                }}
                className="h-8 inline-flex items-center justify-center px-3 rounded-lg border border-black/10 dark:border-white/15 whitespace-nowrap shrink-0"
              >
                Sıfırla
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 tabular-nums">
            {diceCounts.map((cnt, idx) => {
              const pct = totalRolls > 0 ? (cnt / totalRolls) * 100 : 0;
              return (
                <div key={idx} className="p-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-center space-y-2">
                  <div className="h-28 flex items-end justify-center">
                    <div
                      className="w-8 bg-[#88B4FF] rounded-t"
                      style={{ height: `${Math.min(100, pct * 3.5)}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs font-semibold">Yüz {idx + 1}</p>
                  <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">
                    {cnt} (%{pct.toFixed(1)})
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-base font-semibold">Veri Kümesi İstatistik Hesaplayıcı</h2>
            <input
              type="text"
              value={statsInput}
              onChange={(e) => setStatsInput(e.target.value)}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums pt-2">
                <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">n = {stats.count}</div>
                <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Ort = {stats.mean.toFixed(2)}</div>
                <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Medyan = {stats.median.toFixed(2)}</div>
                <div className="p-2.5 rounded bg-[#F7F5F0] dark:bg-[#10151E]">Std Sapma = {stats.stdDev.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-base font-semibold">2×2 Matris Determinant ve İz</h2>
            <div className="grid grid-cols-2 gap-2 max-w-[200px]">
              {mat.map((val, i) => (
                <input
                  key={i}
                  type="number"
                  value={val}
                  onChange={(e) => {
                    const next = [...mat] as [number, number, number, number];
                    next[i] = Number(e.target.value);
                    setMat(next);
                  }}
                  className="h-9 px-3 text-sm font-mono text-center rounded bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums"
                />
              ))}
            </div>
            <p className="text-xs font-mono tabular-nums">
              Determinant (ad − bc) = {det} · İz (a + d) = {mat[0] + mat[3]}
            </p>
          </div>
        </div>
      )}

      {tab === 'aesthetics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Mandelbrot Kümesi Fraktalı</h2>
              <label className="text-xs tabular-nums flex items-center gap-2">
                İterasyon: {maxIter}
                <input
                  type="range"
                  min={16}
                  max={96}
                  step={8}
                  value={maxIter}
                  onChange={(e) => setMaxIter(Number(e.target.value))}
                  className="accent-[#88B4FF]"
                />
              </label>
            </div>
            <canvas ref={canvasRef} width={380} height={240} className="w-full rounded-lg border border-white/10" />
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Sayıların Estetiği: Fibonacci ve Altın Oran (φ)</h2>
              <label className="text-xs tabular-nums flex items-center gap-2">
                Terim: {fibCount}
                <input
                  type="range"
                  min={5}
                  max={16}
                  value={fibCount}
                  onChange={(e) => setFibCount(Number(e.target.value))}
                  className="accent-[#D6B782]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs tabular-nums">
              {fibNumbers.map((n, idx) => (
                <span key={idx} className="px-2 py-1 rounded bg-[#F7F5F0] dark:bg-[#10151E]">
                  {n}
                </span>
              ))}
            </div>
            {fibNumbers.length >= 2 && (
              <p className="text-xs font-mono tabular-nums text-[#D6B782]">
                Yakınsanan Oran F({fibCount})/F({fibCount - 1}) ={' '}
                {(fibNumbers[fibNumbers.length - 1] / fibNumbers[fibNumbers.length - 2]).toFixed(6)} · Gerçek φ ≈ 1.618034
              </p>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Matematik Deneyini Sil"
        description={`"${deleteTarget?.title}" deney kaydını silmek istiyor musunuz?`}
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
