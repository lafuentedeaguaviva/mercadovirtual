import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
  format: "image/webp";
}

export interface ClientImageOptimizationOptions {
  maxWidthOrHeight?: number;
  targetMaxKb?: number;
  quality?: number;
}

/**
 * Optimiza y convierte cualquier imagen (JPG, PNG, WebP, HEIC) en el cliente
 * a formato WebP ultraligero (< 100 KB por defecto), garantizando carga instantánea
 * incluso en redes móviles 3G/4G inestables.
 */
export async function optimizeImageToWebP(
  file: File,
  options: ClientImageOptimizationOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidthOrHeight = 900,
    targetMaxKb = 100,
    quality = 0.78,
  } = options;

  const originalSizeKb = Math.round(file.size / 1024);

  // Opciones base de compresión orientada a WebP y bajo consumo de datos
  const baseOptions = {
    maxWidthOrHeight,
    fileType: "image/webp",
    initialQuality: quality,
    maxSizeMB: targetMaxKb / 1024,
    useWebWorker: true,
  };

  let compressedFile = await imageCompression(file, baseOptions);

  // Si tras la primera pasada supera el target deseado, aplicar pasadas agresivas escalonadas
  let currentQuality = quality;
  let currentMaxDimension = maxWidthOrHeight;

  while (compressedFile.size > targetMaxKb * 1024 && currentQuality > 0.35) {
    currentQuality -= 0.12;
    currentMaxDimension = Math.max(640, currentMaxDimension - 80);

    compressedFile = await imageCompression(file, {
      maxWidthOrHeight: currentMaxDimension,
      fileType: "image/webp",
      initialQuality: currentQuality,
      maxSizeMB: (targetMaxKb * 0.95) / 1024,
      useWebWorker: true,
    });
  }

  // Medir dimensiones resultantes
  let width = 0;
  let height = 0;
  try {
    const bitmap = await createImageBitmap(compressedFile);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    // Fallback si createImageBitmap no está disponible en el entorno
  }

  const compressedSizeKb = Math.round(compressedFile.size / 1024);

  return {
    file: compressedFile,
    originalSizeKb,
    compressedSizeKb,
    width,
    height,
    format: "image/webp",
  };
}

/**
 * Construye URLs optimizadas para Supabase Storage o CDNs compatibles
 * aprovechando transformación en el servidor / caché Cloudflare edge.
 */
export function getOptimizedImageUrl(
  rawUrl: string | null | undefined,
  options?: { width?: number; height?: number; quality?: number }
): string {
  if (!rawUrl) return "/placeholder-product.svg";

  // Si no es URL de Supabase Storage, retornar tal cual
  if (!rawUrl.includes("storage/v1/object/public")) {
    return rawUrl;
  }

  const { width = 800, quality = 80 } = options || {};

  // Supabase Image Transformations endpoint:
  // Cambia /storage/v1/object/public/ -> /storage/v1/render/image/public/
  try {
    const renderUrl = rawUrl.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );

    const url = new URL(renderUrl);
    url.searchParams.set("width", width.toString());
    url.searchParams.set("quality", quality.toString());
    url.searchParams.set("format", "origin"); // o webp
    return url.toString();
  } catch {
    return rawUrl;
  }
}
