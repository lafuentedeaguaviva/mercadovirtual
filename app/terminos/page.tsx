import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos del Servicio | MercadoVirtual Oruro",
  description: "Términos y condiciones de uso de la plataforma comercial MercadoVirtual Oruro.",
};

export default function TerminosServicioPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Inicio
        </Link>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-8">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Términos del Servicio</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Última actualización: 24 de Octubre de 2026 &bull; MercadoVirtual Oruro, Bolivia
            </p>
          </div>
        </div>

        <div className="space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">1.</span> Aceptación de los Términos
            </h2>
            <p>
              Al acceder, navegar o utilizar la plataforma digital <strong>MercadoVirtual Oruro</strong> (en adelante, &quot;la Plataforma&quot;), tanto visitantes, clientes como comerciantes aceptan regirse plenamente por estos Términos y Condiciones de Uso, así como por nuestra Política de Privacidad. Si no está de acuerdo con alguno de los términos, deberá abstenerse de usar el servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">2.</span> Descripción del Servicio y Modelo Phygital
            </h2>
            <p>
              MercadoVirtual Oruro es un facilitador tecnológico que ofrece vitrinas virtuales, catálogos digitales interactivos enlazados a códigos QR y herramientas de contacto directo vía WhatsApp para negocios, puestos gastronómicos, inmobiliarias y prestadores de servicios en Oruro, Bolivia.
            </p>
            <p>
              La plataforma no procesa directamente cobros monetarios bancarios en nombre de los clientes finales; las transacciones, pagos por QR simple/transferencia o pago en efectivo se acuerdan y coordinan directamente entre el cliente y el comercio receptor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">3.</span> Responsabilidades del Comerciante
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-400">
              <li>El comerciante es el único responsable de la veracidad de los precios, fotos, disponibilidad de inventario y calidad de los productos o servicios ofrecidos.</li>
              <li>Queda estrictamente prohibida la publicación de sustancias ilícitas, productos falsificados, armas o material que contravenga las leyes bolivianas.</li>
              <li>El comerciante es responsable de resguardar la confidencialidad de su cuenta y contraseña o acceso OAuth.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">4. Limitación de Responsabilidad</h2>
            <p>
              MercadoVirtual Oruro procura mantener la plataforma disponible las 24 horas del día. No obstante, no se hace responsable por interrupciones atribuibles a cortes de conectividad externa, fallas en la red de WhatsApp o servicios de terceros.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white">5. Contacto</h2>
            <p>
              Para aclaraciones o reclamos relacionados con estos términos:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-300">
              <p><strong>Correo Electrónico:</strong> <span className="text-indigo-400">soporte@mercadovirtual.bo</span></p>
              <p><strong>Ubicación:</strong> Oruro, Bolivia</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
