"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectUrl } from "@/lib/utils";

async function getRequestSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Si no se puede leer headers, fallback a variable o localhost
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  next: z.string().optional().nullable(),
});

export type LoginResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const nextParam = formData.get("next");

  const validated = loginSchema.safeParse({
    email,
    password,
    next: nextParam,
  });

  if (!validated.success) {
    return {
      success: false,
      error: "Credenciales incorrectas.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error || !data.user) {
    // Regla de seguridad: Mensaje de error genérico para no revelar existencia de emails
    return {
      success: false,
      error: "Credenciales incorrectas.",
    };
  }

  // Consultar el rol del usuario en profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;

  // Destino predeterminado según el rol:
  // superadmin -> /superadmin/cobros
  // owner -> /admin
  const defaultDestination = role === "superadmin" ? "/superadmin/cobros" : "/admin";

  let finalRedirect = defaultDestination;

  // Si se envió ?next=, sanitizarlo para permitir solo rutas internas
  if (validated.data.next) {
    const sanitizedNext = sanitizeRedirectUrl(validated.data.next, defaultDestination);
    // Si el usuario es owner no debe ser enviado a /superadmin a través de ?next=
    if (role !== "superadmin" && sanitizedNext.startsWith("/superadmin")) {
      finalRedirect = "/admin";
    } else {
      finalRedirect = sanitizedNext;
    }
  }

  return {
    success: true,
    redirectTo: finalRedirect,
  };
}

export async function signInWithGoogleAction(nextUrl: string = "/admin"): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const siteUrl = await getRequestSiteUrl();
  const sanitizedNext = sanitizeRedirectUrl(nextUrl, "/admin");
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return { error: error?.message || "No se pudo iniciar conexión con Google." };
  }

  return { url: data.url };
}

const resetRequestSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido."),
});

export async function requestPasswordResetAction(
  _prevState: { success: boolean; message?: string; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; message?: string; error?: string }> {
  const email = formData.get("email");
  const validated = resetRequestSchema.safeParse({ email });

  if (!validated.success) {
    return {
      success: false,
      error: "Ingresa un correo electrónico válido.",
    };
  }

  const supabase = await createClient();
  const siteUrl = await getRequestSiteUrl();
  const redirectUrl = `${siteUrl}/auth/callback?next=/login/reset`;

  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    console.error("Error al solicitar recuperación de contraseña:", error);
  }

  // Por seguridad, siempre mostramos éxito para evitar enumeración de usuarios
  return {
    success: true,
    message: "Si tu correo está registrado, recibirás un enlace seguro para restablecer tu contraseña.",
  };
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export async function updatePasswordAction(
  _prevState: { success: boolean; error?: string; redirectTo?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  const validated = updatePasswordSchema.safeParse({ password, confirmPassword });
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Datos no válidos.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Tu enlace ha expirado o no es válido. Por favor solicita uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "No se pudo actualizar la contraseña.",
    };
  }

  // Consultar rol para redirigir tras actualizar
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;
  const destination = role === "superadmin" ? "/superadmin/cobros" : "/admin";

  return {
    success: true,
    redirectTo: destination,
  };
}

// ---------------------------------------------------------------------------
// AUTO-REGISTRO PÚBLICO ABIERTO (Para nuevos comerciantes)
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo."),
  businessName: z.string().min(2, "El nombre de tu negocio debe tener al menos 2 caracteres."),
  email: z.string().email("Ingresa un correo electrónico válido."),
  whatsapp: z.string().regex(/^591[0-9]{8}$/, "WhatsApp inválido (ej: 59171234567)."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  niche: z.enum(["comercio", "plaza_comidas", "agenda", "inmueble"]).default("comercio"),
});

export type RegisterResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

export async function registerAction(
  _prevState: RegisterResult | null,
  formData: FormData
): Promise<RegisterResult> {
  const fullName = String(formData.get("fullName") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const rawWhatsapp = String(formData.get("whatsapp") || "").replace(/[^0-9]/g, "");
  const whatsapp = rawWhatsapp.startsWith("591") ? rawWhatsapp : `591${rawWhatsapp}`;
  const password = String(formData.get("password") || "");
  const niche = (formData.get("niche") as "comercio" | "plaza_comidas" | "agenda" | "inmueble") || "comercio";

  const validated = registerSchema.safeParse({
    fullName,
    businessName,
    email,
    whatsapp,
    password,
    niche,
  });

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Verifica los datos ingresados.",
    };
  }

  const supabase = await createClient();

  // Generar slug a partir del nombre del negocio
  let baseSlug = businessName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug || baseSlug.length < 3) {
    baseSlug = `tienda-${Date.now().toString().slice(-4)}`;
  }

  // Comprobar si el slug existe
  const { data: existingBiz } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();

  const finalSlug = existingBiz ? `${baseSlug}-${Math.floor(100 + Math.random() * 900)}` : baseSlug;

  // Registrar usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "No se pudo registrar la cuenta. El correo podría estar en uso.",
    };
  }

  const userId = authData.user.id;

  // Crear el negocio del nuevo usuario inmediatamente
  const { error: bizError } = await (supabase.from("businesses") as any).insert({
    owner_id: userId,
    name: validated.data.businessName,
    slug: finalSlug,
    niche: validated.data.niche,
    catalog_mode: validated.data.niche === "inmueble" ? "vitrina" : "carrito",
    whatsapp: validated.data.whatsapp,
    city: "Oruro",
    address: "Oruro, Bolivia",
    plan_name: "prueba_gratis",
    billing_cycle: "mensual",
    payment_status: "al_dia",
    subscription_price: 49.00,
    max_items: 30,
    next_due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    is_active: true,
  });

  if (bizError) {
    console.error("Error al crear negocio del nuevo usuario:", bizError);
  }

  return {
    success: true,
    redirectTo: "/admin",
  };
}
