export default function CatalogLoading() {
  return (
    <div className="space-y-8 animate-pulse" role="status" aria-label="Cargando catálogo del negocio">
      {/* Portada Skeleton */}
      <div className="w-full h-48 sm:h-64 rounded-3xl bg-slate-200" />

      {/* Info Negocio Skeleton */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 px-4">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-300 border-4 border-white shadow-md" />
        <div className="space-y-2 flex-1 text-center sm:text-left">
          <div className="h-7 w-48 bg-slate-200 rounded-lg mx-auto sm:mx-0" />
          <div className="h-4 w-32 bg-slate-200 rounded mx-auto sm:mx-0" />
        </div>
      </div>

      {/* Items Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="w-full aspect-square bg-slate-100 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
            </div>
            <div className="h-11 w-full bg-slate-200 rounded-xl" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando contenido del catálogo...</span>
    </div>
  );
}
