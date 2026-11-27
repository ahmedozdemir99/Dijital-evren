import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isSafeHttpUrl } from '../../core/services/integrationService';
import { useAppStore } from '../../store/useAppStore';
import { MODULES, OFFICIAL_SOURCES, QUIZ_QUESTIONS } from './data/academyData';
import { ACADEMY_MODULE_ID, ACADEMY_PROGRESS_TYPE, ACADEMY_SOURCE, combinedAcademyProgress } from './progress';

const button = 'inline-flex min-h-11 items-center rounded-lg border border-current/20 px-3 py-2 text-sm font-medium disabled:opacity-50';
const panel = 'min-w-0 space-y-3 rounded-2xl border border-current/15 bg-white p-4 sm:p-5 dark:bg-[#1C2633]';

export function MihrapAcademyPage() {
  const [params, setParams] = useSearchParams();
  const { moduleRecords, addModuleRecord, updateModuleRecord } = useAppStore();
  const { result, local } = useMemo(() => combinedAcademyProgress(moduleRecords), [moduleRecords]);
  const course = MODULES.find((entry) => entry.id === params.get('course')) ?? MODULES[0];
  const lessonIndex = Math.max(0, course.cards.findIndex((item) => item.id === params.get('lesson')));
  const lesson = course.cards[lessonIndex];
  const lessonKey = `${course.index}:${lessonIndex}`;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const questions = QUIZ_QUESTIONS.filter((question) => question.moduleIndex === course.index);

  const navigateLesson = (courseId: string, lessonId?: string) => {
    setFeedback('');
    setParams(lessonId ? { course: courseId, lesson: lessonId } : { course: courseId });
  };

  const exportBackup = () => {
    const bundle = { ...result, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mihrap_akademi_yedek.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link to="/modul/mihrap-ve-minber" className="text-sm underline">Mihrap ve Minber</Link>
        <h1 className="text-3xl font-semibold">Mihrap ve Minber Akademisi</h1>
        <p className="text-sm">Dersleri okuyun, soruları çözün ve ilerlemenizi kaydedin.</p>
        <div className="flex flex-wrap gap-2">
          <Link className={button} to="/ayarlar?uygulama=mihrap-ve-minber#uygulama-yedekleri">Akademi yedeğini içe aktar</Link>
          <button className={button} onClick={exportBackup}>Akademi yedeğini indir</button>
        </div>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(15rem,0.65fr)_minmax(0,1.35fr)]">
        <aside className={panel}>
          <label className="grid gap-2 text-sm font-medium">Ders bölümü
            <select className="w-full rounded-lg border border-current/20 bg-transparent p-2.5"
              value={course.id} onChange={(event) => navigateLesson(event.target.value)}>
              {MODULES.map((entry) => <option value={entry.id} key={entry.id}>{entry.shortTitle}</option>)}
            </select>
          </label>
          <p className="text-sm">{course.cards.filter((_card, index) => result.completed[`${course.index}:${index}`]).length} / {course.cards.length} ders tamamlandı</p>
          <ol className="space-y-1">
            {course.cards.map((item, index) => <li key={item.id}>
              <button type="button" aria-current={item.id === lesson.id ? 'true' : undefined}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-black/5 aria-[current=true]:bg-black/10 dark:hover:bg-white/5 dark:aria-[current=true]:bg-white/10"
                onClick={() => navigateLesson(course.id, item.id)}>
                {item.t}{result.completed[`${course.index}:${index}`] ? ' · Tamamlandı' : ''}
              </button>
            </li>)}
          </ol>
        </aside>
        <section className={panel}>
          <h2 className="text-xl font-semibold">{lesson.t}</h2>
          <p className="whitespace-pre-wrap leading-relaxed">{lesson.body}</p>
          {lesson.ar && <p dir="rtl" lang="ar" className="whitespace-pre-wrap text-lg">{lesson.ar}</p>}
          {lesson.tr && <p className="whitespace-pre-wrap text-sm">{lesson.tr}</p>}
          {lesson.tip && <p className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">{lesson.tip}</p>}
          <ul className="space-y-2 text-sm">
            {lesson.media?.filter((media) => isSafeHttpUrl(media.url)).map((media) => <li key={media.url}>
              <a href={media.url} target="_blank" rel="noreferrer" className="break-words underline">{media.name}</a>
            </li>)}
            {lesson.url && isSafeHttpUrl(lesson.url) && <li><a href={lesson.url} target="_blank" rel="noreferrer" className="underline">Ders bağlantısı</a></li>}
            {OFFICIAL_SOURCES.filter((source) => course.refs.includes(source.key) && isSafeHttpUrl(source.url))
              .map((source) => <li key={source.key}><a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.label}</a></li>)}
          </ul>
          <form key={lesson.id + ':' + (local.get(lesson.id)?.updatedAt ?? '')} className="grid gap-3 border-t border-current/15 pt-3" onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const data = new FormData(event.currentTarget);
            const payload = { cardId: lesson.id, completed: data.has('complete'), note: String(data.get('note')).trim() };
            setBusy(true);
            setFeedback('');
            try {
              const existing = local.get(lesson.id);
              if (existing) await updateModuleRecord(existing.id, { payload });
              else await addModuleRecord({
                moduleId: ACADEMY_MODULE_ID, entityType: ACADEMY_PROGRESS_TYPE, title: lesson.t,
                category: 'Akademi ilerlemesi', tags: ['akademi'], isFavorite: false, isArchived: false,
                privacyDomain: 'ibadet', payload,
              });
              setFeedback('Ders ilerlemeniz kaydedildi.');
            } catch {
              setFeedback('Ders ilerlemesi kaydedilemedi.');
            } finally {
              setBusy(false);
            }
          }}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="complete" defaultChecked={Boolean(result.completed[lessonKey])} /> Dersi tamamladım</label>
            <label className="grid gap-1 text-sm">Ders notum
              <textarea name="note" rows={4} maxLength={12000} defaultValue={result.notes?.[lesson.id] ?? ''}
                className="w-full rounded-lg border border-current/20 bg-transparent p-2.5" />
            </label>
            <button className={button + ' justify-self-start'} disabled={busy}>İlerlemeyi kaydet</button>
          </form>
          {feedback && <p className="text-sm" role="status">{feedback}</p>}
          {questions.length > 0 && <details className="border-t border-current/15 pt-3">
            <summary className="cursor-pointer font-medium">Bölüm soruları</summary>
            <div className="mt-3 space-y-4">
              {questions.map((question) => <fieldset key={question.id} className="space-y-1.5">
                <legend className="font-medium">{question.question}</legend>
                {question.options.map((option, index) => <label className="flex items-start gap-2 text-sm" key={option}>
                  <input type="radio" name={question.id} className="mt-1" checked={answers[question.id] === index}
                    onChange={() => setAnswers((next) => ({ ...next, [question.id]: index }))} /> {option}
                </label>)}
                {answers[question.id] !== undefined && <p role="status" className="text-sm">
                  {answers[question.id] === question.correctIndex ? 'Doğru.' : 'Yanlış.'} {question.explanation}
                </p>}
              </fieldset>)}
            </div>
          </details>}
        </section>
      </div>
      <a href={ACADEMY_SOURCE} target="_blank" rel="noreferrer" className="text-sm underline">Akademinin kaynak sürümü</a>
    </div>
  );
}
