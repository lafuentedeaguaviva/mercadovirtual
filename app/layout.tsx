import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "MercadoVirtual Oruro | Catálogos Phygital & Comercio Local",
    template: "%s | MercadoVirtual Oruro",
  },
  description:
    "Plataforma comercial y catálogos phygital con tótem QR y WhatsApp para negocios y emprendimientos de Oruro, Bolivia.",
  keywords: ["Oruro", "Bolivia", "Catálogos", "Comercio", "WhatsApp", "Phygital", "Plaza de comidas"],
  authors: [{ name: "MercadoVirtual Oruro" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        {/* Skip link de accesibilidad */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 font-bold text-sm"
        >
          Saltar al contenido principal
        </a>

        {/* Encabezado condicional (Se oculta en /admin para dejar una interfaz de gestión limpia y elegante) */}
        <SiteHeader />

        <main id="main-content" className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 py-3 md:py-6 focus:outline-none">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
