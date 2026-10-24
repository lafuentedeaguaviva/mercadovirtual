import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad | MercadoVirtual Oruro",
  description: "Conoce cómo recopilamos, protegemos y gestionamos tus datos personales y comerciales en MercadoVirtual Oruro.",
};

export default function PoliticaPrivacidadPage() {
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
        {/* Cabecera */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-8">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Política de Privacidad</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Última actualización: 24 de Octubre de 2026 &bull; MercadoVirtual Oruro, Bolivia
            </p>
          </div>
        </div>

        {/* Contenido Legal */}
        <div className="space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">1.</span> Identidad del Responsable y Alcance
            </h2>
            <p>
              <strong>MercadoVirtual Oruro</strong> (en adelante, &quot;la Plataforma&quot; o &quot;nosotros&quot;) es un servicio digital orientado a la visualización de catálogos phygital, directorios de comercios, reservas de turnos y contacto comercial vía WhatsApp para negocios y clientes en el departamento de Oruro y el Estado Plurinacional de Bolivia.
            </p>
            <p>
              Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y salvaguardamos los datos provistos por visitantes, clientes y comerciantes propietarios.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">2.</span> Datos que Recopilamos
            </h2>
            <p>Recopilamos únicamente la información necesaria para el funcionamiento eficiente del servicio:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Comerciantes y Administradores:</strong> Nombre comercial, correo electrónico, número de WhatsApp para recepción de pedidos, dirección física, logotipo, enlaces de redes sociales y catálogo de productos o servicios.
              </li>
              <li>
                <strong className="text-slate-200">Autenticación de Terceros (Google OAuth):</strong> Si decide iniciar sesión con Google, recibimos únicamente su nombre de perfil, dirección de correo electrónico y fotografía básica autorizada por el protocolo de consentimiento de Google. Nunca solicitamos acceso a sus contraseñas privadas, correos personales ni datos sensibles.
              </li>
              <li>
                <strong className="text-slate-200">Compradores y Clientes:</strong> No es obligatorio crear una cuenta para navegar ni para realizar pedidos. Al generar una orden o reservar un turno, el usuario puede ingresar opcionalmente su nombre, número de mesa o teléfono únicamente para remitir la orden directamente al comerciante vía WhatsApp.
              </li>
              <li>
                <strong className="text-slate-200">Métricas y Analíticas Anónimas:</strong> Conteo de clics en enlaces de WhatsApp, visitas anónimas por comercio y escaneos de códigos QR para fines estadísticos del comerciante.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">3.</span> Finalidad del Tratamiento de los Datos
            </h2>
            <p>Sus datos personales se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
              <li>Crear y gestionar el acceso seguro a los paneles de administración de cada negocio.</li>
              <li>Facilitar la comunicación directa entre compradores y comerciantes vía WhatsApp.</li>
              <li>Generar reportes estadísticos y métricas de desempeño de ventas para los administradores.</li>
              <li>Garantizar la seguridad, prevención de fraudes y disponibilidad técnica de la plataforma.</li>
            </ul>
            <p className="text-xs text-sky-300/80 bg-sky-950/40 p-3 rounded-xl border border-sky-900/50">
              <strong>Nota fundamental:</strong> MercadoVirtual Oruro nunca vende, alquila ni comercializa bases de datos o información personal con terceros o agencias publicitarias externas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">4.</span> Cookies y Almacenamiento Local
            </h2>
            <p>
              Utilizamos cookies técnicas y almacenamiento de sesión esencial para preservar el estado de autenticación (tokens de Supabase) y retener los productos agregados en el carrito de compras local mientras el usuario navega en el catálogo. No empleamos cookies invasivas de seguimiento masivo entre sitios externos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">5.</span> Derechos del Usuario (Acceso, Rectificación y Supresión)
            </h2>
            <p>
              De conformidad con las normativas vigentes sobre protección de datos personales, cualquier usuario o comerciante registrado tiene el derecho de solicitar el acceso, actualización, rectificación o eliminación total de su cuenta y sus datos de nuestro sistema.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, puede ponerse en contacto con nuestro equipo de asistencia técnica a través del canal de soporte indicado a continuación.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white">6. Contacto y Asistencia</h2>
            <p>
              Para cualquier consulta, inquietud sobre privacidad o reporte de soporte respecto a esta política y la plataforma, puede comunicarse a:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-300 space-y-1">
              <p><strong>Plataforma:</strong> MercadoVirtual Oruro</p>
              <p><strong>Ubicación:</strong> Oruro, Estado Plurinacional de Bolivia</p>
              <p><strong>Correo Electrónico de Asistencia:</strong> <span className="text-sky-400">soporte@mercadovirtual.bo</span></p>
              <p><strong>Atención WhatsApp:</strong> Soporte a Emprendedores y Comerciantes Locales</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
