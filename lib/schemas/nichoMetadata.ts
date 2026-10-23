import { z } from "zod";
import { loteMetadataSchema } from "@/lib/schemas/inmueble";

export const comercioMetadataSchema = z.object({
  tallas: z.array(z.string().trim()).default([]).optional(),
  colores: z.array(z.string().trim()).default([]).optional(),
  marca: z.string().trim().max(100).optional(),
  stock: z.coerce.number().min(0).optional(),
  unidad: z.string().trim().max(30).default("unidades").optional(),
  mostrar_stock: z.boolean().default(false).optional(),
  badge_etiqueta: z.string().trim().max(50).optional(),
});

export const agendaMetadataSchema = z.object({
  duracion_minutos: z.coerce
    .number()
    .positive("La duración debe ser mayor a 0")
    .refine((val) => val % 5 === 0, "La duración debe ser un múltiplo de 5 minutos")
    .default(30),
  requisitos: z.string().trim().max(500).optional(),
});

export const plazaComidasMetadataSchema = z.object({
  categoria: z.string().trim().min(2, "La categoría es requerida").default("Plato Fuerte"),
  tiempo_preparacion: z.string().trim().max(100).optional(),
  stock: z.coerce.number().min(0).optional(),
  unidad: z.string().trim().max(30).default("porciones").optional(),
  mostrar_stock: z.boolean().default(false).optional(),
  badge_etiqueta: z.string().trim().max(50).optional(),
});

export { loteMetadataSchema };
