"use client";

import React, { useState, useEffect, useActionState, useTransition } from "react";
import type { Database } from "@/types/database";
import { formatBs } from "@/lib/utils";
import { recordClickBeacon } from "@/lib/analytics-client";
import {
  createBookingAction,
  fetchBusySlotsAction,
  type BookingResult,
} from "@/app/actions/bookings";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export interface VistaAgendaProps {
  businessId: string;
  items: ItemRow[];
  whatsapp: string;
  businessName: string;
  schedule?: {
    days?: number[];
    morning?: [string, string];
    afternoon?: [string, string];
    slot_minutes?: number;
    allow_public_booking?: boolean;
    [key: string]: unknown;
  };
}

const initialBookingState: BookingResult = {
  success: false,
  message: "",
};

export function VistaAgenda({
  businessId,
  items,
  whatsapp,
  businessName,
  schedule,
}: VistaAgendaProps) {
  const allowPublicBooking = schedule?.allow_public_booking !== false;
  const slotMinutes = schedule?.slot_minutes || 30;

  // Pasos: 1 = Servicio, 2 = Fecha y Hora, 3 = Datos, 4 = Confirmación
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<ItemRow | null>(null);

  // Fechas y horas
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [busySlots, setBusySlots] = useState<Set<string>>(new Set());
  const [isPendingBusy, startTransition] = useTransition();

  // Datos del paciente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [state, formAction, isPendingSubmit] = useActionState(
    createBookingAction,
    initialBookingState
  );

  // Generar próximos 7 días laborables (Lunes a Viernes o días según schedule) en Oruro (America/La_Paz)
  const availableDays = React.useMemo(() => {
    const days: Array<{ dateStr: string; labelDay: string; labelDate: string }> = [];
    const now = new Date();

    let counter = 0;
    while (days.length < 7 && counter < 14) {
      const target = new Date(now);
      target.setDate(now.getDate() + counter);

      // 0=Domingo, 6=Sábado
      const dayOfWeek = target.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = target.toISOString().split("T")[0];
        const labelDay = new Intl.DateTimeFormat("es-BO", {
          timeZone: "America/La_Paz",
          weekday: "short",
        }).format(target);
        const labelDate = new Intl.DateTimeFormat("es-BO", {
          timeZone: "America/La_Paz",
          day: "numeric",
          month: "short",
        }).format(target);

        days.push({
          dateStr,
          labelDay: labelDay.toUpperCase(),
          labelDate,
        });
      }
      counter++;
    }
    return days;
  }, []);

  // Seleccionar primer día por defecto
  useEffect(() => {
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0].dateStr);
    }
  }, [availableDays, selectedDate]);

  // Cargar slots ocupados mediante RPC get_busy_slots
  useEffect(() => {
    if (!businessId || availableDays.length === 0) return;

    startTransition(async () => {
      const from = availableDays[0].dateStr;
      const to = availableDays[availableDays.length - 1].dateStr;
      const slots = await fetchBusySlotsAction(businessId, from, to);
      setBusySlots(new Set(slots));
    });
  }, [businessId, availableDays]);

  // Si hay conflicto de reserva simultánea, volver al paso 2 y recargar slots
  useEffect(() => {
    if (state.isConflict) {
      setStep(2);
      if (availableDays.length > 0) {
        startTransition(async () => {
          const from = availableDays[0].dateStr;
          const to = availableDays[availableDays.length - 1].dateStr;
          const slots = await fetchBusySlotsAction(businessId, from, to);
          setBusySlots(new Set(slots));
        });
      }
    }
  }, [state.isConflict, businessId, availableDays]);

  // Generar bloques de horarios dinámicamente según slotMinutes (15, 30 o 60 min)
  const generateSlots = (startHour: number, startMin: number, endHour: number, endMin: number, stepMin: number) => {
    const list: string[] = [];
    let cur = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    while (cur < end) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      list.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      cur += stepMin;
    }
    return list;
  };

  const morningSlots = generateSlots(8, 0, 12, 0, slotMinutes);
  const afternoonSlots = generateSlots(14, 30, 19, 0, slotMinutes);

  // Comprobar si un slot está ocupado o ya pasó
  const isSlotDisabled = (time: string) => {
    if (!selectedDate) return true;
    const isoString = `${selectedDate}T${time}:00-04:00`;
    const slotTime = new Date(isoString).getTime();
    const nowTime = new Date().getTime();

    // Bloquear si ya pasó la hora
    if (slotTime < nowTime) return true;

    // Bloquear si está en busySlots devuelto por RPC get_busy_slots
    for (const busy of busySlots) {
      const bTime = new Date(busy).getTime();
      if (Math.abs(bTime - slotTime) < (slotMinutes * 60000 - 1000)) {
        return true;
      }
    }

    return false;
  };

  // Fecha y hora combinada ISO para la reserva
  const scheduledAtIso = selectedDate && selectedTime ? `${selectedDate}T${selectedTime}:00-04:00` : "";

  // Si el dueño desactivó las citas directas de clientes
  if (!allowPublicBooking) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl border border-amber-200/60 shadow-xs">
          📅
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Citas y Consultas por WhatsApp</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Este establecimiento coordina su agenda de forma personalizada en recepción. Haz clic abajo para solicitar tu horario directamente por WhatsApp.
          </p>
        </div>
        <div className="pt-2">
          <a
            href={`https://wa.me/591${whatsapp.replace(/\D/g, "").slice(-8)}?text=${encodeURIComponent(
              `Hola ${businessName}, quisiera consultar horarios disponibles para agendar una cita o atención.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <span>💬</span>
            <span>Solicitar Cita por WhatsApp</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-sm space-y-6">
      {/* Barra de Progreso Superior */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Paso {step} de 4</span>
          <span>
            {step === 1 && "Selección de Servicio"}
            {step === 2 && "Fecha y Horario"}
            {step === 3 && "Tus Datos"}
            {step === 4 && "Confirmación Final"}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Botón Atrás cuando no es el paso 1 y no ha concluido con éxito */}
      {step > 1 && !state.success && (
        <button
          onClick={() => setStep(step - 1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 min-h-[44px] px-2 py-1 rounded-lg"
          aria-label="Volver al paso anterior"
        >
          ← Volver atrás
        </button>
      )}

      {/* PASO 1: SELECCIÓN DE SERVICIO */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. Selecciona el servicio profesional</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Escoge el procedimiento o consulta que deseas agendar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((srv) => {
              const metadata = (srv.metadata || {}) as Record<string, unknown>;
              const duracion = metadata.duracion_minutos || metadata.duracion_min || 30;
              const isSelected = selectedService?.id === srv.id;

              return (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/60 shadow-sm ring-2 ring-sky-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{srv.title}</h3>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md flex-shrink-0">
                      {formatBs(srv.price)}
                    </span>
                  </div>

                  {srv.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded">
                      ⏱ {String(duracion)} minutos
                    </span>
                    <button
                      type="button"
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg min-h-[44px] ${
                        isSelected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isSelected ? "Seleccionado ✓" : "Seleccionar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedService}
              className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all"
            >
              Continuar a Horarios →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: FECHA Y HORA */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">2. Elige la fecha y hora disponible</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Horarios sincronizados en tiempo real para {businessName}
            </p>
          </div>

          {/* Carrusel táctil de días laborables */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Días laborales:
            </span>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {availableDays.map((d) => {
                const isSelected = selectedDate === d.dateStr;
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.dateStr);
                      setSelectedTime("");
                    }}
                    className={`min-h-[50px] min-w-[76px] p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-75">{d.labelDay}</span>
                    <span className="text-xs font-extrabold">{d.labelDate}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloques de horarios: Mañana y Tarde */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                <span>🌅</span> Mañana (08:00 - 12:00)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {morningSlots.map((time) => {
                  const disabled = isSlotDisabled(time);
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTime(time)}
                      className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        disabled
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-sky-600 text-white border-sky-600 shadow"
                          : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                <span>🌆</span> Tarde (14:30 - 19:00)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {afternoonSlots.map((time) => {
                  const disabled = isSlotDisabled(time);
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTime(time)}
                      className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        disabled
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-sky-600 text-white border-sky-600 shadow"
                          : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(3)}
              disabled={!selectedTime}
              className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all"
            >
              Continuar a Datos del Paciente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: DATOS DEL PACIENTE */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">3. Información de contacto</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Datos requeridos por el consultorio para confirmar tu asistencia
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="clientName" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nombre Completo (Paciente)
              </label>
              <input
                id="clientName"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. Roberto Morales Choque"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="clientPhone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Celular / WhatsApp (Bolivia - 8 dígitos)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-sm font-semibold">
                  +591
                </span>
                <input
                  id="clientPhone"
                  type="tel"
                  required
                  maxLength={8}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="71234567"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-r-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Motivo o notas adicionales (Opcional, máx. 300)
              </label>
              <textarea
                id="notes"
                maxLength={300}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Primera consulta, dolor leve en muela superior..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(4)}
              disabled={clientName.trim().length < 2 || clientPhone.length !== 8}
              className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all"
            >
              Revisar y Confirmar →
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: CONFIRMACIÓN Y ENVÍO */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">4. Resumen de la reserva</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Verifica los detalles antes de enviar la solicitud
            </p>
          </div>

          {state.message && (
            <div
              className={`p-4 rounded-xl text-sm ${
                state.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
              role="alert"
            >
              {state.message}
            </div>
          )}

          {/* Tarjeta de Resumen */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm space-y-2.5">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Servicio:</span>
              <span className="font-bold text-slate-900">{selectedService?.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Precio:</span>
              <span className="font-bold text-slate-900">{formatBs(selectedService?.price || 0)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Fecha y Hora:</span>
              <span className="font-bold text-sky-700">
                {selectedDate} a las {selectedTime}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Paciente:</span>
              <span className="font-bold text-slate-900">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Celular:</span>
              <span className="font-bold text-slate-900">+591 {clientPhone}</span>
            </div>
          </div>

          {state.success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">¡Cita Registrada!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Para confirmar la disponibilidad inmediata con el profesional, envía el comprobante por WhatsApp:
              </p>
              {state.whatsappUrl && (
                <a
                  href={state.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    recordClickBeacon({
                      businessId,
                      itemId: selectedService?.id || null,
                      type: "booking",
                    });
                  }}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                  aria-label="Abrir WhatsApp para confirmar cita"
                >
                  <span>Abrir WhatsApp y confirmar cita</span>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.031 2C6.49 2 2 6.49 2 12.031c0 1.802.474 3.557 1.375 5.109L2 22l4.984-1.334a10.007 10.007 0 005.047 1.365h.005c5.536 0 10.026-4.49 10.026-10.031 0-2.68-1.043-5.197-2.937-7.091A9.957 9.957 0 0012.031 2zm5.834 14.195c-.244.686-1.42 1.32-1.954 1.399-.49.073-1.125.102-3.238-.769-2.7-1.113-4.453-3.864-4.587-4.043-.134-.18-1.092-1.455-1.092-2.776 0-1.32.69-1.97 1.026-2.298.244-.244.537-.366.86-.366.104 0 .198.005.284.01.272.012.408.028.588.46.225.54.767 1.874.834 2.012.068.138.113.3.023.48-.09.18-.135.293-.27.452-.136.158-.284.354-.407.476-.135.135-.276.281-.119.55.158.27 1.056 1.738 2.268 2.818 1.558 1.39 2.872 1.82 3.28 1.989.314.13.593.076.81-.157.279-.297.632-.823.951-1.343.226-.367.48-.31.796-.192.316.118 2.002.943 2.344 1.114.341.171.568.257.65.399.083.142.083.824-.16 1.51z" />
                  </svg>
                </a>
              )}
            </div>
          ) : (
            <form action={formAction} className="pt-2">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="itemId" value={selectedService?.id || ""} />
              <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
              <input type="hidden" name="clientName" value={clientName} />
              <input type="hidden" name="clientPhone" value={clientPhone} />
              <input type="hidden" name="notes" value={notes} />
              {/* Honeypot oculto anti-spam */}
              <input type="hidden" name="website_hp" value="" />

              <button
                type="submit"
                disabled={isPendingSubmit}
                className="min-h-[44px] w-full py-3 px-6 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {isPendingSubmit ? "Procesando reserva..." : "Solicitar Reserva"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
