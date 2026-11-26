import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Check, HelpCircle, Scale, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import { localDateIso } from '../../core/services/integrationService';
import type { ModuleRecord } from '../../core/types/entities';
import { useAppStore } from '../../store/useAppStore';

interface LogicPayload {
  kind: 'argument' | 'fallacy' | 'rule';
  premises: string[];
  conclusion: string;
  formula?: string;
  isValidNote?: string;
}

type Token =
  | { type: 'var'; name: string }
  | { type: 'op'; op: 'NOT' | 'AND' | 'OR' | 'IMP' | 'IFF' }
  | { type: 'lparen' }
  | { type: 'rparen' };

export function tokenizeLogicFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
    } else if (ch === '!' || ch === '~' || ch === '¬') {
      tokens.push({ type: 'op', op: 'NOT' });
      i++;
    } else if (ch === '&' || ch === '^' || ch === '∧') {
      tokens.push({ type: 'op', op: 'AND' });
      i++;
    } else if (ch === '|' || ch === '∨') {
      tokens.push({ type: 'op', op: 'OR' });
      i++;
    } else if (expr.slice(i, i + 3) === '<->' || expr.slice(i, i + 3) === '<=>') {
      tokens.push({ type: 'op', op: 'IFF' });
      i += 3;
    } else if (ch === '↔') {
      tokens.push({ type: 'op', op: 'IFF' });
      i++;
    } else if (expr.slice(i, i + 2) === '->' || expr.slice(i, i + 2) === '=>') {
      tokens.push({ type: 'op', op: 'IMP' });
      i += 2;
    } else if (ch === '→') {
      tokens.push({ type: 'op', op: 'IMP' });
      i++;
    } else if (/[a-zA-Z]/.test(ch)) {
      let word = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      const upper = word.toUpperCase();
      if (upper === 'AND' || upper === 'VE') tokens.push({ type: 'op', op: 'AND' });
      else if (upper === 'OR' || upper === 'VEYA') tokens.push({ type: 'op', op: 'OR' });
      else if (upper === 'NOT' || upper === 'DEGIL') tokens.push({ type: 'op', op: 'NOT' });
      else if (upper === 'IMP' || upper === 'ISE') tokens.push({ type: 'op', op: 'IMP' });
      else if (upper === 'IFF') tokens.push({ type: 'op', op: 'IFF' });
      else tokens.push({ type: 'var', name: word.toLowerCase() });
    } else {
      throw new Error(`Tanınmayan karakter: "${ch}"`);
    }
  }
  return tokens;
}

export function buildTruthTable(expr: string): {
  vars: string[];
  rows: Array<{ env: Record<string, boolean>; result: boolean }>;
  classification: 'Totoloji (Her zaman doğru)' | 'Çelişki (Her zaman yanlış)' | 'Olumsal (Kısmen doğru)';
  error?: string;
} {
  try {
    const tokens = tokenizeLogicFormula(expr);
    if (tokens.length === 0) {
      return { vars: [], rows: [], classification: 'Olumsal (Kısmen doğru)', error: 'Formül giriniz.' };
    }
    const varsSet = new Set<string>();
    for (const t of tokens) {
      if (t.type === 'var') varsSet.add(t.name);
    }
    const vars = Array.from(varsSet).sort().slice(0, 4);
    if (vars.length === 0) {
      return { vars: [], rows: [], classification: 'Olumsal (Kısmen doğru)', error: 'En az bir önerme harfi (p, q, r) girin.' };
    }

    const evalTokens = (env: Record<string, boolean>): boolean => {
      let pos = 0;
      const peek = () => tokens[pos];
      const consume = () => tokens[pos++];

      const parseIff = (): boolean => {
        let left = parseImp();
        while (peek()?.type === 'op' && (peek() as { type: 'op'; op: string }).op === 'IFF') {
          consume();
          const right = parseImp();
          left = left === right;
        }
        return left;
      };
      const parseImp = (): boolean => {
        const left = parseOr();
        if (peek()?.type === 'op' && (peek() as { type: 'op'; op: string }).op === 'IMP') {
          consume();
          const right = parseImp();
          return !left || right;
        }
        return left;
      };
      const parseOr = (): boolean => {
        let left = parseAnd();
        while (peek()?.type === 'op' && (peek() as { type: 'op'; op: string }).op === 'OR') {
          consume();
          const right = parseAnd();
          left = left || right;
        }
        return left;
      };
      const parseAnd = (): boolean => {
        let left = parseNot();
        while (peek()?.type === 'op' && (peek() as { type: 'op'; op: string }).op === 'AND') {
          consume();
          const right = parseNot();
          left = left && right;
        }
        return left;
      };
      const parseNot = (): boolean => {
        if (peek()?.type === 'op' && (peek() as { type: 'op'; op: string }).op === 'NOT') {
          consume();
          return !parseNot();
        }
        return parsePrimary();
      };
      const parsePrimary = (): boolean => {
        const tok = consume();
        if (!tok) throw new Error('Eksik ifade');
        if (tok.type === 'var') return env[tok.name] ?? false;
        if (tok.type === 'lparen') {
          const val = parseIff();
          const close = consume();
          if (!close || close.type !== 'rparen') throw new Error('Kapanmayan parantez');
          return val;
        }
        throw new Error('Beklenmeyen sembol');
      };

      const val = parseIff();
      if (pos < tokens.length) throw new Error('Fazla karakter');
      return val;
    };

    const rowCount = 1 << vars.length;
    const rows: Array<{ env: Record<string, boolean>; result: boolean }> = [];
    for (let mask = rowCount - 1; mask >= 0; mask--) {
      const env: Record<string, boolean> = {};
      vars.forEach((v, idx) => {
        env[v] = Boolean((mask >> (vars.length - 1 - idx)) & 1);
      });
      rows.push({ env, result: evalTokens(env) });
    }

    const allTrue = rows.every((r) => r.result);
    const allFalse = rows.every((r) => !r.result);
    const classification = allTrue
      ? 'Totoloji (Her zaman doğru)'
      : allFalse
        ? 'Çelişki (Her zaman yanlış)'
        : 'Olumsal (Kısmen doğru)';
    return { vars, rows, classification };
  } catch (err) {
    return {
      vars: [],
      rows: [],
      classification: 'Olumsal (Kısmen doğru)',
      error: err instanceof Error ? err.message : 'Formül çözümlenemedi.',
    };
  }
}

const INFERENCE_RULES = [
  { name: 'Modus Ponens (Olumlu Koşullu Çıkarım)', schema: '(p -> q) ve p ⊢ q', desc: 'Koşul cümlesinin ön bileşeni doğruysa art bileşeni de zorunlu olarak doğrudur.' },
  { name: 'Modus Tollens (Olumsuz Koşullu Çıkarım)', schema: '(p -> q) ve !q ⊢ !p', desc: 'Art bileşen yanlışsa ön bileşen de yanlış olmalıdır.' },
  { name: 'Varsayımsal Tasımlama', schema: '(p -> q) ve (q -> r) ⊢ (p -> r)', desc: 'Koşullu önermeler zinciri geçişlidir.' },
  { name: 'Ayrık Tasımlama', schema: '(p | q) ve !p ⊢ q', desc: 'İki seçenekten biri elendiğinde diğeri zorunlu olur.' },
];

const FALLACY_LIBRARY = [
  { name: 'Ad Hominem (Kişiliğe Saldırı)', desc: 'Argümanı çürütmek yerine argümanı sunan kişinin karakterine veya geçmişine saldırmak.' },
  { name: 'Korkuluk Safsatası (Strawman)', desc: 'Karşı tarafın görüşünü çarpıtıp zayıflatılmış bir hâline saldırarak onu çürüttüğünü iddia etmek.' },
  { name: 'Sahte İkilem (False Dilemma)', desc: 'Çok sayıda ara seçenek varken konuyu yapay olarak yalnızca iki zıt seçeneğe indirgemek.' },
  { name: 'Kaygan Zemin (Slippery Slope)', desc: 'Makul ara kanıtlar sunmadan küçük bir adımın kaçınılmaz bir felakete yol açacağını öne sürmek.' },
  { name: 'Döngüsel Akıl Yürütme', desc: 'Kanıtlanmaya çalışılan sonucu öncüllerin içine gizleyerek kendini doğrulamaya çalışmak.' },
];

const QUIZ_QUESTIONS = [
  {
    q: '"Ya bizimlesin ya da tamamen karşımızdasın" ifadesi hangi safsata türüne örnektir?',
    options: ['Sahte İkilem', 'Modus Ponens', 'Korkuluk Safsatası'],
    answer: 0,
  },
  {
    q: '((p -> q) & p) -> q önermesinin doğruluk tablosu sonucu nedir?',
    options: ['Çelişki', 'Totoloji', 'Olumsal'],
    answer: 1,
  },
  {
    q: 'Bir yazarın savunduğu fikri değil de yaşadığı şehri eleştirerek tezini çürütmeye çalışmak nedir?',
    options: ['Döngüsel Akıl Yürütme', 'Ad Hominem', 'Varsayımsal Tasımlama'],
    answer: 1,
  },
];

export function LogicAcademyModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    moduleRecords,
    moduleSettings,
    recordModuleOpen,
    addModuleRecord,
    deleteModuleRecord,
  } = useAppStore();

  useEffect(() => {
    recordModuleOpen('mantik-akademisi');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'mantik-akademisi')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const records = useMemo(
    () =>
      moduleRecords.filter(
        (r) => r.moduleId === 'mantik-akademisi' && !r.isArchived && (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<LogicPayload>>,
    [moduleRecords, showDemo]
  );

  const [tab, setTab] = useState<'truth' | 'arguments' | 'fallacies' | 'quiz'>('truth');
  const [formulaInput, setFormulaInput] = useState('((p -> q) & p) -> q');
  const truthResult = useMemo(() => buildTruthTable(formulaInput), [formulaInput]);

  const selectedId = searchParams.get('recordId') || records[0]?.id || null;
  const selected = records.find((r) => r.id === selectedId) ?? null;

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [premisesText, setPremisesText] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [formula, setFormula] = useState('p -> q');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<LogicPayload> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreateArgument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !conclusion.trim()) return;
    const premises = premisesText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const created = await addModuleRecord<LogicPayload>({
      moduleId: 'mantik-akademisi',
      entityType: 'argument_map',
      title: title.trim(),
      subtitle: `${premises.length} öncül · ${formula}`,
      category: 'Argüman Haritası',
      tags: ['Mantık'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        kind: 'argument',
        premises,
        conclusion: conclusion.trim(),
        formula: formula.trim(),
        isValidNote: truthResult.error ? 'Formül doğrulanmadı' : truthResult.classification,
      },
    });
    setTitle('');
    setPremisesText('');
    setConclusion('');
    setShowNew(false);
    setTab('arguments');
    setSearchParams({ recordId: created.id });
  };

  const handleSendToPhilosophy = async (item?: ModuleRecord<LogicPayload>) => {
    const formulaText = item?.payload.formula ?? formulaInput;
    const rec = await addModuleRecord({
      moduleId: 'felsefe-meclisi',
      entityType: 'thought_experiment',
      title: item ? `Mantıksal İnceleme: ${item.title}` : `Önerme Çözümlemesi: ${formulaText}`,
      subtitle: 'Mantık Akademisi aktarımı',
      category: 'Mantık ve Epistemoloji',
      tags: ['Mantık Akademisi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'mantik-akademisi',
      sourceEntityId: item?.id,
      sourceLabel: item?.title ?? formulaText,
      payload: {
        kind: 'thought_experiment',
        school: 'Analitik Felsefe / Biçimsel Mantık',
        era: 'Klasik ve Çağdaş Mantık',
        coreThesis: item?.payload.conclusion ?? `Biçimsel formül: ${formulaText}`,
        socraticQuestions: ['Öncüllerin doğruluğu sonucu zorunlu kılıyor mu?'],
        body: item
          ? `Öncüller:\n${item.payload.premises.join('\n')}\n\nSonuç: ${item.payload.conclusion}`
          : `Doğruluk tablosu sınıflandırması: ${truthResult.classification}`,
        isFictionalSimulation: false,
      },
    });
    setFeedback('Kayıt Felsefe Meclisi tartışmasına gönderildi.');
    setTimeout(() => setFeedback(null), 2500);
    navigate(`/modul/felsefe-meclisi?recordId=${rec.id}`);
  };

  const handleSendToMemoryPalace = async (item?: ModuleRecord<LogicPayload>) => {
    const formulaText = item?.payload.formula ?? formulaInput;
    const card = await addModuleRecord({
      moduleId: 'hafiza-sarayi',
      entityType: 'memory_card',
      title: item ? `Mantık Kartı: ${item.title}` : `Formül Kartı: ${formulaText}`,
      subtitle: 'Mantık Akademisi aktarımı',
      category: 'Mantık ve Akıl Yürütme',
      tags: ['Mantık Akademisi'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      sourceModule: 'mantik-akademisi',
      sourceEntityId: item?.id,
      sourceLabel: item?.title ?? formulaText,
      date: localDateIso(),
      payload: {
        palace: 'İrfan Konağı',
        room: 'Mantık Odası',
        front: item ? `${item.title} argümanının sonucu nedir?` : `${formulaText} önermesi nasıl sınıflanır?`,
        back: item ? item.payload.conclusion : truthResult.classification,
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: localDateIso(),
      },
    });
    setFeedback('Mantık kartı Hafıza Sarayı’na eklendi.');
    setTimeout(() => setFeedback(null), 2500);
    navigate(`/modul/hafiza-sarayi?recordId=${card.id}`);
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="mantik-akademisi"
        recordCount={records.length}
        primaryActionLabel="Yeni Argüman Haritası"
        onPrimaryAction={() => {
          setTab('arguments');
          setShowNew((v) => !v);
        }}
      />

      {feedback && (
        <div className="px-4 py-2.5 rounded-lg text-xs bg-[#D5B477]/15 border border-[#D5B477]/40">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'truth', label: 'Doğruluk Tablosu Üreticisi' },
          { id: 'arguments', label: `Argüman Haritaları (${records.length})` },
          { id: 'fallacies', label: 'Çıkarım Kuralları ve Safsatalar' },
          { id: 'quiz', label: 'Mantık Alıştırmaları' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`h-8 px-3 text-xs rounded-lg inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-[#D5B477] text-[#10151E] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'truth' && (
        <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Önerme Mantığı Doğruluk Tablosu Üreticisi</h2>
            <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
              Operatörler: <span className="font-mono">!</span> (Değil), <span className="font-mono">&</span> (Ve),{' '}
              <span className="font-mono">|</span> (Veya), <span className="font-mono">-&gt;</span> (İse),{' '}
              <span className="font-mono">&lt;-&gt;</span> (Ancak ve ancak). Önerme harfleri: p, q, r, s.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              className="flex-1 min-w-[240px] h-9 px-3 text-sm font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
            {['((p -> q) & p) -> q', '!(p & q) <-> (!p | !q)', '(p | q) & !p'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFormulaInput(preset)}
                className="h-9 px-2.5 text-xs font-mono rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>

          {truthResult.error ? (
            <p className="text-xs text-red-400">{truthResult.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  <strong>Sınıflandırma:</strong> {truthResult.classification}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendToPhilosophy()}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#D5B477] text-[#10151E] font-medium whitespace-nowrap shrink-0"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Felsefe Meclisi’nde Tartış
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToMemoryPalace()}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#71C6BD] text-[#10151E] font-medium whitespace-nowrap shrink-0"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Hafıza Kartı Üret
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-black/10 dark:border-white/10 font-mono tabular-nums">
                  <thead>
                    <tr className="bg-[#F7F5F0] dark:bg-[#10151E]">
                      {truthResult.vars.map((v) => (
                        <th key={v} className="px-3 py-2 text-left border-b border-black/10 dark:border-white/10">
                          {v}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left border-b border-black/10 dark:border-white/10 text-[#D5B477]">
                        {formulaInput}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {truthResult.rows.map((row, idx) => (
                      <tr key={idx} className="border-t border-black/5 dark:border-white/5">
                        {truthResult.vars.map((v) => (
                          <td key={v} className="px-3 py-1.5">
                            {row.env[v] ? '1 (D)' : '0 (Y)'}
                          </td>
                        ))}
                        <td
                          className={`px-3 py-1.5 font-semibold ${
                            row.result ? 'text-[#93BF90]' : 'text-red-400'
                          }`}
                        >
                          {row.result ? '1 (DOĞRU)' : '0 (YANLIŞ)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'arguments' && (
        <div className="space-y-4">
          {showNew && (
            <form
              onSubmit={handleCreateArgument}
              className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
            >
              <h2 className="text-base font-semibold">Yeni Argüman Haritası</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Argüman başlığı..."
                  required
                  className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="Biçimsel önerme (ör. (p -> q) & p -> q)"
                  className="h-9 px-3 text-sm font-mono rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                />
              </div>
              <textarea
                rows={3}
                value={premisesText}
                onChange={(e) => setPremisesText(e.target.value)}
                placeholder="Öncülleri her satıra bir tane yazın..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
              <input
                type="text"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Sonuç önermesi..."
                required
                className="w-full h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="h-8 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 text-xs font-medium rounded-lg bg-[#D5B477] text-[#10151E] inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Kaydet
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2">
              {records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSearchParams({ recordId: r.id })}
                  className={`w-full text-left p-3.5 rounded-xl border ${
                    r.id === selected?.id
                      ? 'bg-[#D5B477]/12 border-[#D5B477]'
                      : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                  }`}
                >
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">{r.subtitle}</p>
                </button>
              ))}
              {records.length === 0 && (
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] p-4 rounded-xl border border-dashed border-black/15 dark:border-white/15">
                  Henüz argüman haritası kaydı yok. Yeni bir argüman ekleyebilirsiniz.
                </p>
              )}
            </div>

            <div className="lg:col-span-7">
              {selected ? (
                <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-serif font-semibold">{selected.title}</h3>
                      {selected.payload.formula && (
                        <p className="text-xs font-mono text-[#D5B477] mt-1">{selected.payload.formula}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      title="Argümanı sil"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#546070] dark:text-[#9BA7B6]">Öncüller</p>
                    {selected.payload.premises.map((p, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-sm">
                        <span className="font-mono text-xs mr-2 opacity-60">P{i + 1}.</span>
                        {p}
                      </div>
                    ))}
                    <p className="text-xs font-semibold text-[#93BF90] pt-2">Sonuç (⊢)</p>
                    <div className="p-3 rounded-lg bg-[#93BF90]/15 border border-[#93BF90]/30 text-sm font-medium">
                      {selected.payload.conclusion}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.payload.formula && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormulaInput(selected.payload.formula!);
                          setTab('truth');
                        }}
                        className="h-8 px-3 text-xs rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                      >
                        Doğruluk Tablosunda Aç
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSendToPhilosophy(selected)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg bg-[#D5B477] text-[#10151E] font-medium whitespace-nowrap shrink-0"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      Felsefe Meclisi’ne Aktar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendToMemoryPalace(selected)}
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg bg-[#71C6BD] text-[#10151E] font-medium whitespace-nowrap shrink-0"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Hafıza Sarayı’na Kart Gönder
                    </button>
                  </div>
                  <RecordActionsBar
                    moduleId="mantik-akademisi"
                    entityId={selected.id}
                    entityType="argument_map"
                    entityLabel={selected.title}
                    privacyDomain="genel"
                  />
                </div>
              ) : (
                <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-sm text-[#546070] dark:text-[#9BA7B6]">
                  İncelemek için soldan bir argüman seçin veya yeni argüman oluşturun.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'fallacies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#93BF90]" />
              Temel Çıkarım Kuralları
            </h2>
            <div className="space-y-3">
              {INFERENCE_RULES.map((r) => (
                <div key={r.name} className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs font-mono text-[#D5B477]">{r.schema}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#D5B477]" />
              Safsatalar Kütüphanesi
            </h2>
            <div className="space-y-3">
              {FALLACY_LIBRARY.map((f) => (
                <div key={f.name} className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-1">
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-5">
          <h2 className="text-base font-semibold">Mantık ve Safsata Değerlendirme Testi</h2>
          {QUIZ_QUESTIONS.map((item, idx) => {
            const chosen = quizAnswers[idx];
            return (
              <div key={idx} className="p-4 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2.5">
                <p className="text-sm font-medium">
                  {idx + 1}. {item.q}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt, optIdx) => {
                    const isPicked = chosen === optIdx;
                    const isCorrect = optIdx === item.answer;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQuizAnswers((p) => ({ ...p, [idx]: optIdx }))}
                        className={`px-3 py-1.5 text-xs rounded-lg border inline-flex items-center gap-1.5 ${
                          isPicked
                            ? isCorrect
                              ? 'bg-[#93BF90]/20 border-[#93BF90] text-[#93BF90]'
                              : 'bg-red-500/15 border-red-400 text-red-400'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        {isPicked && isCorrect && <Check className="w-3.5 h-3.5" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Argümanı Sil"
        message={`"${deleteTarget?.title}" kaydını silmek istiyor musunuz?`}
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
