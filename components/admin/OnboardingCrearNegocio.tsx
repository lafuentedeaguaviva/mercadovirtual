"use client";

import React, { useState, useTransition } from "react";
import { registrarNegocioParaUsuarioAction } from "@/app/actions/admin";

interface OnboardingCrearNegocioProps {
  userEmail: string;
}

export function OnboardingCrearNegocio({ userEmail }: OnboardingCrearNegocioProps) {
  const [isPending, startTransition] = useTransition();
  const [businessName, setBusinessName] = useState("");
  const [selectedRubro, setSelectedRubro] = useState("comercio_ropa");
  const [customRubro, setCustomRubro] = useState("");
  const [catalogMode, setCatalogMode] = useState<"carrito" | "vitrina">("carrito");
  const [cardShape, setCardShape] = useState<"rounded" | "pill" | "asymmetric" | "sharp">("rounded");
  const [primaryColor, setPrimaryColor] = useState("#0284c7");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Mapeo del rubro específico:
  // - Un restaurante individual es nicho 'comercio' con modo 'carrito' (su propio menú de comida).
  // - Una plaza de comidas multipuesto es nicho 'plaza_comidas'.
  // - Citas / Servicios es 'agenda'.
  // - Bienes raíces / vehículos es 'inmueble'.
  const getMappedNiche = (rubro: string): "comercio" | "plaza_comidas" | "agenda" | "inmueble" => {
    if (rubro === "plaza_multipuesto") return "plaza_comidas";
    if (rubro.startsWith("agenda_")) return "agenda";
    if (rubro.startsWith("inmueble_")) return "inmueble";
    return "comercio";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const niche = getMappedNiche(selectedRubro);
    const rubroLabel = selectedRubro === "otro" ? customRubro : selectedRubro;

    startTransition(async () => {
      const res = await registrarNegocioParaUsuarioAction({
        businessName,
        niche,
        customRubro: rubroLabel,
        catalogMode,
        primaryColor,
        cardShape,
        whatsapp,
        address,
        mapsUrl,
      });

      if (!res.success) {
        setError(res.error || "No se pudo crear el negocio.");
        return;
      }

      // Recargar la página para entrar al dashboard directamente
      window.location.reload();
    });
  };

  return (
    <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-sky-500/25">
          🏪
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          ¡Crea tu Negocio en Oruro!
        </h1>
        <p className="text-sm text-slate-600">
          Hola <strong className="text-slate-800">{userEmail}</strong>. Completa estos datos para activar tu catálogo digital y comenzar tus 15 días de prueba gratis.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre Comercial de tu Tienda / Negocio *
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ej. Calzados Bolívar Oruro, Pollos El Pagador..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tipo / Rubro del Negocio *
            </label>
            <select
              value={selectedRubro}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedRubro(val);
                // Si elige un nicho de agenda o inmueble, sugerir el modo adecuado automáticamente
                if (val.startsWith("inmueble_")) {
                  setCatalogMode("vitrina");
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            >
              <optgroup label="Comercio y Tiendas (Catálogo con Carrito)">
                <option value="comercio_ropa">🛍️ Tienda de Ropa / Moda / Calzados</option>
                <option value="comercio_tecnologia">📱 Tecnología, Celulares & Electrohogar</option>
                <option value="comercio_farmacia">💊 Farmacia / Cuidado Personal</option>
                <option value="comercio_artesanias">🎨 Artesanías, Regalos & Bazar</option>
                <option value="comercio_abarrotes">🛒 Abarrotes, Distribuidora o Ferretería</option>
              </optgroup>
              <optgroup label="Gastronomía & Restaurantes (Menú y Pedidos)">
                <option value="gastro_restaurante">🍔 Restaurante, Cafetería o Hamburguesería</option>
                <option value="gastro_pollos">🍗 Pollos a la Brasa & Broaster</option>
                <option value="gastro_charquekan">🍲 Comida Típica Orureña (Charquekan)</option>
                <option value="gastro_heladeria">🍦 Heladería, Pastelería o Juguería</option>
              </optgroup>
              <optgroup label="Plazas y Patios de Comida (Múltiples Locales)">
                <option value="plaza_multipuesto">🎪 Plaza de Comidas (Patio con múltiples puestos gastronómicos)</option>
              </optgroup>
              <optgroup label="Servicios y Citas Programadas">
                <option value="agenda_dental">🦷 Consultorio Dental o Médico</option>
                <option value="agenda_barberia">✂️ Barbería, Spa o Salón de Belleza</option>
                <option value="agenda_mecanica">🔧 Taller Mecánico, Electrónico o Servicios</option>
                <option value="agenda_profesional">⚖️ Abogados, Consultores o Contadores</option>
              </optgroup>
              <optgroup label="Bienes Raíces y Propiedades (Vitrina)">
                <option value="inmueble_inmobiliaria">🏢 Inmobiliaria, Alquileres o Lotes</option>
                <option value="inmueble_vehiculos">🚗 Concesionaria o Venta de Vehículos</option>
              </optgroup>
              <optgroup label="Otro Rubro no listado">
                <option value="otro">✨ Otro Rubro (Especificar)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              WhatsApp para Pedidos (Bolivia) *
            </label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej. 71234567 o 59171234567"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Si eligió 'Otro Rubro', mostrar campo para que especifique */}
        {selectedRubro === "otro" && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl space-y-1.5">
            <label className="block text-xs font-bold text-sky-900">
              ¿Cuál es tu rubro o actividad específica? *
            </label>
            <input
              type="text"
              required
              value={customRubro}
              onChange={(e) => setCustomRubro(e.target.value)}
              placeholder="Ej. Imprenta y serigrafía, Veterinaria y mascotas, Florería..."
              className="w-full px-3.5 py-2 bg-white border border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[42px]"
            />
            <p className="text-[11px] text-sky-700">
              El superadministrador revisará tu rubro para asignarte una categoría destacada en el directorio de Oruro.
            </p>
          </div>
        )}

        {/* Alternativas de Diseño / Vista del Catálogo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            🎨 Estilo de Vista de tu Catálogo
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="mode_carrito"
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none relative ${
                catalogMode === "carrito"
                  ? "border-sky-500 bg-sky-50/80 shadow-md ring-2 ring-sky-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 opacity-70 hover:opacity-100"
              }`}
            >
              <input
                id="mode_carrito"
                type="radio"
                name="catalog_mode_option"
                value="carrito"
                checked={catalogMode === "carrito"}
                onChange={() => setCatalogMode("carrito")}
                className="sr-only"
              />
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-2xl">🛍️</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                  catalogMode === "carrito"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {catalogMode === "carrito" ? "✓ Seleccionado" : "Clic para activar"}
                </span>
              </div>
              <strong className="text-xs font-black text-slate-900">Tienda con Carrito de Compras</strong>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Ideal para compras de varios productos. Los clientes agregan al carrito y envían la lista completa de pedido con total a WhatsApp.
              </p>
            </label>

            <label
              htmlFor="mode_vitrina"
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none relative ${
                catalogMode === "vitrina"
                  ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 opacity-70 hover:opacity-100"
              }`}
            >
              <input
                id="mode_vitrina"
                type="radio"
                name="catalog_mode_option"
                value="vitrina"
                checked={catalogMode === "vitrina"}
                onChange={() => setCatalogMode("vitrina")}
                className="sr-only"
              />
              <div className="flex items-center justify-between mb-2 w-full">
                <span className="text-2xl">🖼️</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                  catalogMode === "vitrina"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {catalogMode === "vitrina" ? "✓ Seleccionado" : "Clic para activar"}
                </span>
              </div>
              <strong className="text-xs font-black text-slate-900">Vitrina / Consulta Directa</strong>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Fotos grandes y elegantes. El cliente consulta directamente sobre cada artículo o servicio específico con un botón "Preguntar por WhatsApp".
              </p>
            </label>
          </div>
        </div>

        {/* Formas Geométricas de las Tarjetas y Fotos */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            📐 Forma Geométrica de las Tarjetas de Productos
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "rounded", label: "Moderna Curva", desc: "Esquinas suaves", icon: "▢", radius: "rounded-2xl" },
              { id: "pill", label: "Óvalo / Cápsula", desc: "Curvas pronunciadas", icon: "⬭", radius: "rounded-[26px]" },
              { id: "asymmetric", label: "Asimétrica", desc: "Diagonal moderna", icon: "◩", radius: "rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md" },
              { id: "sharp", label: "Minimal Recta", desc: "Bordes limpios", icon: "▭", radius: "rounded-md" },
            ].map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => setCardShape(shape.id as any)}
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  cardShape === shape.id
                    ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20 text-slate-900 font-bold"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className={`w-8 h-8 mx-auto mb-1.5 border-2 border-slate-700 flex items-center justify-center text-xs bg-white ${shape.radius}`}>
                  {shape.icon}
                </div>
                <div className="text-xs font-bold leading-tight">{shape.label}</div>
                <div className="text-[10px] text-slate-500">{shape.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Paletas de Colores de Marca */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            🎨 Color de Identidad de tu Negocio
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { hex: "#0284c7", name: "Azul Altiplano" },
              { hex: "#e11d48", name: "Rojo Pasión" },
              { hex: "#d97706", name: "Oro Minero" },
              { hex: "#059669", name: "Verde Esmeralda" },
              { hex: "#7c3aed", name: "Púrpura Real" },
              { hex: "#0f172a", name: "Negro Carbón" },
            ].map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setPrimaryColor(c.hex)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  primaryColor === c.hex
                    ? "border-slate-900 ring-2 ring-slate-900/20 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: c.hex }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Podrás cambiar y ajustar todos los colores, logos y formas en cualquier momento desde tu panel de administración.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Dirección en Oruro (Texto para el cliente) *
            </label>
            <button
              type="button"
              onClick={() => {
                const query = encodeURIComponent(`${address || businessName || "Plaza 10 de Febrero"}, Oruro, Bolivia`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
              }}
              className="text-[11px] text-sky-600 hover:text-sky-700 font-bold underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>🔍 Buscar esta dirección en Google Maps</span> ↗
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={address}
              onChange={(e) => {
                const val = e.target.value;
                setAddress(val);
                // Si aún no tiene un link personalizado, autogenerar el link de búsqueda de Google Maps
                if (!mapsUrl || mapsUrl.includes("google.com/maps/search")) {
                  const q = encodeURIComponent(`${val}, Oruro, Bolivia`);
                  setMapsUrl(`https://www.google.com/maps/search/?api=1&query=${q}`);
                }
              }}
              placeholder="Ej. Calle Bolívar N° 450 entre 6 de Agosto y Pagador"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Escribe la calle o zona. El sistema preparará automáticamente el punto en el mapa de Oruro.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              📍 Enlace GPS de Google Maps (Generado o Personalizado)
            </label>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1"
              >
                <span>Probar enlace en mapa</span> ↗
              </a>
            )}
          </div>
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="Se genera automáticamente o pega tu enlace exacto de Google Maps (ej. https://maps.app.goo.gl/...)"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px]"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Puedes afinar la ubicación exacta abriendo Google Maps y pegando el enlace de <strong>"Compartir ubicación"</strong> de tu local.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          🎁 <strong>Activación Inmediata:</strong> Te crearemos tu catálogo digital con pedidos por WhatsApp al instante.
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[48px] py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isPending ? (
            <span>Creando catálogo en Oruro...</span>
          ) : (
            <span>🚀 Activar Mi Catálogo y Entrar al Panel</span>
          )}
        </button>
      </form>
    </div>
  );
}
