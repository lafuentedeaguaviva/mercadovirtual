export default function Loading() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 gap-4" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-sky-600 animate-spin" />
      <p className="text-sm font-medium text-slate-600">Cargando catálogo...</p>
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
}
