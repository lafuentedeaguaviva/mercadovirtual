import { z } from "zod";

export const coordenadasGpsSchema = z.object({
  lat: z.number().min(-90, "Latitud debe estar entre -90 y 90").max(90, "Latitud debe estar entre -90 y 90"),
  lng: z.number().min(-180, "Longitud debe estar entre -180 y 180").max(180, "Longitud debe estar entre -180 y 180"),
});

export const servicioItemSchema = z.enum([
  "agua",
  "luz",
  "gas",
  "alcantarillado",
]);

export const documentoItemSchema = z.enum([
  "folio_real",
  "minuta",
  "otros",
]);

export const loteMetadataSchema = z.object({
  superficie_m2: z.coerce.number().positive("La superficie debe ser mayor a 0").optional(),
  frente_m: z.coerce.number().positive("El frente debe ser mayor a 0").optional(),
  fondo_m: z.coerce.number().positive("El fondo debe ser mayor a 0").optional(),
  manzano: z.string().trim().min(1).optional(),
  lote: z.string().trim().min(1).optional(),
  servicios: z.array(servicioItemSchema).default([]).optional(),
  documentos: z.array(documentoItemSchema).default([]).optional(),
  coordenadas_gps: coordenadasGpsSchema.optional(),
  zona: z.string().trim().optional(),
});

export type LoteMetadata = z.infer<typeof loteMetadataSchema>;
