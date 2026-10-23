import React from "react";

interface BarraUsoItemsProps {
  currentCount: number;
  maxItems: number;
}

export function BarraUsoItems({ currentCount, maxItems }: BarraUsoItemsProps) {
  const percentage = maxItems > 0 ? Math.min(Math.round((currentCount / maxItems) * 100), 100) : 100;

  // Color de barra: verde < 80%, ámbar 80-99%, rojo 100%
  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-700";

  if (percentage >= 100) {
    barColor = "bg-rose-500";
    textColor = "text-rose-700";
  } else if (percentage >= 80) {
    barColor = "bg-amber-500";
    textColor = "text-amber-800";
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-slate-600">Capacidad de Catálogo</span>
        <span className={textColor}>
          {currentCount} de {maxItems} productos ({percentage}%)
        </span>
      </div>

      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage >= 100 && (
        <p className="text-[11px] font-semibold text-rose-600">
          ⚠️ Has alcanzado el límite máximo de items de tu plan actual.
        </p>
      )}
    </div>
  );
}
