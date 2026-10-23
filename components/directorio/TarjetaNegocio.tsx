import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { BusinessDirectoryItem } from "./types";
import { isTallerBusiness } from "./types";

interface TarjetaNegocioProps {
  business: BusinessDirectoryItem;
}

const NICHE_LABELS: Record<BusinessDirectoryItem["niche"], { label: string; badgeClass: string }> = {
  comercio: {
    label: "Tienda / Comercio",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  plaza_comidas: {
    label: "Plaza Gastronómica",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
  agenda: {
    label: "Salud & Citas",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
  },
  inmueble: {
    label: "Inmuebles & Lotes",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
};

export function TarjetaNegocio({ business }: TarjetaNegocioProps) {
  const isTaller = isTallerBusiness(business);
  const nicheInfo = isTaller
    ? { label: "Taller & Servicio", badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200" }
    : NICHE_LABELS[business.niche] || {
        label: business.niche,
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
      };

  const hasRating = (business.rating_count ?? 0) > 0;
  const ratingAvg = Number(business.rating_avg || 0).toFixed(1);

  // Fallbacks visuales de alta resolución según el nicho
  const NICHE_BANNERS: Record<string, string> = {
    comercio: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=75",
    plaza_comidas: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=75",
    agenda: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=75",
    inmueble: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=75",
  };

  const bannerPlaceholder =
    business.banner_url ||
    NICHE_BANNERS[business.niche] ||
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=75";

  return (
    <article className="group flex flex-col bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/10 transition-all duration-300 overflow-hidden">
      {/* Portada / Banner con Logo superpuesto */}
      <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerPlaceholder}
          alt={`Portada de ${business.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Chip de nicho en la esquina superior derecha */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-slate-900/80 text-sky-300 border border-slate-700/80 shadow-md"
          >
            {nicheInfo.label}
          </span>
        </div>

        {/* Logo en la esquina inferior izquierda montado sobre el borde */}
        <div className="absolute -bottom-4 left-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 p-1 shadow-xl border border-slate-700/80 flex items-center justify-center overflow-hidden">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={`Logo de ${business.name}`}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-inner">
                {business.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido de la Tarjeta */}
      <div className="flex-1 flex flex-col pt-6 p-4 sm:p-5 space-y-3">
        {/* Calificación y Estado */}
        <div className="flex items-center justify-between text-xs pt-1">
          {hasRating ? (
            <div
              className="inline-flex items-center gap-1 font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20"
              aria-label={`Calificación ${ratingAvg} de 5 estrellas, ${business.rating_count} reseñas`}
            >
              <span aria-hidden="true">⭐</span>
              <span>{ratingAvg}</span>
              <span className="text-slate-400 font-normal">({business.rating_count})</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verificado
            </span>
          )}

          <span className="text-slate-400 truncate max-w-[150px] font-medium">
            {business.address ? business.address.split(",")[0] : "Oruro, Bolivia"}
          </span>
        </div>

        {/* Nombre del Negocio */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
            <Link href={`/${business.slug}`} className="focus:outline-none focus-visible:underline">
              {business.name}
            </Link>
          </h2>
          {business.description && (
            <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
              {business.description}
            </p>
          )}
        </div>

        {/* Dirección detallada si existe */}
        {business.address && (
          <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
            <svg
              className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="line-clamp-1">{business.address}</span>
          </div>
        )}

        {/* Botón hacia el catálogo /[slug] */}
        <div className="pt-3 mt-auto border-t border-slate-800">
          <Link
            href={`/${business.slug}`}
            className="w-full min-h-[44px] px-4 py-2.5 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-800/80 hover:from-sky-500 hover:to-indigo-600 text-white font-medium text-sm rounded-xl border border-slate-700/60 hover:border-transparent transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span>Ver perfil / Catálogo</span>
            <svg
              className="w-4 h-4 rtl:rotate-180 text-sky-400 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
