"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const reviewActionSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido."),
  rating: z.coerce.number().int().min(1, "Debes seleccionar al menos 1 estrella.").max(5, "Máximo 5 estrellas."),
  authorName: z
    .string()
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres.")
    .max(60, "El nombre no puede exceder los 60 caracteres."),
  comment: z
    .string()
    .trim()
    .max(500, "El comentario no puede exceder los 500 caracteres.")
    .optional()
    .or(z.literal("")),
  honeypot: z.string().max(0, "Intento de spam detectado.").optional().or(z.literal("")),
});

export type SubmitReviewState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function submitReviewAction(
  prevState: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  try {
    // 1. Extraer y validar campos con Zod
    const rawData = {
      businessId: formData.get("businessId"),
      rating: formData.get("rating"),
      authorName: formData.get("authorName"),
      comment: formData.get("comment"),
      honeypot: formData.get("website_hp"), // campo trampa oculto
    };

    const parsed = reviewActionSchema.safeParse(rawData);

    if (!parsed.success) {
      return {
        success: false,
        message: "Por favor corrige los datos del formulario.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { businessId, rating, authorName, comment, honeypot } = parsed.data;

    // 2. Control de Spam: Rechazo si el honeypot viene lleno
    if (honeypot && honeypot.length > 0) {
      return {
        success: false,
        message: "No se pudo procesar la solicitud.",
      };
    }

    // 3. Obtener IP del cliente para Rate Limiting
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const clientIp = (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp || "127.0.0.1";

    const adminSupabase = createAdminClient();

    // 4. Rate Limiting con clave review:{ip}:{businessId} (máximo 3 por hora)
    const rateLimitKey = `review:${clientIp}:${businessId}`;
    const { data: isAllowed, error: rateLimitError } = await adminSupabase.rpc(
      "check_rate_limit",
      {
        p_key: rateLimitKey,
        p_max: 3,
        p_window: "1 hour",
      }
    );

    if (rateLimitError) {
      console.error("Error al evaluar check_rate_limit:", rateLimitError);
    }

    if (isAllowed === false) {
      return {
        success: false,
        message: "Has superado el límite de opiniones para este negocio. Intenta nuevamente más tarde.",
      };
    }

    // 5. Verificar que el negocio exista y esté activo
    const { data: business } = await adminSupabase
      .from("businesses")
      .select("id, is_active")
      .eq("id", businessId)
      .single();

    if (!business || !business.is_active) {
      return {
        success: false,
        message: "El establecimiento no está disponible para recibir opiniones.",
      };
    }

    // 6. Insertar reseña con is_approved = false (No pública hasta moderación en admin)
    const { error: insertError } = await adminSupabase.from("reviews").insert({
      business_id: businessId,
      rating,
      author_name: authorName,
      comment: comment || null,
      is_approved: false,
    });

    if (insertError) {
      console.error("Error al registrar reseña:", insertError);
      return {
        success: false,
        message: "Ocurrió un error al registrar tu opinión. Intenta de nuevo.",
      };
    }

    return {
      success: true,
      message: "Gracias, tu opinión será publicada tras la revisión del negocio.",
    };
  } catch (error) {
    console.error("Error inesperado en submitReviewAction:", error);
    return {
      success: false,
      message: "No se pudo procesar tu opinión en este momento.",
    };
  }
}
