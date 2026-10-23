"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error no controlado en la aplicación:", error);
  }, [error]);

  return (
    <div
      className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl space-y-5 max-w-xl mx-auto my-12"
      role="alert"
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl shadow-inner">
        !
      </div>
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          Ocurrió un problema técnico
        </h2>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          No se pudo procesar la solicitud. Por favor intenta nuevamente o regresa al inicio.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label="Reintentar cargar la página"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="min-h-[44px] px-6 py-2.5 inline-flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          ← Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
