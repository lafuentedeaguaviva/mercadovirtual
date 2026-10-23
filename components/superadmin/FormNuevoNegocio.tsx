"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  crearNegocioAction,
  checkSlugAvailabilityAction,
  type CrearNegocioInput,
} from "@/app/actions/superadmin";
import { GeneradorQRModal } from "./GeneradorQRModal";

interface FormNuevoNegocioProps {
  plazas: Array<{ id: string; name: string }>;
}

export function FormNuevoNegocio({ plazas }: FormNuevoNegocioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados de campos
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [niche, setNiche] = useState<CrearNegocioInput["niche"]>("comercio");
  const [catalogMode, setCatalogMode] = useState<CrearNegocioInput["catalog_mode"]>("carrito");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("Oruro");
  const [planName, setPlanName] = useState("basico");
  const [subscriptionPrice, setSubscriptionPrice] = useState(150);
  const [maxItems, setMaxItems] = useState(50);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [parentId, setParentId] = useState<string>("");

  // Estados de validación de slug
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);

  // Estados de retroalimentación
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<{
    businessId: string;
    slug: string;
    name: string;
  } | null>(null);

  // Modal de QR
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Generación de sugerencia de slug desde el nombre
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slugStatus === null) {
      const generated = val
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      setSlug(generated);
      if (generated.length >= 3) {
        checkSlug(generated);
      }
    }
  };

  const checkSlug = async (candidateSlug: string) => {
    if (candidateSlug.length < 3) {
      setSlugStatus({ valid: false, message: "El slug debe tener al menos 3 caracteres." });
      return;
    }
    setSlugChecking(true);
    try {
      const res = await checkSlugAvailabilityAction(candidateSlug);
      if (res.available) {
        setSlugStatus({ valid: true, message: "Slug disponible" });
      } else {
        setSlugStatus({ valid: false, message: res.message || "Slug no disponible" });
      }
    } catch {
      setSlugStatus({ valid: false, message: "No se pudo verificar el slug." });
    } finally {
      setSlugChecking(false);
    }
  };

  const handleSlugBlur = () => {
    if (slug) {
      checkSlug(slug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    startTransition(async () => {
      const res = await crearNegocioAction({
        name,
        slug,
        niche,
        catalog_mode: catalogMode,
        whatsapp,
        city,
        plan_name: planName,
        subscription_price: Number(subscriptionPrice),
        max_items: Number(maxItems),
        owner_email: ownerEmail,
        parent_id: parentId ? parentId : null,
      });

      if (!res.success) {
        setServerError(res.error || "Ocurrió un error al crear el negocio.");
      } else {
        setCreatedSuccess({
          businessId: res.businessId!,
          slug: res.slug!,
          name,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Modal de QR generado */}
      {createdSuccess && (
        <GeneradorQRModal
          slug={createdSuccess.slug}
          niche={niche}
          businessName={createdSuccess.name}
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
        />
      )}

      {/* Alerta de éxito */}
      {createdSuccess && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                ¡Negocio dado de alta exitosamente!
              </h3>
              <p className="text-xs text-emerald-700">
                Se envió la invitación por correo electrónico al dueño ({ownerEmail}). Próximo vencimiento
                en 30 días.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Generar y Descargar QR Phygital</span>
            </button>
            <Link
              href={`/${createdSuccess.slug}`}
              target="_blank"
              className="min-h-[44px] px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <span>Ver Catálogo Público</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedSuccess(null);
                setName("");
                setSlug("");
                setOwnerEmail("");
                setWhatsapp("");
                setSlugStatus(null);
              }}
              className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
            >
              Registrar Otro Negocio
            </button>
          </div>
        </div>
      )}

      {/* Alerta de error del servidor */}
      {serverError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-2xl flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong className="font-bold block">No se pudo crear el negocio</strong>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* Formulario principal */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre del Negocio */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-semibold text-slate-800">
              Nombre Comercial *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Calzados San Agustín"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>

          {/* Slug con autocheck */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="slug" className="block text-sm font-semibold text-slate-800">
                Slug (URL permanente) *
              </label>
              {slugChecking && (
                <span className="text-[11px] text-slate-500 animate-pulse">Verificando...</span>
              )}
            </div>
            <div className="relative">
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase());
                  setSlugStatus(null);
                }}
                onBlur={handleSlugBlur}
                placeholder="ej: calzados-san-agustin"
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 min-h-[44px] ${
                  slugStatus
                    ? slugStatus.valid
                      ? "border-emerald-400 focus:ring-emerald-500"
                      : "border-rose-400 focus:ring-rose-500"
                    : "border-slate-300 focus:ring-sky-500"
                }`}
              />
            </div>
            {slugStatus && (
              <p
                className={`text-xs font-medium ${
                  slugStatus.valid ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {slugStatus.message}
              </p>
            )}
          </div>

          {/* Correo del Dueño */}
          <div className="space-y-1.5">
            <label htmlFor="ownerEmail" className="block text-sm font-semibold text-slate-800">
              Correo Electrónico del Propietario *
            </label>
            <input
              id="ownerEmail"
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="dueno@negocio.bo"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              Recibirá la invitación de Supabase para definir su contraseña y acceder.
            </p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className="block text-sm font-semibold text-slate-800">
              WhatsApp para Pedidos (Bolivia) *
            </label>
            <input
              id="whatsapp"
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="71234567 o 59171234567"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              Formato nacional: 8 dígitos locales o con código 591.
            </p>
          </div>

          {/* Nicho */}
          <div className="space-y-1.5">
            <label htmlFor="niche" className="block text-sm font-semibold text-slate-800">
              Nicho / Rubro *
            </label>
            <select
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value as CrearNegocioInput["niche"])}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            >
              <option value="comercio">Comercio / Tienda (Ropa, máscaras, artesanías)</option>
              <option value="plaza_comidas">Plaza de Comidas / Patio Gastronómico</option>
              <option value="agenda">Agenda / Salud / Citas / Talleres</option>
              <option value="inmueble">Inmuebles / Terrenos / Lotes</option>
            </select>
          </div>

          {/* Modo de Catálogo */}
          <div className="space-y-1.5">
            <label htmlFor="catalogMode" className="block text-sm font-semibold text-slate-800">
              Modo de Catálogo *
            </label>
            <select
              id="catalogMode"
              value={catalogMode}
              onChange={(e) => setCatalogMode(e.target.value as CrearNegocioInput["catalog_mode"])}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            >
              <option value="carrito">Carrito de Compras (Pedidos con detalle a WhatsApp)</option>
              <option value="vitrina">Vitrina / Consulta Directa</option>
            </select>
          </div>

          {/* Plaza de comidas Padre (Opcional) */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="parentId" className="block text-sm font-semibold text-slate-800">
              Pertenece a una Plaza de Comidas (Opcional)
            </label>
            <select
              id="parentId"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            >
              <option value="">Ninguna (Negocio independiente de nivel superior)</option>
              {plazas.map((p) => (
                <option key={p.id} value={p.id}>
                  Puesto dentro de: {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Si se asocia a una plaza, formará parte del menú centralizado de ese patio de comidas.
            </p>
          </div>

          {/* Ciudad */}
          <div className="space-y-1.5">
            <label htmlFor="city" className="block text-sm font-semibold text-slate-800">
              Ciudad
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <label htmlFor="planName" className="block text-sm font-semibold text-slate-800">
              Nombre del Plan *
            </label>
            <input
              id="planName"
              type="text"
              required
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="basico, pro, corporativo..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>

          {/* Tarifa en Bs. */}
          <div className="space-y-1.5">
            <label htmlFor="subscriptionPrice" className="block text-sm font-semibold text-slate-800">
              Tarifa Mensual (Bs.) *
            </label>
            <input
              id="subscriptionPrice"
              type="number"
              min="0"
              step="1"
              required
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>

          {/* Límite de productos */}
          <div className="space-y-1.5">
            <label htmlFor="maxItems" className="block text-sm font-semibold text-slate-800">
              Límite Máximo de Items / Productos *
            </label>
            <input
              id="maxItems"
              type="number"
              min="1"
              max="5000"
              required
              value={maxItems}
              onChange={(e) => setMaxItems(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/superadmin")}
            className="min-h-[44px] px-5 py-2.5 text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || (slugStatus !== null && !slugStatus.valid)}
            className="min-h-[44px] px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creando negocio y enviando invitación...</span>
              </>
            ) : (
              <span>Crear Negocio y Dar de Alta</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
