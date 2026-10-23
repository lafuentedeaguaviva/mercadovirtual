"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugSchema, whatsappSchema, priceSchema } from "@/lib/validators";
import type { Database } from "@/types/database";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

/**
 * Verifica de forma estricta que el usuario activo sea Superadmin.
 * Lanza excepción si no está autenticado o no posee el rol 'superadmin'.
 */
export async function verifySuperAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado. Inicia sesión como superadministrador.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = (profile as { role?: string } | null)?.role;

  if (userRole !== "superadmin") {
    throw new Error("Acceso denegado: Se requiere rol de superadministrador.");
  }

  return {
    userId: user.id,
    email: user.email || "",
  };
}

// ---------------------------------------------------------------------------
// 1. REGISTRAR COBRO (Llama al RPC register_payment)
// ---------------------------------------------------------------------------
const registerPaymentSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido"),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["qr", "transferencia", "efectivo", "otro"]).default("qr"),
  notes: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
});

export async function registerPaymentAction(input: {
  businessId: string;
  amount: number;
  method?: "qr" | "transferencia" | "efectivo" | "otro";
  notes?: string | null;
}) {
  await verifySuperAdmin();

  const validated = registerPaymentSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Datos de pago inválidos.",
    };
  }

  const supabase = await createClient();

  // Llamar directamente al RPC transaccional register_payment con el cliente del usuario autenticado
  // (El RPC valida internamente if not is_superadmin() then raise exception)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("register_payment", {
    p_business_id: validated.data.businessId,
    p_amount: validated.data.amount,
    p_method: validated.data.method,
    p_notes: validated.data.notes || null,
  });

  if (error) {
    console.error("Error al ejecutar register_payment RPC:", error);
    return {
      success: false,
      error: error.message || "Error al registrar el cobro en el servidor.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    data,
  };
}

// ---------------------------------------------------------------------------
// 2. TOGGLE SUSPENSIÓN (is_active)
// ---------------------------------------------------------------------------
const toggleSuspensionSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido"),
  isActive: z.boolean(),
});

export async function toggleBusinessSuspensionAction(input: {
  businessId: string;
  isActive: boolean;
}) {
  await verifySuperAdmin();

  const validated = toggleSuspensionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Parámetros inválidos.",
    };
  }

  // Usamos el cliente admin con service-role para actualizar is_active de forma segura
  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient.from("businesses") as any)
    .update({ is_active: validated.data.isActive })
    .eq("id", validated.data.businessId);

  if (error) {
    console.error("Error al actualizar estado is_active:", error);
    return {
      success: false,
      error: "No se pudo actualizar el estado del negocio.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    isActive: validated.data.isActive,
  };
}

// ---------------------------------------------------------------------------
// 3. EDITAR PLAN (plan_name, max_items, subscription_price)
// ---------------------------------------------------------------------------
const editPlanSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido"),
  planName: z.string().min(2, "El nombre del plan debe tener al menos 2 caracteres").max(50),
  maxItems: z.number().int().min(1, "La capacidad debe ser de al menos 1 producto"),
  subscriptionPrice: z.number().min(0, "La tarifa no puede ser negativa"),
});

export async function editBusinessPlanAction(input: {
  businessId: string;
  planName: string;
  maxItems: number;
  subscriptionPrice: number;
}) {
  await verifySuperAdmin();

  const validated = editPlanSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Parámetros de plan inválidos.",
    };
  }

  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient.from("businesses") as any)
    .update({
      plan_name: validated.data.planName,
      max_items: validated.data.maxItems,
      subscription_price: validated.data.subscriptionPrice,
    })
    .eq("id", validated.data.businessId);

  if (error) {
    console.error("Error al actualizar plan de negocio:", error);
    return {
      success: false,
      error: "No se pudo actualizar el plan del negocio.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
  };
}

// ---------------------------------------------------------------------------
// 3b. ACTUALIZAR SECTOR O RUBRO (NICHE) DEL NEGOCIO (SUPERADMIN)
// ---------------------------------------------------------------------------
const updateNicheSchema = z.object({
  businessId: z.string().uuid("ID de negocio inválido"),
  niche: z.enum(["comercio", "plaza_comidas", "agenda", "inmueble"]),
});

export async function updateBusinessNicheAction(input: {
  businessId: string;
  niche: "comercio" | "plaza_comidas" | "agenda" | "inmueble";
}) {
  await verifySuperAdmin();

  const validated = updateNicheSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Sector o rubro no válido.",
    };
  }

  const adminClient = createAdminClient();

  const { error } = await (adminClient.from("businesses") as any)
    .update({ niche: validated.data.niche })
    .eq("id", validated.data.businessId);

  if (error) {
    console.error("Error al actualizar sector/rubro del negocio:", error);
    return {
      success: false,
      error: "No se pudo actualizar el rubro del negocio.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin");
  revalidatePath("/");

  return {
    success: true,
    message: "Rubro del negocio actualizado exitosamente.",
  };
}

// ---------------------------------------------------------------------------
// 4. HISTORIAL DE PAGOS POR NEGOCIO
// ---------------------------------------------------------------------------
export async function getBusinessPaymentHistoryAction(businessId: string): Promise<{
  success: boolean;
  payments?: PaymentRow[];
  error?: string;
}> {
  await verifySuperAdmin();

  const idSchema = z.string().uuid().safeParse(businessId);
  if (!idSchema.success) {
    return { success: false, error: "ID de negocio inválido." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener historial de pagos:", error);
    return {
      success: false,
      error: "Error al consultar historial de pagos.",
    };
  }

  return {
    success: true,
    payments: (data as PaymentRow[]) || [],
  };
}

// ---------------------------------------------------------------------------
// 5. EXPORTAR PAGOS DEL MES (Para generación CSV)
// ---------------------------------------------------------------------------
export async function getPaymentsForMonthAction(year: number, month: number): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    created_at: string;
    business_name: string;
    amount: number;
    method: string;
    notes: string | null;
  }>;
  error?: string;
}> {
  await verifySuperAdmin();

  const adminClient = createAdminClient();

  // Rango de fechas para el mes dado en timezone Bolivia (UTC-4)
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  const { data, error } = await adminClient
    .from("payments")
    .select(`
      id,
      created_at,
      amount,
      method,
      notes,
      businesses (
        name
      )
    `)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener pagos para CSV:", error);
    return { success: false, error: "No se pudieron obtener los pagos del mes." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []).map((p: any) => ({
    id: p.id,
    created_at: p.created_at,
    business_name: p.businesses?.name || "Sin nombre",
    amount: Number(p.amount) || 0,
    method: p.method,
    notes: p.notes || null,
  }));

  return {
    success: true,
    data: rows,
  };
}

// ---------------------------------------------------------------------------
// 6. VERIFICAR DISPONIBILIDAD DE SLUG
// ---------------------------------------------------------------------------
export async function checkSlugAvailabilityAction(slug: string): Promise<{
  available: boolean;
  message?: string;
}> {
  const normalized = slug.trim().toLowerCase();

  // Validar formato y palabras reservadas
  const validation = slugSchema.safeParse(normalized);
  if (!validation.success) {
    return {
      available: false,
      message: validation.error.issues[0]?.message || "Slug inválido.",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", normalized)
    .maybeSingle();

  if (data) {
    return {
      available: false,
      message: `El slug "${normalized}" ya está registrado por otro negocio.`,
    };
  }

  return { available: true };
}

// ---------------------------------------------------------------------------
// 7. ALTA DE NEGOCIOS Y CLIENTES: crearNegocioAction
// ---------------------------------------------------------------------------
const crearNegocioSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(120),
  slug: slugSchema,
  niche: z.enum(["comercio", "inmueble", "agenda", "plaza_comidas"]),
  catalog_mode: z.enum(["carrito", "vitrina"]),
  whatsapp: whatsappSchema,
  city: z.string().default("Oruro"),
  plan_name: z.string().min(2, "Debes especificar un plan."),
  subscription_price: priceSchema,
  max_items: z.number().int().min(1, "Debe permitir al menos 1 producto o servicio."),
  owner_email: z.string().email("Correo electrónico de propietario no válido."),
  parent_id: z.string().uuid("ID de plaza de comidas inválido.").nullable().optional(),
});

export type CrearNegocioInput = z.infer<typeof crearNegocioSchema>;

export async function crearNegocioAction(input: CrearNegocioInput): Promise<{
  success: boolean;
  businessId?: string;
  slug?: string;
  error?: string;
}> {
  // 1. Verificación de superadministrador obligatoria
  await verifySuperAdmin();

  // 2. Validación de esquema Zod
  const validated = crearNegocioSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Datos del negocio inválidos.",
    };
  }

  const {
    name,
    slug,
    niche,
    catalog_mode,
    whatsapp,
    city,
    plan_name,
    subscription_price,
    max_items,
    owner_email,
    parent_id,
  } = validated.data;

  const adminClient = createAdminClient();

  // 3. Verificar duplicidad de slug en la base de datos
  const { data: existingBiz } = await adminClient
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingBiz) {
    return {
      success: false,
      error: `El slug "${slug}" ya está registrado por otro negocio.`,
    };
  }

  // 4. Si se especificó parent_id, validar que exista y sea de nicho plaza_comidas
  if (parent_id) {
    const { data: parentBiz } = await adminClient
      .from("businesses")
      .select("id, niche, parent_id")
      .eq("id", parent_id)
      .maybeSingle();

    if (!parentBiz) {
      return { success: false, error: "La plaza de comidas seleccionada no existe." };
    }
    if (parentBiz.parent_id !== null) {
      return {
        success: false,
        error: "Un puesto de plaza no puede ser hijo de otro puesto subordinado.",
      };
    }
  }

  // 5. Gestión del Usuario Propietario (Auth)
  let ownerId: string | null = null;
  let newlyCreatedUserId: string | null = null;

  // Comprobar si ya existe un usuario con este correo
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  const existingUser = usersList?.users?.find(
    (u) => u.email?.toLowerCase() === owner_email.toLowerCase()
  );

  if (existingUser) {
    ownerId = existingUser.id;
  } else {
    // Invitar usuario mediante Supabase Auth Admin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      owner_email,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/login/reset`,
        data: {
          full_name: name,
        },
      }
    );

    if (inviteError || !inviteData?.user) {
      return {
        success: false,
        error: `No se pudo enviar la invitación por correo: ${inviteError?.message || "Error desconocido"}`,
      };
    }

    ownerId = inviteData.user.id;
    newlyCreatedUserId = inviteData.user.id;

    // Asegurar que exista el profile con rol 'owner'
    const { error: profileError } = await (adminClient.from("profiles") as any).upsert({
      id: ownerId,
      full_name: name,
      role: "owner",
    });

    if (profileError) {
      // Revertir usuario si falla creación de profile
      await adminClient.auth.admin.deleteUser(newlyCreatedUserId);
      return {
        success: false,
        error: "Error al registrar el perfil del propietario.",
      };
    }
  }

  // 6. Calcular next_due_date a 30 días
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 30);
  const nextDueDateString = nextDueDate.toISOString().split("T")[0];

  // 7. Crear el negocio en la tabla businesses
  const { data: createdBiz, error: createBizError } = await (adminClient.from("businesses") as any)
    .insert({
      name,
      slug,
      niche,
      catalog_mode,
      whatsapp,
      city: city || "Oruro",
      plan_name,
      subscription_price,
      max_items,
      payment_status: "al_dia",
      next_due_date: nextDueDateString,
      is_active: true,
      owner_id: ownerId,
      parent_id: parent_id || null,
      theme: { primary_color: "#0ea5e9" },
    })
    .select("id, slug")
    .single();

  if (createBizError) {
    console.error("Error creando negocio:", createBizError);

    // Rollback: Si se acaba de crear el usuario, eliminarlo para no dejarlo huérfano
    if (newlyCreatedUserId) {
      await adminClient.auth.admin.deleteUser(newlyCreatedUserId);
    }

    return {
      success: false,
      error: `Error al crear el negocio en la base de datos: ${createBizError.message}`,
    };
  }

  revalidatePath("/");
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/cobros");

  return {
    success: true,
    businessId: createdBiz.id,
    slug: createdBiz.slug,
  };
}
