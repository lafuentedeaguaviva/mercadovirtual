"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

export type SaveItemResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  newItemId?: string;
};

/**
 * Sube una imagen optimizada al bucket items-media validando permisos en el servidor
 */
export async function uploadItemImageAction(
  businessId: string,
  formData: FormData
): Promise<{ success: boolean; publicUrl?: string; message?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "No autenticado. Por favor inicia sesión." };
    }

    // Verificar propiedad o rol superadmin
    const { data: rawBiz } = await supabase
      .from("businesses")
      .select("id, owner_id, parent_id, is_active")
      .eq("id", businessId)
      .single();

    const biz = rawBiz as BusinessRow | null;
    if (!biz) {
      return { success: false, message: "Negocio no encontrado." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = (profile as any)?.role === "superadmin";
    const isOwner = biz.owner_id === user.id;

    if (!isSuperAdmin && !isOwner) {
      // Verificar si es propietario del negocio padre
      if (biz.parent_id) {
        const { data: parent } = await supabase
          .from("businesses")
          .select("owner_id")
          .eq("id", biz.parent_id)
          .single();
        if ((parent as any)?.owner_id !== user.id) {
          return { success: false, message: "No tienes permisos para subir imágenes a este negocio." };
        }
      } else {
        return { success: false, message: "No tienes permisos para subir imágenes a este negocio." };
      }
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, message: "No se proporcionó ningún archivo de imagen." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFileName = `${businessId}/${crypto.randomUUID()}.webp`;

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from("items-media")
      .upload(uniqueFileName, buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from("items-media")
      .getPublicUrl(uniqueFileName);

    return { success: true, publicUrl: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error("Error en uploadItemImageAction:", err);
    return { success: false, message: err.message || "Error al subir imagen." };
  }
}

/**
 * Guarda o actualiza un item asegurando permisos y limpieza de imágenes huérfanas si falla
 */
export async function saveItemFullAction(
  businessId: string,
  payload: {
    itemId?: string;
    title: string;
    description: string;
    price: number;
    status: "disponible" | "agotado" | "reservado" | "vendido";
    images: string[];
    metadata: Record<string, unknown>;
  }
): Promise<SaveItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "No autenticado. Por favor inicia sesión." };
  }

  // 1. Verificar pertenencia del negocio
  const { data: rawBiz } = await supabase
    .from("businesses")
    .select("id, owner_id, parent_id, max_items, is_active, payment_status, slug")
    .eq("id", businessId)
    .single();

  const biz = rawBiz as BusinessRow | null;

  if (!biz) {
    // Si la pertenencia falla, limpiar imágenes que se subieron
    await cleanupStorageImages(payload.images);
    return { success: false, message: "Negocio no encontrado o sin permisos." };
  }

  // Comprobar ownership (directo o plaza de comidas)
  let isAuthorized = biz.owner_id === user.id;
  if (!isAuthorized && biz.parent_id) {
    const { data: parent } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", biz.parent_id)
      .single();
    const parentBiz = parent as { owner_id: string } | null;
    isAuthorized = !!parentBiz && parentBiz.owner_id === user.id;
  }

  if (!isAuthorized || !biz.is_active || biz.payment_status === "vencido") {
    await cleanupStorageImages(payload.images);
    return { success: false, message: "Acceso denegado o negocio en solo lectura." };
  }

  // 2. Validaciones básicas comunes
  if (!payload.title || payload.title.trim().length < 3 || payload.title.length > 200) {
    await cleanupStorageImages(payload.images);
    return { success: false, message: "El título debe tener entre 3 y 200 caracteres." };
  }

  if (payload.price < 0) {
    await cleanupStorageImages(payload.images);
    return { success: false, message: "El precio no puede ser negativo." };
  }

  if (payload.images.length > 5) {
    await cleanupStorageImages(payload.images);
    return { success: false, message: "Máximo 5 imágenes permitidas." };
  }

  try {
    if (!payload.itemId) {
      // Inserción: Validar límite en BD
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("business_id", biz.id);

      if ((count || 0) >= biz.max_items) {
        await cleanupStorageImages(payload.images);
        return {
          success: false,
          message: `Límite alcanzado: Has ocupado tus ${biz.max_items} productos. Mejora tu plan para agregar más.`,
        };
      }

      const { data: inserted, error: insertError } = await (supabase.from("items") as any)
        .insert({
          business_id: biz.id,
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          price: payload.price,
          status: payload.status,
          images: payload.images,
          metadata: payload.metadata,
          sort_order: (count || 0) + 1,
        })
        .select("id")
        .single();

      if (insertError) {
        await cleanupStorageImages(payload.images);
        throw insertError;
      }

      revalidatePath("/admin");
      revalidatePath(`/${biz.slug}`);
      return { success: true, message: "Producto guardado con éxito.", newItemId: inserted?.id };
    } else {
      // Actualización
      const { error: updateError } = await (supabase.from("items") as any)
        .update({
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          price: payload.price,
          status: payload.status,
          images: payload.images,
          metadata: payload.metadata,
        })
        .eq("id", payload.itemId)
        .eq("business_id", biz.id);

      if (updateError) {
        throw updateError;
      }

      revalidatePath("/admin");
      revalidatePath(`/${biz.slug}`);
      return { success: true, message: "Producto actualizado con éxito." };
    }
  } catch (err: any) {
    console.error("Error al persistir item en base de datos:", err);
    await cleanupStorageImages(payload.images);
    return { success: false, message: err.message || "Error al guardar el producto." };
  }
}

/**
 * Elimina imágenes huérfanas en el Storage de Supabase
 */
export async function cleanupStorageImages(imageUrls: string[]): Promise<void> {
  if (!imageUrls || imageUrls.length === 0) return;

  try {
    const adminSupabase = createAdminClient();
    const filePaths: string[] = [];

    imageUrls.forEach((imgUrl) => {
      try {
        const url = new URL(imgUrl);
        const parts = url.pathname.split("/items-media/");
        if (parts.length > 1) {
          filePaths.push(parts[1]);
        }
      } catch {
        // Ignorar URLs externas no pertenecientes a Supabase
      }
    });

    if (filePaths.length > 0) {
      await adminSupabase.storage.from("items-media").remove(filePaths);
    }
  } catch (err) {
    console.error("Error al limpiar imágenes huérfanas en Storage:", err);
  }
}
