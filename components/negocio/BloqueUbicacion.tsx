"use client";

import React from "react";
import { recordClickBeacon } from "@/lib/analytics-client";

interface BloqueUbicacionProps {
  businessId?: string;
  address: string | null;
  mapsUrl: string | null;
}

/**
 * Valida si la URL pertenece a dominios legítimos de Google Maps.
 */
function isValidGoogleMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validHostnames = [
      "maps.app.goo.gl",
      "goo.gl",
      "google.com",
      "www.google.com",
    ];

    if (!validHostnames.includes(parsed.hostname)) {
      return false;
    }

    if (parsed.hostname === "google.com" || parsed.hostname === "www.google.com") {
      return parsed.pathname.startsWith("/maps");
    }

    if (parsed.hostname === "goo.gl") {
      return parsed.pathname.startsWith("/maps");
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * BloqueUbicacion para ficha de negocio con telemetría no bloqueante hacia Google Maps.
 */
export function BloqueUbicacion({ businessId, address, mapsUrl }: BloqueUbicacionProps) {
  if (!address && !mapsUrl) {
    return null;
  }

  // Determinar enlace seguro de Google Maps
  let targetUrl: string | null = null;

  if (mapsUrl && isValidGoogleMapsUrl(mapsUrl)) {
    targetUrl = mapsUrl;
  } else if (address && address.trim().length > 0) {
    targetUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }

  const handleMapsClick = () => {
    if (businessId) {
      recordClickBeacon({
        businessId,
        type: "maps",
      });
    }
  };

  return (
    <section
      aria-label="Ubicación del establecimiento"
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
          <svg
            className="w-5 h-5 text-slate-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900">Dirección y Referencias</h2>
          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed break-words">
            {address || "Dirección no especificada"}
          </p>
        </div>
      </div>

      {targetUrl && (
        <div>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleMapsClick}
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label={`📍 Cómo llegar en Google Maps (${address || "Ubicación"})`}
          >
            <span>📍 Cómo llegar en Google Maps</span>
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}
    </section>
  );
}
