"use client";

import React, { useReducer, useEffect, useState } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";
import { formatBs, buildWhatsappUrl, normalizeWhatsapp } from "@/lib/utils";
import { recordClickBeacon } from "@/lib/analytics-client";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface VistaComercioProps {
  businessId: string;
  items: ItemRow[];
  whatsapp: string;
  businessName: string;
  theme?: {
    primary_color?: string;
    card_shape?: "rounded" | "pill" | "sharp" | "asymmetric";
  };
}

// Estructura del estado del carrito
interface CartState {
  // Mapa de itemId -> cantidad
  quantities: Record<string, number>;
}

type CartAction =
  | { type: "INIT"; quantities: Record<string, number> }
  | { type: "ADD"; itemId: string }
  | { type: "DECREMENT"; itemId: string }
  | { type: "CLEAR" };

const MAX_QUANTITY_PER_ITEM = 20;

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "INIT": {
      return { quantities: action.quantities };
    }
    case "ADD": {
      const current = state.quantities[action.itemId] || 0;
      if (current >= MAX_QUANTITY_PER_ITEM) {
        return state;
      }
      return {
        ...state,
        quantities: {
          ...state.quantities,
          [action.itemId]: current + 1,
        },
      };
    }
    case "DECREMENT": {
      const current = state.quantities[action.itemId] || 0;
      if (current <= 1) {
        const next = { ...state.quantities };
        delete next[action.itemId];
        return { ...state, quantities: next };
      }
      return {
        ...state,
        quantities: {
          ...state.quantities,
          [action.itemId]: current - 1,
        },
      };
    }
    case "CLEAR": {
      return { quantities: {} };
    }
    default:
      return state;
  }
}

export function VistaComercio({
  businessId,
  items,
  whatsapp,
  businessName,
  theme,
}: VistaComercioProps) {
  const [state, dispatch] = useReducer(cartReducer, { quantities: {} });
  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = `cart:${businessId}`;

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

  const buttonBorderRadius =
    shape === "pill"
      ? "rounded-full shadow-md"
      : shape === "sharp"
      ? "rounded-none border border-slate-950 font-mono uppercase tracking-wider"
      : shape === "asymmetric"
      ? "rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm"
      : "rounded-2xl";

  // 1. Carga segura desde localStorage solo en cliente tras montaje (previene errores de hidratación)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          const cleanedQuantities: Record<string, number> = {};

          // Validar contra la lista fresca de items disponibles
          items.forEach((item) => {
            const qty = parsed[item.id];
            // Solo conservar si existe, la cantidad es > 0 y el producto no está agotado
            if (qty && qty > 0 && item.status !== "agotado" && item.status !== "vendido") {
              cleanedQuantities[item.id] = Math.min(qty, MAX_QUANTITY_PER_ITEM);
            }
          });

          dispatch({ type: "INIT", quantities: cleanedQuantities });
        }
      }
    } catch (err) {
      console.warn("No se pudo leer el carrito desde localStorage:", err);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey, items]);

  // 2. Persistencia en localStorage tras cada cambio (solo después de la hidratación inicial)
  useEffect(() => {
    if (!isHydrated) return;

    try {
      if (typeof window !== "undefined") {
        if (Object.keys(state.quantities).length === 0) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, JSON.stringify(state.quantities));
        }
      }
    } catch (err) {
      console.warn("No se pudo persistir el carrito en localStorage:", err);
    }
  }, [state.quantities, isHydrated, storageKey]);

  // Mapa rápido de items para cálculos de totales
  const itemsMap = new Map(items.map((i) => [i.id, i]));

  // Cálculo de totales
  const cartEntries = Object.entries(state.quantities).flatMap(([itemId, qty]) => {
    const item = itemsMap.get(itemId);
    return item ? [{ item, quantity: qty }] : [];
  });

  const totalItemsCount = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalAmount = cartEntries.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );

  // 3. Generación y apertura del pedido por WhatsApp
  const handlePedirWhatsApp = async () => {
    if (totalItemsCount === 0) return;

    try {
      let mensaje = `¡Hola *${businessName}*! 👋 Quisiera realizar el siguiente pedido desde el catálogo de MercadoVirtual Oruro:\n\n`;

      cartEntries.forEach(({ item, quantity }) => {
        const subtotal = item.price * quantity;
        mensaje += `• *${quantity}x* ${item.title} — ${formatBs(subtotal)}\n`;
      });

      mensaje += `\n*Total a pagar:* ${formatBs(totalAmount)}\n`;
      mensaje += `\n¿Tienen disponibilidad para envío o recojo en tienda? ¡Muchas gracias!`;

      const normalizedNumber = normalizeWhatsapp(whatsapp);
      const url = buildWhatsappUrl(normalizedNumber, mensaje);

      // Registrar métrica de clic de forma no bloqueante (sendBeacon / fire-and-forget)
      recordClickBeacon({
        businessId,
        type: "whatsapp_order",
      });

      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Error al generar enlace de WhatsApp:", err);
      alert("Hubo un problema al preparar tu pedido para WhatsApp. Por favor verifica los datos.");
    }
  };

  const handleVaciarCarrito = () => {
    dispatch({ type: "CLEAR" });
  };

  // 4. Estado vacío si no hay productos
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mx-auto text-slate-500">
          🛍️
        </div>
        <h3 className="text-base font-bold text-slate-900">Catálogo sin productos disponibles</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Este establecimiento no tiene artículos en exhibición en este momento. Vuelve a consultar pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Grid Responsivo: 2 col en móvil, 3 en tablet (md), 4 en desktop (lg) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {items.map((item) => {
          const qty = state.quantities[item.id] || 0;
          const isAgotado = item.status === "agotado";
          const itemImages = Array.isArray(item.images) ? item.images : [];
          const mainImage = itemImages[0] || "/placeholder-product.svg";
          const metadata = (item.metadata || {}) as Record<string, unknown>;

          // Extraer posibles etiquetas de metadata (tallas, colores)
          const tallas = metadata.tallas || metadata.talla;
          const colores = metadata.colores || metadata.color;

          return (
            <article
              key={item.id}
              className={`bg-white ${cardBorderRadius} border overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-200 ${
                isAgotado
                  ? "opacity-60 border-slate-200 bg-slate-50"
                  : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="space-y-2.5">
                {/* Imagen Cuadrada con next/image lazy y sizes responsivos */}
                <div className={`relative w-full aspect-square bg-slate-100 overflow-hidden ${imageBorderRadius}`}>
                  <Image
                    src={mainImage}
                    alt={item.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`object-cover transition-transform duration-300 ${
                      !isAgotado ? "hover:scale-105" : "grayscale"
                    }`}
                  />

                  {/* Badge de Agotado, Etiqueta Especial y Precio */}
                  {isAgotado ? (
                    <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-sm uppercase tracking-wide">
                      Agotado
                    </div>
                  ) : metadata.badge_etiqueta ? (
                    <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white px-2.5 py-0.5 rounded-lg text-[11px] font-black shadow-md tracking-wide flex items-center gap-1">
                      <span>🏷️</span>
                      <span>{String(metadata.badge_etiqueta)}</span>
                    </div>
                  ) : null}

                  {!isAgotado && (
                    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-black text-slate-900 shadow-sm">
                      {formatBs(item.price)}
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4 pt-1 space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Etiquetas de metadata: tallas, colores y stock disponible */}
                  {(tallas !== undefined || colores !== undefined || (Boolean(metadata.mostrar_stock) && metadata.stock !== undefined)) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Boolean(metadata.mostrar_stock) && metadata.stock !== undefined ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          📦 {Number(metadata.stock) > 0 ? `${String(metadata.stock)} ${String(metadata.unidad || "disp.")}` : "Sin stock"}
                        </span>
                      ) : null}
                      {tallas !== undefined && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          Talla: {Array.isArray(tallas) ? tallas.join(", ") : String(tallas)}
                        </span>
                      )}
                      {colores !== undefined && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          Color: {Array.isArray(colores) ? colores.join(", ") : String(colores)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles de Compra */}
              <div className="p-3 sm:p-4 pt-0">
                {isAgotado ? (
                  <button
                    disabled
                    className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-slate-200 text-slate-400 font-semibold text-xs cursor-not-allowed"
                    aria-label={`${item.title} está agotado`}
                  >
                    No disponible
                  </button>
                ) : qty > 0 ? (
                  <div className="flex items-center justify-between bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => dispatch({ type: "DECREMENT", itemId: item.id })}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      aria-label={`Quitar una unidad de ${item.title}`}
                    >
                      -
                    </button>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 px-2">
                      {qty}
                    </span>
                    <button
                      onClick={() => dispatch({ type: "ADD", itemId: item.id })}
                      disabled={qty >= MAX_QUANTITY_PER_ITEM}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      aria-label={`Añadir una unidad más de ${item.title}`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => dispatch({ type: "ADD", itemId: item.id })}
                    className={`w-full min-h-[44px] py-2.5 px-3 ${buttonBorderRadius} text-white font-bold text-xs sm:text-sm transition-opacity hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm`}
                    style={{ backgroundColor: "var(--brand-color, #16a34a)" }}
                    aria-label={`Agregar ${item.title} al pedido`}
                  >
                    + Agregar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Espaciador dinámico para evitar que la barra inferior flotante tape elementos inferiores */}
      {totalItemsCount > 0 && <div className="h-28" aria-hidden="true" />}

      {/* 4. Barra Inferior Fija con safe-area padding */}
      {totalItemsCount > 0 && (
        <aside
          aria-label="Barra de pedido"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"} seleccionados
                </div>
                <div className="text-lg font-black text-slate-900 leading-none">
                  {formatBs(totalAmount)}
                </div>
              </div>

              <button
                onClick={handleVaciarCarrito}
                className="text-xs text-slate-500 hover:text-rose-600 underline font-medium px-2 py-1 min-h-[44px] flex items-center"
                aria-label="Vaciar todos los artículos del carrito"
              >
                Vaciar carrito
              </button>
            </div>

            <button
              onClick={handlePedirWhatsApp}
              className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Pedir por WhatsApp ahora"
            >
              <span>Pedir por WhatsApp</span>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.031 2C6.49 2 2 6.49 2 12.031c0 1.802.474 3.557 1.375 5.109L2 22l4.984-1.334a10.007 10.007 0 005.047 1.365h.005c5.536 0 10.026-4.49 10.026-10.031 0-2.68-1.043-5.197-2.937-7.091A9.957 9.957 0 0012.031 2zm5.834 14.195c-.244.686-1.42 1.32-1.954 1.399-.49.073-1.125.102-3.238-.769-2.7-1.113-4.453-3.864-4.587-4.043-.134-.18-1.092-1.455-1.092-2.776 0-1.32.69-1.97 1.026-2.298.244-.244.537-.366.86-.366.104 0 .198.005.284.01.272.012.408.028.588.46.225.54.767 1.874.834 2.012.068.138.113.3.023.48-.09.18-.135.293-.27.452-.136.158-.284.354-.407.476-.135.135-.276.281-.119.55.158.27 1.056 1.738 2.268 2.818 1.558 1.39 2.872 1.82 3.28 1.989.314.13.593.076.81-.157.279-.297.632-.823.951-1.343.226-.367.48-.31.796-.192.316.118 2.002.943 2.344 1.114.341.171.568.257.65.399.083.142.083.824-.16 1.51z" />
              </svg>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
