"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ModalZoomProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  images: string[];
}

export function ModalZoom({ isOpen, onClose, title, images }: ModalZoomProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Guardar foco previo y bloquear scroll del body
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setCurrentIndex(0);

      // Enfocar el modal para interacción inmediata por teclado
      setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Manejo de eventos de teclado (Escape para cerrar, Flechas para navegar)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        if (images.length > 1) {
          setCurrentIndex((prev) => (prev + 1) % images.length);
        }
      } else if (event.key === "ArrowLeft") {
        if (images.length > 1) {
          setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex] || "/placeholder-product.svg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-zoom-title"
      ref={modalRef}
      tabIndex={-1}
    >
      <div
        className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-800 text-white">
          <div className="min-w-0 pr-3">
            <h2 id="modal-zoom-title" className="text-sm sm:text-base font-bold truncate">
              {title}
            </h2>
            {images.length > 1 && (
              <p className="text-xs text-slate-400">
                Imagen {currentIndex + 1} de {images.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Cerrar vista de imagen"
          >
            ✕
          </button>
        </div>

        {/* Contenedor de la Imagen con Carrusel Simple */}
        <div className="relative w-full aspect-square sm:aspect-[4/3] bg-black/50 flex items-center justify-center">
          <Image
            src={currentImage}
            alt={`${title} - Imagen ${currentIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-contain"
            priority
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Ver imagen anterior"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Ver siguiente imagen"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Miniaturas de navegación si hay múltiples imágenes */}
        {images.length > 1 && (
          <div className="p-3 bg-slate-950 flex justify-center gap-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  currentIndex === idx ? "border-sky-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
                aria-label={`Ir a la imagen ${idx + 1}`}
              >
                <Image src={img} alt="" fill sizes="48px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
