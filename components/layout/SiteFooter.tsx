"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = mounted && (pathname?.startsWith("/admin") || pathname?.startsWith("/superadmin"));

  if (isAdmin) {
    return null;
  }

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-slate-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="font-semibold text-slate-300">MercadoVirtual Oruro — Comercio Local Phygital</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Diseñado para negocios, artesanos, plazas gastronómicas y consultorios de Oruro, Bolivia.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4">
          <a href="/privacidad" className="hover:text-sky-400 transition-colors">Privacidad</a>
          <a href="/terminos" className="hover:text-sky-400 transition-colors">Términos</a>
          <a href="/login" className="hover:text-sky-400 transition-colors">Panel Dueños</a>
          <a href="/sitemap.xml" className="hover:text-sky-400 transition-colors">Sitemap</a>
          <a href="/robots.txt" className="hover:text-sky-400 transition-colors">Robots</a>
        </div>
      </div>
    </footer>
  );
}
