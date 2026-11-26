import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderHeart, Plus, Star, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { getModuleById } from '../core/registry/modules';
import type { ThematicCollection } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

export function CollectionsPage() {
  const {
    books,
    quotes,
    moduleRecords,
    moduleSettings,
    collections,
    addCollection,
    deleteCollection,
    removeItemFromCollection,
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#D6B782');
  const [deleteTarget, setDeleteTarget] = useState<ThematicCollection | null>(null);

  const favBooks = books.filter((b) => b.isFavorite);
  const favQuotes = quotes.filter((q) => q.isFavorite);
  const favRecords = moduleRecords.filter((r) => r.isFavorite && !r.isArchived);
  const favModules = useMemo(
    () =>
      moduleSettings
        .filter((s) => s.isFavorite)
        .map((s) => getModuleById(s.moduleId))
        .filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [moduleSettings]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addCollection(title, description, color);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
          Koleksiyonlar ve Favoriler Merkezi
        </h1>
        <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1">
          Farklı modüllerdeki kayıtları kopyalamadan referans kimliğiyle tematik koleksiyonlarda toplayın ve tüm favorilerinize tek yerden erişin.
        </p>
      </div>

      {/* Unified Favorites Section */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-4 h-4 text-[#D5B477] fill-[#D5B477]" />
          Tüm Modüllerden Favoriler
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2">
            <p className="font-semibold">Favori Modüller ({favModules.length})</p>
            {favModules.length === 0 ? (
              <p className="text-[#546070] dark:text-[#9BA7B6]">Henüz favori modül seçilmedi.</p>
            ) : (
              favModules.map((m) => (
                <Link key={m.id} to={m.route} className="block text-[#71C6BD] hover:underline truncate">
                  {m.name}
                </Link>
              ))
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2">
            <p className="font-semibold">Favori Kitaplar ({favBooks.length})</p>
            {favBooks.length === 0 ? (
              <p className="text-[#546070] dark:text-[#9BA7B6]">Favori kitap henüz yok.</p>
            ) : (
              favBooks.map((b) => (
                <Link
                  key={b.id}
                  to={`/modul/dijital-kutuphanem?bookId=${b.id}`}
                  className="block text-[#D6B782] hover:underline truncate"
                >
                  {b.title}
                </Link>
              ))
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2">
            <p className="font-semibold">Favori Alıntılar ({favQuotes.length})</p>
            {favQuotes.length === 0 ? (
              <p className="text-[#546070] dark:text-[#9BA7B6]">Favori alıntı henüz yok.</p>
            ) : (
              favQuotes.map((q) => (
                <Link
                  key={q.id}
                  to={`/modul/alinti-defterim?quoteId=${q.id}`}
                  className="block hover:underline truncate"
                >
                  “{q.text.slice(0, 48)}…”
                </Link>
              ))
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] space-y-2">
            <p className="font-semibold">Diğer Favori Kayıtlar ({favRecords.length})</p>
            {favRecords.length === 0 ? (
              <p className="text-[#546070] dark:text-[#9BA7B6]">Diğer modüllerde favori yok.</p>
            ) : (
              favRecords.map((r) => (
                <Link
                  key={r.id}
                  to={`/modul/${r.moduleId}?recordId=${r.id}`}
                  className="block text-[#88B4FF] hover:underline truncate"
                >
                  {r.title}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Create Thematic Collection */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
      >
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FolderHeart className="w-4 h-4 text-[#D6B782]" />
          Yeni Modüller Arası Koleksiyon Oluştur
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Koleksiyon adı (ör. Doğu-Batı Felsefe Okumaları)..."
            required
            className="sm:col-span-2 h-9 px-3 text-sm rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kısa açıklama..."
            className="h-9 px-3 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E] border border-black/10 dark:border-white/10"
          />
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Koleksiyon rengi"
              className="h-9 w-12 rounded cursor-pointer bg-transparent shrink-0"
            />
            <button
              type="submit"
              className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] font-medium whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Oluştur</span>
            </button>
          </div>
        </div>
      </form>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-dashed border-black/15 dark:border-white/15 text-sm text-[#546070] dark:text-[#9BA7B6]">
          Henüz tematik koleksiyon oluşturulmadı. Yukarıdaki formdan ilk koleksiyonunuzu ekleyebilirsiniz.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {collections.map((col) => (
            <div
              key={col.id}
              className="p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ backgroundColor: col.color }} />
                  <div>
                    <h3 className="text-lg font-semibold">{col.title}</h3>
                    {col.description && (
                      <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">{col.description}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(col)}
                  aria-label="Koleksiyonu sil"
                  className="h-8 w-8 inline-flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {col.items.length === 0 ? (
                <p className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                  Henüz öğe eklenmedi. Herhangi bir modülde "Koleksiyona Ekle" butonunu kullanabilirsiniz.
                </p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {col.items.map((item) => {
                    const modName = getModuleById(item.moduleId)?.name ?? item.moduleId;
                    const targetRoute =
                      item.moduleId === 'dijital-kutuphanem'
                        ? `/modul/dijital-kutuphanem?bookId=${item.entityId}`
                        : item.moduleId === 'alinti-defterim'
                          ? `/modul/alinti-defterim?quoteId=${item.entityId}`
                          : `/modul/${item.moduleId}?recordId=${item.entityId}`;
                    return (
                      <div
                        key={item.entityId}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F7F5F0] dark:bg-[#10151E]"
                      >
                        <Link to={targetRoute} className="truncate hover:underline">
                          <strong>{item.label}</strong> ·{' '}
                          <span className="text-[#546070] dark:text-[#9BA7B6]">{modName}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItemFromCollection(col.id, item.entityId)}
                          aria-label="Koleksiyondan çıkar"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-[#546070] hover:text-red-400 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Koleksiyonu Sil"
        description={`"${deleteTarget?.title}" koleksiyonunu silmek istiyor musunuz? Bağlı kayıtların kendisi silinmez, yalnızca koleksiyon grubu kaldırılır.`}
        confirmLabel="Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteCollection(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
