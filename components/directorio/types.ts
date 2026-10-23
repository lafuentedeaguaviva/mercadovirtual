import type { Database } from "@/types/database";

export type BusinessDirectoryItem = Pick<
  Database["public"]["Tables"]["businesses"]["Row"],
  | "slug"
  | "name"
  | "niche"
  | "logo_url"
  | "banner_url"
  | "address"
  | "rating_avg"
  | "rating_count"
  | "description"
  | "theme"
>;

export type CategoryFilter =
  | "todos"
  | "comercio"
  | "plaza_comidas"
  | "agenda"
  | "inmueble"
  | "taller";

export type ZonaFilter =
  | "todas"
  | "central"
  | "norte"
  | "sud"
  | "este"
  | "mercado_campero";

export interface CategoryOption {
  id: CategoryFilter;
  label: string;
  nicheEquivalent?: Database["public"]["Tables"]["businesses"]["Row"]["niche"];
  description: string;
}

export interface ZonaOption {
  id: ZonaFilter;
  label: string;
  keywords: string[];
}

export const ZONA_OPTIONS: readonly ZonaOption[] = [
  { id: "todas", label: "Todas las zonas", keywords: [] },
  { id: "central", label: "Zona Central / Bolívar", keywords: ["central", "bolivar", "bolívar", "plaza 10", "adolfo mier", "la paz", "presidente montes"] },
  { id: "norte", label: "Zona Norte / Circunvalación", keywords: ["norte", "villarroel", "circunvalacion", "circunvalación"] },
  { id: "sud", label: "Zona Sud", keywords: ["sud", "sur", "san pedro"] },
  { id: "este", label: "Zona Este", keywords: ["este", "terminal", "estacion", "estación"] },
  { id: "mercado_campero", label: "Mercado Campero / Pagador", keywords: ["campero", "pagador", "aroma", "velasco", "6 de agosto"] },
] as const;

export function matchesZonaBusiness(biz: BusinessDirectoryItem, zona: ZonaFilter): boolean {
  if (zona === "todas") return true;

  const option = ZONA_OPTIONS.find((z) => z.id === zona);
  if (!option || option.keywords.length === 0) return true;

  const textToSearch = `${biz.address || ""} ${biz.name} ${biz.description || ""}`.toLowerCase();

  return option.keywords.some((kw) => textToSearch.includes(kw));
}

/**
 * Criterio de categorización para "Talleres":
 * Los talleres operan bajo el nicho "agenda" (citas/turnos mecánicos o de servicio),
 * y se identifican mediante:
 * 1. theme.category = 'taller' (o theme.etiquetas / theme.tags conteniendo 'taller')
 * 2. O palabras clave ("taller", "mecanica", "lubricentro", "rectificacion", "chapa y pintura")
 *    en el nombre o descripción del negocio.
 */
export function isTallerBusiness(biz: BusinessDirectoryItem): boolean {
  if (biz.niche !== "agenda") return false;

  const themeObj = biz.theme as Record<string, unknown> | null;
  if (themeObj) {
    if (themeObj.category === "taller" || themeObj.tipo === "taller") return true;
    if (Array.isArray(themeObj.tags) && themeObj.tags.includes("taller")) return true;
    if (Array.isArray(themeObj.etiquetas) && themeObj.etiquetas.includes("taller")) return true;
  }

  const searchable = `${biz.name} ${biz.description || ""}`.toLowerCase();
  return (
    searchable.includes("taller") ||
    searchable.includes("mecanic") ||
    searchable.includes("lubricentro") ||
    searchable.includes("rectific")
  );
}

export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { id: "todos", label: "Todos", description: "Todos los negocios" },
  { id: "comercio", label: "Tiendas & Hogar", nicheEquivalent: "comercio", description: "Electrodomésticos, tecnología, calzado y tiendas" },
  { id: "plaza_comidas", label: "Comida & Patios", nicheEquivalent: "plaza_comidas", description: "Patios de comidas y gastronomía" },
  { id: "agenda", label: "Salud & Citas", nicheEquivalent: "agenda", description: "Consultorios médicos, dentales y servicios con cita" },
  { id: "inmueble", label: "Terrenos & Lotes", nicheEquivalent: "inmueble", description: "Inmobiliarias, lotes y alquileres" },
  { id: "taller", label: "Talleres", description: "Talleres mecánicos, técnicos y servicios especializados" },
] as const;
