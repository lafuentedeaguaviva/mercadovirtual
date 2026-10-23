import { z } from "zod";
import { isHexColor, normalizeWhatsapp } from "@/lib/utils";

// Expresión regular para slug alfanumérico en minúsculas con guiones
export const slugRegex = /^[a-z0-9-]{3,60}$/;

// Lista de slugs protegidos para evitar colisiones con rutas del sistema
export const reservedSlugs = [
  "admin",
  "superadmin",
  "api",
  "login",
  "_next",
  "auth",
  "dashboard",
  "settings",
  "checkout",
] as const;

/**
 * Esquema de validación para Slugs de negocios
 */
export const slugSchema = z
  .string()
  .min(3, "El slug debe tener al menos 3 caracteres.")
  .max(60, "El slug no puede exceder 60 caracteres.")
  .regex(slugRegex, "El slug solo puede contener letras minúsculas, números y guiones.")
  .refine(
    (val) => !reservedSlugs.includes(val as (typeof reservedSlugs)[number]),
    "Este slug está reservado para el sistema."
  );

/**
 * Esquema de validación para números de teléfono móvil en Bolivia (8 dígitos, empezando generalmente en 6 o 7)
 */
export const bolivianPhoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ""))
  .refine((val) => val.length === 8, "El número local boliviano debe tener exactamente 8 dígitos.")
  .refine(
    (val) => /^[67]/.test(val),
    "El número de celular en Bolivia suele iniciar con 6 o 7."
  );

/**
 * Esquema de validación para WhatsApp con formato normalizado 591 + 8 dígitos
 */
export const whatsappSchema = z
  .string()
  .transform((val) => {
    try {
      return normalizeWhatsapp(val);
    } catch {
      return val;
    }
  })
  .refine(
    (val) => /^591[0-9]{8}$/.test(val),
    "El número de WhatsApp debe tener un formato boliviano válido (591 seguido de 8 dígitos)."
  );

/**
 * Esquema de validación para colores hexadecimales
 */
export const hexColorSchema = z
  .string()
  .refine((val) => isHexColor(val), "Debe ser un código de color hexadecimal válido (ej: #0ea5e9).");

/**
 * Esquema de validación para precios monetarios en Bolivianos
 */
export const priceSchema = z
  .number({ invalid_type_error: "El precio debe ser un número." })
  .min(0, "El precio no puede ser negativo.")
  .max(10000000, "El monto supera el límite permitido.");

/**
 * Esquema de validación para nombres de personas o negocios
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe contener al menos 2 caracteres.")
  .max(120, "El nombre no puede exceder los 120 caracteres.");
