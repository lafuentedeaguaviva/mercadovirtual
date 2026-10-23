"use client";

import React, { useState, useTransition, useDeferredValue, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import type { BusinessDirectoryItem, CategoryFilter, ZonaFilter } from "./types";
import { CATEGORY_OPTIONS, ZONA_OPTIONS, isTallerBusiness, matchesZonaBusiness } from "./types";
import { TarjetaNegocio } from "./TarjetaNegocio";
import { normalizeSearchText } from "@/lib/utils";

// Cargar mapa dinámicamente solo en cliente (sin SSR) para compatibilidad con window / Leaflet
const MapaDirectorio = dynamic(
  () => import("./MapaDirectorio").then((mod) => mod.MapaDirectorio),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Cargando mapa comercial de Oruro...</span>
        </div>
      </div>
    ),
  }
);

interface DirectorioClientProps {
  initialBusinesses: BusinessDirectoryItem[];
  error?: string | null;
}

const ITEMS_PER_PAGE = 24;

const QUICK_SEARCH_TAGS = [
  "Café",
  "Smart TV",
  "Charquekan",
  "Odontología",
  "Lotes",
  "Taller",
];

export function DirectorioClient({ initialBusinesses, error }: DirectorioClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Modo de vista: 'grid' (tarjetas) o 'mapa' (Leaflet OpenStreetMap)
  const [viewMode, setViewMode] = useState<"grid" | "mapa">("grid");

  // Leer estado inicial sincronizado con URL (?q=&cat=&zona=)
  const initialQ = searchParams?.get("q") ?? "";
  const initialCat = (searchParams?.get("cat") as CategoryFilter) ?? "todos";
  const initialZona = (searchParams?.get("zona") as ZonaFilter) ?? "todas";

  const [rawSearchTerm, setRawSearchTerm] = useState<string>(initialQ);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(
    CATEGORY_OPTIONS.some((opt) => opt.id === initialCat) ? initialCat : "todos"
  );
  const [selectedZona, setSelectedZona] = useState<ZonaFilter>(
    ZONA_OPTIONS.some((z) => z.id === initialZona) ? initialZona : "todas"
  );
  const [page, setPage] = useState<number>(1);
  const [, startTransition] = useTransition();

  // useDeferredValue para un buscador instantáneo no bloqueante
  const deferredSearchTerm = useDeferredValue(rawSearchTerm);

  // Sincronizar URL suavemente con shallow navigation
  const updateUrl = (newQuery: string, newCategory: CategoryFilter, newZona: ZonaFilter) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newQuery.trim()) {
        params.set("q", newQuery.trim());
      }
      if (newCategory !== "todos") {
        params.set("cat", newCategory);
      }
      if (newZona !== "todas") {
        params.set("zona", newZona);
      }
      const queryString = params.toString();
      const newPath = queryString ? `/?${queryString}` : "/";
      router.replace(newPath, { scroll: false });
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawSearchTerm(val);
    setPage(1);
    updateUrl(val, selectedCategory, selectedZona);
  };

  const handleClearSearch = () => {
    setRawSearchTerm("");
    setPage(1);
    updateUrl("", selectedCategory, selectedZona);
  };

  const handleSelectCategory = (cat: CategoryFilter) => {
    setSelectedCategory(cat);
    setPage(1);
    updateUrl(rawSearchTerm, cat, selectedZona);
  };

  const handleSelectZona = (zona: ZonaFilter) => {
    setSelectedZona(zona);
    setPage(1);
    updateUrl(rawSearchTerm, selectedCategory, zona);
  };

  const handleQuickTagClick = (tag: string) => {
    setRawSearchTerm(tag);
    setPage(1);
    updateUrl(tag, selectedCategory, selectedZona);
  };

  // Filtrado reactivo en memoria: ignora mayúsculas, minúsculas y tildes
  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredSearchTerm);

    return initialBusinesses.filter((biz) => {
      // 1. Filtro por categoría
      if (selectedCategory !== "todos") {
        if (selectedCategory === "taller") {
          if (!isTallerBusiness(biz)) return false;
        } else {
          if (biz.niche !== selectedCategory) return false;
        }
      }

      // 2. Filtro por zona geográfica de Oruro
      if (selectedZona !== "todas") {
        if (!matchesZonaBusiness(biz, selectedZona)) return false;
      }

      // 3. Filtro por búsqueda de texto (nombre, dirección y descripción)
      if (normalizedQuery) {
        const normName = normalizeSearchText(biz.name);
        const normAddress = normalizeSearchText(biz.address);
        const normDescription = normalizeSearchText(biz.description);

        const matches =
          normName.includes(normalizedQuery) ||
          normAddress.includes(normalizedQuery) ||
          normDescription.includes(normalizedQuery);

        if (!matches) return false;
      }

      return true;
    });
  }, [initialBusinesses, deferredSearchTerm, selectedCategory, selectedZona]);

  // Paginación lista
  const totalItems = filteredBusinesses.length;
  const paginatedBusinesses = useMemo(() => {
    return filteredBusinesses.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredBusinesses, page]);

  const hasMore = paginatedBusinesses.length < totalItems;

  return (
    <div className="space-y-8">
      {/* 1. Barra de Búsqueda y Chips */}
      <section aria-label="Búsqueda y filtros del directorio" className="space-y-5">
        {/* Input Buscador con diseño dark glassmorphic */}
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-emerald-500/20 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-300 pointer-events-none" />
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sky-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="buscador-directorio"
              type="search"
              value={rawSearchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre, dirección o rubro (ej: 'Café', 'Pasteles', 'Bolívar')..."
              className="w-full pl-12 pr-10 py-4 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-inner text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base transition-all"
              autoComplete="off"
              aria-label="Buscar negocios en el directorio"
            />
            {rawSearchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white focus:outline-none"
                aria-label="Limpiar búsqueda"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Sugerencias Rápidas de Búsqueda */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-400">
          <span className="font-medium mr-1 text-slate-500">Sugerencias:</span>
          {QUICK_SEARCH_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleQuickTagClick(tag)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all text-[11px]"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Chips Horizontales de Categorías */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Categorías
          </div>
          <div
            role="tablist"
            aria-label="Filtrar por categoría"
            className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar px-1 -mx-1"
          >
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  id={`chip-${cat.id}`}
                  aria-selected={isSelected}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/30"
                      : "bg-slate-900/70 backdrop-blur-md text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                  }`}
                  title={cat.description}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Zonas de Oruro */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <span>📍</span>
            <span>Zona en Oruro</span>
          </div>
          <div
            role="tablist"
            aria-label="Filtrar por zona de Oruro"
            className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar px-1 -mx-1"
          >
            {ZONA_OPTIONS.map((zona) => {
              const isSelected = selectedZona === zona.id;
              return (
                <button
                  key={zona.id}
                  role="tab"
                  id={`chip-zona-${zona.id}`}
                  aria-selected={isSelected}
                  onClick={() => handleSelectZona(zona.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 shrink-0 ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-sm"
                      : "bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80"
                  }`}
                >
                  {zona.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Feedback de estado / Contador y Toggle de Vista (Cuadrícula vs Mapa) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-400 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span>
            Mostrando <strong className="font-semibold text-white">{totalItems}</strong>{" "}
            {totalItems === 1 ? "negocio verificado" : "negocios verificados"}
            {selectedCategory !== "todos" && (
              <span className="text-sky-400">
                {" "}
                en {CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.label}
              </span>
            )}
            {selectedZona !== "todas" && (
              <span className="text-emerald-400">
                {" "}
                • {ZONA_OPTIONS.find((z) => z.id === selectedZona)?.label}
              </span>
            )}
          </span>

          {(rawSearchTerm || selectedCategory !== "todos" || selectedZona !== "todas") && (
            <button
              type="button"
              onClick={() => {
                setRawSearchTerm("");
                setSelectedCategory("todos");
                setSelectedZona("todas");
                setPage(1);
                updateUrl("", "todos", "todas");
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium underline ml-2"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        {/* Toggle Cuadrícula vs Mapa de Oruro */}
        <div className="inline-flex items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "grid"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🗂️</span>
            <span>Cuadrícula</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mapa")}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "mapa"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🗺️</span>
            <span>Mapa de Oruro</span>
          </button>
        </div>
      </div>

      {/* 3. Estados: Error, Vacío, Mapa o Grid */}
      {error ? (
        <div
          role="alert"
          className="p-8 text-center bg-rose-950/40 border border-rose-800/50 rounded-3xl space-y-3 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-full bg-rose-900/60 text-rose-300 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-rose-200">Hubo un problema al cargar el directorio</h3>
          <p className="text-sm text-rose-300/80 max-w-md mx-auto">{error}</p>
        </div>
      ) : totalItems === 0 ? (
        /* Estado Vacío */
        <div
          className="text-center py-16 px-4 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl space-y-4 max-w-lg mx-auto"
          role="status"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No encontramos resultados</h3>
            <p className="text-sm text-slate-400">
              {rawSearchTerm
                ? `No hay negocios que coincidan con "${rawSearchTerm}". Intenta con otro término o elimina los filtros.`
                : "No hay negocios registrados en esta categoría por el momento."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRawSearchTerm("");
              setSelectedCategory("todos");
              setSelectedZona("todas");
              setPage(1);
              updateUrl("", "todos", "todas");
            }}
            className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs sm:text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Ver todos los negocios
          </button>
        </div>
      ) : viewMode === "mapa" ? (
        /* VISTA DE MAPA INTERACTIVO (LEAFLET + OPENSTREETMAP) */
        <div className="space-y-4 animate-fade-in">
          <MapaDirectorio
            businesses={filteredBusinesses}
            selectedCategory={selectedCategory}
            selectedZona={selectedZona}
          />
        </div>
      ) : (
        /* VISTA DE CUADRÍCULA TRADICIONAL */
        <div className="space-y-8">
          <div
            id="directorio-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {paginatedBusinesses.map((biz) => (
              <TarjetaNegocio key={biz.slug} business={biz} />
            ))}
          </div>

          {/* Paginación / Cargar más */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                className="min-h-[44px] px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Cargar más negocios ({totalItems - paginatedBusinesses.length} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
