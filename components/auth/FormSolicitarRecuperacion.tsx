"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";

export function FormSolicitarRecuperacion() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div
          role="status"
          className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-start gap-2"
        >
          <svg className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{state.message}</span>
        </div>
      )}

      {state?.error && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2"
        >
          <svg className="w-5 h-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
          Correo Registrado
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu-correo@ejemplo.bo"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[44px]"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        {isPending ? "Enviando enlace..." : "Enviar enlace de recuperación"}
      </button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs text-slate-500 hover:text-slate-800 font-medium focus:outline-none focus-visible:underline"
        >
          ← Regresar al inicio de sesión
        </Link>
      </div>
    </form>
  );
}
