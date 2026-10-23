"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { bolivianPhoneSchema } from "@/lib/validators";

const bookingActionSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido."),
  itemId: z.string().uuid("ID de servicio inválido."),
  scheduledAt: z.string().datetime({ message: "Fecha y hora de reserva inválida." }),
  clientName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre no puede exceder los 80 caracteres."),
  clientPhone: bolivianPhoneSchema,
  notes: z
    .string()
    .trim()
    .max(300, "Las notas no pueden exceder los 300 caracteres.")
    .optional()
    .or(z.literal("")),
  honeypot: z.string().max(0, "Intento de spam detectado.").optional().or(z.literal("")),
});

export type BookingResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  bookingId?: string;
  whatsappUrl?: string;
  isConflict?: boolean;
};

interface BusinessSchedule {
  days: number[]; // 1=Lunes, 7=Domingo
  morning: [string, string]; // ["08:00", "12:00"]
  afternoon: [string, string]; // ["14:30", "19:00"]
  slot_minutes: number;
}

/**
 * Valida si la hora seleccionada está dentro del horario de atención del negocio en Bolivia.
 */
function isWithinSchedule(dateTimeStr: string, schedule: BusinessSchedule): boolean {
  const date = new Date(dateTimeStr);

  // Convertir a tiempo local de Bolivia (UTC-4)
  const boliviaTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/La_Paz",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const partsMap: Record<string, string> = {};
  boliviaTime.forEach((p) => {
    partsMap[p.type] = p.value;
  });

  // Determinar día de la semana (1 = Lunes, ..., 7 = Domingo)
  const d = new Date(date.toLocaleString("en-US", { timeZone: "America/La_Paz" }));
  let dayOfWeek = d.getDay(); // 0 es Domingo
  if (dayOfWeek === 0) dayOfWeek = 7;

  if (!schedule.days.includes(dayOfWeek)) {
    return false;
  }

  const timeStr = `${partsMap.hour}:${partsMap.minute}`;

  const isBetween = (time: string, [start, end]: [string, string]) => {
    return time >= start && time < end;
  };

  const inMorning = isBetween(timeStr, schedule.morning);
  const inAfternoon = isBetween(timeStr, schedule.afternoon);

  return inMorning || inAfternoon;
}

export async function createBookingAction(
  prevState: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  try {
    const rawData = {
      businessId: formData.get("businessId"),
      itemId: formData.get("itemId"),
      scheduledAt: formData.get("scheduledAt"),
      clientName: formData.get("clientName"),
      clientPhone: formData.get("clientPhone"),
      notes: formData.get("notes"),
      honeypot: formData.get("website_hp"),
    };

    const parsed = bookingActionSchema.safeParse(rawData);

    if (!parsed.success) {
      return {
        success: false,
        message: "Por favor corrige los datos del formulario.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { businessId, itemId, scheduledAt, clientName, clientPhone, notes, honeypot } = parsed.data;

    if (honeypot && honeypot.length > 0) {
      return {
        success: false,
        message: "No se pudo procesar la solicitud.",
      };
    }

    // Rate Limiting: booking:{ip} máximo 5 por hora
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const clientIp = (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp || "127.0.0.1";

    const adminSupabase = createAdminClient();

    const rateLimitKey = `booking:${clientIp}`;
    const { data: isAllowed } = await adminSupabase.rpc("check_rate_limit", {
      p_key: rateLimitKey,
      p_max: 5,
      p_window: "1 hour",
    });

    if (isAllowed === false) {
      return {
        success: false,
        message: "Has superado el límite de reservas por hora. Intenta de nuevo más tarde.",
      };
    }

    // Consultar negocio y schedule
    const { data: business } = await adminSupabase
      .from("businesses")
      .select("id, name, whatsapp, is_active, schedule")
      .eq("id", businessId)
      .single();

    if (!business || !business.is_active) {
      return {
        success: false,
        message: "Este consultorio o establecimiento no se encuentra disponible.",
      };
    }

    const defaultSchedule: BusinessSchedule = {
      days: [1, 2, 3, 4, 5],
      morning: ["08:00", "12:00"],
      afternoon: ["14:30", "19:00"],
      slot_minutes: 30,
    };

    const businessSchedule = (business.schedule as unknown as BusinessSchedule & { allow_public_booking?: boolean }) || defaultSchedule;

    if (businessSchedule.allow_public_booking === false) {
      return {
        success: false,
        message: "Las reservas públicas directas están temporalmente deshabilitadas. Por favor contáctanos por WhatsApp para agendar tu cita.",
      };
    }

    // Validar que el horario esté dentro del horario laboral
    if (!isWithinSchedule(scheduledAt, businessSchedule)) {
      return {
        success: false,
        message: "El horario seleccionado se encuentra fuera del horario de atención del consultorio.",
      };
    }

    // Consultar item de servicio
    const { data: item } = await adminSupabase
      .from("items")
      .select("id, title")
      .eq("id", itemId)
      .single();

    // Insertar reserva con estado 'pendiente'
    const { data: newBooking, error: insertError } = await adminSupabase
      .from("bookings")
      .insert({
        business_id: businessId,
        item_id: itemId,
        scheduled_at: scheduledAt,
        client_name: clientName,
        client_phone: clientPhone,
        notes: notes || null,
        status: "pendiente",
      })
      .select("id")
      .single();

    // Manejo de colisión / doble reserva simultánea (uq_bookings_business_scheduled_active)
    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          isConflict: true,
          message: "Ese horario acaba de ser reservado por otro paciente, por favor elige otro.",
        };
      }

      console.error("Error al registrar reserva:", insertError);
      return {
        success: false,
        message: "Ocurrió un error al registrar la reserva. Intenta nuevamente.",
      };
    }

    // Formatear mensaje para WhatsApp
    const appointmentDate = new Date(scheduledAt);
    const dateFormatted = new Intl.DateTimeFormat("es-BO", {
      timeZone: "America/La_Paz",
      dateStyle: "full",
      timeStyle: "short",
    }).format(appointmentDate);

    const serviceTitle = item?.title || "Servicio profesional";
    const whatsappMessage = `Hola, solicité una cita desde su perfil web:\n- Servicio: ${serviceTitle}\n- Paciente: ${clientName}\n- Fecha/Hora: ${dateFormatted}\nQuedo a la espera de su confirmación.`;

    const whatsappNumber = business.whatsapp.startsWith("591")
      ? business.whatsapp
      : `591${business.whatsapp}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    return {
      success: true,
      message: "¡Reserva solicitada con éxito!",
      bookingId: newBooking?.id,
      whatsappUrl,
    };
  } catch (err) {
    console.error("Error general en createBookingAction:", err);
    return {
      success: false,
      message: "Error al procesar la solicitud.",
    };
  }
}

/**
 * Consulta de horarios ocupados segura (únicamente devuelve scheduled_at)
 */
export async function fetchBusySlotsAction(
  businessId: string,
  fromDate: string,
  toDate: string
): Promise<string[]> {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.rpc("get_busy_slots", {
      p_business_id: businessId,
      p_from: fromDate,
      p_to: toDate,
    });

    if (error) {
      console.error("Error en get_busy_slots:", error);
      return [];
    }

    return (data || []).map((row: { busy_at: string }) => row.busy_at);
  } catch (err) {
    console.error("Error al consultar slots ocupados:", err);
    return [];
  }
}
