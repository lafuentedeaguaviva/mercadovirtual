import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DirectorioClient } from "@/components/directorio/DirectorioClient";
import { DirectorioSkeleton } from "@/components/directorio/DirectorioSkeleton";
import { SeccionAfiliacion } from "@/components/directorio/SeccionAfiliacion";
import type { BusinessDirectoryItem } from "@/components/directorio/types";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "MercadoVirtual Oruro | Directorio Comercial y Digital",
  description:
    "Descubre los mejores comercios, plazas de comidas, consultorios e inmuebles de Oruro, Bolivia. Catálogos digitales interactivos y contacto directo por WhatsApp.",
  keywords: [
    "MercadoVirtual",
    "Oruro",
    "Bolivia",
    "Comercio Oruro",
    "Catálogos WhatsApp",
    "Plaza de Comidas Oruro",
    "Directorio de empresas Oruro",
    "Tótem QR",
  ],
  openGraph: {
    title: "MercadoVirtual Oruro | Directorio Comercial y Digital",
    description:
      "Explora tiendas, gastronomía, salud y propiedades en Oruro con catálogos directos a WhatsApp.",
    type: "website",
    locale: "es_BO",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MercadoVirtual Oruro - Directorio de Comercios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MercadoVirtual Oruro | Directorio Comercial y Digital",
    description:
      "Encuentra negocios de Oruro con catálogos en línea y pedidos directos por WhatsApp.",
  },
};

import { DEMO_BUSINESSES } from "@/lib/demo-data";

export default async function HomePage() {
  let initialList: BusinessDirectoryItem[] = [];
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();

    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("slug, name, niche, logo_url, banner_url, address, rating_avg, rating_count, description, theme")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("rating_avg", { ascending: false })
      .order("name", { ascending: true })
      .limit(200);

    if (error || !businesses || businesses.length === 0) {
      initialList = DEMO_BUSINESSES;
    } else {
      initialList = businesses as BusinessDirectoryItem[];
    }
  } catch (err) {
    console.warn("Usando datos demostrativos para la portada:", err);
    initialList = DEMO_BUSINESSES;
  }

  return (
    <div className="space-y-12">
      {/* Hero Header Premium */}
      <section className="relative text-center py-10 sm:py-16 space-y-5 overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-transparent p-6 sm:p-10 border border-slate-800/80 shadow-2xl backdrop-blur-sm">
        {/* Glows de fondo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-sky-500/10 border border-sky-400/20 text-sky-300 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Oruro, Bolivia • Catálogos & Tótems QR</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            El Directorio Comercial y <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">Digital de Oruro</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Explora comercios de moda, plazas gastronómicas, consultorios de salud y bienes raíces. 
            Conecta con los negocios en un toque y pide directo por WhatsApp sin comisiones ni intermediarios.
          </p>

          {/* Micro badges informativos */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60">
              ⚡ <span>Pedidos directos a WhatsApp</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60">
              🏷️ <span>Precios en Bolivianos (Bs.)</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60">
              📍 <span>Ubicaciones verificadas en Oruro</span>
            </span>
          </div>
        </div>
      </section>

      {/* Componente Cliente del Directorio con Buscador y Chips */}
      <Suspense fallback={<DirectorioSkeleton />}>
        <DirectorioClient
          initialBusinesses={initialList}
          error={errorMessage}
        />
      </Suspense>

      {/* Sección Inferior: Afilia tu negocio */}
      <SeccionAfiliacion />
    </div>
  );
}
