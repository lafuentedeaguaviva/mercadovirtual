"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHexColor, normalizeWhatsapp } from "@/lib/utils";
import type { Database } from "@/types/database";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

/**
 * Valida la sesión del usuario y que tenga acceso de propietario sobre el businessId
 * (o sobre su negocio padre en caso de puestos de plaza).
 */
async function verifyOwnerAccess(businessId: string): Promise<{
  userId: string;
  business: BusinessRow;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado. Por favor inicia sesión.");
  }

  // Comprobar negocio y propiedad
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  const biz = business as BusinessRow | null;

  if (!biz) {
    throw new Error("Negocio no encontrado o no tienes permisos de acceso.");
  }

  // Si no es el owner directo, verificar si es owner del negocio padre (caso plaza de comidas)
  if (biz.owner_id !== user.id) {
    if (biz.parent_id) {
      const { data: parent } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", biz.parent_id)
        .single();
      const parentBiz = parent as { owner_id: string } | null;
      if (!parentBiz || parentBiz.owner_id !== user.id) {
        throw new Error("Acceso denegado: Este negocio no te pertenece.");
      }
    } else {
      throw new Error("Acceso denegado: Este negocio no te pertenece.");
    }
  }

  // Verificar si el negocio está suspendido o vencido
  if (!biz.is_active || biz.payment_status === "vencido") {
    throw new Error("Negocio en estado de solo lectura (suscripción vencida o suspendida).");
  }

  return { userId: user.id, business: biz };
}

// 1. Toggle modo de catálogo: carrito / vitrina
export async function updateCatalogModeAction(
  businessId: string,
  newMode: "carrito" | "vitrina"
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);

    const supabase = await createClient();
    const { error } = await (supabase.from("businesses") as any)
      .update({ catalog_mode: newMode })
      .eq("id", business.id);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: `Modo cambiado a ${newMode}.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al actualizar modo." };
  }
}

// 2. Toggle o actualización de estado de item (disponible, agotado, reservado, vendido)
export async function updateItemStatusAction(
  businessId: string,
  itemId: string,
  newStatus: "disponible" | "agotado" | "reservado" | "vendido"
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);

    const supabase = await createClient();
    const { error } = await (supabase.from("items") as any)
      .update({ status: newStatus })
      .eq("id", itemId)
      .eq("business_id", business.id);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Estado de producto actualizado." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al actualizar estado." };
  }
}

// 3. Reordenar item (subir/bajar sort_order)
export async function reorderItemAction(
  businessId: string,
  itemId: string,
  direction: "up" | "down"
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    const { data: rawItems } = await supabase
      .from("items")
      .select("id, sort_order")
      .eq("business_id", business.id)
      .order("sort_order", { ascending: true });

    const items = (rawItems || []) as { id: string; sort_order: number }[];
    const index = items.findIndex((i) => i.id === itemId);

    if (index === -1) throw new Error("Item no encontrado.");

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return { success: true, message: "Ya está en la posición límite." };
    }

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    // Intercambiar sort_order
    await (supabase.from("items") as any).update({ sort_order: targetItem.sort_order }).eq("id", currentItem.id);
    await (supabase.from("items") as any).update({ sort_order: currentItem.sort_order }).eq("id", targetItem.id);

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Posición actualizada." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al reordenar." };
  }
}

// 4. Eliminar item y limpiar sus imágenes en Storage
export async function deleteItemAction(
  businessId: string,
  itemId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    // Obtener imágenes para borrarlas del Storage
    const { data: rawItem } = await supabase
      .from("items")
      .select("images")
      .eq("id", itemId)
      .eq("business_id", business.id)
      .single();

    const item = rawItem as { images?: string[] } | null;

    if (item && item.images && item.images.length > 0) {
      const adminSupabase = createAdminClient();
      const filePaths: string[] = [];

      item.images.forEach((imgUrl: string) => {
        try {
          const url = new URL(imgUrl);
          const parts = url.pathname.split("/items-media/");
          if (parts.length > 1) {
            filePaths.push(parts[1]);
          }
        } catch {
          // Ignorar URLs externas no pertenecientes al storage propio
        }
      });

      if (filePaths.length > 0) {
        await adminSupabase.storage.from("items-media").remove(filePaths);
      }
    }

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId)
      .eq("business_id", business.id);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Producto eliminado correctamente." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al eliminar producto." };
  }
}

// 5. Crear o Editar Item
export async function saveItemAction(
  businessId: string,
  formData: FormData,
  itemId?: string
): Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const price = Number(formData.get("price") || 0);
    const status = (formData.get("status") as any) || "disponible";
    const imageUrl = String(formData.get("imageUrl") || "").trim();

    if (title.length < 2) {
      return { success: false, message: "El título debe contener al menos 2 caracteres." };
    }
    if (price < 0) {
      return { success: false, message: "El precio no puede ser negativo." };
    }

    const supabase = await createClient();

    if (!itemId) {
      // Inserción de nuevo item: comprobar límite max_items en el servidor
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id);

      if ((count || 0) >= business.max_items) {
        return {
          success: false,
          message: `Límite alcanzado: Has ocupado tus ${business.max_items} productos. Mejora tu plan para agregar más.`,
        };
      }

      const images = imageUrl ? [imageUrl] : [];
      const { error } = await (supabase.from("items") as any).insert({
        business_id: business.id,
        title,
        description: description || null,
        price,
        status,
        images,
        sort_order: (count || 0) + 1,
      });

      if (error) throw error;
    } else {
      // Edición de item existente
      const updateData: any = {
        title,
        description: description || null,
        price,
        status,
      };
      if (imageUrl) {
        updateData.images = [imageUrl];
      }

      const { error } = await (supabase.from("items") as any)
        .update(updateData)
        .eq("id", itemId)
        .eq("business_id", business.id);

      if (error) throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: itemId ? "Producto actualizado." : "Producto agregado." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al guardar producto." };
  }
}

// 6. Moderación de Reseñas: Aprobar o Eliminar
export async function moderateReviewAction(
  businessId: string,
  reviewId: string,
  action: "approve" | "delete"
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    if (action === "approve") {
      const { error } = await (supabase.from("reviews") as any)
        .update({ is_approved: true })
        .eq("id", reviewId)
        .eq("business_id", business.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("business_id", business.id);
      if (error) throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: action === "approve" ? "Reseña aprobada." : "Reseña eliminada." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al moderar reseña." };
  }
}

// 7. Actualización de Reserva (confirmar / cancelar)
export async function updateBookingStatusAction(
  businessId: string,
  bookingId: string,
  newStatus: "confirmada" | "cancelada"
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    const { error } = await (supabase.from("bookings") as any)
      .update({ status: newStatus })
      .eq("id", bookingId)
      .eq("business_id", business.id);

    if (error) throw error;

    revalidatePath("/admin");
    return { success: true, message: `Reserva marcada como ${newStatus}.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al actualizar reserva." };
  }
}

// 7b. Crear Cita Manualmente desde el Panel de Administración
export async function createManualBookingAction(input: {
  businessId: string;
  itemId?: string;
  clientName: string;
  clientPhone: string;
  scheduledAt: string;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(input.businessId);
    const adminSupabase = createAdminClient();

    if (!input.clientName || input.clientName.trim().length < 2) {
      return { success: false, message: "El nombre del cliente debe tener al menos 2 caracteres." };
    }

    if (!input.clientPhone || input.clientPhone.trim().length < 8) {
      return { success: false, message: "Ingresa un número de teléfono válido (ej: 71234567)." };
    }

    if (!input.scheduledAt) {
      return { success: false, message: "Selecciona la fecha y hora de la cita." };
    }

    let finalItemId = input.itemId;
    // Si no se proporcionó itemId, vincular al primer item disponible del negocio
    if (!finalItemId) {
      const { data: firstItem } = await adminSupabase
        .from("items")
        .select("id")
        .eq("business_id", business.id)
        .limit(1)
        .maybeSingle();

      if (firstItem?.id) {
        finalItemId = firstItem.id;
      }
    }

    if (!finalItemId) {
      return {
        success: false,
        message: "Primero debes crear al menos un servicio o ítem en la pestaña 'Inventario'.",
      };
    }

    const cleanPhone = input.clientPhone.replace(/\D/g, "").slice(-8);

    const { error: insertError } = await adminSupabase
      .from("bookings")
      .insert({
        business_id: business.id,
        item_id: finalItemId,
        scheduled_at: new Date(input.scheduledAt).toISOString(),
        client_name: input.clientName.trim(),
        client_phone: cleanPhone,
        notes: input.notes?.trim() || null,
        status: "confirmada",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          message: "Ya existe una cita programada exactamente en ese horario.",
        };
      }
      throw insertError;
    }

    revalidatePath("/admin");
    return { success: true, message: "Cita creada y agendada exitosamente." };
  } catch (err: any) {
    console.error("Error al crear cita manual:", err);
    return { success: false, message: err.message || "Error al crear la cita." };
  }
}

// 7c. Configuración de Citas / Agenda: Habilitar o desactivar reserva pública y cambiar duración de turnos
export async function updateBusinessBookingSettingsAction(input: {
  businessId: string;
  allowPublicBooking: boolean;
  slotMinutes: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(input.businessId);
    const adminSupabase = createAdminClient();

    const currentSchedule = (business.schedule as any) || {
      days: [1, 2, 3, 4, 5, 6],
      morning: ["08:00", "12:00"],
      afternoon: ["14:00", "20:00"],
      slot_minutes: 30,
    };

    const updatedSchedule = {
      ...currentSchedule,
      allow_public_booking: input.allowPublicBooking,
      slot_minutes: input.slotMinutes,
    };

    const { error } = await (adminSupabase.from("businesses") as any)
      .update({
        schedule: updatedSchedule,
      })
      .eq("id", business.id);

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Configuración de agenda guardada correctamente." };
  } catch (err: any) {
    console.error("Error al actualizar configuración de agenda:", err);
    return { success: false, message: err.message || "Error al guardar configuración de agenda." };
  }
}


// 8. Pestaña "Mi negocio": Actualizar descripción, dirección, mapas, WhatsApp y color de tema
export async function updateBusinessProfileAction(
  businessId: string,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);

    const description = String(formData.get("description") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const mapsUrl = String(formData.get("mapsUrl") || "").trim();
    const rawWhatsapp = String(formData.get("whatsapp") || "").trim();
    const primaryColor = String(formData.get("primaryColor") || "").trim();
    const logoUrl = String(formData.get("logoUrl") || "").trim();
    const bannerUrl = String(formData.get("bannerUrl") || "").trim();

    // Validar WhatsApp boliviano
    const whatsapp = normalizeWhatsapp(rawWhatsapp);

    // Validar color hexadecimal
    if (!isHexColor(primaryColor)) {
      throw new Error("El color de marca debe ser un código hexadecimal válido (ej. #0ea5e9).");
    }

    const cardShape = String(formData.get("cardShape") || "").trim();
    const fontFamily = String(formData.get("fontFamily") || "").trim();

    const currentTheme = (business.theme || {}) as Record<string, unknown>;
    const updatedTheme = {
      ...currentTheme,
      primary_color: primaryColor,
      card_shape: cardShape || (currentTheme.card_shape as string) || "rounded",
      font_family: fontFamily || (currentTheme.font_family as string) || "jakarta",
    };

    const adminSupabase = createAdminClient();
    const updatePayload: any = {
      description: description || null,
      address: address || null,
      maps_url: mapsUrl || null,
      whatsapp,
      theme: updatedTheme,
    };

    if (logoUrl !== undefined && logoUrl !== "") updatePayload.logo_url = logoUrl || null;
    if (bannerUrl !== undefined && bannerUrl !== "") updatePayload.banner_url = bannerUrl || null;

    const { error } = await (adminSupabase.from("businesses") as any)
      .update(updatePayload)
      .eq("id", business.id);

    if (error) {
      console.error("Error al actualizar perfil de negocio:", error);
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Perfil del negocio actualizado exitosamente." };
  } catch (err: any) {
    console.error("Error capturado en updateBusinessProfileAction:", err);
    return { success: false, message: err.message || "Error al actualizar perfil del negocio." };
  }
}

// 8b. Acción directa para actualizar Portada y/o Logo del negocio
export async function updateBusinessBrandingAction(
  businessId: string,
  branding: { logoUrl?: string | null; bannerUrl?: string | null }
): Promise<{ success: boolean; message: string }> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    const payload: Record<string, string | null> = {};
    if (branding.logoUrl !== undefined) {
      payload.logo_url = branding.logoUrl || null;
    }
    if (branding.bannerUrl !== undefined) {
      payload.banner_url = branding.bannerUrl || null;
    }

    const { error } = await (supabase.from("businesses") as any)
      .update(payload)
      .eq("id", business.id);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath(`/${business.slug}`);
    return { success: true, message: "Imagen actualizada con éxito." };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al actualizar imagen." };
  }
}

// 9. Historial de Pagos para el Dueño del Negocio
export async function getOwnerPaymentHistoryAction(businessId: string): Promise<{
  success: boolean;
  payments?: Database["public"]["Tables"]["payments"]["Row"][];
  error?: string;
}> {
  try {
    const { business } = await verifyOwnerAccess(businessId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      payments: (data || []) as Database["public"]["Tables"]["payments"]["Row"][],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener historial de pagos.";
    return { success: false, error: msg };
  }
}

// 11. Registro directo de negocio para usuario autenticado (Onboarding)
export async function registrarNegocioParaUsuarioAction(input: {
  businessName: string;
  niche: "comercio" | "plaza_comidas" | "agenda" | "inmueble";
  customRubro?: string;
  catalogMode?: "carrito" | "vitrina";
  primaryColor?: string;
  cardShape?: "rounded" | "pill" | "sharp" | "asymmetric";
  whatsapp: string;
  address?: string;
  mapsUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Debes iniciar sesión primero." };
    }

    const businessName = input.businessName.trim();
    if (businessName.length < 2) {
      return { success: false, error: "El nombre del negocio debe tener al menos 2 caracteres." };
    }

    // Normalizar WhatsApp para Bolivia
    const cleanPhone = input.whatsapp.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("591") ? cleanPhone : `591${cleanPhone}`;

    if (!/^591[0-9]{8}$/.test(formattedPhone)) {
      return { success: false, error: "Ingresa un número de WhatsApp boliviano válido (ej: 71234567)." };
    }

    // Generar slug
    let baseSlug = businessName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = `negocio-${Date.now().toString().slice(-4)}`;
    }

    // Usar cliente admin para evitar bloqueos de RLS durante la creación del negocio
    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("businesses")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const finalSlug = existing ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}` : baseSlug;

    // Determinar modo de catálogo elegido o por defecto según nicho
    const chosenMode = input.catalogMode || (input.niche === "inmueble" ? "vitrina" : "carrito");

    const themeConfig = {
      primary_color: input.primaryColor || "#0284c7",
      card_shape: input.cardShape || "rounded",
      sub_rubro: input.customRubro || input.niche,
    };

    // Asegurar que el perfil del usuario exista en public.profiles para respetar la foreign key
    const { data: profileCheck } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileCheck) {
      await (adminClient.from("profiles") as any).insert({
        id: user.id,
        full_name: (user.user_metadata?.full_name as string) || businessName,
        role: "owner",
      });
    }

    const { error: insertError } = await (adminClient.from("businesses") as any).insert({
      owner_id: user.id,
      name: businessName,
      slug: finalSlug,
      niche: input.niche,
      catalog_mode: chosenMode,
      whatsapp: formattedPhone,
      city: "Oruro",
      address: input.address?.trim() || "Oruro, Bolivia",
      maps_url: input.mapsUrl?.trim() || null,
      description: input.customRubro ? `Rubro especificado: ${input.customRubro.trim()}` : null,
      theme: themeConfig,
      plan_name: "prueba_gratis",
      max_items: 30,
      subscription_price: 49.00,
      billing_cycle: "mensual",
      payment_status: "al_dia",
      next_due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_active: true,
    });

    if (insertError) {
      console.error("Error al registrar negocio:", insertError);
      return { success: false, error: insertError.message || "No se pudo guardar el negocio en la base de datos." };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: msg };
  }
}

// 12. Cerrar Sesión
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}

// 13. Crear Puesto Hijo de Comida en una Plaza de Comidas
export async function createChildStallAction(
  plazaId: string,
  data: {
    name: string;
    description?: string;
    whatsapp?: string;
    category?: string;
    primaryColor?: string;
  }
): Promise<{ success: boolean; stall?: BusinessRow; error?: string }> {
  try {
    const { business: plazaBiz, userId } = await verifyOwnerAccess(plazaId);

    if (plazaBiz.niche !== "plaza_comidas") {
      return { success: false, error: "Solo una Plaza de Comidas puede tener puestos gastronómicos." };
    }

    const stallName = data.name.trim();
    if (stallName.length < 2) {
      return { success: false, error: "El nombre del puesto debe tener al menos 2 caracteres." };
    }

    // Slug del puesto
    let baseSlug = `${plazaBiz.slug}-${stallName}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from("businesses")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const finalSlug = existing ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}` : baseSlug;

    // Normalizar WhatsApp si se especifica, o heredar de la plaza
    let stallPhone = plazaBiz.whatsapp;
    if (data.whatsapp && data.whatsapp.trim()) {
      const cleanPhone = data.whatsapp.replace(/[^0-9]/g, "");
      const formattedPhone = cleanPhone.startsWith("591") ? cleanPhone : `591${cleanPhone}`;
      if (/^591[0-9]{8}$/.test(formattedPhone)) {
        stallPhone = formattedPhone;
      }
    }

    const stallCategory = data.category || "Platos Tradicionales";

    const { data: newStall, error: insertError } = await (adminClient.from("businesses") as any)
      .insert({
        owner_id: userId,
        parent_id: plazaBiz.id,
        name: stallName,
        slug: finalSlug,
        niche: "comercio",
        catalog_mode: "carrito",
        whatsapp: stallPhone,
        city: plazaBiz.city || "Oruro",
        address: plazaBiz.address || "Plaza Gastronómica, Oruro",
        maps_url: plazaBiz.maps_url,
        description: data.description?.trim() || `Puesto gastronómico en ${plazaBiz.name}`,
        theme: {
          primary_color: data.primaryColor || "#e11d48",
          card_shape: "rounded",
          category: stallCategory,
        },
        plan_name: "puesto_plaza",
        max_items: 20,
        subscription_price: 0,
        billing_cycle: "mensual",
        payment_status: "al_dia",
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al registrar puesto de comida:", insertError);
      return { success: false, error: insertError.message || "No se pudo registrar el puesto." };
    }

    revalidatePath("/admin");
    revalidatePath(`/${plazaBiz.slug}`);
    return { success: true, stall: newStall as BusinessRow };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: msg };
  }
}

// 14. Obtener items de un negocio específico al alternar en el dashboard
export async function getBusinessItemsAction(
  businessId: string
): Promise<{ success: boolean; items: ItemRow[]; error?: string }> {
  try {
    await verifyOwnerAccess(businessId);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return { success: true, items: (data || []) as ItemRow[] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al cargar items.";
    return { success: false, items: [], error: msg };
  }
}


