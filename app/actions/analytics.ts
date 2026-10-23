"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ClickEventType = "whatsapp_order" | "whatsapp_consult" | "maps" | "booking";

const trackClickSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido"),
  itemId: z.string().uuid("ID de item inválido").optional().nullable(),
  type: z.enum(["whatsapp_order", "whatsapp_consult", "maps", "booking"]),
});

export type TrackClickInput = {
  businessId: string;
  itemId?: string | null;
  type: ClickEventType;
};

/**
 * Server Action trackClick:
 * Invoca la función RPC de PostgreSQL `track_click`, la cual valida
 * que el negocio esté activo (is_active = true) y aplica rate limiting (check_rate_limit).
 * No bloquea la navegación del usuario.
 */
export async function trackClick(input: TrackClickInput): Promise<{ success: boolean }> {
  try {
    const validated = trackClickSchema.safeParse(input);
    if (!validated.success) {
      return { success: false };
    }

    const supabase = await createClient();

    // Invocar el RPC track_click en PostgreSQL
    const { data, error } = await (supabase.rpc as any)("track_click", {
      p_business_id: validated.data.businessId,
      p_item_id: validated.data.itemId || null,
      p_type: validated.data.type,
    });

    if (error) {
      console.error("Error al registrar click en trackClick RPC:", error);
      return { success: false };
    }

    return { success: Boolean(data) };
  } catch (err) {
    console.error("Excepción en trackClick:", err);
    return { success: false };
  }
}

export type BusinessMetrics30Days = {
  whatsappClicks: number;
  mapsClicks: number;
  bookingClicks: number;
  topItems: Array<{
    itemId: string;
    title: string;
    clicks: number;
  }>;
};

/**
 * Obtiene las métricas de los últimos 30 días para un negocio dado.
 * RLS garantiza que solo el owner o el superadmin puedan consultar estos eventos.
 */
export async function getBusinessMetrics30DaysAction(
  businessId: string
): Promise<{ success: boolean; data?: BusinessMetrics30Days; error?: string }> {
  try {
    const supabase = await createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    // 1. Obtener eventos de los últimos 30 días (filtrados por RLS del negocio)
    const { data: events, error } = await supabase
      .from("click_events")
      .select("id, type, item_id, created_at")
      .eq("business_id", businessId)
      .gte("created_at", thirtyDaysAgoIso);

    if (error) {
      console.error("Error al consultar métricas del negocio:", error);
      return {
        success: false,
        data: {
          whatsappClicks: 0,
          mapsClicks: 0,
          bookingClicks: 0,
          topItems: [],
        },
      };
    }

    const eventList = (events as Array<{
      id: string;
      type: ClickEventType;
      item_id: string | null;
      created_at: string;
    }> | null) || [];

    let whatsappClicks = 0;
    let mapsClicks = 0;
    let bookingClicks = 0;
    const itemClickCounts = new Map<string, number>();

    eventList.forEach((e) => {
      if (e.type === "whatsapp_order" || e.type === "whatsapp_consult") {
        whatsappClicks++;
      } else if (e.type === "maps") {
        mapsClicks++;
      } else if (e.type === "booking") {
        bookingClicks++;
      }

      if (e.item_id) {
        itemClickCounts.set(e.item_id, (itemClickCounts.get(e.item_id) || 0) + 1);
      }
    });

    // 2. Ordenar items por clics y obtener los títulos de los 5 principales
    const sortedItemEntries = Array.from(itemClickCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let topItems: Array<{ itemId: string; title: string; clicks: number }> = [];

    if (sortedItemEntries.length > 0) {
      const topIds = sortedItemEntries.map(([id]) => id);
      const { data: itemRows } = await supabase
        .from("items")
        .select("id, title")
        .in("id", topIds);

      const itemsTyped = (itemRows as Array<{ id: string; title: string }> | null) || [];
      const titleMap = new Map(itemsTyped.map((it) => [it.id, it.title]));

      topItems = sortedItemEntries.map(([id, clicks]) => ({
        itemId: id,
        title: titleMap.get(id) || "Producto o Servicio",
        clicks,
      }));
    }

    return {
      success: true,
      data: {
        whatsappClicks,
        mapsClicks,
        bookingClicks,
        topItems,
      },
    };
  } catch (err: any) {
    console.error("Error en getBusinessMetrics30DaysAction:", err);
    return {
      success: false,
      error: err.message || "Error al calcular analítica.",
    };
  }
}

