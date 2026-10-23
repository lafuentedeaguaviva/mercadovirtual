"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { saveItemFullAction, uploadItemImageAction } from "@/app/actions/items";
import {
  comercioMetadataSchema,
  loteMetadataSchema,
  agendaMetadataSchema,
  plazaComidasMetadataSchema,
} from "@/lib/schemas/nichoMetadata";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface FormNuevoItemProps {
  business: {
    id: string;
    niche: string;
    max_items: number;
  };
  itemExistente?: ItemRow | null;
  onSaved: () => void;
  onClose?: () => void;
}

export function FormNuevoItem({
  business,
  itemExistente,
  onSaved,
  onClose,
}: FormNuevoItemProps) {
  // 1. Campos comunes
  const [title, setTitle] = useState(itemExistente?.title || "");
  const [description, setDescription] = useState(itemExistente?.description || "");
  const [price, setPrice] = useState(itemExistente ? String(itemExistente.price) : "");
  const [status, setStatus] = useState<ItemRow["status"]>(itemExistente?.status || "disponible");

  // 2. Imágenes (hasta 5)
  const [images, setImages] = useState<string[]>(itemExistente?.images || []);
  const [newlyUploadedUrls, setNewlyUploadedUrls] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>("");
  const [lastUploadedSizeKb, setLastUploadedSizeKb] = useState<number | null>(null);

  // 3. Campos dinámicos por nicho (metadata)
  const existingMeta = (itemExistente?.metadata || {}) as Record<string, any>;

  // Nicho: Comercio y Stock
  const PRESET_UNIDADES = ["unidades", "pares", "piezas", "cajas", "porciones", "docenas", "kg", "litros", "metros"];
  const initialUnidad = existingMeta.unidad || "unidades";
  const isCustomInitial = !PRESET_UNIDADES.includes(initialUnidad);

  const [stock, setStock] = useState<string>(existingMeta.stock !== undefined ? String(existingMeta.stock) : "");
  const [tipoUnidad, setTipoUnidad] = useState<string>(isCustomInitial ? "otro" : initialUnidad);
  const [unidadPersonalizada, setUnidadPersonalizada] = useState<string>(isCustomInitial ? initialUnidad : "");
  const [mostrarStock, setMostrarStock] = useState<boolean>(Boolean(existingMeta.mostrar_stock));
  const [badgeEtiqueta, setBadgeEtiqueta] = useState<string>(existingMeta.badge_etiqueta || "");
  const [tallaInput, setTallaInput] = useState("");
  const [tallas, setTallas] = useState<string[]>(
    Array.isArray(existingMeta.tallas) ? existingMeta.tallas : []
  );
  const [colorInput, setColorInput] = useState("");
  const [colores, setColores] = useState<string[]>(
    Array.isArray(existingMeta.colores) ? existingMeta.colores : []
  );
  const [marca, setMarca] = useState<string>(existingMeta.marca || "");

  // Nicho: Inmueble
  const [superficieM2, setSuperficieM2] = useState(existingMeta.superficie_m2 ? String(existingMeta.superficie_m2) : "");
  const [frenteM, setFrenteM] = useState(existingMeta.frente_m ? String(existingMeta.frente_m) : "");
  const [fondoM, setFondoM] = useState(existingMeta.fondo_m ? String(existingMeta.fondo_m) : "");
  const [zona, setZona] = useState(existingMeta.zona || "");
  const [manzano, setManzano] = useState(existingMeta.manzano || "");
  const [lote, setLote] = useState(existingMeta.lote || "");
  const [servicios, setServicios] = useState<string[]>(existingMeta.servicios || ["agua", "luz"]);
  const [documentos, setDocumentos] = useState<string[]>(existingMeta.documentos || ["folio_real"]);
  const [lat, setLat] = useState(existingMeta.coordenadas_gps?.lat ? String(existingMeta.coordenadas_gps.lat) : "");
  const [lng, setLng] = useState(existingMeta.coordenadas_gps?.lng ? String(existingMeta.coordenadas_gps.lng) : "");

  // Nicho: Agenda
  const [duracionMinutos, setDuracionMinutos] = useState<number>(
    existingMeta.duracion_minutos || 30
  );
  const [requisitos, setRequisitos] = useState<string>(existingMeta.requisitos || "");

  // Nicho: Plaza de comidas
  const [categoriaPlato, setCategoriaPlato] = useState<string>(existingMeta.categoria || "Platos Fuertes");
  const [tiempoPreparacion, setTiempoPreparacion] = useState<string>(existingMeta.tiempo_preparacion || "15 min");

  // Estados de proceso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Accesibilidad: Atrapar foco en el modal y cerrar con Escape
  useEffect(() => {
    modalRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Manejo de chips de tallas y colores
  const addTalla = () => {
    if (tallaInput.trim() && !tallas.includes(tallaInput.trim())) {
      setTallas([...tallas, tallaInput.trim()]);
      setTallaInput("");
    }
  };

  const removeTalla = (t: string) => {
    setTallas(tallas.filter((x) => x !== t));
  };

  const addColor = () => {
    if (colorInput.trim() && !colores.includes(colorInput.trim())) {
      setColores([...colores, colorInput.trim()]);
      setColorInput("");
    }
  };

  const removeColor = (c: string) => {
    setColores(colores.filter((x) => x !== c));
  };

  // Compresión y subida progresiva de imágenes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMessage("Solo puedes tener un máximo de 5 imágenes por producto.");
      return;
    }

    try {
      setIsCompressing(true);
      setErrorMessage("");

      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo y tamaño original (máx 10 MB)
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
        if (!validTypes.includes(file.type)) {
          throw new Error(`Tipo de archivo no permitido (${file.name}). Usa JPG, PNG o WebP.`);
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} supera los 10 MB máximos.`);
        }

        setCompressionProgress(`Optimizando y convirtiendo a WebP (${i + 1} de ${files.length})...`);

        // Compresión ultra-optimizada en el cliente a WebP (< 100 KB)
        const { file: compressedFile, compressedSizeKb } = await optimizeImageToWebP(file, {
          maxWidthOrHeight: 850,
          targetMaxKb: 95, // Margen de seguridad estricto menor a 100 KB
          quality: 0.75,
        });

        setLastUploadedSizeKb(compressedSizeKb);

        // Subir mediante Server Action autorizado (evita fallos de RLS en el navegador)
        const uploadFormData = new FormData();
        uploadFormData.append("file", compressedFile);

        const uploadRes = await uploadItemImageAction(business.id, uploadFormData);

        if (!uploadRes.success || !uploadRes.publicUrl) {
          throw new Error(`Error al subir imagen: ${uploadRes.message || "Error desconocido"}`);
        }

        uploadedUrls.push(uploadRes.publicUrl);
      }

      setImages((prev) => [...prev, ...uploadedUrls]);
      setNewlyUploadedUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      console.error("Error al procesar imágenes:", err);
      setErrorMessage(err.message || "Error al comprimir o subir la imagen.");
    } finally {
      setIsCompressing(false);
      setCompressionProgress("");
      if (e.target) e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const newIdx = direction === "left" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setImages(copy);
  };

  // Guardar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Construir metadata dinámico validado con Zod
      let finalMetadata: Record<string, unknown> = {};
      const resolvedUnidad = (tipoUnidad === "otro" ? unidadPersonalizada.trim() : tipoUnidad) || "unidades";

      if (business.niche === "comercio") {
        finalMetadata = comercioMetadataSchema.parse({
          tallas,
          colores,
          marca: marca.trim() || undefined,
          stock: stock !== "" ? parseInt(stock, 10) : undefined,
          unidad: resolvedUnidad,
          mostrar_stock: mostrarStock,
          badge_etiqueta: badgeEtiqueta.trim() || undefined,
        });
      } else if (business.niche === "inmueble") {
        const parsedCoords =
          lat && lng
            ? { lat: parseFloat(lat), lng: parseFloat(lng) }
            : undefined;

        finalMetadata = loteMetadataSchema.parse({
          superficie_m2: superficieM2 ? parseFloat(superficieM2) : undefined,
          frente_m: frenteM ? parseFloat(frenteM) : undefined,
          fondo_m: fondoM ? parseFloat(fondoM) : undefined,
          zona: zona.trim() || undefined,
          manzano: manzano.trim() || undefined,
          lote: lote.trim() || undefined,
          servicios: servicios as any,
          documentos: documentos as any,
          coordenadas_gps: parsedCoords,
        });
      } else if (business.niche === "agenda") {
        finalMetadata = agendaMetadataSchema.parse({
          duracion_minutos: duracionMinutos,
          requisitos: requisitos.trim() || undefined,
        });
      } else if (business.niche === "plaza_comidas") {
        finalMetadata = plazaComidasMetadataSchema.parse({
          categoria: categoriaPlato.trim(),
          tiempo_preparacion: tiempoPreparacion.trim() || undefined,
          stock: stock !== "" ? parseInt(stock, 10) : undefined,
          unidad: resolvedUnidad || "porciones",
          mostrar_stock: mostrarStock,
          badge_etiqueta: badgeEtiqueta.trim() || undefined,
        });
      }

      // 2. Invocar Server Action
      const result = await saveItemFullAction(business.id, {
        itemId: itemExistente?.id,
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        status,
        images,
        metadata: finalMetadata,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setToastMessage(itemExistente ? "¡Producto actualizado con éxito!" : "¡Producto creado con éxito!");
      onSaved();

      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    } catch (err: any) {
      console.error("Error al validar o guardar:", err);
      setErrorMessage(err.message || "Error al validar los campos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto focus:outline-none">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="form-modal-title" className="text-base sm:text-lg font-black text-slate-900">
              {itemExistente ? "Editar Artículo del Catálogo" : "Nuevo Artículo en Catálogo"}
            </h2>
            <p className="text-xs text-slate-500">
              Personalizado para nicho: <strong className="capitalize">{business.niche.replace(/_/g, " ")}</strong>
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Notificación de Error */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Notificación Toast de Éxito */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold animate-fade-in" role="status">
            ✓ {toastMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-700">
          {/* 1. CAMPOS COMUNES */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Información General
            </span>

            <div>
              <label htmlFor="item-title" className="block uppercase tracking-wider mb-1">
                Título (3 - 200 caracteres) *
              </label>
              <input
                id="item-title"
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Televisor Smart TV 55 4K Ultra HD"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-price" className="block uppercase tracking-wider mb-1 font-bold text-slate-700">
                  Precio en Bolivianos (Bs.) *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 bg-white shadow-sm">
                  <span className="px-3.5 py-2 bg-slate-100 text-slate-700 text-xs sm:text-sm font-black border-r border-slate-300 select-none">
                    Bs.
                  </span>
                  <input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej: 150"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-black focus:outline-none bg-white text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="item-status" className="block uppercase tracking-wider mb-1 font-bold text-slate-700">
                  Estado de Disponibilidad
                </label>
                <select
                  id="item-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                >
                  <option value="disponible">Disponible</option>
                  <option value="agotado">Agotado</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
              </div>
            </div>

            {/* Cantidad / Stock y control de visibilidad para clientes */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="item-stock" className="block uppercase tracking-wider text-xs font-bold text-slate-700">
                  Control de Cantidad (Stock)
                </label>
                
                {/* Botón switch para visibilidad al cliente */}
                <button
                  type="button"
                  onClick={() => setMostrarStock(!mostrarStock)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    mostrarStock
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700"
                  }`}
                  title="Haz clic para mostrar u ocultar la cantidad disponible en el catálogo a tus clientes"
                >
                  <span>{mostrarStock ? "👁️ Visible al cliente" : "🔒 Oculto al cliente"}</span>
                </button>
              </div>

              {/* Fila compacta: Caja numérica pequeña + Selector de Unidad */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="w-full sm:w-32 flex-shrink-0">
                  <input
                    id="item-stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ej: 12"
                    value={stock}
                    onKeyDown={(e) => {
                      if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-" || e.key === "+") {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                      setStock(cleanVal);
                    }}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <select
                    id="item-unidad"
                    value={tipoUnidad}
                    onChange={(e) => setTipoUnidad(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="unidades">Unidades (uds.)</option>
                    <option value="pares">Pares (calzados, guantes)</option>
                    <option value="piezas">Piezas (pzas.)</option>
                    <option value="cajas">Cajas / Paquetes</option>
                    <option value="porciones">Porciones / Platos</option>
                    <option value="docenas">Docenas</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="litros">Litros (L)</option>
                    <option value="metros">Metros (m)</option>
                    <option value="otro">✏️ Otro (Escribir personalizado...)</option>
                  </select>

                  {tipoUnidad === "otro" && (
                    <input
                      type="text"
                      maxLength={25}
                      placeholder="Ej: frascos, quintales..."
                      value={unidadPersonalizada}
                      onChange={(e) => setUnidadPersonalizada(e.target.value)}
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-sky-300 bg-sky-50/50 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {mostrarStock
                  ? `✓ Los clientes verán "${stock || 0} ${tipoUnidad === "otro" ? unidadPersonalizada || "unidades" : tipoUnidad}" disponibles en el catálogo.`
                  : "ℹ️ La cantidad es privada para tu control interno de inventario y no se muestra a los clientes."}
              </p>
            </div>

            {/* Grupo de Etiqueta Promocional / Destacado */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="item-badge" className="block uppercase tracking-wider text-xs font-bold text-amber-900">
                  Etiqueta Especial / Destacado (Opcional)
                </label>
                {badgeEtiqueta && (
                  <button
                    type="button"
                    onClick={() => setBadgeEtiqueta("")}
                    className="text-[11px] text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
                  >
                    Quitar etiqueta
                  </button>
                )}
              </div>

              {/* Botones rápidos de etiquetas populares */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "🔥 Promoción", value: "Promoción" },
                  { label: "🏷️ Descuento", value: "Descuento" },
                  { label: "⭐ Nuevo", value: "Nuevo" },
                  { label: "⚡ 2x1", value: "2x1" },
                  { label: "💥 Liquidación", value: "Liquidación" },
                  { label: "🏆 Más Vendido", value: "Más Vendido" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBadgeEtiqueta(badgeEtiqueta === preset.value ? "" : preset.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                      badgeEtiqueta === preset.value
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Input libre para cualquier otra etiqueta personalizada */}
              <div className="pt-1">
                <input
                  id="item-badge"
                  type="text"
                  maxLength={40}
                  placeholder="O escribe otra etiqueta... Ej: Oferta por San Juan, Envío Gratis..."
                  value={badgeEtiqueta}
                  onChange={(e) => setBadgeEtiqueta(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-amber-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <p className="text-[11px] text-amber-800/80">
                {badgeEtiqueta ? (
                  <span>
                    ✓ Se mostrará la insignia destacada <strong className="px-2 py-0.5 rounded bg-amber-200/90 text-amber-900">{badgeEtiqueta}</strong> en la esquina del producto.
                  </span>
                ) : (
                  "Destaca tu producto con ofertas especiales, descuentos o promociones para llamar la atención del cliente."
                )}
              </p>
            </div>

            <div>
              <label htmlFor="item-desc" className="block uppercase tracking-wider mb-1">
                Descripción (máx. 1000 caracteres)
              </label>
              <textarea
                id="item-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla las características principales del producto, materiales o condiciones..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white resize-y"
              />
            </div>
          </div>

          {/* 2. CAMPOS DINÁMICOS SEGÚN EL NICHO */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Características del Nicho: {business.niche}
            </span>

            {/* NICHO COMERCIO */}
            {business.niche === "comercio" && (
              <div className="space-y-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Tallas Disponibles (Chips)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tallaInput}
                      onChange={(e) => setTallaInput(e.target.value)}
                      placeholder="Ej. S, M, XL o 38, 40..."
                      className="flex-1 min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTalla();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addTalla}
                      className="min-h-[44px] px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                    >
                      + Añadir
                    </button>
                  </div>
                  {tallas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {tallas.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 text-xs font-bold">
                          {t}
                          <button type="button" onClick={() => removeTalla(t)} className="text-sky-700 hover:text-rose-600">
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Colores Disponibles</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="Ej. Rojo, Dorado, Negro..."
                      className="flex-1 min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      className="min-h-[44px] px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                    >
                      + Añadir
                    </button>
                  </div>
                  {colores.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {colores.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">
                          {c}
                          <button type="button" onClick={() => removeColor(c)} className="text-emerald-700 hover:text-rose-600">
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="marca-input" className="block uppercase tracking-wider mb-1">Marca o Fabricante</label>
                  <input
                    id="marca-input"
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej. Bordados Socavón Oruro"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* NICHO INMUEBLE */}
            {business.niche === "inmueble" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Superficie (m²)</label>
                    <input
                      type="number"
                      step="1"
                      value={superficieM2}
                      onChange={(e) => setSuperficieM2(e.target.value)}
                      placeholder="300"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Frente (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={frenteM}
                      onChange={(e) => setFrenteM(e.target.value)}
                      placeholder="12"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Fondo (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={fondoM}
                      onChange={(e) => setFondoM(e.target.value)}
                      placeholder="25"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Zona / Urbanización</label>
                  <input
                    type="text"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    placeholder="Ej. Zona Sud, Vinto, Challapampa, Urbanización Las Retamas..."
                    className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Manzano</label>
                    <input
                      type="text"
                      value={manzano}
                      onChange={(e) => setManzano(e.target.value)}
                      placeholder="Mza. C"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Lote</label>
                    <input
                      type="text"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                      placeholder="Lote 14"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Latitud GPS</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="-17.9645"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block uppercase tracking-wider mb-1">Longitud GPS</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="-67.1135"
                      className="w-full min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NICHO AGENDA */}
            {business.niche === "agenda" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="duracion-select" className="block uppercase tracking-wider mb-1">Duración del Procedimiento (Múltiplo de 5 min) *</label>
                  <select
                    id="duracion-select"
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(parseInt(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} minutos
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="requisitos-input" className="block uppercase tracking-wider mb-1">Requisitos Previos</label>
                  <input
                    id="requisitos-input"
                    type="text"
                    value={requisitos}
                    onChange={(e) => setRequisitos(e.target.value)}
                    placeholder="Ej. Venir en ayunas, traer radiografía panorámica..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* NICHO PLAZA DE COMIDAS */}
            {business.niche === "plaza_comidas" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="categoria-plato" className="block uppercase tracking-wider mb-1">Categoría del Plato *</label>
                  <input
                    id="categoria-plato"
                    type="text"
                    required
                    value={categoriaPlato}
                    onChange={(e) => setCategoriaPlato(e.target.value)}
                    placeholder="Ej. Tradicionales, Postres, Bebidas..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="tiempo-prep" className="block uppercase tracking-wider mb-1">Tiempo Estimado de Preparación</label>
                  <input
                    id="tiempo-prep"
                    type="text"
                    value={tiempoPreparacion}
                    onChange={(e) => setTiempoPreparacion(e.target.value)}
                    placeholder="Ej. 10 - 15 min"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. IMÁGENES (HASTA 5) */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Galería de Fotos ({images.length} de 5)
              </span>
              {lastUploadedSizeKb && (
                <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                  Última imagen: {lastUploadedSizeKb} KB (WebP)
                </span>
              )}
            </div>

            {/* Selector de Archivo */}
            {images.length < 5 && (
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  disabled={isCompressing || isSubmitting}
                  onChange={handleImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Formatos: JPG, PNG, WebP o HEIC. Se optimizarán automáticamente a WebP &lt; 200 KB.
                </p>
              </div>
            )}

            {isCompressing && (
              <div className="flex items-center gap-2 p-3 bg-sky-50 rounded-xl text-sky-800 text-xs font-semibold animate-pulse">
                <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <span>{compressionProgress || "Procesando compresión..."}</span>
              </div>
            )}

            {/* Galería de previsualizaciones con opción de quitar y reordenar */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 bg-slate-100 group">
                    <Image src={imgUrl} alt={`Foto ${idx + 1}`} fill sizes="120px" className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-between items-center text-white text-[10px]">
                        <span className="bg-black/60 px-1 rounded">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="w-6 h-6 rounded bg-rose-600 text-white flex items-center justify-center font-bold"
                          aria-label={`Eliminar imagen ${idx + 1}`}
                        >
                          ✕
                        </button>
                      </div>

                      {images.length > 1 && (
                        <div className="flex justify-between text-white text-xs">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, "left")}
                            className="w-6 h-6 rounded bg-white/30 hover:bg-white/50 flex items-center justify-center disabled:opacity-20"
                            aria-label="Mover a la izquierda"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => moveImage(idx, "right")}
                            className="w-6 h-6 rounded bg-white/30 hover:bg-white/50 flex items-center justify-center disabled:opacity-20"
                            aria-label="Mover a la derecha"
                          >
                            ▶
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción del Modal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {isSubmitting
                ? "Guardando en Catálogo..."
                : itemExistente
                ? "Actualizar Producto"
                : "Crear Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
