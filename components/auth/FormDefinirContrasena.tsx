"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/auth";

export function FormDefinirContrasena() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updatePasswordAction, null);

  useEffect(() => {
    if (state?.success && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
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
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
          Nueva Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[44px]"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
          Confirmar Nueva Contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[44px]"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        {isPending ? "Guardando contraseña..." : "Actualizar Contraseña y Entrar"}
      </button>
    </form>
  );
}
