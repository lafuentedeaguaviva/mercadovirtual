"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { updateBusinessBrandingAction } from "@/app/actions/admin";

interface GestorBrandingNegocioProps {
  businessId: string;
  businessName: string;
  niche: string;
  initialLogoUrl: string | null;
  initialBannerUrl: string | null;
  isSuspended?: boolean;
  onUpdate?: (newLogo: string | null, newBanner: string | null) => void;
}

// Sugerencias estéticas curadas de Unsplash según el rubro boliviano
const PRESET_BANNERS: Record<string, { label: string; url: string }[]> = {
  comercio: [
    {
      label: "Boutique & Moda",
      url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Vitrina Moderna",
      url: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Calzados & Estilo",
      url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Tecnología & Celulares",
      url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Joyería & Relojería",
      url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Librería & Papelería",
      url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Artesanías & Regalos",
      url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Perfumería & Cosméticos",
      url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80",
    },
  ],
  plaza_comidas: [
    {
      label: "Restaurante Gourmet",
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Hamburguesas & Grill",
      url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Cafetería & Pasteles",
      url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Pizzería Artesanal",
      url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Pollo Broaster & Papas",
      url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Heladería & Postres",
      url: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Churrasquería & Carnes",
      url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Comida Típica & Tradición",
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
    },
  ],
  agenda: [
    {
      label: "Salón de Belleza / Spa",
      url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Barbería Clásica",
      url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Clínica & Consultorio",
      url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Odontología & Sonrisa",
      url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Fitness & Gimnasio",
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Manicura & Uñas",
      url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Veterinaria & Mascotas",
      url: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Psicología & Coaching",
      url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&auto=format&fit=crop&q=80",
    },
  ],
  inmueble: [
    {
      label: "Arquitectura Moderna",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Interiores Cálidos",
      url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Edificio Residencial",
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Casa Familiar & Jardín",
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Departamento & Terraza",
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Oficinas & Cowork",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Terrenos & Lotes",
      url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80",
    },
    {
      label: "Local Comercial",
      url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&auto=format&fit=crop&q=80",
    },
  ],
};

export function GestorBrandingNegocio({
  businessId,
  businessName,
  niche,
  initialLogoUrl,
  initialBannerUrl,
  isSuspended = false,
  onUpdate,
}: GestorBrandingNegocioProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [bannerUrl, setBannerUrl] = useState<string | null>(initialBannerUrl);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [showUrlModal, setShowUrlModal] = useState<"logo" | "banner" | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const presets = PRESET_BANNERS[niche] || PRESET_BANNERS.comercio;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Subir imagen optimizada a Supabase Storage (bucket items-media)
  const handleFileUpload = async (file: File, type: "logo" | "banner") => {
    if (isSuspended) {
      showToast("Tu negocio está en modo solo lectura.", "error");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type)) {
      showToast("Formato no compatible. Sube imágenes JPG, PNG o WebP.", "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("La imagen supera los 8 MB permitidos.", "error");
      return;
    }

    if (type === "logo") setIsUploadingLogo(true);
    else setIsUploadingBanner(true);

    setUploadProgress("Optimizando resolución a WebP ultraligero...");

    try {
      // Configuración de optimización diferenciada
      const isBanner = type === "banner";
      const { file: compressedFile, compressedSizeKb } = await optimizeImageToWebP(file, {
        maxWidthOrHeight: isBanner ? 1400 : 500,
        targetMaxKb: isBanner ? 160 : 70,
        quality: 0.8,
      });

      setUploadProgress(`Subiendo (${compressedSizeKb} KB)...`);

      const supabase = createClient();
      const uniquePath = `${businessId}/${type}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("items-media")
        .upload(uniquePath, compressedFile, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Error al subir al servidor de almacenamiento.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("items-media")
        .getPublicUrl(uniquePath);

      const finalUrl = publicUrlData.publicUrl;

      // Guardar en la base de datos
      const updatePayload = isBanner ? { bannerUrl: finalUrl } : { logoUrl: finalUrl };
      const res = await updateBusinessBrandingAction(businessId, updatePayload);

      if (!res.success) {
        throw new Error(res.message);
      }

      if (isBanner) {
        setBannerUrl(finalUrl);
        onUpdate?.(logoUrl, finalUrl);
        showToast("¡Banner de portada actualizado con éxito!");
      } else {
        setLogoUrl(finalUrl);
        onUpdate?.(finalUrl, bannerUrl);
        showToast("¡Foto de perfil / logo actualizado con éxito!");
      }
    } catch (err: any) {
      console.error("Error al actualizar branding:", err);
      showToast(err.message || "No se pudo actualizar la imagen.", "error");
    } finally {
      setIsUploadingLogo(false);
      setIsUploadingBanner(false);
      setUploadProgress("");
    }
  };

  const handleApplyPresetBanner = async (url: string) => {
    if (isSuspended) return;
    setIsUploadingBanner(true);
    try {
      const res = await updateBusinessBrandingAction(businessId, { bannerUrl: url });
      if (res.success) {
        setBannerUrl(url);
        onUpdate?.(logoUrl, url);
        showToast("¡Portada temática aplicada!");
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al aplicar portada.", "error");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customUrlInput.trim()) return;
    const isBanner = showUrlModal === "banner";

    try {
      new URL(customUrlInput);
    } catch {
      showToast("Ingresa una URL web válida que comience con https://", "error");
      return;
    }

    if (isBanner) setIsUploadingBanner(true);
    else setIsUploadingLogo(true);

    try {
      const payload = isBanner ? { bannerUrl: customUrlInput } : { logoUrl: customUrlInput };
      const res = await updateBusinessBrandingAction(businessId, payload);
      if (res.success) {
        if (isBanner) {
          setBannerUrl(customUrlInput);
          onUpdate?.(logoUrl, customUrlInput);
        } else {
          setLogoUrl(customUrlInput);
          onUpdate?.(customUrlInput, bannerUrl);
        }
        showToast(`¡${isBanner ? "Portada" : "Logo"} actualizado correctamente!`);
        setShowUrlModal(null);
        setCustomUrlInput("");
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al guardar URL.", "error");
    } finally {
      setIsUploadingBanner(false);
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveImage = async (type: "logo" | "banner") => {
    if (isSuspended) return;
    if (!confirm(`¿Deseas quitar la ${type === "banner" ? "portada" : "foto de logo"}? Se usará el diseño por defecto.`)) {
      return;
    }

    try {
      const payload = type === "banner" ? { bannerUrl: null } : { logoUrl: null };
      const res = await updateBusinessBrandingAction(businessId, payload);
      if (res.success) {
        if (type === "banner") {
          setBannerUrl(null);
          onUpdate?.(logoUrl, null);
        } else {
          setLogoUrl(null);
          onUpdate?.(null, bannerUrl);
        }
        showToast("Imagen restablecida a la predeterminada.");
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al quitar imagen.", "error");
    }
  };

  const activeBanner = bannerUrl || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&auto=format&fit=crop&q=80";
  const activeLogo = logoUrl || "/placeholder-product.svg";

  return (
    <div className="space-y-6">
      {/* Toast de Notificación */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold shadow-lg transition-all flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-2 font-black text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Tarjeta de Banner Panorámico & Identidad de Marca (Elegante, Moderno y Editable al instante) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
        {/* Hero Card Visual Panorámico */}
        <div className="relative">
          {/* Banner Container con Ratio Panorámico Moderno */}
          <div className="relative w-full h-48 sm:h-64 lg:h-72 bg-slate-900 group overflow-hidden">
            <Image
              src={activeBanner}
              alt="Portada de negocio"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            {/* Gradientes elegantes para contraste superior e inferior */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-black/30" />

            {/* Acciones flotantes integradas sobre el Banner */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner || isSuspended}
                className="px-4 py-2 rounded-2xl bg-white/95 hover:bg-white text-slate-900 text-xs sm:text-sm font-black shadow-lg backdrop-blur-md transition-all hover:scale-105 flex items-center gap-2 active:scale-95"
              >
                <span>🖼️</span>
                <span>{bannerUrl ? "Cambiar Portada" : "Elegir Portada"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomUrlInput(bannerUrl || "");
                  setShowUrlModal("banner");
                }}
                className="px-3.5 py-2 rounded-2xl bg-black/60 hover:bg-black/80 text-white text-xs sm:text-sm font-bold backdrop-blur-md transition-colors flex items-center gap-1.5"
              >
                <span>🔗 URL</span>
              </button>
              {bannerUrl && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage("banner")}
                  title="Restablecer banner a imagen por defecto"
                  className="w-9 h-9 rounded-2xl bg-black/60 hover:bg-rose-600 text-white text-xs flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Spinner de Carga de Banner */}
            {isUploadingBanner && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
                <div className="w-9 h-9 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold">{uploadProgress || "Guardando portada..."}</span>
              </div>
            )}
          </div>

          {/* Logo y Controles Superpuestos */}
          <div className="px-6 sm:px-8 pb-6 pt-0 relative bg-white">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16">
              {/* Avatar con overlay interactivo para cambiar logo */}
              <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white flex-shrink-0 ring-1 ring-slate-200/50">
                <Image
                  src={activeLogo}
                  alt={businessName}
                  fill
                  sizes="112px"
                  className="object-cover"
                />

                {/* Overlay hover para cambiar logo */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo || isSuspended}
                  className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold p-1 text-center"
                >
                  <span className="text-lg">📷</span>
                  <span>Cambiar Logo</span>
                </button>

                {/* Spinner de Carga de Logo */}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-[10px] font-bold z-10">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span>Subiendo...</span>
                  </div>
                )}
              </div>

              {/* Botones de acción para Logo y Portada */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo || isSuspended}
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 active:scale-95"
                >
                  <span>👤 Cambiar Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isUploadingBanner || isSuspended}
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 active:scale-95"
                >
                  <span>🌆 Subir Portada</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs de Archivo Ocultos */}
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "banner");
          e.target.value = "";
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, "logo");
          e.target.value = "";
        }}
      />

      {/* Bloque 1: Subida de Banner con Drag & Drop Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subida de Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>🌆</span> Portada / Banner Panorámico
              </h4>
              <p className="text-[11px] text-slate-500">Recomendado: 1200 x 450 px (Paisaje)</p>
            </div>
            {bannerUrl && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Personalizado ✓
              </span>
            )}
          </div>

          <div
            onClick={() => bannerInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-sky-50/40 transition-all group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
              📤
            </div>
            <p className="text-xs font-bold text-slate-800">
              Toca para seleccionar tu Banner
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              JPG, PNG o WebP. Se optimiza automáticamente a WebP ultrarrápido.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(bannerUrl || "");
                setShowUrlModal("banner");
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>🔗 Pegar URL de imagen</span>
            </button>
            {bannerUrl && (
              <button
                type="button"
                onClick={() => handleRemoveImage("banner")}
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Quitar portada
              </button>
            )}
          </div>
        </div>

        {/* Subida de Logo / Foto de Perfil */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>🎯</span> Logo o Foto de Perfil
              </h4>
              <p className="text-[11px] text-slate-500">Recomendado: 400 x 400 px (Cuadrado)</p>
            </div>
            {logoUrl && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Personalizado ✓
              </span>
            )}
          </div>

          <div
            onClick={() => logoInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-sky-50/40 transition-all group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
              👤
            </div>
            <p className="text-xs font-bold text-slate-800">
              Toca para seleccionar tu Logo
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tu marca o foto del puesto. Se muestra en el avatar principal.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(logoUrl || "");
                setShowUrlModal("logo");
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>🔗 Pegar URL de logo</span>
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => handleRemoveImage("logo")}
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bloque 2: Galería de Portadas Temáticas Listas para Usar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>✨</span> Portadas Profesionales Sugeridas para {niche.toUpperCase()}
            </h4>
            <p className="text-[11px] text-slate-500">
              ¿No tienes una foto panorámica ahora? Elige una de alta calidad con 1 clic:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {presets.map((preset) => (
            <div
              key={preset.url}
              onClick={() => handleApplyPresetBanner(preset.url)}
              className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
                bannerUrl === preset.url
                  ? "border-sky-500 ring-2 ring-sky-300"
                  : "border-slate-200 hover:border-sky-400"
              }`}
            >
              <div className="relative w-full h-24 bg-slate-100">
                <Image
                  src={preset.url}
                  alt={preset.label}
                  fill
                  sizes="200px"
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-[11px] font-black text-white leading-tight drop-shadow">
                  {preset.label}
                </span>
                {bannerUrl === preset.url && (
                  <span className="absolute top-2 right-2 bg-sky-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow">
                    ✓
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Pegar URL Externa */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Pegar enlace de {showUrlModal === "banner" ? "Portada" : "Logo"}
              </h3>
              <button
                onClick={() => setShowUrlModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Pega una dirección web (URL pública directa) que comience con <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">https://</code>
            </p>

            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="https://ejemplo.com/mi-imagen.jpg"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />

            {customUrlInput && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src={customUrlInput}
                  alt="Previsualización"
                  fill
                  sizes="400px"
                  className="object-cover"
                  onError={() => showToast("La URL no parece ser una imagen válida.", "error")}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                disabled={isUploadingBanner || isUploadingLogo}
                className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow"
              >
                Guardar Imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
