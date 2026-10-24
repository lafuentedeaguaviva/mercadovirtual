import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const revalidate = 3600; // 1 hora de revalidación para el sitemap

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mercadovirtual.bo";

  // Rutas estáticas principales
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return staticRoutes;
    }

    // Usar cliente sin cookies para permitir generación estática / ISR limpia en el sitemap
    const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Consultar SOLO negocios activos (is_active = true)
    // Los negocios suspendidos o inactivos NO deben figurar en el sitemap
    const { data } = await supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("is_active", true);

    const businesses = data as Array<{ slug: string; updated_at: string | null }> | null;

    if (!businesses || businesses.length === 0) {
      return staticRoutes;
    }

    const businessRoutes: MetadataRoute.Sitemap = businesses.map((biz) => ({
      url: `${baseUrl}/${biz.slug}`,
      lastModified: biz.updated_at ? new Date(biz.updated_at) : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticRoutes, ...businessRoutes];
  } catch (error) {
    console.error("Error generando sitemap dinámico:", error);
    return staticRoutes;
  }
}
