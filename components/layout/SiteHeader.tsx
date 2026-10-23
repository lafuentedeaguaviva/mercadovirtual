"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // En el panel de administración (/admin), ocultamos la barra comercial externa para máxima limpieza y elegancia
  const isAdmin = mounted && (pathname?.startsWith("/admin") || pathname?.startsWith("/superadmin"));

  if (isAdmin) {
    return null;
  }

  return (
    <>
      {/* Barra superior de anuncios phygital con degradado premium */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 text-white text-[11px] sm:text-xs py-1.5 px-4 text-center font-semibold tracking-wide flex items-center justify-center gap-2 shadow-inner">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>🚀 Plataforma Comercial Phygital & Tótems QR Interactivos de Oruro</span>
      </div>

      {/* Encabezado Principal Glassmorphism */}
      <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl group"
            aria-label="MercadoVirtual Oruro - Inicio"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
              MV
            </div>
            <div className="flex flex-col">
              <span className="leading-tight flex items-center gap-1.5">
                <span>MercadoVirtual</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  Oruro
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Red Comercial & Tótems 3D
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-white px-3 sm:px-3.5 py-2 min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-700/80 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-850 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 shadow-sm"
            >
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Acceso Propietarios</span>
              <span className="sm:hidden">Ingresar</span>
            </Link>

            <Link
              href="/login?tab=register"
              className="text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 px-3 sm:px-4 py-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all transform active:scale-95"
            >
              <span>+</span>
              <span>Registrar Mi Tienda</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
