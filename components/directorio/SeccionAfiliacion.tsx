import React from "react";
import Link from "next/link";
import { buildWhatsappUrl } from "@/lib/utils";

interface SeccionAfiliacionProps {
  contactWhatsapp?: string;
}

const DEFAULT_ADMIN_WHATSAPP = "59170000000";

const PASOS = [
  {
    numero: "1",
    titulo: "Contáctanos",
    descripcion:
      "Escríbenos directamente por WhatsApp. Te asesoramos sobre el plan ideal para tu rubro en Oruro.",
    icono: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    numero: "2",
    titulo: "Subimos tu catálogo",
    descripcion:
      "Configuramos tu marca, tus productos o servicios con precios en Bolivianos y enlace directo a tu WhatsApp.",
    icono: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
    ),
  },
  {
    numero: "3",
    titulo: "Recibes tu tótem 3D",
    descripcion:
      "Te entregamos tu tótem interactivo con código QR phygital para exhibirlo en tu punto físico y ferias.",
    icono: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
  },
];

export function SeccionAfiliacion({ contactWhatsapp }: SeccionAfiliacionProps) {
  const whatsappNumber = contactWhatsapp || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || DEFAULT_ADMIN_WHATSAPP;
  const whatsappUrl = buildWhatsappUrl(
    whatsappNumber,
    "¡Hola! Me gustaría afiliar mi negocio a MercadoVirtual Oruro para tener mi catálogo phygital y tótem 3D."
  );

  return (
    <section
      aria-labelledby="afilia-tu-negocio-heading"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white p-8 sm:p-12 shadow-xl border border-slate-700/50 mt-16"
    >
      {/* Elementos decorativos de fondo */}
      <div
        className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
        <span className="inline-block px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-sky-400/30">
          Únete a la Red Comercial Phygital
        </span>
        <h2
          id="afilia-tu-negocio-heading"
          className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
        >
          Afilia tu negocio a MercadoVirtual
        </h2>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300">
          Conecta tu mostrador físico con el mundo digital en 3 sencillos pasos. Sin comisiones por venta
          y con atención directa en tu WhatsApp.
        </p>

        {/* 3 Pasos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
          {PASOS.map((paso) => (
            <div
              key={paso.numero}
              className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-sky-400/50 transition-colors flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-sky-500 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                  {paso.numero}
                </span>
                <span className="text-sky-300">{paso.icono}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{paso.titulo}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {paso.descripcion}
              </p>
            </div>
          ))}
        </div>

        {/* Botón de WhatsApp y llamada a la acción */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {/* Ícono de WhatsApp */}
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.572 4.184 1.574 5.938l-1.574 5.748 5.897-1.547c1.705.95 3.666 1.488 5.753 1.488 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>Afiliar Negocio por WhatsApp</span>
          </a>
          <Link
            href="/login"
            className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 inline-flex items-center justify-center text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl border border-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Ya tengo cuenta (Acceder)
          </Link>
        </div>
      </div>
    </section>
  );
}
