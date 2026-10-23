"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";
import { formatBs, buildWhatsappUrl } from "@/lib/utils";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface ChildBusinessWithItems {
  business: BusinessRow;
  items: ItemRow[];
}

interface VistaPlazaComidasProps {
  plazaName: string;
  mesa?: string;
  childBusinesses: ChildBusinessWithItems[];
}

// Estructura de ítem en el carrito con referencia al puesto
interface CartItemEntry {
  item: ItemRow;
  business: BusinessRow;
  quantity: number;
}

export function VistaPlazaComidas({
  plazaName,
  mesa,
  childBusinesses,
}: VistaPlazaComidasProps) {
  // Filtro de puestos: "all" para ver todas las comidas de la plaza o un Set de IDs seleccionados
  const [selectedStallIds, setSelectedStallIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado del Carrito Multi-Puesto: Record<itemId, CartItemEntry>
  const [cart, setCart] = useState<Record<string, CartItemEntry>>({});
  
  // Modal para revisar pedido agrupado por puestos
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Categorías presentes en los locales de la plaza
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    childBusinesses.forEach(({ business }) => {
      const cat = (business.theme as any)?.category || "Comida Típica";
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [childBusinesses]);

  // Manejo de selección múltiple de puestos
  const toggleStallSelection = (stallId: string) => {
    setSelectedStallIds((prev) => {
      if (prev.includes(stallId)) {
        return prev.filter((id) => id !== stallId);
      } else {
        return [...prev, stallId];
      }
    });
  };

  const selectAllStalls = () => {
    setSelectedStallIds([]); // Vacío significa "todos los puestos seleccionados"
  };

  const isAllSelected = selectedStallIds.length === 0;

  // Filtrar los puestos a mostrar en pantalla por categoría, selección y búsqueda
  const visibleStalls = useMemo(() => {
    let list = isAllSelected
      ? childBusinesses
      : childBusinesses.filter((cb) => selectedStallIds.includes(cb.business.id));

    if (selectedCategory !== "todas") {
      list = list.filter((cb) => {
        const cat = (cb.business.theme as any)?.category || "Comida Típica";
        return cat === selectedCategory;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (cb) =>
          cb.business.name.toLowerCase().includes(q) ||
          (cb.business.description && cb.business.description.toLowerCase().includes(q)) ||
          cb.items.some((it) => it.title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [childBusinesses, selectedStallIds, isAllSelected, selectedCategory, searchTerm]);

  // Funciones de gestión de carrito
  const addToCart = (item: ItemRow, business: BusinessRow) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = existing ? Math.min(existing.quantity + 1, 20) : 1;
      return {
        ...prev,
        [item.id]: {
          item,
          business,
          quantity,
        },
      };
    });
  };

  const decrementInCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const clearCart = () => {
    setCart({});
    setIsReviewOpen(false);
  };

  // Cálculos del Carrito
  const cartEntries = Object.values(cart);
  const totalItemsCount = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCartPrice = cartEntries.reduce(
    (sum, entry) => sum + (entry.item.price || 0) * entry.quantity,
    0
  );

  // Agrupación por puesto para enviar pedidos a los WhatsApp correspondientes
  const ordersByBusiness = useMemo(() => {
    const groups: Record<
      string,
      {
        business: BusinessRow;
        items: Array<{ item: ItemRow; quantity: number }>;
        subtotal: number;
      }
    > = {};

    cartEntries.forEach(({ item, business, quantity }) => {
      if (!groups[business.id]) {
        groups[business.id] = {
          business,
          items: [],
          subtotal: 0,
        };
      }
      groups[business.id].items.push({ item, quantity });
      groups[business.id].subtotal += (item.price || 0) * quantity;
    });

    return Object.values(groups);
  }, [cartEntries]);

  if (childBusinesses.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
        <p className="text-base font-semibold text-slate-800">Plaza gastronómica sin puestos activos</p>
        <p className="text-xs text-slate-500">Pronto se habilitarán locales de comida.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Alerta de mesa física desde QR en tótem */}
      {mesa && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span>Estás ordenando para la <strong>Mesa #{mesa}</strong></span>
          </div>
          <span className="text-xs bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
            Servicio a Mesa
          </span>
        </div>
      )}

      {/* Selector Multi-Tienda de Puestos */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🏪</span>
              <span>Elige las tiendas de comida que deseas ver:</span>
            </h2>
            <p className="text-xs text-slate-500">
              Puedes seleccionar varias tiendas a la vez para armar un pedido combinado en tu mesa.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={selectAllStalls}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                isAllSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Ver todas ({childBusinesses.length})
            </button>
          </div>
        </div>

        {/* Buscador de Puestos o Comidas */}
        <div className="relative pt-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tienda o plato (ej: charquekan, api, hamburguesa, pollo)..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
          />
          <span className="absolute left-3 top-3.5 text-xs text-slate-400">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Categorías Gastronómicas */}
        {availableCategories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <button
              onClick={() => setSelectedCategory("todas")}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                selectedCategory === "todas"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🍽️ Todas
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Chips de selección múltiple */}
        <div className="flex flex-wrap gap-2 pt-1">
          {childBusinesses.map(({ business, items }) => {
            const isSelected = isAllSelected || selectedStallIds.includes(business.id);
            return (
              <button
                key={business.id}
                onClick={() => toggleStallSelection(business.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2 ${
                  isSelected
                    ? "bg-rose-50 border-rose-300 text-rose-950 shadow-sm ring-1 ring-rose-400"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60"
                }`}
                aria-pressed={isSelected}
              >
                <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  isSelected ? "bg-rose-600 text-white" : "border border-slate-300 bg-white"
                }`}>
                  {isSelected ? "✓" : ""}
                </span>
                <span>{business.name}</span>
                <span className="text-[11px] font-normal px-1.5 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-500">
                  {items.length} platos
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listado de menús agrupados por las tiendas seleccionadas */}
      <div className="space-y-8">
        {visibleStalls.map(({ business, items }) => {
          return (
            <section
              key={business.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4"
            >
              {/* Encabezado del Puesto */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  {business.logo_url && (
                    <div className="relative w-11 h-11 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                      <Image
                        src={business.logo_url}
                        alt={business.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{business.name}</h3>
                    {business.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{business.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                    {items.length} platos en carta
                  </span>
                </div>
              </div>

              {/* Grid de Platos de este Puesto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const itemImages = Array.isArray(item.images) ? item.images : [];
                  const mainImage = itemImages[0] || (item as any).image_url || "/placeholder-product.svg";
                  const cartEntry = cart[item.id];
                  const inCartQty = cartEntry?.quantity || 0;

                  return (
                    <article
                      key={item.id}
                      className="bg-slate-50/60 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                    >
                      <div>
                        <div className="relative w-full aspect-[16/10] bg-slate-100">
                          <Image
                            src={mainImage}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 33vw"
                            className="object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-white/95 px-2.5 py-1 rounded-xl text-xs font-extrabold text-slate-900 shadow-sm border border-slate-100">
                            {formatBs(item.price)}
                          </div>
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 pt-0">
                        {inCartQty > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-rose-300 rounded-xl p-1 shadow-sm">
                            <button
                              onClick={() => decrementInCart(item.id)}
                              className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 font-bold flex items-center justify-center hover:bg-rose-100 transition-colors text-base"
                              aria-label={`Disminuir ${item.title}`}
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-slate-900 px-2">
                              {inCartQty} en pedido
                            </span>
                            <button
                              onClick={() => addToCart(item, business)}
                              className="w-9 h-9 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center hover:bg-rose-700 transition-colors text-base"
                              aria-label={`Aumentar ${item.title}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item, business)}
                            className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
                            aria-label={`Agregar ${item.title} a la orden`}
                          >
                            <span>+ Agregar al Pedido</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Barra Flotante Inferior de Pedido Multi-Tienda */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-sm">
                {totalItemsCount}
              </div>
              <div>
                <p className="text-xs text-slate-300">
                  {ordersByBusiness.length} {ordersByBusiness.length === 1 ? "tienda" : "tiendas"} en tu orden
                  {mesa ? ` • Mesa #${mesa}` : ""}
                </p>
                <p className="text-base font-extrabold text-white">
                  Total: {formatBs(totalCartPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-2 rounded-xl transition-colors min-h-[44px]"
              >
                Vaciar
              </button>
              <button
                onClick={() => setIsReviewOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-md"
              >
                <span>Revisar y Pedir</span>
                <span className="text-base">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Drawer para Desglose y Envíos por WhatsApp a Cada Puesto */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Resumen de tu Pedido Gastronómico
                </h3>
                <p className="text-xs text-slate-500">
                  {plazaName} {mesa ? `• Servicio para Mesa #${mesa}` : ""}
                </p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm min-h-[44px] min-w-[44px]"
                aria-label="Cerrar resumen"
              >
                ✕
              </button>
            </div>

            {/* Modal Content: Desglose por Puesto */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-100">
              {ordersByBusiness.map(({ business, items, subtotal }) => {
                const mesaNotice = mesa ? ` (Mesa #${mesa})` : "";
                const itemsSummary = items
                  .map((entry) => `• ${entry.quantity}x ${entry.item.title} (${formatBs((entry.item.price || 0) * entry.quantity)})`)
                  .join("\n");
                const message = `¡Hola *${business.name}* en *${plazaName}*! 👋 Quisiera hacer el siguiente pedido${mesaNotice}:\n\n${itemsSummary}\n\n*Total puesto:* ${formatBs(subtotal)}\n\n¿Cuánto tiempo demora la preparación?`;
                const whatsappUrl = buildWhatsappUrl(business.whatsapp, message);

                return (
                  <div key={business.id} className="pt-4 first:pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                        {business.name}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">
                        Subtotal: {formatBs(subtotal)}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {items.map(({ item, quantity }) => (
                        <li key={item.id} className="flex justify-between items-center">
                          <span>
                            <strong className="text-slate-900">{quantity}x</strong> {item.title}
                          </span>
                          <span className="font-medium text-slate-700">
                            {formatBs((item.price || 0) * quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Botón directo de WhatsApp para este puesto específico */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12.031 2C6.49 2 2 6.49 2 12.031c0 1.802.474 3.557 1.375 5.109L2 22l4.984-1.334a10.007 10.007 0 005.047 1.365h.005c5.536 0 10.026-4.49 10.026-10.031 0-2.68-1.043-5.197-2.937-7.091A9.957 9.957 0 0012.031 2zm5.834 14.195c-.244.686-1.42 1.32-1.954 1.399-.49.073-1.125.102-3.238-.769-2.7-1.113-4.453-3.864-4.587-4.043-.134-.18-1.092-1.455-1.092-2.776 0-1.32.69-1.97 1.026-2.298.244-.244.537-.366.86-.366.104 0 .198.005.284.01.272.012.408.028.588.46.225.54.767 1.874.834 2.012.068.138.113.3.023.48-.09.18-.135.293-.27.452-.136.158-.284.354-.407.476-.135.135-.276.281-.119.55.158.27 1.056 1.738 2.268 2.818 1.558 1.39 2.872 1.82 3.28 1.989.314.13.593.076.81-.157.279-.297.632-.823.951-1.343.226-.367.48-.31.796-.192.316.118 2.002.943 2.344 1.114.341.171.568.257.65.399.083.142.083.824-.16 1.51z" />
                      </svg>
                      <span>Enviar Pedido a {business.name}</span>
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total General</p>
                <p className="text-lg font-black text-slate-900">{formatBs(totalCartPrice)}</p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="min-h-[44px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Seguir Agregando Platos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
