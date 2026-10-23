import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHexColor, parseSearchParam, getAccessibleTextColor } from "@/lib/utils";
import { BloqueUbicacion } from "@/components/negocio/BloqueUbicacion";
import { SeccionResenas } from "@/components/negocio/SeccionResenas";
import { VistaComercio } from "@/components/nichos/VistaComercio";
import { VistaVitrina } from "@/components/nichos/VistaVitrina";
import { VistaInmueble } from "@/components/nichos/VistaInmueble";
import { VistaAgenda } from "@/components/nichos/VistaAgenda";
import {
  VistaPlazaComidas,
  type ChildBusinessWithItems,
} from "@/components/nichos/VistaPlazaComidas";
import type { Database } from "@/types/database";
import { FULL_DEMO_CATALOGS } from "@/lib/demo-data";

// Renderizado siempre dinámico y en tiempo real para reflejar cambios inmediatos del panel
export const revalidate = 0;

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let biz: (Pick<BusinessRow, "name" | "description" | "logo_url" | "banner_url" | "city" | "is_active">) | null = null;

  try {
    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("name, description, logo_url, banner_url, city, is_active")
      .eq("slug", slug)
      .maybeSingle();

    biz = business as (Pick<BusinessRow, "name" | "description" | "logo_url" | "banner_url" | "city" | "is_active">) | null;
  } catch {
    // Si la DB está inaccesible, se recurre a demo
  }

  if (!biz && (slug in FULL_DEMO_CATALOGS)) {
    const demo = FULL_DEMO_CATALOGS[slug];
    biz = {
      name: demo.name,
      description: demo.description,
      logo_url: demo.logo_url,
      banner_url: demo.banner_url,
      city: demo.city,
      is_active: demo.is_active,
    };
  }

  if (!biz || !biz.is_active) {
    return {
      title: "Catálogo No Disponible | MercadoVirtual Oruro",
      description: "Catálogos comerciales y pedidos directos en Oruro, Bolivia.",
    };
  }

  const title = `${biz.name} | Catálogo en Oruro`;
  const description =
    biz.description || `Explora el catálogo oficial de ${biz.name} en MercadoVirtual Oruro, Bolivia.`;
  const image = biz.banner_url || biz.logo_url || "/og-image.jpg";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mercadovirtual.bo";
  const canonicalUrl = `${siteUrl}/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: biz.name,
        },
      ],
      type: "website",
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mesa?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mesa = parseSearchParam(resolvedSearchParams.mesa);

  const supabase = await createClient();
  let rawBusiness: BusinessRow | null = null;

  try {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    rawBusiness = data as BusinessRow | null;
  } catch {
    // Si la DB está desconectada, pasamos al fallback demo
  }

  let business = rawBusiness;
  const isDemo = !business && (slug in FULL_DEMO_CATALOGS);
  const demoFallback = isDemo ? FULL_DEMO_CATALOGS[slug] : null;

  if (demoFallback) {
    business = {
      id: demoFallback.id,
      slug: demoFallback.slug,
      name: demoFallback.name,
      niche: demoFallback.niche,
      catalog_mode: demoFallback.catalog_mode,
      description: demoFallback.description,
      logo_url: demoFallback.logo_url,
      banner_url: demoFallback.banner_url,
      address: demoFallback.address,
      city: demoFallback.city,
      whatsapp: demoFallback.whatsapp,
      maps_url: demoFallback.maps_url,
      rating_avg: demoFallback.rating_avg,
      rating_count: demoFallback.rating_count,
      is_active: demoFallback.is_active,
      parent_id: demoFallback.parent_id,
      theme: demoFallback.theme,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      max_items: 50,
      monthly_fee: 100,
      next_due_date: "2026-12-31",
      owner_id: "demo-owner",
      plan: "basico",
    } as unknown as BusinessRow;
  }

  if (!business) {
    notFound();
  }

  // Si is_active = false, mostrar pantalla de mantenimiento sin exponer datos sensibles
  if (!business.is_active) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
          🛠
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Establecimiento en mantenimiento o no disponible
        </h1>
        <p className="text-sm text-slate-600 max-w-md">
          Este catálogo se encuentra temporalmente fuera de servicio. Si eres el propietario,
          revisa el estado de tu cuenta en el panel administrativo.
        </p>
        <Link
          href="/"
          className="min-h-[44px] px-6 py-2.5 inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Explorar otros negocios en Oruro
        </Link>
      </div>
    );
  }

  // 2. Manejo de parent_id (Puestos dependientes de una plaza de comidas):
  // DECISIÓN DE ARQUITECTURA: Redirigir a la plaza principal con ancla/foco al slug del puesto
  // para preservar la experiencia unificada del comensal y centralizar los pedidos.
  if (business.parent_id) {
    const { data: rawParent } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", business.parent_id)
      .single();

    const parent = rawParent as Pick<BusinessRow, "slug"> | null;

    if (parent?.slug) {
      redirect(`/${parent.slug}#${business.slug}`);
    }
  }

  // 3. Consultas en paralelo con Promise.all (con soporte para demoFallback)
  const itemsQuery = (async () => {
    let rawItems: Array<Record<string, unknown>> = [];
    if (demoFallback) {
      rawItems = (demoFallback.items || []) as unknown as Array<Record<string, unknown>>;
    } else {
      let query = supabase
        .from("items")
        .select("*")
        .eq("business_id", business.id)
        .neq("status", "vendido");

      // En comercio regular, no mostrar agotados
      if (business.niche === "comercio") {
        query = query.neq("status", "agotado");
      }

      const { data } = await query.order("sort_order", { ascending: true });
      rawItems = (data || []) as unknown as Array<Record<string, unknown>>;
    }

    // Normalizar propiedad images para evitar crash si viene como image_url o undefined
    return rawItems.map((item) => {
      let images: string[] = [];
      if (Array.isArray(item.images)) {
        images = item.images as string[];
      } else if (typeof item.image_url === "string" && item.image_url) {
        images = [item.image_url];
      }
      return {
        ...item,
        images,
      } as unknown as ItemRow;
    });
  })();

  const reviewsQuery = (async () => {
    if (demoFallback) {
      return [] as ReviewRow[];
    }
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data || []) as ReviewRow[];
  })();

  const plazaChildrenQuery = (async (): Promise<ChildBusinessWithItems[]> => {
    if (demoFallback && demoFallback.childBusinesses) {
      return demoFallback.childBusinesses as unknown as ChildBusinessWithItems[];
    }
    if (business.niche !== "plaza_comidas") {
      return [];
    }

    const { data: rawChildren } = await supabase
      .from("businesses")
      .select("*")
      .eq("parent_id", business.id)
      .eq("is_active", true);

    const children = (rawChildren || []) as BusinessRow[];

    const result = await Promise.all(
      children.map(async (child) => {
        const { data: childItems } = await supabase
          .from("items")
          .select("*")
          .eq("business_id", child.id)
          .neq("status", "vendido")
          .order("sort_order", { ascending: true });

        const rawList = (childItems || []) as unknown as Array<Record<string, unknown>>;
        const normalized = rawList.map((it) => ({
          ...it,
          images: Array.isArray(it.images)
            ? (it.images as string[])
            : typeof it.image_url === "string" && it.image_url
            ? [it.image_url]
            : [],
        })) as unknown as ItemRow[];

        return {
          business: child,
          items: normalized,
        };
      })
    );

    return result;
  })();

  const [items, reviews, childBusinesses] = await Promise.all([
    itemsQuery,
    reviewsQuery,
    plazaChildrenQuery,
  ]);

  // 4. Color de tema y tipografía con fallback seguro
  const primaryThemeColor =
    typeof business.theme?.primary_color === "string" && isHexColor(business.theme.primary_color)
      ? business.theme.primary_color
      : "#16a34a";
  const brandTextColor = getAccessibleTextColor(primaryThemeColor);

  const rawFont = (business.theme as any)?.font_family || "jakarta";
  const fontCssFamily =
    rawFont === "outfit"
      ? "'Outfit', sans-serif"
      : rawFont === "montserrat"
      ? "'Montserrat', sans-serif"
      : rawFont === "playfair"
      ? "'Playfair Display', serif"
      : rawFont === "space"
      ? "'Space Grotesk', sans-serif"
      : "'Plus Jakarta Sans', system-ui, sans-serif";

  const bannerImg = business.banner_url || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&auto=format&fit=crop&q=80";
  const logoImg = business.logo_url || "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mercadovirtual.bo";
  const canonicalUrl = `${siteUrl}/${slug}`;

  // JSON-LD Schema (LocalBusiness)
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description || `Catálogo oficial de ${business.name} en MercadoVirtual Oruro`,
    image: [bannerImg, logoImg],
    url: canonicalUrl,
    telephone: business.whatsapp ? `+${business.whatsapp}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address || "Oruro Centro",
      addressLocality: business.city || "Oruro",
      addressCountry: "BO",
    },
  };

  // Solo incluir aggregateRating si hay reseñas registradas
  if (business.rating_count > 0 && business.rating_avg > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(business.rating_avg).toFixed(1),
      reviewCount: business.rating_count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  const shape = (business.theme as any)?.card_shape || "rounded";
  const headerRadius =
    shape === "pill"
      ? "rounded-[46px] border-2 shadow-lg"
      : shape === "sharp"
      ? "rounded-none border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
      : shape === "asymmetric"
      ? "rounded-tl-[48px] rounded-br-[48px] rounded-tr-md rounded-bl-md border-2 shadow-lg"
      : "rounded-3xl border border-slate-200/80 shadow-sm";

  return (
    <div
      style={{
        ["--brand-color" as string]: primaryThemeColor,
        ["--brand-text" as string]: brandTextColor,
        fontFamily: fontCssFamily,
      }}
      className="space-y-8 pb-16"
    >
      {/* Marcado estructurado JSON-LD para motores de búsqueda */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Encabezado: Portada, Logo circular, Nombre, Nicho, Estrellas y Estado con estilo adaptado al tema */}
      <header className={`bg-white ${headerRadius} overflow-hidden transition-all duration-300`}>
        {/* Banner con next/image y priority para evitar CLS */}
        <div className="relative w-full h-44 sm:h-64 bg-slate-100">
          <Image
            src={bannerImg}
            alt={`Portada de ${business.name}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 sm:-mt-16 mb-4">
            <div
              style={{ borderColor: primaryThemeColor }}
              className={`relative w-24 h-24 sm:w-28 sm:h-28 ${
                shape === "sharp" ? "rounded-none" : "rounded-full"
              } border-4 shadow-xl overflow-hidden bg-white flex-shrink-0`}
            >
              <Image
                src={logoImg}
                alt={`Logo de ${business.name}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span
                  style={{ color: primaryThemeColor, backgroundColor: `${primaryThemeColor}15` }}
                  className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-current"
                >
                  {business.niche.replace(/_/g, " ")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Abierto
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {business.name}
              </h1>
            </div>

            {/* Resumen de Estrellas */}
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <span>★</span>
              <span className="text-slate-800">
                {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "Nuevo"}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                ({business.rating_count})
              </span>
            </div>
          </div>

          {business.description && (
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed mt-2">
              {business.description}
            </p>
          )}
        </div>
      </header>

      {/* Bloque de Ubicación con telemetría no bloqueante */}
      <BloqueUbicacion
        businessId={business.id}
        address={business.address}
        mapsUrl={business.maps_url}
      />

      {/* Vistas dinámicas según niche y catalog_mode */}
      <section aria-label="Catálogo de productos o servicios">
        {business.niche === "plaza_comidas" && (
          <VistaPlazaComidas
            plazaName={business.name}
            mesa={mesa}
            childBusinesses={childBusinesses}
          />
        )}

        {business.niche === "inmueble" && (
          <VistaInmueble
            businessId={business.id}
            items={items}
            whatsapp={business.whatsapp}
            businessName={business.name}
          />
        )}

        {business.niche === "agenda" && (
          <VistaAgenda
            businessId={business.id}
            items={items}
            whatsapp={business.whatsapp}
            businessName={business.name}
            schedule={(business as any).schedule}
          />
        )}

        {business.niche === "comercio" && business.catalog_mode === "vitrina" && (
          <VistaVitrina
            businessId={business.id}
            items={items}
            whatsapp={business.whatsapp}
            businessName={business.name}
            theme={business.theme as any}
          />
        )}

        {business.niche === "comercio" && business.catalog_mode === "carrito" && (
          <VistaComercio
            businessId={business.id}
            items={items}
            whatsapp={business.whatsapp}
            businessName={business.name}
            theme={business.theme as any}
          />
        )}
      </section>

      {/* Sección de Reseñas */}
      <SeccionResenas
        businessId={business.id}
        initialReviews={reviews}
        ratingAvg={business.rating_avg}
        ratingCount={business.rating_count}
      />

      {/* Footer del Catálogo */}
      <footer className="text-center pt-8 border-t border-slate-200">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg p-2 min-h-[44px]"
        >
          <span>← Explorar más negocios en MercadoVirtual Oruro</span>
        </Link>
      </footer>
    </div>
  );
}
