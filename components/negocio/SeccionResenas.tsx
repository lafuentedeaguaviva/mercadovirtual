"use client";

import React, { useState, useActionState } from "react";
import type { Database } from "@/types/database";
import { submitReviewAction, type SubmitReviewState } from "@/app/actions/reviews";

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

interface SeccionResenasProps {
  businessId: string;
  initialReviews: ReviewRow[];
  ratingAvg?: number;
  ratingCount?: number;
}

const initialState: SubmitReviewState = {
  success: false,
  message: "",
};

export function SeccionResenas({
  businessId,
  initialReviews,
  ratingAvg = 0,
  ratingCount = 0,
}: SeccionResenasProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);

  const [state, formAction, isPending] = useActionState(
    submitReviewAction,
    initialState
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("es-BO", {
        timeZone: "America/La_Paz",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <section
      aria-label="Opiniones y valoraciones"
      className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-6"
    >
      {/* Resumen Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Opiniones de Clientes</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Experiencias compartidas en Oruro
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/60 px-3.5 py-2 rounded-xl">
            <span className="text-amber-500 text-xl font-bold">★</span>
            <span className="text-slate-900 font-extrabold text-lg">
              {ratingAvg > 0 ? ratingAvg.toFixed(1) : "Nuevo"}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              ({ratingCount} {ratingCount === 1 ? "opinión" : "opiniones"})
            </span>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 flex items-center gap-2"
            aria-expanded={showForm}
            aria-controls="formulario-opinion"
          >
            <span>✍️ Dejar opinión</span>
          </button>
        </div>
      </div>

      {/* Formulario Desplegable */}
      {showForm && (
        <div
          id="formulario-opinion"
          className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900">Tu opinión nos ayuda a mejorar</h3>

          {state.message && (
            <div
              className={`p-3.5 rounded-xl text-sm ${
                state.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
              role="alert"
            >
              {state.message}
            </div>
          )}

          {!state.success && (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="rating" value={selectedRating} />

              {/* Honeypot oculto anti-spam */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website_hp">No llenar este campo</label>
                <input
                  type="text"
                  id="website_hp"
                  name="website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Selector táctil de 1 a 5 estrellas accesible por teclado */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Calificación (Estrellas)
                </label>
                <div
                  role="radiogroup"
                  aria-label="Calificación en estrellas"
                  className="flex items-center gap-2"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      role="radio"
                      aria-checked={selectedRating === star}
                      onClick={() => setSelectedRating(star)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" && star < 5) setSelectedRating(star + 1);
                        if (e.key === "ArrowLeft" && star > 1) setSelectedRating(star - 1);
                      }}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-2xl transition-transform ${
                        star <= selectedRating
                          ? "text-amber-500 scale-105"
                          : "text-slate-300 hover:text-amber-300"
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
                      aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm font-bold text-slate-700 ml-2">
                    {selectedRating} / 5
                  </span>
                </div>
                {state.errors?.rating && (
                  <p className="text-xs text-rose-600 mt-1">{state.errors.rating[0]}</p>
                )}
              </div>

              {/* Nombre del autor */}
              <div>
                <label
                  htmlFor="authorName"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                >
                  Tu Nombre o Apodo
                </label>
                <input
                  type="text"
                  id="authorName"
                  name="authorName"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="Ej. Carmen Pérez"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
                {state.errors?.authorName && (
                  <p className="text-xs text-rose-600 mt-1">{state.errors.authorName[0]}</p>
                )}
              </div>

              {/* Comentario */}
              <div>
                <label
                  htmlFor="comment"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                >
                  Tu Comentario (Opcional, máx. 500 caracteres)
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  maxLength={500}
                  rows={3}
                  placeholder="Comparte detalles de la atención, calidad o tiempo de entrega..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white resize-y"
                />
                {state.errors?.comment && (
                  <p className="text-xs text-rose-600 mt-1">{state.errors.comment[0]}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-h-[44px] px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  {isPending ? "Enviando..." : "Publicar Opinión"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Listado de Opiniones Aprobadas */}
      {initialReviews.length === 0 ? (
        <div className="py-8 text-center space-y-1.5">
          <p className="text-sm font-semibold text-slate-800">Sin opiniones publicadas aún</p>
          <p className="text-xs text-slate-500">
            Sé el primero en calificar tu experiencia tras tu visita o compra.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialReviews.map((rev) => (
            <article
              key={rev.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {rev.author_name || "Cliente verificado"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(rev.created_at)}
                </span>
              </div>

              <div
                className="flex text-amber-500 text-xs tracking-wider"
                aria-label={`Calificación: ${rev.rating} de 5 estrellas`}
              >
                {"★".repeat(rev.rating)}
                {"☆".repeat(5 - rev.rating)}
              </div>

              {rev.comment && (
                <p className="text-sm text-slate-700 leading-relaxed break-words">
                  {rev.comment}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
