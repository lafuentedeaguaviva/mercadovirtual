import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl space-y-4 max-w-xl mx-auto my-12">
      <span className="text-5xl font-black bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
        404
      </span>
      <h1 className="text-2xl font-bold text-white">Negocio o Catálogo no encontrado</h1>
      <p className="text-sm text-slate-300 max-w-md leading-relaxed">
        El comercio o enlace solicitado no existe en la red o fue retirado temporalmente.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="min-h-[44px] px-6 py-2.5 inline-flex items-center justify-center bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label="Volver a la página principal"
        >
          ← Explorar Negocios de Oruro
        </Link>
      </div>
    </div>
  );
}
