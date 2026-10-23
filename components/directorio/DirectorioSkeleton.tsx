import React from "react";

export function DirectorioSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse"
      aria-label="Cargando negocios del directorio..."
      role="status"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
        >
          {/* Portada Skeleton */}
          <div className="relative h-40 w-full bg-slate-200">
            <div className="absolute top-3 right-3 w-20 h-5 bg-slate-300 rounded-full" />
            <div className="absolute -bottom-4 left-4 w-14 h-14 rounded-xl bg-slate-300 border-2 border-white" />
          </div>

          {/* Cuerpo Skeleton */}
          <div className="pt-6 p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="w-16 h-4 bg-slate-200 rounded" />
                <div className="w-24 h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-3/4 h-5 bg-slate-200 rounded" />
              <div className="w-full h-3 bg-slate-100 rounded" />
              <div className="w-2/3 h-3 bg-slate-100 rounded" />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="w-full h-11 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando directorio...</span>
    </div>
  );
}
