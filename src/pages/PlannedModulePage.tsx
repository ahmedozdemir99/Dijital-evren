import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Link2, Shield, Star } from 'lucide-react';
import { getCenterById, getModuleById } from '../core/registry/modules';
import { useAppStore } from '../store/useAppStore';

export function PlannedModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { moduleSettings, toggleModuleFavorite, toggleModuleEnabled } = useAppStore();

  const mod = moduleId ? getModuleById(moduleId) : undefined;

  if (!mod) {
    return (
      <div className="py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Modül bulunamadı</h1>
        <Link to="/moduller" className="text-sm text-[#8C6B32] dark:text-[#D6B782] hover:underline">
          Modül Dizinine Dön
        </Link>
      </div>
    );
  }

  const center = getCenterById(mod.centerId);
  const setting = moduleSettings.find((s) => s.moduleId === mod.id);
  const enabled = setting?.enabled ?? true;
  const isFav = setting?.isFavorite ?? false;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to={`/merkez/${mod.centerId}`}
        className="inline-flex items-center gap-1.5 text-xs text-[#546070] dark:text-[#9BA7B6] hover:text-[#141923] dark:hover:text-[#F1F3F5]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {center?.name} Merkezine Dön
      </Link>

      <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
              <span
                className="w-2.5 h-2.5 rounded-[2px]"
                style={{ backgroundColor: center?.color ?? '#D6B782' }}
                aria-hidden="true"
              />
              <span>{center?.name}</span>
              <span aria-hidden="true">·</span>
              <span>Aşama {mod.stage}</span>
              <span aria-hidden="true">·</span>
              <span>Geliştirme Aşamasında</span>
            </div>
            <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
              {mod.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleModuleFavorite(mod.id)}
              className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
            >
              <Star
                className={`w-3.5 h-3.5 shrink-0 ${
                  isFav ? 'text-[#D5B477] fill-[#D5B477]' : 'text-[#546070]'
                }`}
              />
              <span>{isFav ? 'Favoride' : 'Favorile'}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleModuleEnabled(mod.id)}
              className="h-8 inline-flex items-center justify-center px-3 text-xs rounded-lg border border-black/10 dark:border-white/10 whitespace-nowrap"
            >
              {enabled ? 'Etkin' : 'Devre Dışı'}
            </button>
          </div>
        </div>

        <p className="text-base leading-relaxed text-[#546070] dark:text-[#C7D0DC]">
          {mod.shortDescription}
        </p>

        <div className="p-4 rounded-xl bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10 flex items-start gap-3">
          <Clock className="w-4 h-4 text-[#D5B477] shrink-0 mt-0.5" />
          <div className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Bu modül <strong>Aşama {mod.stage}</strong> kapsamında geliştirilmek üzere modül kayıt
            sistemine tanımlanmıştır. Şu anda yalnızca yer tutucu durum kartı gösterilmektedir; sahte
            veri veya çalışmayan kontroller üretilmemiştir.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Planlanan Temel Yetenekler</h2>
            <ul className="space-y-1.5 text-sm text-[#546070] dark:text-[#9BA7B6]">
              {mod.plannedFeatures.map((feat, i) => (
                <li key={i}>• {feat}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Veri Mimarisi ve İzinler</h2>
            <div className="space-y-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Gizlilik alanı: {mod.privacyDomain}</span>
              </div>
              {mod.isDataOwner && (
                <div>Asli veri sahipliği: {mod.isDataOwner}</div>
              )}
              {mod.feedsInto.length > 0 && (
                <div>
                  Beslediği modüller:{' '}
                  {mod.feedsInto
                    .map((id) => getModuleById(id)?.name ?? id)
                    .join(', ')}
                </div>
              )}
            </div>

            {mod.hasExistingApp && (
              <Link
                to="/entegrasyonlar"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C6B32] dark:text-[#D6B782] hover:underline pt-1"
              >
                <Link2 className="w-3.5 h-3.5" />
                Mevcut Uygulama Entegrasyonunu Yapılandır →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
