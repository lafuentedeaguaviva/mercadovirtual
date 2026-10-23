"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

interface GeneradorQRModalProps {
  slug: string;
  niche?: string;
  businessName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GeneradorQRModal({
  slug,
  niche,
  businessName,
  isOpen,
  onClose,
}: GeneradorQRModalProps) {
  const isPlaza = niche === "plaza_comidas";
  const [mesa, setMesa] = useState<string>("1");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mercadovirtual.bo";
  const targetUrl = isPlaza && mesa ? `${siteUrl}/${slug}?mesa=${mesa}` : `${siteUrl}/${slug}`;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error("Error al generar código QR:", err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const fileName = isPlaza && mesa ? `qr-${slug}-mesa-${mesa}.png` : `qr-${slug}.png`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 id="qr-modal-title" className="text-lg font-bold text-slate-900">
              Código QR Phygital
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[220px]">{businessName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg focus:outline-none"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Parámetro de mesa si es plaza de comidas */}
        {isPlaza && (
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200/60 space-y-1.5">
            <label htmlFor="mesa-input" className="block text-xs font-bold text-amber-900">
              Número de Mesa para el Tótem
            </label>
            <input
              id="mesa-input"
              type="text"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              placeholder="Ej: 1, 14, Terraza..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-amber-700">
              Los clientes que escaneen este QR abrirán el catálogo con la mesa preseleccionada.
            </p>
          </div>
        )}

        {/* Display del QR */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          {isGenerating ? (
            <div className="w-48 h-48 flex items-center justify-center text-sm text-slate-400 animate-pulse">
              Generando QR en alta resolución...
            </div>
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`Código QR hacia ${targetUrl}`}
              className="w-48 h-48 rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-rose-500">
              Error al generar el QR
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-2 text-center break-all select-all font-mono">
            {targetUrl}
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl || isGenerating}
            className="flex-1 min-h-[44px] px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Descargar PNG</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
