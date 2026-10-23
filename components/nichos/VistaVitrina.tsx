"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";
import { formatBs, buildWhatsappUrl, normalizeWhatsapp } from "@/lib/utils";
import { recordClickBeacon } from "@/lib/analytics-client";
import { ModalZoom } from "@/components/nichos/ModalZoom";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface VistaVitrinaProps {
  businessId: string;
  items: ItemRow[];
  whatsapp: string;
  businessName: string;
  theme?: {
    primary_color?: string;
    card_shape?: "rounded" | "pill" | "sharp" | "asymmetric";
  };
}

export function VistaVitrina({
  businessId,
  items,
  whatsapp,
  businessName,
  theme,
}: VistaVitrinaProps) {
  const [zoomItem, setZoomItem] = useState<ItemRow | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConsultar = (item: ItemRow) => {
    try {
      const precioTexto = item.price && item.price > 0 ? ` (Precio: ${formatBs(item.price)})` : "";
      const mensaje = `Hola ${businessName}, vi este producto en su vitrina digital y quiero más información: ${item.title}${precioTexto}. ¿Tienen disponible?`;

      const normalizedNumber = normalizeWhatsapp(whatsapp);
      const url = buildWhatsappUrl(normalizedNumber, mensaje);

      // Registrar clic en analítica sin bloquear con sendBeacon
      recordClickBeacon({
        businessId,
        type: "whatsapp_consult",
        itemId: item.id,
      });

      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Error al preparar consulta de vitrina por WhatsApp:", err);
    }
  };

  // Formas de tarjeta según el theme (Visualmente dramáticas e inequívocas)
  const shape = theme?.card_shape || "rounded";
  const cardBorderRadius =
    shape === "pill"
      ? "rounded-[42px] border-2 shadow-md hover:shadow-xl"
      : shape === "sharp"
      ? "rounded-none border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
      : shape === "asymmetric"
      ? "rounded-tl-[44px] rounded-br-[44px] rounded-tr-md rounded-bl-md border-2 shadow-md hover:-rotate-1"
      : "rounded-3xl border shadow-sm";

  const imageBorderRadius =
    shape === "pill"
      ? "rounded-t-[40px]"
      : shape === "sharp"
      ? "rounded-none"
      : shape === "asymmetric"
      ? "rounded-tl-[42px] rounded-tr-none"
      : "rounded-t-2xl";

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto text-slate-500">
          🖼️
        </div>
        <h3 className="text-base font-bold text-slate-900">Vitrina digital sin productos</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Este comercio no tiene productos en exhibición en este momento. Vuelve a consultar pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Grid Fluido: 1 col móvil pequeño, 2 col móvil, 3 tablet, 4 desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map((item) => {
          const isAgotado = item.status === "agotado";
          const itemImages = Array.isArray(item.images) ? item.images : [];
          const hasMultipleImages = itemImages.length > 1;
          const mainImage = itemImages[0] || "/placeholder-product.svg";
          const isExpanded = !!expandedDescriptions[item.id];
          const hasPrice = item.price && item.price > 0;

          // Procesar metadata de forma segura como texto plano (nunca HTML)
          const metadata = (item.metadata || {}) as Record<string, unknown>;
          const metadataEntries = Object.entries(metadata).filter(
            ([_, v]) => v !== null && v !== undefined && v !== ""
          );

          return (
            <article
              key={item.id}
              className={`bg-white ${cardBorderRadius} border overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-200 ${
                isAgotado
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="space-y-3">
                {/* Imagen con botón de Zoom accesible */}
                <div className={`relative w-full aspect-square bg-slate-100 overflow-hidden group ${imageBorderRadius}`}>
                  <Image
                    src={mainImage}
                    alt={item.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Badge de Precio o A cotizar */}
                  <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-black text-slate-900 shadow-sm">
                    {hasPrice ? formatBs(item.price) : "A cotizar"}
                  </div>

                  {/* Badge de Agotado */}
                  {isAgotado && (
                    <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide shadow-sm">
                      Agotado
                    </div>
                  )}

                  {/* Botón flotante para abrir Modal de Zoom */}
                  <button
                    onClick={() => setZoomItem(item)}
                    className="absolute bottom-2.5 right-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    aria-label={`Ver imagen ampliada de ${item.title}${hasMultipleImages ? ` (${itemImages.length} fotos)` : ""}`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                      />
                    </svg>
                    {hasMultipleImages && (
                      <span className="sr-only">Galería de imágenes disponible</span>
                    )}
                  </button>
                </div>

                <div className="p-4 pt-1 space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Descripción con 'Ver más' / 'Ver menos' */}
                  {item.description && (
                    <div className="text-xs text-slate-600 leading-relaxed">
                      <p className={isExpanded ? "" : "line-clamp-2"}>
                        {item.description}
                      </p>
                      {item.description.length > 70 && (
                        <button
                          onClick={() => toggleDescription(item.id)}
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 mt-1 min-h-[44px] inline-flex items-center"
                          aria-label={isExpanded ? `Ver menos detalles de ${item.title}` : `Ver más detalles de ${item.title}`}
                        >
                          {isExpanded ? "Ver menos" : "Ver más"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Lista de características desde metadata (Texto plano seguro, sin inyección HTML) */}
                  {metadataEntries.length > 0 && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5 border-t border-slate-100">
                      {metadataEntries.map(([key, val]) => {
                        const cleanKey = key.replace(/_/g, " ");
                        const cleanVal = Array.isArray(val) ? val.join(", ") : String(val);

                        return (
                          <span
                            key={key}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700 capitalize"
                          >
                            <span className="font-semibold">{cleanKey}:</span>&nbsp;
                            <span>{cleanVal}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Consultar Disponibilidad */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => handleConsultar(item)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-white font-bold text-xs sm:text-sm transition-opacity hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm"
                  style={{ backgroundColor: "var(--brand-color, #16a34a)" }}
                  aria-label={`Consultar disponibilidad de ${item.title} por WhatsApp`}
                >
                  <span>💬 Consultar disponibilidad</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Zoom Accesible */}
      {zoomItem && (
        <ModalZoom
          isOpen={!!zoomItem}
          onClose={() => setZoomItem(null)}
          title={zoomItem.title}
          images={Array.isArray(zoomItem.images) && zoomItem.images.length > 0 ? zoomItem.images : ["/placeholder-product.svg"]}
        />
      )}
    </div>
  );
}
