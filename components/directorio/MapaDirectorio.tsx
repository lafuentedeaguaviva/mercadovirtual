"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import type { BusinessDirectoryItem } from "@/components/directorio/types";
import { isTallerBusiness } from "@/components/directorio/types";

interface MapaDirectorioProps {
  businesses: BusinessDirectoryItem[];
  selectedCategory?: string;
  selectedZona?: string;
}

// Coordenadas geográficas representativas en la ciudad de Oruro para cada negocio
const ORURO_COORDINATES: Record<string, [number, number]> = {
  // Centro / Plaza 10 de Febrero y Bolívar
  "tecnologia-hogar-oruro": [-17.9688, -67.1122],
  "plaza-oruro-central": [-17.9695, -67.1105],
  "cafe-andino-oruro": [-17.9678, -67.1135],
  // San Agustín / 6 de Agosto
  "dental-san-agustin": [-17.9715, -67.1085],
  // Zona Norte / Circunvalación
  "mecanica-el-quirquincho": [-17.9542, -67.1098],
  // Zona Sud / Central
  "inmobiliaria-altiplano": [-17.9732, -67.1142],
};

// Fallback disperso alrededor de Oruro Centro
function getCoordinatesForBusiness(biz: BusinessDirectoryItem, index: number): [number, number] {
  if (biz.slug && ORURO_COORDINATES[biz.slug]) {
    return ORURO_COORDINATES[biz.slug];
  }
  // Coordenadas base de Oruro: -17.968, -67.112
  const offsetLat = ((index % 5) - 2) * 0.0035;
  const offsetLng = (((index * 3) % 7) - 3) * 0.0032;
  return [-17.9685 + offsetLat, -67.112 + offsetLng];
}

// Colores según el nicho
function getMarkerColor(biz: BusinessDirectoryItem): string {
  if (isTallerBusiness(biz)) return "#6366f1"; // Indigo
  switch (biz.niche) {
    case "comercio":
      return "#2563eb"; // Azul
    case "plaza_comidas":
      return "#e11d48"; // Rojo / Rosa
    case "agenda":
      return "#0d9488"; // Teal
    case "inmueble":
      return "#0284c7"; // Celeste
    default:
      return "#0ea5e9";
  }
}

function getNicheIcon(biz: BusinessDirectoryItem): string {
  if (isTallerBusiness(biz)) return "🔧";
  switch (biz.niche) {
    case "comercio":
      return "🛍️";
    case "plaza_comidas":
      return "🍔";
    case "agenda":
      return "🦷";
    case "inmueble":
      return "🏢";
    default:
      return "📍";
  }
}

export function MapaDirectorio({ businesses }: MapaDirectorioProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializar mapa de Oruro si no existe
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-17.9685, -67.112],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Controles de zoom con estilo
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Capa de mapa abierta y 100% gratuita de OpenStreetMap (sin API Key requerida)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds: [number, number][] = [];

    businesses.forEach((biz, idx) => {
      const coords = getCoordinatesForBusiness(biz, idx);
      bounds.push(coords);

      const color = getMarkerColor(biz);
      const iconEmoji = getNicheIcon(biz);

      // Marcador personalizado con HTML
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            background: ${color};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            border: 3px solid #ffffff;
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="hover:scale-110">
            ${iconEmoji}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marker = L.marker(coords, { icon: customIcon });

      // Popup informativo con estilo dark glassmorphic
      const logoUrl = biz.logo_url || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100&auto=format&fit=crop&q=80";
      const ratingText = biz.rating_avg && biz.rating_avg > 0 ? `⭐ ${biz.rating_avg.toFixed(1)}` : "Nuevo";

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 210px; max-width: 250px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <img src="${logoUrl}" alt="${biz.name}" style="width: 40px; height: 40px; border-radius: 10px; object-fit: cover; border: 1px solid #e2e8f0;" />
            <div style="flex: 1; min-width: 0;">
              <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${biz.name}
              </h4>
              <span style="font-size: 11px; font-weight: 600; color: ${color}; text-transform: uppercase;">
                ${biz.niche.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${biz.address || "Oruro, Bolivia"}
          </p>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 700; color: #d97706; background: #fef3c7; padding: 2px 6px; border-radius: 6px;">
              ${ratingText}
            </span>
          </div>
          <a href="/${biz.slug}" style="
            display: block;
            text-align: center;
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 8px 12px;
            border-radius: 10px;
            text-decoration: none;
            transition: background 0.2s ease;
          ">
            Ver Catálogo / Pedir ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: "modern-popup",
      });

      markersLayer.addLayer(marker);
    });

    // Ajustar zoom para abarcar todos los pines de la búsqueda
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [businesses]);

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Leyenda interactiva en la esquina superior izquierda */}
      <div className="absolute top-4 left-4 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-lg text-xs text-slate-300">
        <span className="font-bold text-white flex items-center gap-1.5">
          <span>📍</span> Comercios de Oruro:
        </span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tiendas</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Comida</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Citas</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Talleres</span>
      </div>

      {/* Badge flotante inferior */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
        Mostrando <strong className="text-white font-bold">{businesses.length}</strong> locales en el mapa
      </div>
    </div>
  );
}
