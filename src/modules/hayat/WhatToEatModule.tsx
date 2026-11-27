import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Calendar, Check, Plus, ShoppingCart, Trash2, Utensils } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ModuleWorkbenchHeader } from '../../components/shared/ModuleWorkbenchHeader';
import { RecordActionsBar } from '../../components/shared/RecordActionsBar';
import type { ModuleRecord } from '../../core/types/entities';
import { useModuleStore } from '../../store/useModuleStore';

interface RecipePayload {
  kind: 'recipe' | 'pantry';
  ingredients: string[];
  prepMinutes: number;
  instructions: string;
}

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export function WhatToEatModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { moduleRecords, moduleSettings, recordModuleOpen, addModuleRecord, deleteModuleRecord } =
    useModuleStore();

  useEffect(() => {
    recordModuleOpen('bugun-ne-yesem');
  }, [recordModuleOpen]);

  const showDemo =
    (moduleSettings.find((s) => s.moduleId === 'bugun-ne-yesem')?.customSettings?.showDemo as
      | boolean
      | undefined) ?? true;

  const recipes = useMemo(
    () =>
      moduleRecords.filter(
        (r) =>
          r.moduleId === 'bugun-ne-yesem' &&
          !r.isArchived &&
          (showDemo || !r.isDemo)
      ) as Array<ModuleRecord<RecipePayload>>,
    [moduleRecords, showDemo]
  );

  const [tab, setTab] = useState<'recipes' | 'pantry' | 'planner'>('recipes');
  const [pantryInput, setPantryInput] = useState('mısır unu, tereyağı, kaşar, yumurta, domates, soğan');
  const [weeklyPlan, setWeeklyPlan] = useState<Record<string, string>>({});

  // New recipe form
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Ana Yemek');
  const [ingredientsStr, setIngredientsStr] = useState('');
  const [prepMinutes, setPrepMinutes] = useState(30);
  const [instructions, setInstructions] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModuleRecord<RecipePayload> | null>(null);

  const selectedId = searchParams.get('recordId') || recipes[0]?.id || null;
  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  const pantryItems = useMemo(
    () =>
      pantryInput
        .split(/[\n,]+/)
        .map((s) => s.trim().toLocaleLowerCase('tr-TR'))
        .filter(Boolean),
    [pantryInput]
  );

  // Rank recipes by pantry ingredient match
  const matchedRecipes = useMemo(() => {
    return recipes
      .map((r) => {
        const total = Math.max(1, r.payload.ingredients.length);
        const hits = r.payload.ingredients.filter((ing) =>
          pantryItems.some((p) => ing.toLocaleLowerCase('tr-TR').includes(p) || p.includes(ing.toLocaleLowerCase('tr-TR')))
        );
        const missing = r.payload.ingredients.filter((ing) => !hits.includes(ing));
        return {
          recipe: r,
          matchPct: Math.round((hits.length / total) * 100),
          missing,
        };
      })
      .sort((a, b) => b.matchPct - a.matchPct);
  }, [recipes, pantryItems]);

  // Auto-generated shopping list from weekly meal plan minus pantry
  const shoppingList = useMemo(() => {
    const needed = new Set<string>();
    for (const day of DAYS) {
      const recId = weeklyPlan[day];
      const rec = recipes.find((r) => r.id === recId);
      if (!rec) continue;
      for (const ing of rec.payload.ingredients) {
        const has = pantryItems.some((p) => ing.toLocaleLowerCase('tr-TR').includes(p));
        if (!has) needed.add(ing);
      }
    }
    return Array.from(needed);
  }, [weeklyPlan, recipes, pantryItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ingList = ingredientsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const created = await addModuleRecord<RecipePayload>({
      moduleId: 'bugun-ne-yesem',
      entityType: 'recipe',
      title: title.trim(),
      subtitle: `${category} · ${prepMinutes} dk`,
      category,
      tags: ['Tarif'],
      isFavorite: false,
      isArchived: false,
      privacyDomain: 'genel',
      payload: {
        kind: 'recipe',
        ingredients: ingList,
        prepMinutes: Number(prepMinutes),
        instructions: instructions.trim(),
      },
    });
    setTitle('');
    setIngredientsStr('');
    setInstructions('');
    setShowNew(false);
    setSearchParams({ recordId: created.id });
  };

  return (
    <div className="space-y-6">
      <ModuleWorkbenchHeader
        moduleId="bugun-ne-yesem"
        recordCount={recipes.length}
        primaryActionLabel="Yeni Tarif Ekle"
        onPrimaryAction={() => setShowNew((v) => !v)}
      />

      <div className="p-3 rounded-xl bg-[#DFA183]/12 border border-[#DFA183]/30 flex items-center gap-2 text-xs">
        <AlertCircle className="w-4 h-4 text-[#DFA183] shrink-0" />
        <span>Bilgilendirme: Mutfak planlaması ve tarif önerileri günlük yaşam kolaylığı amaçlıdır; tıbbi beslenme veya diyet tavsiyesi yerine geçmez.</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        {[
          { id: 'recipes', label: `Tarif Defteri (${recipes.length})` },
          { id: 'pantry', label: 'Eldeki Malzemelerle Tarif Bul' },
          { id: 'planner', label: 'Haftalık Menü ve Alışveriş Listesi' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`h-8 px-3 text-xs rounded-lg inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-[#DFA183] text-[#10151E] font-medium'
                : 'text-[#546070] dark:text-[#9BA7B6] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
        >
          <h2 className="text-base font-semibold">Yeni Yemek Tarifi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yemek adı..." required className="h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori..." className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
            <input type="number" min={1} max={1440} value={prepMinutes} onChange={(e) => setPrepMinutes(Math.max(1, Number(e.target.value) || 1))} placeholder="Hazırlık (dk)" className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 tabular-nums" />
          </div>
          <input type="text" value={ingredientsStr} onChange={(e) => setIngredientsStr(e.target.value)} placeholder="Malzemeler (virgülle ayırın: tereyağı, mısır unu, peynir...)" required className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
          <textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Hazırlanış adımları..." required className="w-full px-3 py-2 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="h-8 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 inline-flex items-center justify-center whitespace-nowrap shrink-0">Vazgeç</button>
            <button type="submit" className="h-8 px-4 text-xs font-medium rounded-lg bg-[#DFA183] text-[#10151E] inline-flex items-center justify-center whitespace-nowrap shrink-0">Kaydet</button>
          </div>
        </form>
      )}

      {tab === 'pantry' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-2">
            <label className="text-xs font-semibold">Mutfağınızdaki Malzemeler (virgülle ayırın)</label>
            <input
              type="text"
              value={pantryInput}
              onChange={(e) => setPantryInput(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
            />
          </div>
          {matchedRecipes.length === 0 ? (
            <div className="p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
              Karşılaştırma için henüz kayıtlı tarif bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedRecipes.map(({ recipe, matchPct, missing }) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => {
                    setTab('recipes');
                    setSearchParams({ recordId: recipe.id });
                  }}
                  className="text-left p-4 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 hover:border-[#DFA183]/60 space-y-2 text-xs transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{recipe.title}</span>
                    <span className="font-mono tabular-nums text-[#93BF90] font-semibold shrink-0">%{matchPct} Uyum</span>
                  </div>
                  <p className="text-[#546070] dark:text-[#9BA7B6]">
                    Malzemeler: {recipe.payload.ingredients.join(', ')}
                  </p>
                  <p className={missing.length === 0 ? 'text-[#93BF90]' : 'text-[#DFA183]'}>
                    {missing.length === 0 ? 'Tüm malzemeler elinizde!' : `Eksik: ${missing.join(', ')}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#DFA183]" />
                Haftalık Menü Planlayıcı
              </h2>
              {Object.values(weeklyPlan).some(Boolean) && (
                <button
                  type="button"
                  onClick={() => setWeeklyPlan({})}
                  className="h-8 px-2.5 text-xs rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Menüyü Temizle
                </button>
              )}
            </div>
            <div className="space-y-2 text-xs">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-24 font-medium shrink-0">{day}</span>
                  <select
                    value={weeklyPlan[day] ?? ''}
                    onChange={(e) => setWeeklyPlan((p) => ({ ...p, [day]: e.target.value }))}
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
                  >
                    <option value="">Tarif seç...</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#93BF90]" />
              Otomatik Alışveriş Listesi
            </h2>
            <p className="text-[11px] text-[#546070] dark:text-[#9BA7B6]">
              Haftalık menüdeki tariflerden mutfağınızda eksik olan malzemeler çıkarılmıştır.
            </p>
            {shoppingList.length === 0 ? (
              <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">Henüz eksik malzeme listelenmedi.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {shoppingList.map((item) => (
                  <li key={item} className="flex items-center gap-2 p-2 rounded bg-[#F7F5F0] dark:bg-[#10151E]">
                    <Check className="w-3.5 h-3.5 text-[#DFA183]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSearchParams({ recordId: r.id })}
                className={`w-full text-left p-3.5 rounded-xl border ${
                  r.id === selected?.id
                    ? 'bg-[#DFA183]/12 border-[#DFA183]'
                    : 'bg-white dark:bg-[#1C2633] border-black/10 dark:border-white/10'
                }`}
              >
                <p className="font-semibold text-sm">{r.title}</p>
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5 tabular-nums">
                  {r.category} · {r.payload.prepMinutes} dk
                </p>
              </button>
            ))}
            {recipes.length === 0 && (
              <div className="p-6 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-center text-xs text-[#546070] dark:text-[#9BA7B6]">
                Henüz tarif eklenmedi. “Yeni Tarif Ekle” butonuyla tarif oluşturabilirsiniz.
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#DFA183] inline-flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5" />
                      {selected.category} · {selected.payload.prepMinutes} dakika
                    </span>
                    <h2 className="text-2xl font-serif font-semibold mt-0.5">{selected.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    title="Tarifi sil"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] text-xs space-y-1">
                  <strong>Malzemeler:</strong>
                  <p>{selected.payload.ingredients.join(' · ')}</p>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-line">{selected.payload.instructions}</p>

                <RecordActionsBar
                  moduleId="bugun-ne-yesem"
                  entityId={selected.id}
                  entityType="recipe"
                  entityLabel={selected.title}
                  privacyDomain="genel"
                />
              </div>
            ) : (
              <div className="p-10 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 text-center text-sm text-[#546070] dark:text-[#9BA7B6]">
                Görüntülemek için soldan bir tarif seçin veya yeni tarif ekleyin.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Tarifi Sil"
        description={`"${deleteTarget?.title}" tarif kaydını silmek istiyor musunuz?`}
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
