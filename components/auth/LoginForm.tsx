"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  loginAction,
  registerAction,
  signInWithGoogleAction,
  type LoginResult,
  type RegisterResult,
} from "@/app/actions/auth";

interface LoginFormProps {
  initialNext?: string;
  initialTab?: "login" | "register";
}

export function LoginForm({ initialNext = "", initialTab = "login" }: LoginFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Estado para Login
  const [loginState, loginFormAction, isLoginPending] = useActionState<LoginResult | null, FormData>(
    loginAction,
    null
  );

  // Estado para Registro
  const [registerState, registerFormAction, isRegisterPending] = useActionState<RegisterResult | null, FormData>(
    registerAction,
    null
  );

  useEffect(() => {
    if (loginState?.success && loginState.redirectTo) {
      router.push(loginState.redirectTo);
      router.refresh();
    }
  }, [loginState, router]);

  useEffect(() => {
    if (registerState?.success && registerState.redirectTo) {
      router.push(registerState.redirectTo);
      router.refresh();
    }
  }, [registerState, router]);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      const supabase = createClient();
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const nextTarget = initialNext || "/admin";
      const redirectUrl = `${currentOrigin}/auth/callback?next=${encodeURIComponent(nextTarget)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setGoogleError(error.message || "Error al iniciar sesión con Google.");
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      let msg = "No se pudo conectar con el servidor de autenticación. Verifica que tu proyecto de Supabase esté activo y accesible.";
      if (err instanceof Error && !err.message.includes("NetworkError")) {
        msg = err.message;
      }
      setGoogleError(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector de Pestañas: Iniciar Sesión / Crear Cuenta con navegación nativa y estado */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 gap-1">
        <Link
          href={`/login${initialNext ? `?next=${encodeURIComponent(initialNext)}` : ""}`}
          onClick={() => setActiveTab("login")}
          className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer select-none min-h-[42px] ${
            activeTab === "login"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-950/5"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <span>Iniciar Sesión</span>
        </Link>
        <Link
          href={`/login?tab=register${initialNext ? `&next=${encodeURIComponent(initialNext)}` : ""}`}
          onClick={() => setActiveTab("register")}
          className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none min-h-[42px] ${
            activeTab === "register"
              ? "bg-white text-sky-600 shadow-sm ring-1 ring-sky-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <span>Crear Tienda</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold uppercase">
            Gratis
          </span>
        </Link>
      </div>

      {/* Botón de Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || isLoginPending || isRegisterPending}
        className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>
          {googleLoading
            ? "Conectando con Google..."
            : activeTab === "login"
            ? "Continuar con Google"
            : "Registrarme con Google"}
        </span>
      </button>

      {googleError && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl"
        >
          {googleError}
        </div>
      )}

      {/* Divisor con texto */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-200" />
        <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          O con tus datos
        </span>
        <div className="flex-grow border-t border-slate-200" />
      </div>

      {/* FORMULARIO DE INICIO DE SESIÓN */}
      {activeTab === "login" ? (
        <form action={loginFormAction} className="space-y-4">
          {initialNext && <input type="hidden" name="next" value={initialNext} />}

          {loginState?.error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{loginState.error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
              Correo Electrónico
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <Link
                href="/login/reset"
                className="text-xs text-sky-600 hover:text-sky-700 font-medium focus:outline-none focus-visible:underline"
              >
                ¿Olvidé mi contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoginPending}
            className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isLoginPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>
      ) : (
        /* FORMULARIO DE AUTO-REGISTRO ABIERTO */
        <form action={registerFormAction} className="space-y-3.5">
          {registerState?.error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{registerState.error}</span>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
              Tu Nombre Completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Ej. Juan Pérez"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="businessName" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de tu Negocio / Tienda
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              placeholder="Ej. Ropa Deportiva Bolívar"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="niche" className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Negocio
              </label>
              <select
                id="niche"
                name="niche"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
              >
                <option value="comercio">🛍️ Tienda / Comercio</option>
                <option value="plaza_comidas">🍔 Restaurante / Comida</option>
                <option value="agenda">🦷 Salud / Citas</option>
                <option value="inmueble">🏢 Inmuebles / Bienes</option>
              </select>
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp (Bolivia)
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                required
                placeholder="Ej. 71234567"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg_email" className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="reg_email"
              name="email"
              type="email"
              required
              placeholder="tu-correo@ejemplo.bo"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
            />
          </div>

          <div>
            <label htmlFor="reg_password" className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              id="reg_password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            🎉 <strong>¡Prueba Gratis de 15 días!</strong> Crearemos tu catálogo digital inmediatamente sin costo ni tarjeta de crédito.
          </div>

          <button
            type="submit"
            disabled={isRegisterPending}
            className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 flex items-center justify-center gap-2"
          >
            {isRegisterPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Creando tu tienda en Oruro...</span>
              </>
            ) : (
              <span>Crear Mi Tienda Gratis</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
