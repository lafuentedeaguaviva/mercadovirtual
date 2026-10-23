import React from "react";
import type { BusinessMetrics30Days } from "@/app/actions/analytics";

interface TarjetaMetricasProps {
  metrics: BusinessMetrics30Days;
}

export function TarjetaMetricas({ metrics }: TarjetaMetricasProps) {
  const totalInteractions =
    metrics.whatsappClicks + metrics.mapsClicks + metrics.bookingClicks;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Encabezado de la tarjeta */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Analítica — Últimos 30 días
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interacciones reales de clientes en tu catálogo phygital y tótem 3D.
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          {totalInteractions} {totalInteractions === 1 ? "interacción" : "interacciones"} totales
        </span>
      </div>

      {/* Grid de Contadores Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* WhatsApp */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-800">Clics a WhatsApp</p>
            <p className="text-2xl font-black text-emerald-950">{metrics.whatsappClicks}</p>
            <p className="text-[11px] text-emerald-700">Pedidos y consultas directas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            💬
          </div>
        </div>

        {/* Mapas */}
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-sky-800">Clics a Mapas</p>
            <p className="text-2xl font-black text-sky-950">{metrics.mapsClicks}</p>
            <p className="text-[11px] text-sky-700">Rutas hacia tu punto físico</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📍
          </div>
        </div>

        {/* Reservas */}
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-800">Reservas Solicitadas</p>
            <p className="text-2xl font-black text-teal-950">{metrics.bookingClicks}</p>
            <p className="text-[11px] text-teal-700">Citas agendadas por clientes</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            📅
          </div>
        </div>
      </div>

      {/* Top 5 Items más consultados */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Top 5 Productos o Servicios Más Consultados
        </h3>

        {metrics.topItems.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
            Aún no hay consultas específicas de artículos en este período.
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.topItems.map((item, idx) => {
              const maxClicks = metrics.topItems[0]?.clicks || 1;
              const percent = Math.min(100, Math.round((item.clicks / maxClicks) * 100));

              return (
                <div
                  key={item.itemId}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-slate-800 truncate max-w-[280px] sm:max-w-md">
                      <span className="text-slate-400 mr-2 font-mono">{idx + 1}.</span>
                      {item.title}
                    </span>
                    <span className="font-bold text-emerald-700 font-mono text-xs whitespace-nowrap">
                      {item.clicks} {item.clicks === 1 ? "consulta" : "consultas"}
                    </span>
                  </div>
                  {/* Barra de progreso visual */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
