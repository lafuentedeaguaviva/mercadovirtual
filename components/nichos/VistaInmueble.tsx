"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";
import { formatBs, buildWhatsappUrl, normalizeWhatsapp } from "@/lib/utils";
import { recordClickBeacon } from "@/lib/analytics-client";
import { loteMetadataSchema, type LoteMetadata } from "@/lib/schemas/inmueble";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface VistaInmuebleProps {
  businessId: string;
  items: ItemRow[];
  whatsapp: string;
  businessName: string;
}

export function VistaInmueble({
  businessId,
  items,
  whatsapp,
  businessName,
}: VistaInmuebleProps) {
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterSuperficie, setFilterSuperficie] = useState<string>("todas");
  const [filterZona, setFilterZona] = useState<string>("todas");
  const [searchLote, setSearchLote] = useState<string>("");

  // Parsea de forma segura cada item con loteMetadataSchema
  const parsedItems = useMemo(() => {
    return items.map((item) => {
      const result = loteMetadataSchema.safeParse(item.metadata || {});
      const meta: LoteMetadata = result.success ? result.data : {};
      return {
        item,
        meta,
      };
    });
  }, [items]);

  // Obtener zonas únicas presentes en los inmuebles
  const availableZonas = useMemo(() => {
    const zonas = new Set<string>();
    parsedItems.forEach(({ meta }) => {
      if (meta.zona && meta.zona.trim()) zonas.add(meta.zona.trim());
    });
    return Array.from(zonas);
  }, [parsedItems]);

  // Filtros en cliente (estado, rango de superficie, zona y búsqueda)
  const filteredItems = useMemo(() => {
    return parsedItems.filter(({ item, meta }) => {
      // Filtro de estado
      if (filterStatus !== "todos" && item.status !== filterStatus) {
        return false;
      }

      // Filtro de zona
      if (filterZona !== "todas") {
        const itemZona = meta.zona ? meta.zona.trim().toLowerCase() : "";
        if (itemZona !== filterZona.toLowerCase()) {
          return false;
        }
      }

      // Filtro de rango de superficie
      if (filterSuperficie !== "todas") {
        const m2 = meta.superficie_m2;
        if (!m2) return false;

        if (filterSuperficie === "hasta-250" && m2 > 250) return false;
        if (filterSuperficie === "250-500" && (m2 <= 250 || m2 > 500)) return false;
        if (filterSuperficie === "mas-500" && m2 <= 500) return false;
      }

      // Búsqueda por texto (título, manzano, lote, zona o descripción)
      if (searchLote.trim()) {
        const q = searchLote.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        const matchManzano = meta.manzano ? meta.manzano.toLowerCase().includes(q) : false;
        const matchLoteNum = meta.lote ? meta.lote.toLowerCase().includes(q) : false;
        const matchZona = meta.zona ? meta.zona.toLowerCase().includes(q) : false;

        if (!matchTitle && !matchDesc && !matchManzano && !matchLoteNum && !matchZona) {
          return false;
        }
      }

      return true;
    });
  }, [parsedItems, filterStatus, filterSuperficie, filterZona, searchLote]);

  const handleContactar = (
    item: ItemRow,
    meta: LoteMetadata,
    tipo: "reserva" | "lista_espera"
  ) => {
    try {
      const manzanoTexto = meta.manzano ? `Manzano ${meta.manzano}, ` : "";
      const loteTexto = meta.lote ? `Lote ${meta.lote}, ` : "";
      const supTexto = meta.superficie_m2 ? `Superficie: ${meta.superficie_m2} m², ` : "";
      const precioTexto = item.price > 0 ? `Precio: ${formatBs(item.price)}` : "";

      let mensaje = "";
      if (tipo === "reserva") {
        mensaje = `¡Hola *${businessName}*! 👋 Me interesa agendar una visita o reservar el siguiente terreno: *${item.title}* (${manzanoTexto}${loteTexto}${supTexto}${precioTexto}). ¿Podrían darme mayores informes de disponibilidad y requisitos?`;
      } else {
        mensaje = `¡Hola *${businessName}*! 👋 Vi que el lote *${item.title}* (${manzanoTexto}${loteTexto}${supTexto}) se encuentra reservado. Quisiera anotarme a la *lista de espera* por si se libera la reserva. ¡Muchas gracias!`;
      }

      const normalizedNumber = normalizeWhatsapp(whatsapp);
      const url = buildWhatsappUrl(normalizedNumber, mensaje);

      recordClickBeacon({
        businessId,
        type: "whatsapp_consult",
        itemId: item.id,
      });

      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Error al preparar mensaje de inmueble:", err);
    }
  };

  const getStatusBadge = (status: ItemRow["status"]) => {
    switch (status) {
      case "disponible":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>Disponible</span>
          </span>
        );
      case "reservado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600" aria-hidden="true" />
            <span>Reservado</span>
          </span>
        );
      case "vendido":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600" aria-hidden="true" />
            <span>Vendido</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getServiceIcon = (servicio: string) => {
    switch (servicio) {
      case "agua":
        return "💧 Agua";
      case "luz":
        return "⚡ Electricidad";
      case "gas":
        return "🔥 Gas domic.";
      case "alcantarillado":
        return "🌐 Alcantarillado";
      default:
        return servicio;
    }
  };

  const getDocName = (doc: string) => {
    switch (doc) {
      case "folio_real":
        return "Folio Real al día";
      case "minuta":
        return "Minuta de Transferencia";
      case "otros":
        return "Papeles e impuestos al día";
      default:
        return doc;
    }
  };

  return (
    <div className="space-y-6">
      {/* 7. Barra de Búsqueda y Filtros Rápidos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3">
        {/* Buscador de Lotes, Terrenos y Manzanos */}
        <div className="relative">
          <input
            type="text"
            value={searchLote}
            onChange={(e) => setSearchLote(e.target.value)}
            placeholder="Buscar lote por manzano, número de lote, zona (ej: Manzano 12, Lote 4, Vinto, Zona Sud)..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />
          <span className="absolute left-3 top-3 text-sm text-slate-400">🔍</span>
          {searchLote && (
            <button
              onClick={() => setSearchLote("")}
              className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 p-1"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Filtro de Estado */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              Estado:
            </span>
            {[
              { id: "todos", label: "Todos" },
              { id: "disponible", label: "Disponibles" },
              { id: "reservado", label: "Reservados" },
              { id: "vendido", label: "Vendidos" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === st.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Zona si hay zonas registradas */}
            {availableZonas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="filtro-zona" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Zona:
                </label>
                <select
                  id="filtro-zona"
                  value={filterZona}
                  onChange={(e) => setFilterZona(e.target.value)}
                  className="min-h-[40px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="todas">Todas las zonas</option>
                  {availableZonas.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro de Superficie */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filtro-superficie" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Superficie:
              </label>
              <select
                id="filtro-superficie"
                value={filterSuperficie}
                onChange={(e) => setFilterSuperficie(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="todas">Cualquier dimensión</option>
                <option value="hasta-250">Hasta 250 m²</option>
                <option value="250-500">250 m² a 500 m²</option>
                <option value="mas-500">Más de 500 m²</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Estado vacío con los filtros */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center space-y-3 shadow-sm">
          <div className="text-3xl">📐</div>
          <h3 className="text-base font-bold text-slate-900">No se encontraron lotes con estos criterios</h3>
          <p className="text-xs text-slate-500">
            Prueba cambiando los filtros de estado o rango de superficie.
          </p>
          <button
            onClick={() => {
              setFilterStatus("todos");
              setFilterSuperficie("todas");
            }}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        /* 2. Grid de tarjetas con estilo técnico/corporativo */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map(({ item, meta }) => {
            const isVendido = item.status === "vendido";
            const isReservado = item.status === "reservado";
            const isDisponible = item.status === "disponible";
            const itemImages = Array.isArray(item.images) ? item.images : [];
            const mainImage = itemImages[0] || "/placeholder-product.svg";
            const hasGps =
              meta.coordenadas_gps &&
              typeof meta.coordenadas_gps.lat === "number" &&
              typeof meta.coordenadas_gps.lng === "number";

            const precioM2 =
              meta.superficie_m2 && meta.superficie_m2 > 0 && item.price > 0
                ? item.price / meta.superficie_m2
                : null;

            return (
              <article
                key={item.id}
                className={`bg-white rounded-3xl border overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-200 ${
                  isVendido
                    ? "border-slate-200 opacity-60 bg-slate-50/80"
                    : "border-slate-200/80 hover:shadow-md hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Foto técnica del lote */}
                  <div className="relative w-full h-52 sm:h-60 bg-slate-100">
                    <Image
                      src={mainImage}
                      alt={item.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className={`object-cover ${isVendido ? "grayscale" : ""}`}
                    />
                    <div className="absolute top-3 left-3">{getStatusBadge(item.status)}</div>
                    {item.price > 0 && (
                      <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm font-black shadow-md">
                        {formatBs(item.price)}
                      </div>
                    )}
                  </div>

                  {/* 3. Cabecera y Título */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* 4. Cuadrícula Técnica */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Superficie
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {meta.superficie_m2
                            ? `${new Intl.NumberFormat("es-BO").format(meta.superficie_m2)} m²`
                            : "No indicada"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Dimensiones
                        </span>
                        <span className="font-bold text-slate-800">
                          {meta.frente_m && meta.fondo_m
                            ? `${meta.frente_m}m × ${meta.fondo_m}m`
                            : meta.frente_m
                            ? `${meta.frente_m}m frente`
                            : "A verificar"}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Ubicación
                        </span>
                        <span className="font-bold text-slate-800 truncate block">
                          {meta.manzano || meta.lote
                            ? `Mza. ${meta.manzano || "-"} / Lote ${meta.lote || "-"}`
                            : meta.zona || "Zona Altiplano"}
                        </span>
                      </div>

                      {/* 5. Precio por m² */}
                      {precioM2 && (
                        <div className="col-span-2 sm:col-span-3 pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Precio por metro cuadrado:
                          </span>
                          <span className="font-extrabold text-sky-700 text-xs">
                            {formatBs(precioM2)} / m²
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Chips de Servicios */}
                    {meta.servicios && meta.servicios.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Servicios Básicos:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {meta.servicios.map((srv) => (
                            <span
                              key={srv}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold text-xs border border-sky-100"
                            >
                              {getServiceIcon(srv)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estado Legal de Documentos */}
                    {meta.documentos && meta.documentos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Documentación:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {meta.documentos.map((doc) => (
                            <span
                              key={doc}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200"
                            >
                              ✓ {getDocName(doc)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Acciones según estado */}
                <div className="p-5 sm:p-6 pt-0 space-y-2 border-t border-slate-100">
                  {/* Botón de Coordenadas GPS en Google Maps si están disponibles */}
                  {hasGps && !isVendido && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${meta.coordenadas_gps!.lat},${meta.coordenadas_gps!.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      aria-label={`Ver coordenadas satelitales de ${item.title} en Google Maps`}
                    >
                      <span>📍 Ver ubicación exacta en Google Maps</span>
                    </a>
                  )}

                  {/* Estado DISPONIBLE */}
                  {isDisponible && (
                    <button
                      onClick={() => handleContactar(item, meta, "reserva")}
                      className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:opacity-95 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ backgroundColor: "var(--brand-color, #16a34a)" }}
                      aria-label={`Agendar visita o reservar ${item.title} por WhatsApp`}
                    >
                      <span>Agendar visita o reservar por WhatsApp</span>
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12.031 2C6.49 2 2 6.49 2 12.031c0 1.802.474 3.557 1.375 5.109L2 22l4.984-1.334a10.007 10.007 0 005.047 1.365h.005c5.536 0 10.026-4.49 10.026-10.031 0-2.68-1.043-5.197-2.937-7.091A9.957 9.957 0 0012.031 2zm5.834 14.195c-.244.686-1.42 1.32-1.954 1.399-.49.073-1.125.102-3.238-.769-2.7-1.113-4.453-3.864-4.587-4.043-.134-.18-1.092-1.455-1.092-2.776 0-1.32.69-1.97 1.026-2.298.244-.244.537-.366.86-.366.104 0 .198.005.284.01.272.012.408.028.588.46.225.54.767 1.874.834 2.012.068.138.113.3.023.48-.09.18-.135.293-.27.452-.136.158-.284.354-.407.476-.135.135-.276.281-.119.55.158.27 1.056 1.738 2.268 2.818 1.558 1.39 2.872 1.82 3.28 1.989.314.13.593.076.81-.157.279-.297.632-.823.951-1.343.226-.367.48-.31.796-.192.316.118 2.002.943 2.344 1.114.341.171.568.257.65.399.083.142.083.824-.16 1.51z" />
                      </svg>
                    </button>
                  )}

                  {/* Estado RESERVADO */}
                  {isReservado && (
                    <div className="space-y-2">
                      <button
                        disabled
                        className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs cursor-not-allowed border border-amber-200"
                        aria-label="Lote actualmente reservado"
                      >
                        Lote Reservado
                      </button>
                      <button
                        onClick={() => handleContactar(item, meta, "lista_espera")}
                        className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        aria-label={`Consultar por lista de espera para ${item.title}`}
                      >
                        <span>Consultar por lista de espera</span>
                      </button>
                    </div>
                  )}

                  {/* Estado VENDIDO: Sin interacción, badge informativo */}
                  {isVendido && (
                    <div
                      className="min-h-[44px] w-full flex items-center justify-center rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200"
                      role="status"
                      aria-label="Propiedad vendida"
                    >
                      Propiedad Vendida — Sin disponibilidad
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
