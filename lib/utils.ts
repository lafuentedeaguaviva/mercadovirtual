import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales con resolución de conflictos de Tailwind CSS.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formatea valores numéricos a la moneda nacional boliviana (Bs. 1.234,50).
 */
export function formatBs(value: number | string): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return "Bs. 0,00";
  }

  const formatter = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `Bs. ${formatter.format(numericValue)}`;
}

/**
 * Normaliza cualquier número de teléfono/WhatsApp al formato oficial de Bolivia (591 + 8 dígitos).
 * Ejemplos: "71234567" -> "59171234567", "+591 71234567" -> "59171234567"
 */
export function normalizeWhatsapp(input: string): string {
  const digitsOnly = input.replace(/\D/g, "");

  if (digitsOnly.length === 8) {
    return `591${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("591")) {
    return digitsOnly;
  }

  throw new Error(`Número de WhatsApp boliviano inválido: "${input}". Debe constar de 8 dígitos locales o prefijo 591.`);
}

/**
 * Construye el enlace universal hacia la API de WhatsApp con mensaje codificado.
 */
export function buildWhatsappUrl(number: string, message: string): string {
  const normalizedNumber = normalizeWhatsapp(number);
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Normaliza y extrae el valor de un searchParam de Next.js (string, string[] o undefined).
 */
export function parseSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Comprueba si una cadena es un color hexadecimal válido (#RGB, #RRGGBB o #RRGGBBAA).
 */
export function isHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
}

/**
 * Normaliza cadenas de texto para búsqueda: elimina tildes/marcas diacríticas,
 * convierte a minúsculas y recorta espacios en blanco.
 * Ejemplo: "Café Andino" -> "cafe andino"
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Sanitiza parámetros de redirección (?next=) para prevenir Open Redirects:
 * - Debe comenzar estrictamente con "/"
 * - NO puede comenzar con "//" (redirección de esquema relativo)
 * - NO puede contener backslashes ni ":" antes de una barra
 * - Si es inválido, retorna el fallback seguro proporcionado
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();

  // Debe empezar con '/' y no con '//' o '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Prevenir trucos de tipo /foo/../bar con esquemas o bypass
  try {
    const dummyBase = "http://localhost:3000";
    const parsed = new URL(trimmed, dummyBase);
    // Verificar que el origin se mantenga idéntico
    if (parsed.origin !== dummyBase) {
      return fallback;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

/**
 * Calcula la luminancia relativa de un color hexadecimal (#RGB o #RRGGBB).
 */
export function getRelativeLuminance(hex: string): number {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((char) => char + char).join("");
  }
  if (c.length !== 6) return 0.5;

  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const transform = (val: number) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

  const R = transform(r);
  const G = transform(g);
  const B = transform(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Retorna el color de texto accesible ('#ffffff' o '#0f172a') para contrastar
 * sobre el color de marca especificado según la norma WCAG AA (ratio mínimo 4.5:1).
 */
export function getAccessibleTextColor(backgroundHex: string): "#ffffff" | "#0f172a" {
  if (!isHexColor(backgroundHex)) return "#ffffff";
  const bgLuminance = getRelativeLuminance(backgroundHex);
  const whiteLuminance = 1.0;
  const darkLuminance = 0.01; // Luminancia aproximada de #0f172a

  // Contrast ratio con blanco
  const contrastWithWhite = (whiteLuminance + 0.05) / (bgLuminance + 0.05);
  // Contrast ratio con oscuro
  const contrastWithDark = (bgLuminance + 0.05) / (darkLuminance + 0.05);

  // Si el contraste con blanco no llega a 4.5 y el oscuro es mejor, usar texto oscuro
  if (contrastWithWhite < 4.5 && contrastWithDark > contrastWithWhite) {
    return "#0f172a";
  }

  return "#ffffff";
}

