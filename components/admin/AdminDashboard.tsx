"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Image from "next/image";
import type { Database } from "@/types/database";
import { formatBs } from "@/lib/utils";
import {
  updateCatalogModeAction,
  updateItemStatusAction,
  reorderItemAction,
  deleteItemAction,
  updateBusinessProfileAction,
  moderateReviewAction,
  updateBookingStatusAction,
  createManualBookingAction,
  updateBusinessBookingSettingsAction,
  logoutAction,
  createChildStallAction,
  getBusinessItemsAction,
} from "@/app/actions/admin";
import { BarraUsoItems } from "@/components/admin/BarraUsoItems";
import { FormNuevoItem } from "@/components/admin/FormNuevoItem";
import { TarjetaMetricas } from "@/components/admin/TarjetaMetricas";
import { GestorBrandingNegocio } from "@/components/admin/GestorBrandingNegocio";
import type { BusinessMetrics30Days } from "@/app/actions/analytics";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

interface AdminDashboardProps {
  currentBusiness: BusinessRow;
  allBusinesses: BusinessRow[]; // Plaza y puestos hijos
  initialItems: ItemRow[];
  initialReviews: ReviewRow[];
  initialBookings: BookingRow[];
  initialMetrics?: BusinessMetrics30Days;
  initialPayments?: PaymentRow[];
}

export function AdminDashboard({
  currentBusiness,
  allBusinesses,
  initialItems,
  initialReviews,
  initialBookings,
  initialMetrics,
  initialPayments = [],
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"negocio" | "inventario" | "resenas" | "reservas" | "analitica" | "pagos">("negocio");
  const [selectedBusinessId, setSelectedBusinessId] = useState(currentBusiness.id);

  // Inventario y mutación optimista
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state, { itemId, newStatus }: { itemId: string; newStatus: ItemRow["status"] }) =>
      state.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
  );

  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isMenuCollapsedDesktop, setIsMenuCollapsedDesktop] = useState(false);

  const [businessesList, setBusinessesList] = useState<BusinessRow[]>(allBusinesses);
  const [stallSearch, setStallSearch] = useState("");
  const [stallCategoryFilter, setStallCategoryFilter] = useState("todos");
  const [isNewStallModalOpen, setIsNewStallModalOpen] = useState(false);
  const [newStallName, setNewStallName] = useState("");
  const [newStallCategory, setNewStallCategory] = useState("Comida Típica");
  const [newStallDescription, setNewStallDescription] = useState("");
  const [newStallPhone, setNewStallPhone] = useState("");
  const [isCreatingStall, setIsCreatingStall] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Modal para Generar Citas / Reservas
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [newBookingClientName, setNewBookingClientName] = useState("");
  const [newBookingClientPhone, setNewBookingClientPhone] = useState("");
  const [newBookingDateTime, setNewBookingDateTime] = useState("");
  const [newBookingItemId, setNewBookingItemId] = useState("");
  const [newBookingNotes, setNewBookingNotes] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingViewMode, setBookingViewMode] = useState<"cuadricula" | "agenda" | "lista">("cuadricula");
  const [bookingFilterStatus, setBookingFilterStatus] = useState<"todos" | "confirmada" | "pendiente" | "cancelada">("todos");
  const [calendarWeekOffset, setCalendarWeekOffset] = useState<number>(0);

  const [bookingList, setBookingList] = useState<BookingRow[]>(initialBookings);

  const activeBiz = businessesList.find((b) => b.id === selectedBusinessId) || currentBusiness;

  // Cambiar de puesto/negocio y cargar sus items correspondientes
  const handleSelectBusiness = async (bizId: string) => {
    setSelectedBusinessId(bizId);
    setIsLoadingItems(true);
    const res = await getBusinessItemsAction(bizId);
    if (res.success) {
      setItems(res.items);
    }
    setIsLoadingItems(false);
  };

  // Crear un nuevo puesto dentro de la plaza
  const handleCreateStall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStallName.trim()) return;
    setIsCreatingStall(true);
    const plazaId = currentBusiness.parent_id || currentBusiness.id;
    const res = await createChildStallAction(plazaId, {
      name: newStallName,
      category: newStallCategory,
      description: newStallDescription,
      whatsapp: newStallPhone,
    });
    setIsCreatingStall(false);
    if (res.success && res.stall) {
      setBusinessesList((prev) => [...prev, res.stall!]);
      setSelectedBusinessId(res.stall.id);
      setItems([]);
      setIsNewStallModalOpen(false);
      setNewStallName("");
      setNewStallDescription("");
      setNewStallPhone("");
      setStatusFeedback(`¡Puesto "${res.stall.name}" creado con éxito!`);
    } else {
      setStatusFeedback(`Error: ${res.error || "No se pudo crear el puesto."}`);
    }
  };

  // Configuración de Agenda del negocio (duración de turnos y permitir citas públicas)
  const currentBizSchedule = (activeBiz.schedule as any) || {};
  const [gridIntervalMinutes, setGridIntervalMinutes] = useState<number>(
    currentBizSchedule.slot_minutes || 60
  );
  const [allowPublicBooking, setAllowPublicBooking] = useState<boolean>(
    currentBizSchedule.allow_public_booking !== false
  );
  const [isSavingBookingSettings, setIsSavingBookingSettings] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  const isSuspended = !activeBiz.is_active || activeBiz.payment_status === "vencido";
  const isLimitReached = items.length >= activeBiz.max_items;

  // Toggle rápido de modo de catálogo
  const handleToggleCatalogMode = async () => {
    if (isSuspended) return;
    const newMode = activeBiz.catalog_mode === "carrito" ? "vitrina" : "carrito";
    const res = await updateCatalogModeAction(activeBiz.id, newMode);
    setStatusFeedback(res.message);
  };

  // Toggle optimista de disponibilidad de item
  const handleStatusChange = async (itemId: string, newStatus: ItemRow["status"]) => {
    if (isSuspended) return;

    startTransition(async () => {
      setOptimisticItems({ itemId, newStatus });
      const res = await updateItemStatusAction(activeBiz.id, itemId, newStatus);
      if (!res.success) {
        setStatusFeedback(`Error: ${res.message}`);
        // Reversión forzada
        setItems([...items]);
      } else {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
        );
      }
    });
  };

  const handleReorder = async (itemId: string, dir: "up" | "down") => {
    if (isSuspended) return;
    await reorderItemAction(activeBiz.id, itemId, dir);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isSuspended) return;
    if (!confirm("¿Estás seguro de eliminar este producto? Se borrarán también sus fotos.")) {
      return;
    }
    const res = await deleteItemAction(activeBiz.id, itemId);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      alert(res.message);
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/${activeBiz.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Aviso de Negocio Suspendido / Vencido */}
      {isSuspended && (
        <div className="p-4 sm:p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-sm font-extrabold text-rose-900">
              ⚠️ Negocio en Modo Solo Lectura (Suscripción Vencida)
            </h2>
            <p className="text-xs text-rose-700">
              Tu catálogo no se muestra al público o tus permisos de edición están temporalmente pausados.
            </p>
          </div>
          <a
            href="https://wa.me/59172456789?text=Hola,%20deseo%20renovar%20mi%20suscripción%20en%20MercadoVirtual%20Oruro"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap shadow"
          >
            Pagar Suscripción vía WhatsApp
          </a>
        </div>
      )}

      {/* ESTRUCTURA PRINCIPAL: Menú lateral que se mantiene fijo al hacer scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-0">
        {/* Barra Lateral de Navegación (Sticky fija que nunca se va al subir/bajar) */}
        <aside
          className={`
            transition-all duration-300 z-40
            ${
              isSidebarOpenMobile
                ? "fixed inset-0 bg-slate-950/80 backdrop-blur-md p-4 flex flex-col justify-center animate-fade-in z-50 lg:static lg:p-0 lg:bg-transparent lg:backdrop-blur-none"
                : "hidden lg:block"
            }
            ${isMenuCollapsedDesktop ? "lg:col-span-1" : "lg:col-span-3 xl:col-span-2"}
            lg:sticky lg:top-3 lg:self-start
          `}
        >
          <nav
            aria-label="Pestañas de administración"
            className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xl lg:shadow-sm space-y-2 h-[calc(100vh-1.5rem)] max-h-[960px] flex flex-col justify-between max-w-sm mx-auto w-full lg:max-w-none overflow-y-auto scrollbar-none"
          >
            <div className="space-y-2">
              {/* Header del menú con botón para replegar en PC y cerrar en celular */}
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-100 min-h-[40px]">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 lg:text-slate-400">
                  {isSidebarOpenMobile ? "Menú de Navegación" : !isMenuCollapsedDesktop ? "Menú Principal" : ""}
                </span>
                {/* Botón cerrar en celular */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="lg:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-black text-sm"
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              <button
                type="button"
                onClick={() => setIsMenuCollapsedDesktop(!isMenuCollapsedDesktop)}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all ml-auto"
                title={isMenuCollapsedDesktop ? "Expandir menú lateral" : "Replegar menú lateral"}
              >
                {isMenuCollapsedDesktop ? "➡️" : "⬅️"}
              </button>
            </div>

            {/* 1) Mi Negocio */}
            <button
              onClick={() => {
                setActiveTab("negocio");
                setIsSidebarOpenMobile(false);
              }}
              title="Ajustes de mi negocio, logo y portada"
              className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                isMenuCollapsedDesktop ? "justify-center" : "justify-between"
              } ${
                activeTab === "negocio"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                {!isMenuCollapsedDesktop && <span className="tracking-tight">Mi Negocio</span>}
              </div>
              {!isMenuCollapsedDesktop && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    activeTab === "negocio" ? "bg-sky-500 text-white" : "bg-sky-50 text-sky-700 border border-sky-200/50"
                  }`}
                >
                  Perfil
                </span>
              )}
            </button>

            {/* 2) Inventario o Tiendas de Comida */}
            <button
              onClick={() => {
                setActiveTab("inventario");
                setIsSidebarOpenMobile(false);
              }}
              title={
                activeBiz.niche === "plaza_comidas"
                  ? "Gestión de puestos y locales de comida"
                  : "Inventario de productos y catálogo"
              }
              className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                isMenuCollapsedDesktop ? "justify-center" : "justify-between"
              } ${
                activeTab === "inventario"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {activeBiz.niche === "plaza_comidas" ? "🏪" : "📦"}
                </span>
                {!isMenuCollapsedDesktop && (
                  <span className="tracking-tight">
                    {activeBiz.niche === "plaza_comidas" ? "Tiendas de Comida" : "Inventario"}
                  </span>
                )}
              </div>
              {!isMenuCollapsedDesktop && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    activeTab === "inventario" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-semibold"
                  }`}
                >
                  {activeBiz.niche === "plaza_comidas"
                    ? businessesList.filter((b) => b.parent_id === activeBiz.id).length
                    : items.length}
                </span>
              )}
            </button>

            {/* 3) Reseñas */}
            <button
              onClick={() => {
                setActiveTab("resenas");
                setIsSidebarOpenMobile(false);
              }}
              title="Reseñas y valoraciones de clientes"
              className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                isMenuCollapsedDesktop ? "justify-center" : "justify-between"
              } ${
                activeTab === "resenas"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">✍️</span>
                {!isMenuCollapsedDesktop && <span className="tracking-tight">Reseñas</span>}
              </div>
              {!isMenuCollapsedDesktop && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    activeTab === "resenas" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-semibold"
                  }`}
                >
                  {initialReviews.length}
                </span>
              )}
            </button>

            {/* 4) Reservas (si aplica nicho agenda) */}
            {activeBiz.niche === "agenda" && (
              <button
                onClick={() => {
                  setActiveTab("reservas");
                  setIsSidebarOpenMobile(false);
                }}
                title="Horario de citas y turnos"
                className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                  isMenuCollapsedDesktop ? "justify-center" : "justify-between"
                } ${
                  activeTab === "reservas"
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  {!isMenuCollapsedDesktop && <span className="tracking-tight">Horario / Citas</span>}
                </div>
                {!isMenuCollapsedDesktop && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      activeTab === "reservas" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 font-semibold"
                    }`}
                  >
                    {initialBookings.length}
                  </span>
                )}
              </button>
            )}

            {/* 5) Analítica */}
            <button
              onClick={() => {
                setActiveTab("analitica");
                setIsSidebarOpenMobile(false);
              }}
              title="Estadísticas de visitas y clics"
              className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                isMenuCollapsedDesktop ? "justify-center" : "justify-between"
              } ${
                activeTab === "analitica"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                {!isMenuCollapsedDesktop && <span className="tracking-tight">Analítica</span>}
              </div>
              {!isMenuCollapsedDesktop && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    activeTab === "analitica" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                  }`}
                >
                  30 Días
                </span>
              )}
            </button>

            {/* 6) Pagos & Plan */}
            <button
              onClick={() => {
                setActiveTab("pagos");
                setIsSidebarOpenMobile(false);
              }}
              title="Pagos y plan mensual"
              className={`min-h-[50px] w-full px-3.5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 text-left ${
                isMenuCollapsedDesktop ? "justify-center" : "justify-between"
              } ${
                activeTab === "pagos"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💳</span>
                {!isMenuCollapsedDesktop && <span className="tracking-tight">Pagos & Plan</span>}
              </div>
              <span
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  activeBiz.payment_status === "al_dia"
                    ? "bg-emerald-400"
                    : activeBiz.payment_status === "pendiente"
                    ? "bg-amber-400"
                    : "bg-rose-500"
                }`}
              />
            </button>

            </div>

            {/* Acceso rápido a ver catálogo público al pie del menú */}
            {!isMenuCollapsedDesktop && (
              <div className="pt-3 border-t border-slate-100 mt-auto">
                <a
                  href={`/${activeBiz.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-bold transition-colors flex items-center justify-between shadow-sm active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>Ver catálogo público</span>
                  </span>
                  <span className="text-slate-400 font-bold">↗</span>
                </a>
              </div>
            )}
          </nav>
        </aside>

        {/* Área de Contenido Principal (Aprovechando todo el ancho) */}
        <div
          className={`
            space-y-4 transition-all duration-300
            ${isMenuCollapsedDesktop ? "lg:col-span-11" : "lg:col-span-9 xl:col-span-10"}
          `}
        >
          {/* Barra de activación rápida para celulares (Fija arriba que acompaña el scroll siempre) */}
          <div className="lg:hidden bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-md flex items-center justify-between gap-3 sticky top-2 z-40 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm font-black text-slate-900 tracking-tight truncate">
                {activeTab === "negocio" && "⚙️ 1. Mi Negocio & Marca"}
                {activeTab === "inventario" && "📦 2. Inventario"}
                {activeTab === "resenas" && "✍️ 3. Reseñas de Clientes"}
                {activeTab === "reservas" && "📅 4. Horario & Citas"}
                {activeTab === "analitica" && "📊 5. Métricas y Analítica"}
                {activeTab === "pagos" && "💳 6. Pagos y Plan"}
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow flex-shrink-0 transition-transform active:scale-95"
            >
              <span>{isSidebarOpenMobile ? "✕ Cerrar" : "☰ Menú"}</span>
            </button>
          </div>

          {/* Barra Superior Compacta del Negocio (Diseño de Alto Impacto, Elegante y Bien Alineado) */}
          <header className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
            {/* Info del Negocio con Avatar */}
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              <div
                onClick={() => setActiveTab("negocio")}
                title="Toca para cambiar logo o portada de tu negocio"
                className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex-shrink-0 cursor-pointer border-2 border-white shadow-md ring-1 ring-slate-200/80 group transition-transform hover:scale-105"
              >
                <Image
                  src={activeBiz.logo_url || "/placeholder-product.svg"}
                  alt={activeBiz.name}
                  fill
                  sizes="56px"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  📷
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    {activeBiz.name}
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
                    {activeBiz.niche.replace(/_/g, " ")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En línea
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5 truncate">
                  <span className="text-slate-700 font-mono">/{activeBiz.slug}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 font-normal">Panel de Control Phygital</span>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas con estilo pulido y alineado */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              {/* Selector de Plaza de Comidas (Padre e Hijos) o Múltiples Negocios */}
              {businessesList.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 hidden sm:inline">Tienda activa:</span>
                  <select
                    id="select-local-top"
                    value={selectedBusinessId}
                    onChange={(e) => handleSelectBusiness(e.target.value)}
                    className="min-h-[44px] px-3.5 py-2 rounded-2xl border border-slate-300 text-xs sm:text-sm font-extrabold bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {businessesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.parent_id ? "(Puesto de comida)" : "(Plaza Principal)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botón para crear nuevo puesto de comida si el negocio es plaza_comidas o tiene parent_id */}
              {(currentBusiness.niche === "plaza_comidas" || activeBiz.niche === "plaza_comidas" || !!currentBusiness.parent_id) && (
                <button
                  type="button"
                  onClick={() => setIsNewStallModalOpen(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                  title="Agregar un nuevo puesto o tienda de comida a la plaza"
                >
                  <span className="text-base font-black">＋</span>
                  <span>Nuevo Puesto</span>
                </button>
              )}

              <a
                href={`/${activeBiz.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
                title="Abrir catálogo público de tu negocio"
              >
                <span>Ver catálogo</span>
                <span className="text-slate-400">↗</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
              >
                <span>{copiedLink ? "¡Copiado! ✓" : "Copiar enlace"}</span>
              </button>

              <button
                onClick={() => logoutAction()}
                className="min-h-[44px] px-3.5 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs sm:text-sm font-bold rounded-2xl transition-colors"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </header>

          {statusFeedback && (
            <div className="p-3.5 bg-slate-900 text-white text-xs sm:text-sm rounded-2xl font-medium animate-fade-in flex justify-between items-center shadow-lg">
              <span>{statusFeedback}</span>
              <button onClick={() => setStatusFeedback("")} className="text-xs font-bold px-2 py-1 hover:bg-slate-800 rounded-lg">
                ✕
              </button>
            </div>
          )}

      {/* CONTENIDO PESTAÑA 2: INVENTARIO O TIENDAS DE LA PLAZA */}
      {activeTab === "inventario" && (
        <section className="space-y-5">
          {/* Si es Plaza de Comidas, mostramos la LISTA DE TIENDAS GASTRONÓMICAS A INCLUIR */}
          {activeBiz.niche === "plaza_comidas" ? (
            <div className="space-y-5">
              {/* Encabezado de Tiendas de la Plaza */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Tiendas de Comida en la Plaza
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Gestiona los puestos gastronómicos incluidos en <strong>{activeBiz.name}</strong>. Cada tienda tiene su propio menú y número de pedidos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewStallModalOpen(true)}
                  className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 flex-shrink-0"
                >
                  <span className="text-lg">＋</span>
                  <span>Agregar Nueva Tienda</span>
                </button>
              </div>

              {/* Barra de Búsqueda y Filtros de Categorías Gastronómicas */}
              {businessesList.filter((b) => b.parent_id === activeBiz.id).length > 0 && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-3 shadow-sm flex items-center gap-3">
                    <span className="text-lg text-slate-400 pl-2">🔍</span>
                    <input
                      type="text"
                      value={stallSearch}
                      onChange={(e) => setStallSearch(e.target.value)}
                      placeholder="Buscar puesto o tipo de comida (ej: charquekan, hamburguesas, pasteles)..."
                      className="w-full text-xs sm:text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none font-medium py-1"
                    />
                    {stallSearch && (
                      <button
                        onClick={() => setStallSearch("")}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Agrupación por Categorías Gastronómicas */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {["todos", "Comida Típica", "Comida Rápida", "Cafetería & Desayunos", "Bebidas & Postres", "Parrilladas"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setStallCategoryFilter(cat)}
                        className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all border whitespace-nowrap ${
                          stallCategoryFilter === cat
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cat === "todos" ? "🍴 Todas las Categorías" : cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Tiendas Gastronómicas Disponibles para Incluir y Administrar */}
              {businessesList.filter((b) => b.parent_id === activeBiz.id).length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                    🍽️
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Aún no has agregado tiendas de comida
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Registra los puestos o locales gastronómicos de tu patio de comidas (ej. Charquekan, Hamburguesas, Pastelería) para que los comensales puedan seleccionarlos y pedir.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewStallModalOpen(true)}
                    className="min-h-[44px] px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow transition-all active:scale-95 inline-flex items-center gap-2"
                  >
                    <span>＋ Agregar mi primer puesto</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {businessesList
                    .filter((b) => b.parent_id === activeBiz.id)
                    .filter((stall) => {
                      // Filtro por categoría
                      if (stallCategoryFilter !== "todos") {
                        const stallCat = (stall.theme as any)?.category || "Comida Típica";
                        if (stallCat !== stallCategoryFilter) return false;
                      }
                      // Filtro por búsqueda
                      if (!stallSearch.trim()) return true;
                      const q = stallSearch.toLowerCase();
                      return (
                        stall.name.toLowerCase().includes(q) ||
                        (stall.description && stall.description.toLowerCase().includes(q))
                      );
                    })
                    .map((stall) => (
                      <div
                        key={stall.id}
                        className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
                              {stall.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                                {stall.name}
                              </h3>
                              <span className="text-[11px] font-semibold text-slate-500">
                                WhatsApp: +{stall.whatsapp}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Activo
                          </span>
                        </div>

                        {stall.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {stall.description}
                          </p>
                        )}

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <a
                            href={`/${stall.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-slate-900 font-bold transition-colors"
                          >
                            Ver Menú Público ↗
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSelectBusiness(stall.id)}
                            className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <span>Gestionar Platos</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Capacidad del Catálogo (Solo visible dentro de Inventario de Puesto o Tienda regular) */}
              <BarraUsoItems currentCount={items.length} maxItems={activeBiz.max_items} />

              {/* Si es un puesto hijo, mostrar banner para volver a la plaza */}
              {activeBiz.parent_id && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-rose-950">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏪</span>
                    <span>Editando platos del puesto: <strong>{activeBiz.name}</strong></span>
                  </div>
                  <button
                    onClick={() => handleSelectBusiness(activeBiz.parent_id!)}
                    className="text-xs font-bold text-rose-700 hover:underline px-2 py-1"
                  >
                    ← Volver a lista de tiendas
                  </button>
                </div>
              )}

              {/* Selector de Modo de Catálogo */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">Modo de Catálogo</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {activeBiz.catalog_mode === "carrito" ? "🛒 Carrito" : "🖼️ Vitrina"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                    {activeBiz.catalog_mode === "carrito"
                      ? "Modo Carrito: Los clientes acumulan múltiples productos y te envían el pedido completo y detallado por WhatsApp con un solo toque."
                      : "Modo Vitrina: Los clientes consultan la disponibilidad y detalles de cada producto de manera individual por WhatsApp."}
                  </p>
                </div>

                <button
                  onClick={handleToggleCatalogMode}
                  disabled={isSuspended}
                  className={`min-h-[46px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all border flex items-center gap-2.5 shadow-sm active:scale-95 flex-shrink-0 ${
                    activeBiz.catalog_mode === "carrito"
                      ? "bg-sky-600 hover:bg-sky-500 text-white border-sky-600 shadow-sky-600/20"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                  }`}
                >
                  <span className="text-base">{activeBiz.catalog_mode === "carrito" ? "🛒" : "🖼️"}</span>
                  <span>{activeBiz.catalog_mode === "carrito" ? "Cambiar a Vitrina" : "Cambiar a Carrito"}</span>
                </button>
              </div>

              {/* Encabezado de Inventario y Botón para Agregar Item */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Artículos en Catálogo</h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Administra los precios, fotos, visibilidad y orden de tus productos.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsFormOpen(true);
                  }}
                  disabled={isLimitReached || isSuspended}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="text-lg">＋</span>
                  <span>Añadir nuevo item</span>
                </button>
              </div>

              {isLimitReached && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs sm:text-sm font-medium">
                  ⚠️ Límite de {activeBiz.max_items} productos alcanzado. Para agregar nuevos artículos, amplía tu plan contactando al soporte de MercadoVirtual.
                </div>
              )}

              <div className="space-y-3.5">
                {optimisticItems.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 shadow-inner">
                    <Image
                      src={item.images[0] || "/placeholder-product.svg"}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                      {item.title}
                    </h3>
                    <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                      {formatBs(item.price)}
                    </p>
                    <span className="text-xs text-slate-400 font-medium block">
                      Posición #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Selector o Switch según nicho */}
                  {activeBiz.niche === "inmueble" ? (
                    <select
                      value={item.status}
                      disabled={isSuspended}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                      className="min-h-[46px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-2xl border border-slate-300 bg-white text-slate-800 shadow-sm"
                    >
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  ) : (
                    <button
                      onClick={() =>
                        handleStatusChange(
                          item.id,
                          item.status === "disponible" ? "agotado" : "disponible"
                        )
                      }
                      disabled={isSuspended}
                      className={`min-h-[46px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all active:scale-95 shadow-sm ${
                        item.status === "disponible"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      {item.status === "disponible" ? "✓ En Stock" : "✕ Agotado"}
                    </button>
                  )}

                  {/* Reordenar Subir / Bajar */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/80">
                    <button
                      onClick={() => handleReorder(item.id, "up")}
                      disabled={idx === 0 || isSuspended}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-30 shadow-sm transition-all text-xs font-bold"
                      aria-label="Subir posición"
                      title="Subir posición"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleReorder(item.id, "down")}
                      disabled={idx === optimisticItems.length - 1 || isSuspended}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-30 shadow-sm transition-all text-xs font-bold"
                      aria-label="Bajar posición"
                      title="Bajar posición"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Editar */}
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setIsFormOpen(true);
                    }}
                    disabled={isSuspended}
                    className="min-h-[46px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold shadow-sm transition-colors"
                  >
                    ✏️ Editar
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isSuspended}
                    className="min-h-[46px] px-3.5 py-2 rounded-2xl text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-bold transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
            </>
          )}
        </section>
      )}

      {/* CONTENIDO PESTAÑA 3: RESEÑAS */}
      {activeTab === "resenas" && (
        <section className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Moderación de Reseñas</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Revisa los comentarios y calificaciones que tus clientes dejan en tu catálogo público.
            </p>
          </div>

          {initialReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No hay reseñas para moderar en este momento.
            </div>
          ) : (
            <div className="space-y-3.5">
              {initialReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm sm:text-base font-bold text-slate-900">{rev.author_name}</span>
                    <span className="text-sm sm:text-base text-amber-500 font-bold tracking-wider">
                      {"★".repeat(rev.rating)}
                      {"☆".repeat(Math.max(0, 5 - rev.rating))}
                    </span>
                  </div>
                  {rev.comment && <p className="text-sm text-slate-700 leading-relaxed">{rev.comment}</p>}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-100 gap-3">
                    <span
                      className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
                        rev.is_approved
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-900 border border-amber-200"
                      }`}
                    >
                      {rev.is_approved ? "✓ Aprobada" : "⏳ Pendiente de Aprobación"}
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      {!rev.is_approved && (
                        <button
                          onClick={async () => {
                            await moderateReviewAction(activeBiz.id, rev.id, "approve");
                            alert("Reseña aprobada.");
                          }}
                          className="min-h-[46px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm("¿Eliminar definitivamente esta reseña?")) {
                            await moderateReviewAction(activeBiz.id, rev.id, "delete");
                          }
                        }}
                        className="min-h-[46px] px-4 py-2 text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-bold rounded-2xl transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CONTENIDO PESTAÑA 3: RESERVAS (SOLO NICHO AGENDA) */}
      {activeTab === "reservas" && activeBiz.niche === "agenda" && (
        <section className="space-y-4">
          {/* ENCABEZADO Y CONTROLES DE LA AGENDA */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-xl shadow-xs">
                    📅
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Horario de Citas & Agenda
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {bookingList.length} total
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Control visual de turnos, horarios y pacientes en tiempo real.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón Principal y Selector de Vista */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector de Intervalos de Hora */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                  <span className="text-[10px] text-slate-500 font-black px-2 uppercase">Turnos:</span>
                  <button
                    type="button"
                    onClick={() => setGridIntervalMinutes(60)}
                    className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      gridIntervalMinutes === 60
                        ? "bg-white text-indigo-700 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Ver cuadrícula en intervalos de 1 Hora"
                  >
                    1 Hora
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridIntervalMinutes(30)}
                    className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      gridIntervalMinutes === 30
                        ? "bg-white text-indigo-700 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Ver cuadrícula en intervalos de 30 Minutos"
                  >
                    30 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridIntervalMinutes(15)}
                    className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      gridIntervalMinutes === 15
                        ? "bg-white text-indigo-700 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Ver cuadrícula en intervalos de 15 Minutos"
                  >
                    15 Min
                  </button>
                </div>

                {/* Vistas: Cuadrícula, Días, Lista */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBookingViewMode("cuadricula")}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingViewMode === "cuadricula"
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📊</span> Cuadrícula
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingViewMode("agenda")}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingViewMode === "agenda"
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📆</span> Por Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingViewMode("lista")}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      bookingViewMode === "lista"
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📋</span> Lista
                  </button>
                </div>

                {/* Botón de Ajustes de Reservas */}
                <button
                  type="button"
                  onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                  className={`p-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSettingsPanelOpen
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Configurar permisos de citas y reglas"
                >
                  <span>⚙️</span>
                  <span className="hidden sm:inline">Configuración</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewBookingClientName("");
                    setNewBookingClientPhone("");
                    setNewBookingDateTime("");
                    setNewBookingNotes("");
                    setNewBookingItemId(items[0]?.id || "");
                    setIsBookingModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-sm">✨</span>
                  <span>+ Agendar Cita</span>
                </button>
              </div>
            </div>

            {/* PANEL DESPLEGABLE: CONFIGURACIÓN DE QUIÉN PUEDE AGENDAR */}
            {isSettingsPanelOpen && (
              <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white rounded-2xl border border-indigo-100 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>🛡️</span> Control de Citas Públicas vs. Solo Recepción
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Decide si los pacientes/clientes pueden reservar directamente su horario en tu catálogo web, o si las citas deben ser coordinadas solo por ti o por WhatsApp.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSavingBookingSettings}
                      onClick={async () => {
                        const newAllow = !allowPublicBooking;
                        setAllowPublicBooking(newAllow);
                        setIsSavingBookingSettings(true);
                        try {
                          const res = await updateBusinessBookingSettingsAction({
                            businessId: activeBiz.id,
                            allowPublicBooking: newAllow,
                            slotMinutes: gridIntervalMinutes,
                          });
                          setStatusFeedback(res.message);
                        } finally {
                          setIsSavingBookingSettings(false);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        allowPublicBooking ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title={allowPublicBooking ? "Reserva pública activada" : "Reserva pública desactivada"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          allowPublicBooking ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-slate-800">
                      {allowPublicBooking ? "Pública (Clientes pueden agendar)" : "Privada (Solo recepción o WhatsApp)"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100/70 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span>⏱️</span>
                    <span>Duración estándar de cada turno guardada: <strong>{gridIntervalMinutes} minutos</strong></span>
                  </span>
                  <button
                    type="button"
                    disabled={isSavingBookingSettings}
                    onClick={async () => {
                      setIsSavingBookingSettings(true);
                      try {
                        const res = await updateBusinessBookingSettingsAction({
                          businessId: activeBiz.id,
                          allowPublicBooking,
                          slotMinutes: gridIntervalMinutes,
                        });
                        setStatusFeedback(res.message);
                        setIsSettingsPanelOpen(false);
                      } finally {
                        setIsSavingBookingSettings(false);
                      }
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                  >
                    {isSavingBookingSettings ? "Guardando..." : "Guardar Preferencia"}
                  </button>
                </div>
              </div>
            )}

            {/* BARRA DE FILTROS Y ESTADÍSTICAS RÁPIDAS DE COLOR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBookingFilterStatus("todos")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  bookingFilterStatus === "todos"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10"
                    : "bg-slate-50 text-slate-700 border-slate-200/70 hover:bg-slate-100"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">Todas</div>
                <div className="text-base font-black mt-0.5">{bookingList.length}</div>
              </button>

              <button
                type="button"
                onClick={() => setBookingFilterStatus("confirmada")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  bookingFilterStatus === "confirmada"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-emerald-50/60 text-emerald-800 border-emerald-200/70 hover:bg-emerald-100/70"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Confirmadas</div>
                <div className="text-base font-black mt-0.5">
                  {bookingList.filter((b) => b.status === "confirmada").length}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBookingFilterStatus("pendiente")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  bookingFilterStatus === "pendiente"
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                    : "bg-amber-50/60 text-amber-900 border-amber-200/70 hover:bg-amber-100/70"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Por Atender</div>
                <div className="text-base font-black mt-0.5">
                  {bookingList.filter((b) => b.status === "pendiente").length}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBookingFilterStatus("cancelada")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  bookingFilterStatus === "cancelada"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20"
                    : "bg-rose-50/60 text-rose-800 border-rose-200/70 hover:bg-rose-100/70"
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Canceladas</div>
                <div className="text-base font-black mt-0.5">
                  {bookingList.filter((b) => b.status === "cancelada").length}
                </div>
              </button>
            </div>
          </div>

          {/* CUERPO PRINCIPAL: EMPTY O CONTENIDO */}
          {bookingList.length === 0 ? (
            <div className="bg-gradient-to-b from-white to-indigo-50/30 rounded-3xl border border-dashed border-indigo-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-3xl shadow-inner shadow-indigo-200">
                🗓️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Tu cronograma está libre de citas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tus clientes pueden solicitar citas desde tu catálogo web, o puedes agregar una reserva manual directamente ahora.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <span>✨ Agendar primera cita</span>
              </button>
            </div>
          ) : (
            <>
              {/* FILTRADO DE CITAS */}
              {(() => {
                const filteredBookings = bookingList.filter((b) =>
                  bookingFilterStatus === "todos" ? true : b.status === bookingFilterStatus
                );

                if (filteredBookings.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                      No hay citas con el estado seleccionado ({bookingFilterStatus}).
                    </div>
                  );
                }

                // VISTA 1: CUADRÍCULA SEMANAL DE HORARIOS (Lunes a Domingo con horas)
                if (bookingViewMode === "cuadricula") {
                  // Calcular el lunes de la semana actual + calendarWeekOffset
                  const now = new Date();
                  const currentDay = now.getDay(); // 0 es domingo, 1 es lunes...
                  const distToMonday = (currentDay + 6) % 7; // días desde el lunes
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - distToMonday + calendarWeekOffset * 7);
                  monday.setHours(0, 0, 0, 0);

                  // Días de la semana (Lunes a Domingo)
                  const weekDays = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    return d;
                  });

                  // Rango de horas a mostrar en el cronograma: de 08:00 a 20:00 según el intervalo seleccionado (15, 30 o 60 min)
                  const timeSlots: Array<{ timeStr: string; startMinutes: number; endMinutes: number }> = [];
                  const startHour = 8;
                  const endHour = 20;
                  for (let m = startHour * 60; m < endHour * 60; m += gridIntervalMinutes) {
                    const h = Math.floor(m / 60);
                    const min = m % 60;
                    const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                    timeSlots.push({
                      timeStr,
                      startMinutes: m,
                      endMinutes: m + gridIntervalMinutes,
                    });
                  }

                  const formatDayHeader = (date: Date) => {
                    const dayName = date.toLocaleDateString("es-BO", { weekday: "short" });
                    const dayNum = date.getDate();
                    const monthName = date.toLocaleDateString("es-BO", { month: "short" });
                    return { dayName: dayName.toUpperCase(), dayNum, monthName };
                  };

                  const isToday = (date: Date) => {
                    const today = new Date();
                    return (
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
                    );
                  };

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
                      {/* Cabecera y Navegación de Semanas */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-base">🗓️</span>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 tracking-tight">
                              Horario Semanal:{" "}
                              <span className="text-indigo-600 capitalize">
                                {weekDays[0].toLocaleDateString("es-BO", { day: "numeric", month: "short" })} -{" "}
                                {weekDays[6].toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Visualiza los turnos agendados en cada franja horaria (intervalos de {gridIntervalMinutes} min).
                            </p>
                          </div>
                        </div>

                        {/* Botones de navegación de semanas */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setCalendarWeekOffset((prev) => prev - 1)}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            title="Semana anterior"
                          >
                            <span>◀</span> Ant.
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarWeekOffset(0)}
                            className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
                          >
                            Semana Actual
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarWeekOffset((prev) => prev + 1)}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            title="Semana siguiente"
                          >
                            Sig. <span>▶</span>
                          </button>
                        </div>
                      </div>

                      {/* Cuadro / Tabla del Horario Semanal Responsive */}
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[760px]">
                          {/* Fila de cabecera: Días de Lunes a Domingo */}
                          <div className="grid grid-cols-8 gap-1.5 border-b border-slate-200 pb-2 text-center">
                            {/* Celda vacía para columna de horas */}
                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider py-1 flex items-center justify-center">
                              Hora
                            </div>

                            {weekDays.map((day, idx) => {
                              const { dayName, dayNum, monthName } = formatDayHeader(day);
                              const todayFlag = isToday(day);

                              return (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-2xl transition-all ${
                                    todayFlag
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                      : "bg-slate-50 text-slate-700 border border-slate-200/60"
                                  }`}
                                >
                                  <div
                                    className={`text-[10px] font-black tracking-wider uppercase ${
                                      todayFlag ? "text-indigo-200" : "text-slate-500"
                                    }`}
                                  >
                                    {dayName}
                                  </div>
                                  <div className="text-base font-black leading-tight">{dayNum}</div>
                                  <div
                                    className={`text-[9px] font-bold capitalize ${
                                      todayFlag ? "text-indigo-100" : "text-slate-400"
                                    }`}
                                  >
                                    {monthName}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Filas de franjas horarias */}
                          <div className="divide-y divide-slate-100 mt-1">
                            {timeSlots.map((slot) => {
                              return (
                                <div key={slot.timeStr} className="grid grid-cols-8 gap-1.5 py-1.5 min-h-[50px] items-stretch">
                                  {/* Columna de Hora */}
                                  <div className="flex items-start justify-center pt-1 text-[11px] font-black text-slate-600 bg-slate-50/80 rounded-xl border border-slate-100">
                                    {slot.timeStr}
                                  </div>

                                  {/* Celdas para cada uno de los 7 días */}
                                  {weekDays.map((day, dayIdx) => {
                                    // Filtrar citas en este día y dentro de este slot
                                    const slotBookings = filteredBookings.filter((b) => {
                                      const bDate = new Date(b.scheduled_at);
                                      const sameDay =
                                        bDate.getDate() === day.getDate() &&
                                        bDate.getMonth() === day.getMonth() &&
                                        bDate.getFullYear() === day.getFullYear();

                                      if (!sameDay) return false;

                                      const bMinutes = bDate.getHours() * 60 + bDate.getMinutes();
                                      return bMinutes >= slot.startMinutes && bMinutes < slot.endMinutes;
                                    });

                                    const todayFlag = isToday(day);

                                    return (
                                      <div
                                        key={dayIdx}
                                        className={`rounded-xl p-1 transition-all flex flex-col gap-1 border ${
                                          todayFlag
                                            ? "bg-indigo-50/20 border-indigo-100/70"
                                            : "bg-slate-50/30 hover:bg-slate-50/80 border-slate-100"
                                        }`}
                                      >
                                        {slotBookings.length > 0 ? (
                                          slotBookings.map((b) => {
                                            const bDate = new Date(b.scheduled_at);
                                            const exactTime = bDate.toLocaleTimeString("es-BO", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            });
                                            const serviceItem = items.find((it) => it.id === b.item_id);

                                            const colorClasses =
                                              b.status === "confirmada"
                                                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                                : b.status === "cancelada"
                                                ? "bg-rose-500 text-white shadow-rose-500/20 opacity-60"
                                                : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/20";

                                            return (
                                              <div
                                                key={b.id}
                                                className={`p-1.5 rounded-lg text-left shadow-xs transition-transform hover:scale-[1.02] cursor-pointer ${colorClasses}`}
                                                title={`Cliente: ${b.client_name}\nTeléfono: +591 ${b.client_phone}\nEstado: ${b.status}\n${
                                                  b.notes ? `Notas: ${b.notes}` : ""
                                                }`}
                                              >
                                                <div className="flex items-center justify-between text-[9px] font-black leading-none opacity-90">
                                                  <span>{exactTime}</span>
                                                  <span>
                                                    {b.status === "confirmada" ? "✓" : b.status === "cancelada" ? "✕" : "⏳"}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] font-black truncate mt-0.5 leading-tight">
                                                  {b.client_name}
                                                </div>
                                                {serviceItem && (
                                                  <div className="text-[8px] font-bold truncate opacity-85 mt-0.5">
                                                    {serviceItem.title}
                                                  </div>
                                                )}
                                                <div className="mt-1 pt-1 border-t border-white/20 flex items-center justify-between">
                                                  <a
                                                    href={`https://wa.me/591${b.client_phone.replace(/\D/g, "").slice(-8)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[8px] font-black underline hover:text-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    WhatsApp
                                                  </a>
                                                  {b.status === "pendiente" && (
                                                    <button
                                                      type="button"
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const res = await updateBookingStatusAction(activeBiz.id, b.id, "confirmada");
                                                        if (res.success) {
                                                          setBookingList((prev) =>
                                                            prev.map((item) =>
                                                              item.id === b.id ? { ...item, status: "confirmada" } : item
                                                            )
                                                          );
                                                          setStatusFeedback("Cita confirmada.");
                                                        }
                                                      }}
                                                      className="text-[8px] font-black bg-white text-emerald-800 px-1 py-0.2 rounded hover:bg-emerald-50"
                                                    >
                                                      Confirmar
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div
                                            onClick={() => {
                                              // Preseleccionar fecha y hora exacta al hacer clic en franja vacía
                                              const yyyy = day.getFullYear();
                                              const mm = String(day.getMonth() + 1).padStart(2, "0");
                                              const dd = String(day.getDate()).padStart(2, "0");
                                              setNewBookingDateTime(`${yyyy}-${mm}-${dd}T${slot.timeStr}`);
                                              setNewBookingClientName("");
                                              setNewBookingClientPhone("");
                                              setNewBookingNotes("");
                                              setNewBookingItemId(items[0]?.id || "");
                                              setIsBookingModalOpen(true);
                                            }}
                                            className="h-full w-full rounded-lg hover:bg-indigo-50/40 cursor-pointer flex items-center justify-center text-transparent hover:text-indigo-400 text-xs font-bold transition-all"
                                            title={`Clic para agendar cita a las ${slot.timeStr}`}
                                          >
                                            +
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Leyenda de colores del horario */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Confirmada
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pendiente / Por Atender
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Cancelada
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 italic">
                          💡 Tip: Haz clic en cualquier casillero vacío del horario para agendar en esa hora.
                        </span>
                      </div>
                    </div>
                  );
                }

                // VISTA 2: HORARIO POR DÍAS (TARJETAS DINÁMICAS)
                if (bookingViewMode === "agenda") {
                  // Agrupar por fecha 'YYYY-MM-DD'
                  const groups: { [key: string]: BookingRow[] } = {};
                  filteredBookings.forEach((b) => {
                    const dateKey = new Date(b.scheduled_at).toLocaleDateString("es-BO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(b);
                  });

                  return (
                    <div className="space-y-5">
                      {Object.entries(groups).map(([dateLabel, groupItems]) => (
                        <div key={dateLabel} className="space-y-2.5">
                          {/* Cabecera del día */}
                          <div className="flex items-center gap-2 px-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100"></span>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 capitalize">
                              {dateLabel}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {groupItems.length} {groupItems.length === 1 ? "cita" : "citas"}
                            </span>
                          </div>

                          {/* Grid visual tipo tarjetas de turno */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {groupItems.map((b) => {
                              const dateObj = new Date(b.scheduled_at);
                              const horaStr = dateObj.toLocaleTimeString("es-BO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                              const serviceItem = items.find((it) => it.id === b.item_id);

                              const statusConfig = {
                                confirmada: {
                                  bar: "bg-emerald-500",
                                  badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
                                  icon: "✅",
                                  cardBg: "from-white to-emerald-50/20 hover:border-emerald-300",
                                },
                                pendiente: {
                                  bar: "bg-amber-500",
                                  badge: "bg-amber-100 text-amber-900 border-amber-200",
                                  icon: "⏳",
                                  cardBg: "from-white to-amber-50/20 hover:border-amber-300",
                                },
                                cancelada: {
                                  bar: "bg-rose-500",
                                  badge: "bg-rose-100 text-rose-800 border-rose-200",
                                  icon: "❌",
                                  cardBg: "from-white to-rose-50/20 hover:border-rose-300",
                                },
                              }[b.status] || {
                                bar: "bg-indigo-500",
                                badge: "bg-slate-100 text-slate-800 border-slate-200",
                                icon: "📌",
                                cardBg: "from-white to-slate-50",
                              };

                              return (
                                <div
                                  key={b.id}
                                  className={`relative bg-gradient-to-br ${statusConfig.cardBg} rounded-3xl border border-slate-200/90 p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between overflow-hidden group`}
                                >
                                  {/* Línea lateral de estado */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.bar}`} />

                                  <div className="pl-1.5 space-y-2.5">
                                    {/* Cabecera del turno: Hora y Badge */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-black shadow-xs">
                                        <span>⏰</span>
                                        <span>{horaStr}</span>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border flex items-center gap-1 ${statusConfig.badge}`}
                                      >
                                        <span>{statusConfig.icon}</span>
                                        <span>{b.status}</span>
                                      </span>
                                    </div>

                                    {/* Cliente & Servicio */}
                                    <div>
                                      <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {b.client_name}
                                      </div>
                                      {serviceItem ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold mt-1">
                                          <span>🩺</span>
                                          <span>{serviceItem.title}</span>
                                          <span className="opacity-60">• {formatBs(Number(serviceItem.price))}</span>
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                          Consulta / Reserva general
                                        </div>
                                      )}
                                    </div>

                                    {/* Teléfono y WhatsApp rápido */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                                        <span>📞</span> +591 {b.client_phone}
                                      </span>
                                      <a
                                        href={`https://wa.me/591${b.client_phone.replace(/\D/g, "").slice(-8)}?text=${encodeURIComponent(
                                          `Hola ${b.client_name}, te saludamos de ${activeBiz.name}. Te escribimos sobre tu cita agendada para hoy.`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all shadow-xs"
                                        title="Chatear en WhatsApp"
                                      >
                                        <span>💬</span> Chat
                                      </a>
                                    </div>

                                    {/* Notas si existen */}
                                    {b.notes && (
                                      <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100 text-[11px] text-slate-600 italic">
                                        <span className="font-bold not-italic text-slate-700">Nota: </span>
                                        {b.notes}
                                      </div>
                                    )}
                                  </div>

                                  {/* Botones de acción del turno */}
                                  <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100 pl-1.5">
                                    {b.status === "pendiente" && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const res = await updateBookingStatusAction(activeBiz.id, b.id, "confirmada");
                                          if (res.success) {
                                            setBookingList((prev) =>
                                              prev.map((item) =>
                                                item.id === b.id ? { ...item, status: "confirmada" } : item
                                              )
                                            );
                                            setStatusFeedback("Cita confirmada exitosamente.");
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition-all shadow-xs cursor-pointer"
                                      >
                                        Confirmar Cita
                                      </button>
                                    )}

                                    {b.status !== "cancelada" && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (confirm(`¿Deseas cancelar la cita de ${b.client_name}?`)) {
                                            const res = await updateBookingStatusAction(activeBiz.id, b.id, "cancelada");
                                            if (res.success) {
                                              setBookingList((prev) =>
                                                prev.map((item) =>
                                                  item.id === b.id ? { ...item, status: "cancelada" } : item
                                                )
                                              );
                                              setStatusFeedback("Cita cancelada.");
                                            }
                                          }
                                        }}
                                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-[11px] transition-colors border border-rose-200 cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // VISTA 2: LISTA TRADICIONAL DETALLADA
                return (
                  <div className="space-y-3">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-indigo-200 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{b.client_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                b.status === "confirmada"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : b.status === "cancelada"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-900 border border-amber-200"
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <div className="text-slate-600 flex flex-wrap items-center gap-2">
                            <span>📞 +591 {b.client_phone}</span>
                            <span>•</span>
                            <span className="font-semibold text-indigo-600">
                              🕒 {new Date(b.scheduled_at).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </div>
                          {b.notes && (
                            <div className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                              Notas: {b.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <a
                            href={`https://wa.me/591${b.client_phone.replace(/\D/g, "").slice(-8)}?text=${encodeURIComponent(
                              `Hola ${b.client_name}, nos comunicamos de ${activeBiz.name} para confirmar tu cita agendada.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl border border-emerald-200 text-xs transition-colors"
                            title="Contactar al cliente por WhatsApp"
                          >
                            💬 WhatsApp
                          </a>

                          {b.status === "pendiente" && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await updateBookingStatusAction(activeBiz.id, b.id, "confirmada");
                                if (res.success) {
                                  setBookingList((prev) =>
                                    prev.map((item) => (item.id === b.id ? { ...item, status: "confirmada" } : item))
                                  );
                                  setStatusFeedback("Cita confirmada exitosamente.");
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                            >
                              Confirmar
                            </button>
                          )}

                          {b.status !== "cancelada" && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm("¿Deseas cancelar esta cita?")) {
                                  const res = await updateBookingStatusAction(activeBiz.id, b.id, "cancelada");
                                  if (res.success) {
                                    setBookingList((prev) =>
                                      prev.map((item) => (item.id === b.id ? { ...item, status: "cancelada" } : item))
                                    );
                                    setStatusFeedback("Cita cancelada.");
                                  }
                                }
                              }}
                              className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs transition-colors border border-rose-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {/* MODAL: GENERAR NUEVA CITA MANUALMENTE */}
          {isBookingModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            >
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>📅</span> Generar Nueva Cita
                    </h3>
                    <p className="text-xs text-slate-500">Agrega un paciente o cliente a la agenda de {activeBiz.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBookingClientName || !newBookingClientPhone || !newBookingDateTime) {
                      alert("Por favor completa el nombre, teléfono y fecha/hora.");
                      return;
                    }

                    setIsSubmittingBooking(true);
                    try {
                      const res = await createManualBookingAction({
                        businessId: activeBiz.id,
                        itemId: newBookingItemId || undefined,
                        clientName: newBookingClientName,
                        clientPhone: newBookingClientPhone,
                        scheduledAt: newBookingDateTime,
                        notes: newBookingNotes,
                      });

                      if (!res.success) {
                        alert(res.message);
                        return;
                      }

                      alert("¡Cita agendada exitosamente!");
                      setIsBookingModalOpen(false);
                      window.location.reload();
                    } catch {
                      alert("Error inesperado al generar la cita.");
                    } finally {
                      setIsSubmittingBooking(false);
                    }
                  }}
                  className="space-y-3.5 text-slate-900"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nombre del Paciente / Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Marcelo Quiroga"
                      value={newBookingClientName}
                      onChange={(e) => setNewBookingClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      WhatsApp / Teléfono *
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-600">
                        +591
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="71234567"
                        value={newBookingClientPhone}
                        onChange={(e) => setNewBookingClientPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Fecha y Hora de la Cita *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newBookingDateTime}
                      onChange={(e) => setNewBookingDateTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {items.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Servicio o Especialidad
                      </label>
                      <select
                        value={newBookingItemId}
                        onChange={(e) => setNewBookingItemId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id} className="text-slate-900 bg-white">
                            {it.title} ({formatBs(Number(it.price))})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Motivo o Notas Clínicas (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Limpieza dental, primera consulta..."
                      value={newBookingNotes}
                      onChange={(e) => setNewBookingNotes(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      disabled={isSubmittingBooking}
                      onClick={() => setIsBookingModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSubmittingBooking ? "Guardando..." : "Confirmar y Agendar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* CONTENIDO PESTAÑA 4: MI NEGOCIO */}
      {activeTab === "negocio" && (
        <section className="space-y-6">
          {/* Gestor de Portada y Logo */}
          <GestorBrandingNegocio
            businessId={activeBiz.id}
            businessName={activeBiz.name}
            niche={activeBiz.niche}
            initialLogoUrl={activeBiz.logo_url}
            initialBannerUrl={activeBiz.banner_url}
            isSuspended={isSuspended}
            onUpdate={(newLogo, newBanner) => {
              activeBiz.logo_url = newLogo;
              activeBiz.banner_url = newBanner;
            }}
          />

          {/* Formulario de Información y Tema */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Datos Comerciales y Estilo de Marca</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Configura la información de contacto y la identidad visual que tus clientes verán en tu catálogo público.
              </p>
            </div>

            <form
              action={async (formData) => {
                const res = await updateBusinessProfileAction(activeBiz.id, formData);
                if (res.success) {
                  alert("¡Datos y estilo del negocio guardados correctamente!");
                  window.location.reload();
                } else {
                  alert(`Error: ${res.message}`);
                }
              }}
              className="space-y-5 text-xs font-semibold text-slate-700"
            >
              {/* Sector o Rubro actual (Informativo para el comerciante) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sector / Rubro Asignado</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 capitalize">
                      {activeBiz.niche === "comercio" && "🛍️ Comercio General & Tiendas"}
                      {activeBiz.niche === "plaza_comidas" && "🍔 Gastronomía & Plaza de Comidas"}
                      {activeBiz.niche === "agenda" && "📅 Servicios, Citas & Consultorios"}
                      {activeBiz.niche === "inmueble" && "🏠 Inmuebles & Bienes Raíces"}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {activeBiz.niche}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 max-w-xs text-left sm:text-right">
                  Para cambiar de rubro comercial, solicita el cambio al Superadministrador de MercadoVirtual.
                </span>
              </div>

              {/* Descripción Comercial */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Descripción Comercial del Negocio
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={activeBiz.description || ""}
                  placeholder="Ej: Tienda de ropa de moda, calzados importados y accesorios con envíos a toda la ciudad de Oruro..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Dirección Física y Google Maps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dirección Física */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Dirección Física en Oruro (Lo que lee el cliente)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!navigator.geolocation) {
                            alert("Tu dispositivo o navegador no soporta geolocalización GPS.");
                            return;
                          }
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              const { latitude, longitude } = pos.coords;
                              const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                              const mapsInput = document.getElementById("input-maps-url") as HTMLInputElement;
                              const addrInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                              if (mapsInput) mapsInput.value = mapsUrl;
                              
                              // Geocodificación inversa gratuita con Nominatim OpenStreetMap
                              try {
                                const resp = await fetch(
                                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                                );
                                const data = await resp.json();
                                if (data && data.display_name && addrInput) {
                                  const road = data.address?.road || data.address?.suburb || "";
                                  const houseNumber = data.address?.house_number ? ` #${data.address.house_number}` : "";
                                  const city = data.address?.city || data.address?.town || "Oruro";
                                  addrInput.value = road ? `${road}${houseNumber}, ${city}` : data.display_name.split(",").slice(0, 3).join(",");
                                } else if (addrInput && !addrInput.value) {
                                  addrInput.value = `Ubicación GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)}), Oruro`;
                                }
                              } catch {
                                if (addrInput && !addrInput.value) {
                                  addrInput.value = `Ubicación GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)}), Oruro`;
                                }
                              }
                              alert("¡Ubicación GPS detectada con éxito y campos actualizados!");
                            },
                            (err) => {
                              alert(`No se pudo obtener el GPS: ${err.message}. Asegúrate de dar permisos de ubicación.`);
                            },
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                        title="Obtener ubicación y dirección exacta usando el GPS de tu celular o computadora"
                      >
                        <span>🎯</span>
                        <span>Usar mi GPS Actual</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const addrInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                          const query = addrInput?.value?.trim() ? `${addrInput.value.trim()}, Oruro, Bolivia` : "Oruro, Bolivia";
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline cursor-pointer"
                        title="Ver o buscar esta dirección en Google Maps"
                      >
                        <span>🗺️</span>
                        <span>Buscar en Maps</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      name="address"
                      type="text"
                      defaultValue={activeBiz.address || ""}
                      placeholder="Ej: Calle Bolívar #450, entre 6 de Octubre y Potosí"
                      className="w-full min-h-[46px] px-4 py-2 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const addrInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                        const mapsInput = document.getElementById("input-maps-url") as HTMLInputElement;
                        if (addrInput?.value?.trim() && mapsInput) {
                          const autoUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrInput.value.trim() + ", Oruro, Bolivia")}`;
                          mapsInput.value = autoUrl;
                          alert("¡Enlace GPS generado automáticamente a partir de tu dirección!");
                        } else {
                          alert("Escribe primero tu dirección física para generar el enlace GPS.");
                        }
                      }}
                      className="px-3.5 min-h-[46px] rounded-2xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Copiar dirección hacia el enlace GPS de Google Maps"
                    >
                      <span>➔</span>
                      <span>Copiar a GPS</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Ubicación física para que el cliente llegue a tu puesto o local comercial.</p>
                </div>

                {/* Enlace de Google Maps */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Enlace de Google Maps (Coordenada GPS)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const mapsInput = document.getElementById("input-maps-url") as HTMLInputElement;
                        if (mapsInput?.value?.trim()) {
                          window.open(mapsInput.value.trim(), "_blank");
                        } else {
                          const addrInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                          const query = addrInput?.value?.trim() ? `${addrInput.value.trim()}, Oruro, Bolivia` : "Oruro, Bolivia";
                          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Probar cómo abrirá el cliente el enlace GPS en su teléfono"
                    >
                      <span>📍</span>
                      <span>Probar Enlace GPS</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-maps-url"
                      name="mapsUrl"
                      type="url"
                      defaultValue={activeBiz.maps_url || ""}
                      placeholder="https://maps.app.goo.gl/... o pega aquí tu enlace"
                      className="w-full min-h-[46px] px-4 py-2 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400 font-medium font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const addrInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                        const mapsInput = document.getElementById("input-maps-url") as HTMLInputElement;
                        if (addrInput?.value?.trim() && mapsInput) {
                          const autoUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrInput.value.trim() + ", Oruro, Bolivia")}`;
                          mapsInput.value = autoUrl;
                        } else {
                          alert("Escribe una dirección física para generar el enlace GPS.");
                        }
                      }}
                      className="px-3 min-h-[46px] rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all cursor-pointer"
                      title="Regenerar enlace GPS de Google Maps"
                    >
                      Auto GPS
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Permite a los clientes abrir su GPS con 1 toque en su celular.</p>
                </div>
              </div>

              {/* WhatsApp con Prefijo Fijo de Bolivia y Selector de Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    WhatsApp de Pedidos y Consultas
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 bg-white">
                    <span className="px-3.5 py-2.5 bg-slate-100 text-slate-700 text-xs sm:text-sm font-black border-r border-slate-300 flex items-center gap-1.5 select-none">
                      <span>🇧🇴</span>
                      <span>+591</span>
                    </span>
                    <input
                      name="whatsapp"
                      type="tel"
                      required
                      placeholder="72412345"
                      defaultValue={activeBiz.whatsapp ? activeBiz.whatsapp.replace(/^591/, "") : ""}
                      className="w-full min-h-[46px] px-3.5 py-2 text-sm font-bold focus:outline-none text-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Solo escribe los 8 dígitos locales (el prefijo +591 se añade automáticamente).</p>
                </div>

                {/* Color de Marca con selector visual */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Color de Marca / Tema Visual
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      id="input-color-picker"
                      type="color"
                      defaultValue={(activeBiz.theme as any)?.primary_color || "#0ea5e9"}
                      onChange={(e) => {
                        const textInput = document.getElementById("input-hex-color") as HTMLInputElement;
                        if (textInput) textInput.value = e.target.value;
                      }}
                      className="w-12 h-12 rounded-2xl border border-slate-300 cursor-pointer p-0.5 bg-white shadow-sm flex-shrink-0"
                      title="Haz clic para elegir color visualmente"
                    />
                    <input
                      id="input-hex-color"
                      name="primaryColor"
                      type="text"
                      required
                      defaultValue={(activeBiz.theme as any)?.primary_color || "#0ea5e9"}
                      onChange={(e) => {
                        const picker = document.getElementById("input-color-picker") as HTMLInputElement;
                        if (picker && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          picker.value = e.target.value;
                        }
                      }}
                      className="w-full min-h-[46px] px-4 py-2 rounded-2xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  {/* Presets de Estilo Todo-en-Uno (Temas rápidos con 1 Clic) */}
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>✨</span>
                        <span>Temas de Estilo Todo-en-Uno (1 Clic)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        Auto-coordina Color + Forma + Letra
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Elige una identidad visual profesional preconfigurada para que tu catálogo tenga su propia personalidad única:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {[
                        {
                          id: "gourmet",
                          name: "Gourmet Cálido",
                          tag: "Gastronomía & Café",
                          color: "#f59e0b",
                          shape: "rounded",
                          font: "playfair",
                          icon: "🥐",
                          bgPreview: "from-amber-500 to-amber-700",
                        },
                        {
                          id: "luxe",
                          name: "Minimal Luxe",
                          tag: "Joyería & Premium",
                          color: "#0f172a",
                          shape: "sharp",
                          font: "montserrat",
                          icon: "✨",
                          bgPreview: "from-slate-800 to-slate-950",
                        },
                        {
                          id: "cyber",
                          name: "Neón Tech",
                          tag: "Gaming & Móviles",
                          color: "#0ea5e9",
                          shape: "asymmetric",
                          font: "space",
                          icon: "⚡",
                          bgPreview: "from-sky-500 to-indigo-600",
                        },
                        {
                          id: "organico",
                          name: "Eco Artesanal",
                          tag: "Salud & Orgánico",
                          color: "#10b981",
                          shape: "pill",
                          font: "outfit",
                          icon: "🌿",
                          bgPreview: "from-emerald-500 to-teal-700",
                        },
                        {
                          id: "boutique",
                          name: "Moda Rubí",
                          tag: "Boutique & Ropa",
                          color: "#e11d48",
                          shape: "pill",
                          font: "playfair",
                          icon: "💎",
                          bgPreview: "from-rose-500 to-pink-700",
                        },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            const textInput = document.getElementById("input-hex-color") as HTMLInputElement;
                            const pickerInput = document.getElementById("input-color-picker") as HTMLInputElement;
                            const shapeSelect = document.getElementById("select-card-shape") as HTMLSelectElement;
                            const fontSelect = document.getElementById("select-font-family") as HTMLSelectElement;
                            if (textInput) textInput.value = preset.color;
                            if (pickerInput) pickerInput.value = preset.color;
                            if (shapeSelect) shapeSelect.value = preset.shape;
                            if (fontSelect) fontSelect.value = preset.font;
                          }}
                          className="group relative flex flex-col items-start p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-md transition-all text-left active:scale-95"
                          title={`Aplicar tema ${preset.name}`}
                        >
                          <div className="flex items-center gap-1.5 w-full mb-1">
                            <span className="text-base">{preset.icon}</span>
                            <span
                              style={{ backgroundColor: preset.color }}
                              className="w-3.5 h-3.5 rounded-full border border-white shadow-sm ml-auto flex-shrink-0"
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-sky-700">
                            {preset.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium truncate w-full mt-0.5">
                            {preset.tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paleta rápida de colores populares de comercio */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Colores individuales:</span>
                    {[
                      { hex: "#0ea5e9", name: "Cielo" },
                      { hex: "#10b981", name: "Esmeralda" },
                      { hex: "#f59e0b", name: "Ámbar" },
                      { hex: "#e11d48", name: "Rosa" },
                      { hex: "#6366f1", name: "Índigo" },
                      { hex: "#0f172a", name: "Obsidiana" },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => {
                          const textInput = document.getElementById("input-hex-color") as HTMLInputElement;
                          const pickerInput = document.getElementById("input-color-picker") as HTMLInputElement;
                          if (textInput) textInput.value = col.hex;
                          if (pickerInput) pickerInput.value = col.hex;
                        }}
                        style={{ backgroundColor: col.hex }}
                        className="w-6 h-6 rounded-full border-2 border-white shadow-md ring-1 ring-slate-300 hover:scale-125 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900"
                        title={`Elegir ${col.name} (${col.hex})`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Forma Geométrica y Tipografía de Letra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Forma Geométrica de las Tarjetas */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Forma de Tarjetas de Productos
                  </label>
                  <select
                    id="select-card-shape"
                    name="cardShape"
                    defaultValue={(activeBiz.theme as any)?.card_shape || "rounded"}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white text-slate-800"
                  >
                    <option value="rounded">▢ Moderna Curva (Elegante y suave)</option>
                    <option value="pill">⬭ Óvalo / Cápsula (Llamativa)</option>
                    <option value="asymmetric">◩ Asimétrica Vanguardista</option>
                    <option value="sharp">▭ Minimal Recta (Urbana)</option>
                  </select>
                </div>

                {/* Tipo de Letra / Tipografía */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Estilo de Letra / Tipografía del Catálogo
                  </label>
                  <select
                    id="select-font-family"
                    name="fontFamily"
                    defaultValue={(activeBiz.theme as any)?.font_family || "jakarta"}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white text-slate-800"
                  >
                    <option value="jakarta">Plus Jakarta Sans (Moderna y Tecnológica)</option>
                    <option value="outfit">Outfit (Comercial, Amigable y Juvenil)</option>
                    <option value="montserrat">Montserrat (Imponente, Comercial y Clara)</option>
                    <option value="playfair">Playfair Display (Elegante, Boutique y Clásica)</option>
                    <option value="space">Space Grotesk (Urbana, Vanguardista y Creativa)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSuspended}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>💾</span>
                  <span>Guardar Cambios del Perfil</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* CONTENIDO PESTAÑA 5: ANALÍTICA (MÉTRICAS) */}
      {activeTab === "analitica" && (
        <section className="space-y-6">
          {initialMetrics ? (
            <TarjetaMetricas metrics={initialMetrics} />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              No hay métricas registradas para este periodo.
            </div>
          )}
        </section>
      )}

      {/* CONTENIDO PESTAÑA 6: CONTROL DE PAGOS Y PLAN */}
      {activeTab === "pagos" && (
        <section className="space-y-6">
          {/* Tarjeta de Resumen del Plan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Plan Actual</span>
                <h2 className="text-xl font-black text-slate-900">{activeBiz.plan_name || "Plan Comerciante"}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  activeBiz.payment_status === "al_dia"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : activeBiz.payment_status === "pendiente"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {activeBiz.payment_status === "al_dia"
                    ? "Al Día ✓"
                    : activeBiz.payment_status === "pendiente"
                    ? "Pago Pendiente"
                    : "Vencido ⚠️"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Cuota Mensual</span>
                <span className="text-lg font-black text-slate-900">{formatBs(activeBiz.subscription_price || 0)}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Ciclo {activeBiz.billing_cycle || "mensual"}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Límite de Catálogo</span>
                <span className="text-lg font-black text-slate-900">{items.length} / {activeBiz.max_items}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Productos o servicios</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Próximo Vencimiento</span>
                <span className="text-base font-bold text-slate-900">
                  {activeBiz.next_due_date
                    ? new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(activeBiz.next_due_date))
                    : "Sin fecha programada"}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Estado: {activeBiz.is_active ? "Activo" : "Pausado"}</span>
              </div>
            </div>

            {/* Asistencia de Pago por WhatsApp */}
            <div className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-xs font-bold text-sky-950">¿Deseas renovar tu plan o pagar con QR Simple?</h4>
                <p className="text-xs text-sky-800">
                  Envía tu comprobante o solicita tu código QR oficial al equipo de MercadoVirtual Oruro.
                </p>
              </div>
              <a
                href={`https://wa.me/59172456789?text=${encodeURIComponent(
                  `¡Hola MercadoVirtual! 👋 Deseo reportar/renovar el pago de mi negocio *${activeBiz.name}* (Plan: ${activeBiz.plan_name || "Comerciante"}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
              >
                Reportar Pago por WhatsApp ↗
              </a>
            </div>
          </div>

          {/* Historial de Pagos Registrados */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Historial de Recibos y Cuotas Registradas</h3>

            {initialPayments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No tienes pagos registrados en el sistema todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3">Monto</th>
                      <th className="pb-3">Método</th>
                      <th className="pb-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {initialPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 font-medium text-slate-800">
                          {new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(p.created_at))}
                        </td>
                        <td className="py-3 font-bold text-slate-900">{formatBs(p.amount)}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider text-[10px] bg-slate-100 text-slate-700">
                            {p.method}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{p.notes || "Cuota mensual registrada"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
        </div>
      </div>

      {/* Modal Formulario de Producto */}
      {isFormOpen && (
        <FormNuevoItem
          business={{
            id: activeBiz.id,
            niche: activeBiz.niche,
            max_items: activeBiz.max_items,
          }}
          itemExistente={editingItem}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            window.location.reload();
          }}
        />
      )}

      {/* Modal para Crear Nuevo Puesto / Tienda de Comida dentro de la Plaza */}
      {isNewStallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏪</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Agregar Puesto de Comida</h3>
                  <p className="text-xs text-slate-500">Para la plaza: {currentBusiness.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewStallModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStall} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Puesto o Tienda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Charquekan Doña Bertha, Sajama Burgers..."
                  value={newStallName}
                  onChange={(e) => setNewStallName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoría Gastronómica *
                </label>
                <select
                  value={newStallCategory}
                  onChange={(e) => setNewStallCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium bg-white"
                >
                  <option value="Comida Típica">🍲 Comida Típica (Charquekan, Silpancho, etc.)</option>
                  <option value="Comida Rápida">🍔 Comida Rápida (Hamburguesas, Broaster, Salchipapas)</option>
                  <option value="Cafetería & Desayunos">☕ Cafetería & Desayunos (Api, Pasteles, Café)</option>
                  <option value="Bebidas & Postres">🥤 Bebidas, Helados & Postres</option>
                  <option value="Parrilladas">🥩 Parrilladas & Carnes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Especialidad o Breve Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Comida tradicional orureña, charquekan con mote y queso frito..."
                  value={newStallDescription}
                  onChange={(e) => setNewStallDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp para Pedidos Directos (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 71234567 (hereda el de la plaza si se deja vacío)"
                  value={newStallPhone}
                  onChange={(e) => setNewStallPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewStallModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStall || !newStallName.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  {isCreatingStall ? "Creando puesto..." : "Crear Puesto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
