"use client";

import { useState } from "react";
import { formatBs, normalizeWhatsapp } from "@/lib/utils";
import type { Database } from "@/types/database";
import {
  registerPaymentAction,
  toggleBusinessSuspensionAction,
  editBusinessPlanAction,
  getBusinessPaymentHistoryAction,
  updateBusinessNicheAction,
} from "@/app/actions/superadmin";

type SubscriptionRow = Database["public"]["Views"]["superadmin_subscriptions"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

interface PanelFinancieroProps {
  initialSubscriptions: SubscriptionRow[];
  totalBusinesses: number;
  activeBusinesses: number;
  mrrProjected: number;
  countAlDia: number;
  countPendiente: number;
  countVencido: number;
  collectedCurrentMonth: number;
}

export function PanelFinancieroClient({
  initialSubscriptions,
  totalBusinesses,
  activeBusinesses,
  mrrProjected,
  countAlDia,
  countPendiente,
  countVencido,
  collectedCurrentMonth,
}: PanelFinancieroProps) {
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [nicheFilter, setNicheFilter] = useState<string>("todos");

  // Estado de modales y drawers
  const [paymentModalBiz, setPaymentModalBiz] = useState<SubscriptionRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "transferencia" | "efectivo" | "otro">("qr");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal suspensión
  const [suspensionBiz, setSuspensionBiz] = useState<SubscriptionRow | null>(null);
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // Cambio rápido de nicho directo en la fila/tarjeta
  const [updatingNicheBizId, setUpdatingNicheBizId] = useState<string | null>(null);

  // Modal editar plan y rubro
  const [editPlanBiz, setEditPlanBiz] = useState<SubscriptionRow | null>(null);
  const [planName, setPlanName] = useState("");
  const [businessNiche, setBusinessNiche] = useState<"comercio" | "plaza_comidas" | "agenda" | "inmueble">("comercio");
  const [maxItems, setMaxItems] = useState(50);
  const [subscriptionPrice, setSubscriptionPrice] = useState(0);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Drawer historial de pagos
  const [historyBiz, setHistoryBiz] = useState<SubscriptionRow | null>(null);
  const [historyPayments, setHistoryPayments] = useState<PaymentRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Notificaciones Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtrado reactivo de suscripciones
  const filteredList = initialSubscriptions.filter((item) => {
    // Búsqueda por nombre o slug
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(term);
      const matchSlug = item.slug.toLowerCase().includes(term);
      const matchEmail = (item.owner_email || "").toLowerCase().includes(term);
      if (!matchName && !matchSlug && !matchEmail) return false;
    }

    // Filtro estado
    if (statusFilter !== "todos" && item.payment_status !== statusFilter) {
      return false;
    }

    // Filtro nicho
    if (nicheFilter !== "todos" && item.niche !== nicheFilter) {
      return false;
    }

    return true;
  });

  // Ordenar prioritariamente por fecha de vencimiento más próxima
  const sortedList = [...filteredList].sort((a, b) => {
    return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
  });

  // Exportar CSV de pagos del mes en el navegador
  const handleExportCSV = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const res = await fetch(`/api/cron/mark-overdue`); // test o action
      // Usamos import dinámico de server action
      const { getPaymentsForMonthAction } = await import("@/app/actions/superadmin");
      const result = await getPaymentsForMonthAction(currentYear, currentMonth);

      if (!result.success || !result.data) {
        showToast(result.error || "No hay pagos registrados para este mes.", "error");
        return;
      }

      if (result.data.length === 0) {
        showToast("No existen cobros registrados en el mes actual.", "error");
        return;
      }

      // Generar cabecera y filas CSV
      const headers = ["ID", "Fecha", "Negocio", "Monto (Bs.)", "Metodo", "Notas"];
      const rows = result.data.map((p) => [
        p.id,
        new Date(p.created_at).toLocaleDateString("es-BO"),
        `"${p.business_name.replace(/"/g, '""')}"`,
        p.amount.toFixed(2),
        p.method,
        `"${(p.notes || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `pagos_mercadovirtual_${currentYear}_${String(currentMonth).padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("CSV descargado exitosamente.");
    } catch (err) {
      console.error("Error al exportar CSV:", err);
      showToast("Error al exportar archivo CSV.", "error");
    }
  };

  // 1. Ejecutar Registrar Cobro
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBiz) return;

    if (paymentAmount <= 0) {
      showToast("El monto a cobrar debe ser mayor a 0.", "error");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await registerPaymentAction({
        businessId: paymentModalBiz.business_id,
        amount: paymentAmount,
        method: paymentMethod,
        notes: paymentNotes.trim() || null,
      });

      if (!res.success) {
        showToast(res.error || "No se pudo registrar el pago.", "error");
        setIsSubmittingPayment(false);
        return;
      }

      showToast(`Cobro de Bs. ${paymentAmount.toFixed(2)} registrado. Suscripción extendida 30 días.`);
      setPaymentModalBiz(null);
    } catch (err: unknown) {
      console.error(err);
      showToast("Error inesperado al registrar pago.", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 2. Ejecutar Toggle Suspensión
  const handleConfirmSuspension = async () => {
    if (!suspensionBiz) return;

    const newActiveState = !suspensionBiz.is_active;
    setIsSubmittingSuspension(true);
    try {
      const res = await toggleBusinessSuspensionAction({
        businessId: suspensionBiz.business_id,
        isActive: newActiveState,
      });

      if (!res.success) {
        showToast(res.error || "Error al actualizar estado.", "error");
        setIsSubmittingSuspension(false);
        return;
      }

      showToast(
        newActiveState
          ? `Negocio "${suspensionBiz.name}" reactivado exitosamente.`
          : `Negocio "${suspensionBiz.name}" suspendido. Su catálogo público ha sido deshabilitado.`
      );
      setSuspensionBiz(null);
    } catch {
      showToast("Error inesperado al suspender negocio.", "error");
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  // Cambio rápido e interactivo de nicho desde la tabla
  const handleQuickNicheChange = async (
    biz: SubscriptionRow,
    newNiche: "comercio" | "plaza_comidas" | "agenda" | "inmueble"
  ) => {
    if (biz.niche === newNiche) return;
    setUpdatingNicheBizId(biz.business_id);
    try {
      const res = await updateBusinessNicheAction({
        businessId: biz.business_id,
        niche: newNiche,
      });

      if (!res.success) {
        showToast(res.error || "No se pudo cambiar el rubro.", "error");
        return;
      }

      showToast(`Rubro de "${biz.name}" actualizado a ${newNiche.replace("_", " ")}.`);
      // Actualización optimista local
      biz.niche = newNiche;
    } catch {
      showToast("Error al cambiar rubro.", "error");
    } finally {
      setUpdatingNicheBizId(null);
    }
  };

  // 3. Ejecutar Editar Plan y Sector/Rubro
  const handleSubmitEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlanBiz) return;

    setIsSubmittingPlan(true);
    try {
      const res = await editBusinessPlanAction({
        businessId: editPlanBiz.business_id,
        planName,
        maxItems: Number(maxItems),
        subscriptionPrice: Number(subscriptionPrice),
      });

      if (!res.success) {
        showToast(res.error || "Error al actualizar plan.", "error");
        setIsSubmittingPlan(false);
        return;
      }

      // Si cambió de rubro, actualizar también el rubro (niche)
      if (businessNiche && businessNiche !== editPlanBiz.niche) {
        const nicheRes = await updateBusinessNicheAction({
          businessId: editPlanBiz.business_id,
          niche: businessNiche,
        });
        if (!nicheRes.success) {
          showToast(`Plan actualizado, pero error en rubro: ${nicheRes.error}`, "error");
        }
      }

      showToast(`Plan y configuración de "${editPlanBiz.name}" actualizados.`);
      setEditPlanBiz(null);
      window.location.reload();
    } catch {
      showToast("Error inesperado al guardar plan.", "error");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // 4. Abrir Historial de Pagos
  const handleOpenHistory = async (biz: SubscriptionRow) => {
    setHistoryBiz(biz);
    setIsLoadingHistory(true);
    setHistoryPayments([]);
    try {
      const res = await getBusinessPaymentHistoryAction(biz.business_id);
      if (res.success && res.payments) {
        setHistoryPayments(res.payments);
      } else {
        showToast(res.error || "No se pudo cargar el historial.", "error");
      }
    } catch {
      showToast("Error al consultar el historial.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 5. Enlace WhatsApp Recordatorio
  const buildReminderWhatsappUrl = (biz: SubscriptionRow) => {
    const rawDate = new Date(biz.next_due_date);
    // Formato dd/mm/yyyy
    const day = String(rawDate.getUTCDate()).padStart(2, "0");
    const month = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
    const year = rawDate.getUTCFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const text = `Hola ${biz.name}, te recordamos que tu mensualidad de Bs. ${biz.subscription_price.toFixed(
      2
    )} para tu tótem 3D vence el ${formattedDate}. Puedes transferir a nuestro QR para mantener tu catálogo activo.`;

    const phone = normalizeWhatsapp(biz.whatsapp);
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 transition-all duration-200 ${
            toastType === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{toastType === "success" ? "✓" : "⚠"}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera y Botones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-linear-to-r from-indigo-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Panel Financiero Superadmin
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full shadow-lg shadow-indigo-500/30">
              Live Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitoreo en tiempo real de suscripciones, estados de cobranza y tótems 3D en Oruro.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 shadow-lg hover:shadow-slate-700/20 flex items-center gap-2 transition-all transform active:scale-95"
          >
            <span>📊</span>
            <span>Exportar CSV Mes</span>
          </button>
          <a
            href="/superadmin/negocios/nuevo"
            className="px-4.5 py-2.5 text-xs font-extrabold rounded-xl bg-linear-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <span className="text-sm font-black">+</span>
            <span>Nuevo Negocio</span>
          </a>
        </div>
      </div>

      {/* 1. KPIs FINANCIEROS CON EFECTO GLASS & NEON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total Negocios */}
        <div className="relative overflow-hidden p-5 bg-slate-900/70 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Negocios Registrados</p>
            <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-base shadow-inner group-hover:scale-110 transition-transform">🏪</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{totalBusinesses}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-xs">
              {activeBusinesses} activos
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Locales operando en Oruro</p>
        </div>

        {/* KPI: MRR Proyectado */}
        <div className="relative overflow-hidden p-5 bg-slate-900/70 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MRR Proyectado</p>
            <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-base shadow-inner group-hover:scale-110 transition-transform">💰</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight">
              {formatBs(mrrProjected)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Ingreso mensual recurrente</p>
        </div>

        {/* KPI: Estado de Cartera */}
        <div className="relative overflow-hidden p-5 bg-slate-900/70 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado Cartera</p>
            <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-base shadow-inner group-hover:scale-110 transition-transform">⏱️</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {countAlDia} Al día
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {countPendiente} Pend.
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {countVencido} Venc.
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Salud de pagos y mora</p>
        </div>

        {/* KPI: Cobrado en el Mes */}
        <div className="relative overflow-hidden p-5 bg-slate-900/70 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cobrado Este Mes</p>
            <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-base shadow-inner group-hover:scale-110 transition-transform">💳</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-indigo-300 tracking-tight">
              {formatBs(collectedCurrentMonth)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Percibido vía QR o Transferencias</p>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS Y FILTROS GLASS */}
      <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por negocio, slug o correo..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-800 bg-slate-950/70 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          />
          <span className="absolute left-3.5 top-3 text-slate-500 text-xs">🔍</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm py-2 px-3.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="todos">Todos los Estados</option>
            <option value="al_dia">✓ Al día</option>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="vencido">✕ Vencido</option>
          </select>

          {/* Filtro Nicho */}
          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="text-xs sm:text-sm py-2 px-3.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="todos">Todos los Nichos</option>
            <option value="comercio">🛍️ Comercio</option>
            <option value="inmueble">🏠 Inmueble</option>
            <option value="agenda">📅 Agenda / Citas</option>
            <option value="plaza_comidas">🍔 Plaza de Comidas</option>
          </select>
        </div>
      </div>

      {/* 3. TABLA Y CARDS EN ESTILO FINTECH DARK GLOW */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* VISTA MÓVIL (block md:hidden) */}
        <div className="divide-y divide-slate-800/80 md:hidden">
          {sortedList.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No se encontraron negocios con los filtros seleccionados.
            </div>
          ) : (
            sortedList.map((biz) => {
              const isOverdue = biz.payment_status === "vencido";
              const isPending = biz.payment_status === "pendiente";

              return (
                <div key={biz.business_id} className="p-4 space-y-3 bg-slate-900/50 hover:bg-slate-850/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-white leading-tight">
                          {biz.name}
                        </span>
                        {!biz.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Pausado
                          </span>
                        )}
                      </div>
                      <a
                        href={`/${biz.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline mt-0.5"
                      >
                        <span>/{biz.slug}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    {/* Badge Estado */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                        biz.payment_status === "al_dia"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : isPending
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {biz.payment_status === "al_dia" && "✓ Al día"}
                      {isPending && "⏳ Pendiente"}
                      {isOverdue && "✕ Vencido"}
                    </span>
                  </div>

                  {/* Selector Rápido de Nicho en Tarjeta Móvil */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Rubro / Nicho:
                    </span>
                    <select
                      value={biz.niche}
                      disabled={updatingNicheBizId === biz.business_id}
                      onChange={(e) =>
                        handleQuickNicheChange(biz, e.target.value as any)
                      }
                      className="text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="comercio">🛍️ Comercio</option>
                      <option value="inmueble">🏠 Inmueble</option>
                      <option value="agenda">📅 Agenda / Citas</option>
                      <option value="plaza_comidas">🍔 Plaza Comidas</option>
                    </select>
                  </div>

                  {/* Datos del negocio en cuadrícula compacta */}
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Items</span>
                      <span className="font-semibold text-slate-200">
                        {biz.items_en_uso} / {biz.max_items}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tarifa</span>
                      <span className="font-extrabold text-white">
                        {formatBs(biz.subscription_price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Vencimiento</span>
                      <span
                        className={`font-semibold ${
                          isOverdue ? "text-rose-400 font-bold" : "text-slate-300"
                        }`}
                      >
                        {new Date(biz.next_due_date).toLocaleDateString("es-BO")}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Acciones Fila Móvil */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Botón Abrir Catálogo Público */}
                    <a
                      href={`/${biz.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1 shadow-md"
                      title="Ver Mercado Virtual de este usuario"
                    >
                      <span>🌐 Ver Catálogo</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentModalBiz(biz);
                        setPaymentAmount(biz.subscription_price > 0 ? biz.subscription_price : 100);
                        setPaymentMethod("qr");
                        setPaymentNotes("");
                      }}
                      className="flex-1 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/20 text-center"
                    >
                      💰 Cobrar
                    </button>

                    <a
                      href={buildReminderWhatsappUrl(biz)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      💬 WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => handleOpenHistory(biz)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                      title="Historial de pagos"
                    >
                      📜
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditPlanBiz(biz);
                        setPlanName(biz.plan_name);
                        setBusinessNiche(biz.niche as any);
                        setMaxItems(biz.max_items);
                        setSubscriptionPrice(biz.subscription_price);
                      }}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                      title="Editar plan y rubro"
                    >
                      ⚙️
                    </button>

                    <button
                      type="button"
                      onClick={() => setSuspensionBiz(biz)}
                      className={`min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        biz.is_active
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                      }`}
                      title={biz.is_active ? "Suspender negocio" : "Reactivar negocio"}
                    >
                      {biz.is_active ? "⏸ Pausar" : "▶ Activar"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* VISTA DESKTOP (hidden md:block): Tabla completa estilo Fintech Glow */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">Local / Mercado Virtual</th>
                <th scope="col" className="px-4 py-4">Rubro / Nicho</th>
                <th scope="col" className="px-4 py-4 text-center">Items</th>
                <th scope="col" className="px-4 py-4">Tarifa Mensual</th>
                <th scope="col" className="px-4 py-4">Vencimiento</th>
                <th scope="col" className="px-4 py-4">Estado</th>
                <th scope="col" className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-sm">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                sortedList.map((biz) => {
                  const isOverdue = biz.payment_status === "vencido";
                  const isPending = biz.payment_status === "pendiente";

                  return (
                    <tr key={biz.business_id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Local + Link directo al Mercado Virtual */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                            {biz.name}
                          </span>
                          {!biz.is_active && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Pausado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`/${biz.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                            title="Abrir el catálogo público de este negocio"
                          >
                            <span>/{biz.slug}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </td>

                      {/* Selector Rápido de Nicho */}
                      <td className="px-4 py-4.5">
                        <div className="relative inline-block">
                          <select
                            value={biz.niche}
                            disabled={updatingNicheBizId === biz.business_id}
                            onChange={(e) =>
                              handleQuickNicheChange(biz, e.target.value as any)
                            }
                            title="Cambiar nicho directamente"
                            className="cursor-pointer appearance-none text-xs font-semibold py-1.5 pl-3 pr-7 rounded-xl border border-slate-700 bg-slate-950 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 shadow-sm transition-all disabled:opacity-50"
                          >
                            <option value="comercio">🛍️ Comercio</option>
                            <option value="inmueble">🏠 Inmueble</option>
                            <option value="agenda">📅 Agenda / Citas</option>
                            <option value="plaza_comidas">🍔 Plaza Comidas</option>
                          </select>
                          <span className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400 text-[10px]">
                            ▼
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4.5 text-center text-xs font-medium">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold font-mono">
                          {biz.items_en_uso} / {biz.max_items}
                        </span>
                      </td>

                      <td className="px-4 py-4.5 font-black text-slate-100 text-sm font-mono">
                        {formatBs(biz.subscription_price)}
                      </td>

                      <td className="px-4 py-4.5 text-xs font-mono">
                        <span
                          className={`font-semibold ${
                            isOverdue ? "text-rose-400 font-bold" : isPending ? "text-amber-400" : "text-slate-300"
                          }`}
                        >
                          {new Date(biz.next_due_date).toLocaleDateString("es-BO")}
                        </span>
                      </td>

                      <td className="px-4 py-4.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                            biz.payment_status === "al_dia"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : isPending
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {biz.payment_status === "al_dia" && "✓ Al día"}
                          {isPending && "⏳ Pendiente"}
                          {isOverdue && "✕ Vencido"}
                        </span>
                      </td>

                      <td className="px-5 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Ver Catálogo Público */}
                          <a
                            href={`/${biz.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all shadow-sm flex items-center gap-1.5"
                            title="Ver Mercado Virtual (Catálogo en vivo)"
                          >
                            <span>🌐 Ver</span>
                          </a>

                          {/* Botón Registrar Cobro */}
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalBiz(biz);
                              setPaymentAmount(
                                biz.subscription_price > 0 ? biz.subscription_price : 100
                              );
                              setPaymentMethod("qr");
                              setPaymentNotes("");
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all shadow-md shadow-emerald-500/20"
                          >
                            Registrar cobro
                          </button>

                          {/* Recordatorio WhatsApp */}
                          <a
                            href={buildReminderWhatsappUrl(biz)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shadow-xs"
                            title="Enviar recordatorio WhatsApp"
                          >
                            💬
                          </a>

                          {/* Historial Drawer */}
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(biz)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors shadow-xs"
                            title="Ver historial de pagos"
                          >
                            📜
                          </button>

                          {/* Editar Plan y Rubro */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditPlanBiz(biz);
                              setPlanName(biz.plan_name);
                              setBusinessNiche(biz.niche as any);
                              setMaxItems(biz.max_items);
                              setSubscriptionPrice(biz.subscription_price);
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors shadow-xs"
                            title="Editar plan, tarifa y rubro completo"
                          >
                            ⚙️
                          </button>

                          {/* Switch de Suspensión */}
                          <button
                            type="button"
                            onClick={() => setSuspensionBiz(biz)}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-xs ${
                              biz.is_active
                                ? "bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                            }`}
                            title={biz.is_active ? "Suspender negocio" : "Reactivar negocio"}
                          >
                            {biz.is_active ? "Pausar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: REGISTRAR COBRO (Llama a register_payment RPC)              */}
      {/* ===================================================================== */}
      {paymentModalBiz && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700/80 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💰</span> Registrar Cobro de Mensualidad
                </h3>
                <p className="text-xs text-indigo-400 font-medium">{paymentModalBiz.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalBiz(null)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Monto a cobrar (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-base font-bold focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Tarifa sugerida por plan: {formatBs(paymentModalBiz.subscription_price)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="qr">Pago QR (Simple / Banco)</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="efectivo">Efectivo en Oficina Oruro</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Notas de referencia (opcional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej: Comprobante BCP #984321..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 text-xs text-emerald-300 space-y-1">
                <p className="font-bold">Efecto transaccional inmediato:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Suma 30 días a la fecha de vencimiento.</li>
                  <li>Cambia estado a &quot;Al día&quot; y reactiva el catálogo público.</li>
                  <li>Genera registro auditable en la tabla de pagos.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={() => setPaymentModalBiz(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {isSubmittingPayment ? "Procesando..." : "Confirmar Cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CONFIRMAR SUSPENSIÓN / REACTIVACIÓN                        */}
      {/* ===================================================================== */}
      {suspensionBiz && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700/80 space-y-4 text-slate-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{suspensionBiz.is_active ? "⏸" : "▶"}</span>
              <span>{suspensionBiz.is_active ? "¿Suspender Negocio?" : "¿Reactivar Negocio?"}</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-400">
              Estás a punto de cambiar el estado de{" "}
              <strong className="text-white font-bold">{suspensionBiz.name}</strong>.
            </p>

            {suspensionBiz.is_active ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-300 space-y-1">
                <p className="font-bold">⚠️ Impacto de la suspensión:</p>
                <p>
                  El catálogo público dejará de mostrarse inmediatamente para los clientes que
                  escaneen el código QR en el tótem físico. El panel del dueño quedará restringido.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs text-emerald-300">
                El catálogo volverá a estar disponible públicamente en su enlace y códigos QR.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmittingSuspension}
                onClick={() => setSuspensionBiz(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingSuspension}
                onClick={handleConfirmSuspension}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg disabled:opacity-50 transition-all ${
                  suspensionBiz.is_active
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                }`}
              >
                {isSubmittingSuspension
                  ? "Actualizando..."
                  : suspensionBiz.is_active
                  ? "Sí, Suspender"
                  : "Sí, Reactivar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: EDITAR PLAN                                                 */}
      {/* ===================================================================== */}
      {editPlanBiz && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700/80 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>⚙️</span> Editar Plan y Capacidad
                </h3>
                <p className="text-xs text-indigo-400 font-medium">{editPlanBiz.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditPlanBiz(null)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEditPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Nombre del Plan
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  placeholder="Ej: básico, intermedio, corporativo..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Sector o Rubro Asignado (Nicho)
                </label>
                <select
                  value={businessNiche}
                  onChange={(e) => setBusinessNiche(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="comercio">🛍️ Comercio General & Tiendas</option>
                  <option value="plaza_comidas">🍔 Gastronomía & Plaza de Comidas</option>
                  <option value="agenda">📅 Servicios, Citas & Consultorios</option>
                  <option value="inmueble">🏠 Inmuebles & Bienes Raíces</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Cambiar el rubro activa o desactiva módulos dinámicamente en el catálogo.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Límite de Productos (max_items)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxItems}
                  onChange={(e) => setMaxItems(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Actualmente en uso: {editPlanBiz.items_en_uso} items
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Tarifa mensual en Bs.
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={subscriptionPrice}
                  onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingPlan}
                  onClick={() => setEditPlanBiz(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlan}
                  className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all"
                >
                  {isSubmittingPlan ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DRAWER: HISTORIAL DE PAGOS                                           */}
      {/* ===================================================================== */}
      {historyBiz && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col p-6 space-y-4 overflow-y-auto border-l border-slate-800 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📜</span> Historial de Cobros
                </h3>
                <p className="text-xs text-indigo-400 font-medium">{historyBiz.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryBiz(null)}
                className="text-slate-400 hover:text-white text-2xl font-bold leading-none p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Cargando historial de pagos...
              </div>
            ) : historyPayments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No hay pagos registrados para este negocio aún.
              </div>
            ) : (
              <div className="space-y-3">
                {historyPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-sm font-mono">
                        {formatBs(Number(p.amount))}
                      </span>
                      <span className="capitalize px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px]">
                        {p.method}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Fecha: {new Date(p.created_at).toLocaleString("es-BO")}
                    </p>
                    {p.notes && (
                      <p className="text-slate-300 italic bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        &quot;{p.notes}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 mt-auto">
              <button
                type="button"
                onClick={() => setHistoryBiz(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl transition-all"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
