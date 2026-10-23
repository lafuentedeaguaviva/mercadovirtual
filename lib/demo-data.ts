import type { BusinessDirectoryItem } from "@/components/directorio/types";

export const DEMO_BUSINESSES: BusinessDirectoryItem[] = [
  {
    slug: "tecnologia-hogar-oruro",
    name: "TecnoHogar Electrodomésticos",
    niche: "comercio",
    logo_url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Bolívar esq. 6 de Octubre, Zona Central, Oruro",
    rating_avg: 4.9,
    rating_count: 28,
    description: "Venta de televisores Smart TV, refrigeradores, licuadoras, freidoras de aire y pequeños electrodomésticos con garantía real.",
    theme: { primary_color: "#2563eb" },
  },
  {
    slug: "plaza-oruro-central",
    name: "Plaza Gourmet El Minero",
    niche: "plaza_comidas",
    logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Bolívar entre Pagador y Velasco, Oruro",
    rating_avg: 4.8,
    rating_count: 58,
    description: "Patio gastronómico tradicional con 8 puestos de comida típica: charquekan, api con pastel, silpancho y gastronomía rápida.",
    theme: { primary_color: "#e11d48" },
  },
  {
    slug: "inmobiliaria-altiplano",
    name: "Inmobiliaria y Terrenos del Altiplano",
    niche: "inmueble",
    logo_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Adolfo Mier y Potosí, Edif. El Carmen Of. 2B",
    rating_avg: 4.9,
    rating_count: 15,
    description: "Venta y alquiler de departamentos céntricos, galpones comerciales y lotes con papeles al día en Zona Sud y Zona Este de Oruro.",
    theme: { primary_color: "#0284c7" },
  },
  {
    slug: "dental-san-agustin",
    name: "Centro Odontológico San Agustín",
    niche: "agenda",
    logo_url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80",
    address: "Av. 6 de Agosto esq. Aroma, Galería San Agustín",
    rating_avg: 4.9,
    rating_count: 32,
    description: "Odontología integral, diseño de sonrisa, ortodoncia invisible y urgencias dentales con reserva de turno digital.",
    theme: { primary_color: "#0d9488" },
  },
  {
    slug: "mecanica-el-quirquincho",
    name: "Taller Mecánico El Quirquincho",
    niche: "agenda",
    logo_url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80",
    address: "Av. Circunvalación y Villarroel, Zona Norte, Oruro",
    rating_avg: 4.7,
    rating_count: 19,
    description: "Diagnóstico automotriz computarizado, afinado de motores a inyección, frenos y mantenimiento preventivo.",
    theme: { primary_color: "#4f46e5", category: "taller" },
  },
  {
    slug: "cafe-andino-oruro",
    name: "Café Andino de Altura",
    niche: "comercio",
    logo_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&auto=format&fit=crop&q=80",
    address: "Plaza 10 de Febrero, Calle Presidente Montes",
    rating_avg: 4.8,
    rating_count: 41,
    description: "Café de especialidad de los Yungas tostado en Oruro, repostería artesanal tradicional, pasteles de quinua y chocolate caliente.",
    theme: { primary_color: "#78350f" },
  },
];

export interface FullDemoBusiness {
  id: string;
  slug: string;
  name: string;
  niche: "comercio" | "plaza_comidas" | "agenda" | "inmueble";
  catalog_mode: "carrito" | "vitrina";
  description: string;
  logo_url: string;
  banner_url: string;
  address: string;
  city: string;
  whatsapp: string;
  maps_url: string;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  parent_id: string | null;
  theme: { primary_color: string; category?: string };
  items: Array<{
    id: string;
    business_id: string;
    title: string;
    description: string | null;
    price: number | null;
    image_url: string | null;
    category: string | null;
    status: "disponible" | "agotado" | "vendido";
    sort_order: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  }>;
  childBusinesses?: Array<{
    business: {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      description: string | null;
      whatsapp: string | null;
      niche: "comercio";
      catalog_mode: "carrito";
      theme: { primary_color: string; category?: string };
      rating_avg: number;
      rating_count: number;
      is_active: boolean;
    };
    items: Array<{
      id: string;
      business_id: string;
      title: string;
      description: string | null;
      price: number | null;
      image_url: string | null;
      category: string | null;
      status: "disponible" | "agotado" | "vendido";
      sort_order: number;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>;
  }>;
}

export const FULL_DEMO_CATALOGS: Record<string, FullDemoBusiness> = {
  "tecnologia-hogar-oruro": {
    id: "demo-biz-1",
    slug: "tecnologia-hogar-oruro",
    name: "TecnoHogar Electrodomésticos",
    niche: "comercio",
    catalog_mode: "carrito",
    description: "Venta de televisores Smart TV, refrigeradores, licuadoras, freidoras de aire y pequeños electrodomésticos con garantía real.",
    logo_url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Bolívar esq. 6 de Octubre, Zona Central, Oruro",
    city: "Oruro",
    whatsapp: "59172456789",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.9,
    rating_count: 28,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#2563eb" },
    items: [
      {
        id: "item-101",
        business_id: "demo-biz-1",
        title: "Freidora de Aire Digital 5.5 Litros",
        description: "Panel táctil con 8 programas automáticos, canasta antiadherente libre de BPA y control de temperatura de 80 a 200°C.",
        price: 480,
        image_url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&auto=format&fit=crop&q=80",
        category: "Cocina",
        status: "disponible",
        sort_order: 1,
        metadata: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "item-102",
        business_id: "demo-biz-1",
        title: "Smart TV 50 Pulgadas 4K Ultra HD",
        description: "Resolución 4K, HDR10, asistente por voz, aplicaciones integradas (Netflix, YouTube, Prime Video) y 3 puertos HDMI.",
        price: 2450,
        image_url: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=80",
        category: "Televisores",
        status: "disponible",
        sort_order: 2,
        metadata: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "item-103",
        business_id: "demo-biz-1",
        title: "Licuadora de Alta Potencia con Vaso de Vidrio",
        description: "Motor de 1000W, cuchillas de acero inoxidable de 6 aspas para triturar hielo y selector de 3 velocidades más pulso.",
        price: 260,
        image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80",
        category: "Cocina",
        status: "disponible",
        sort_order: 3,
        metadata: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  "plaza-oruro-central": {
    id: "demo-biz-2",
    slug: "plaza-oruro-central",
    name: "Plaza Gourmet El Minero",
    niche: "plaza_comidas",
    catalog_mode: "carrito",
    description: "Patio gastronómico tradicional con puestos de charquekan, api con pastel, silpancho y comida típica con servicio a mesa digital.",
    logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Bolívar entre Pagador y Velasco, Oruro",
    city: "Oruro",
    whatsapp: "59173456789",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.8,
    rating_count: 58,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#e11d48" },
    items: [],
    childBusinesses: [
      {
        business: {
          id: "child-puesto-1",
          name: "Charquekan Tradicional Doña Bertha",
          slug: "charquekan-dona-bertha",
          logo_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
          description: "El auténtico sabor del charque de llama desmenuzado, mote amarillo, huevo duro, papa imilla y queso criollo frito con llajua.",
          whatsapp: "59171829301",
          niche: "comercio",
          catalog_mode: "carrito",
          theme: { primary_color: "#b91c1c", category: "Comida Típica" },
          rating_avg: 4.9,
          rating_count: 36,
          is_active: true,
        },
        items: [
          {
            id: "charque-1",
            business_id: "child-puesto-1",
            title: "Plato de Charquekan Completo",
            description: "Carne de llama deshidratada frita, huevo, queso criollo dorado, mote tierno y papa con llajua orureña.",
            price: 35,
            image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
            category: "Platos Tradicionales",
            status: "disponible",
            sort_order: 1,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "charque-2",
            business_id: "child-puesto-1",
            title: "Porción Extra de Queso Frito",
            description: "2 láminas gruesas de queso criollo del altiplano doradas en sartén.",
            price: 10,
            image_url: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80",
            category: "Extras",
            status: "disponible",
            sort_order: 2,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
      {
        business: {
          id: "child-puesto-2",
          name: "Api Morado & Pasteles La Ranchería",
          slug: "api-la-rancheria",
          logo_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80",
          description: "Api caliente de maíz morado aromático con canela y clavo, y los tradicionales pasteles inflados con queso derretido.",
          whatsapp: "59178901234",
          niche: "comercio",
          catalog_mode: "carrito",
          theme: { primary_color: "#7e22ce", category: "Cafetería & Desayunos" },
          rating_avg: 4.8,
          rating_count: 22,
          is_active: true,
        },
        items: [
          {
            id: "api-1",
            business_id: "child-puesto-2",
            title: "Vaso de Api Morado Caliente",
            description: "Bebida caliente andina elaborada a base de maíz morado, canela y toque de limón.",
            price: 8,
            image_url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
            category: "Bebidas Andinas",
            status: "disponible",
            sort_order: 1,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "api-2",
            business_id: "child-puesto-2",
            title: "Pastel Frito Gigante con Queso",
            description: "Masa inflada crujiente rellena con abundante queso criollo derretido.",
            price: 10,
            image_url: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80",
            category: "Pastelería",
            status: "disponible",
            sort_order: 2,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
      {
        business: {
          id: "child-puesto-3",
          name: "Hamburguesas & Broaster Sajama",
          slug: "burgers-broaster-sajama",
          logo_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
          description: "Hamburguesas a la parrilla con carne artesanal, papas fritas rústicas y pollo broaster crocante al estilo orureño.",
          whatsapp: "59175678912",
          niche: "comercio",
          catalog_mode: "carrito",
          theme: { primary_color: "#f59e0b", category: "Comida Rápida" },
          rating_avg: 4.7,
          rating_count: 19,
          is_active: true,
        },
        items: [
          {
            id: "burger-1",
            business_id: "child-puesto-3",
            title: "Hamburguesa Doble Sajama con Papas",
            description: "Doble medallón de res a la brasa, queso cheddar fundido, tocino crocante, verduras y porción de papas fritas.",
            price: 28,
            image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
            category: "Hamburguesas",
            status: "disponible",
            sort_order: 1,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "burger-2",
            business_id: "child-puesto-3",
            title: "Porción de Pollo Broaster 3 Piezas",
            description: "Pollo frito extra crujiente con papas fritas, arroz con queso y salsas de la casa.",
            price: 25,
            image_url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80",
            category: "Broaster",
            status: "disponible",
            sort_order: 2,
            metadata: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      },
    ],
  },
  "inmobiliaria-altiplano": {
    id: "demo-biz-3",
    slug: "inmobiliaria-altiplano",
    name: "Inmobiliaria y Terrenos del Altiplano",
    niche: "inmueble",
    catalog_mode: "vitrina",
    description: "Venta y alquiler de departamentos céntricos, galpones comerciales y lotes con papeles al día en Zona Sud y Zona Este de Oruro.",
    logo_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80",
    address: "Calle Adolfo Mier y Potosí, Edif. El Carmen Of. 2B",
    city: "Oruro",
    whatsapp: "59174567890",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.9,
    rating_count: 15,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#0284c7" },
    items: [
      {
        id: "inm-1",
        business_id: "demo-biz-3",
        title: "Lote Urbanizado 300 m² - Zona Sud (Vinto)",
        description: "Terreno plano con agua potable, alcantarillado, luz y papeles registrados en Derechos Reales. A 2 cuadras de la avenida principal.",
        price: 175000,
        image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
        category: "Terrenos & Lotes",
        status: "disponible",
        sort_order: 1,
        metadata: { superficie_m2: 300, zona: "Zona Sud", servicios: "Agua, Luz, Gas" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "inm-2",
        business_id: "demo-biz-3",
        title: "Departamento 3 Dormitorios a Estrenar - Zona Central",
        description: "115 m², suite con vestidor, cocina con cajonería alta/baja, calefón a gas domiciliario y parqueo subterráneo.",
        price: 590000,
        image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80",
        category: "Departamentos",
        status: "disponible",
        sort_order: 2,
        metadata: { superficie_m2: 115, dormitorios: 3, banos: 2 },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  "dental-san-agustin": {
    id: "demo-biz-4",
    slug: "dental-san-agustin",
    name: "Centro Odontológico San Agustín",
    niche: "agenda",
    catalog_mode: "vitrina",
    description: "Odontología integral, diseño de sonrisa, ortodoncia invisible y urgencias dentales con reserva de turno digital.",
    logo_url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80",
    address: "Av. 6 de Agosto esq. Aroma, Galería San Agustín",
    city: "Oruro",
    whatsapp: "59175678901",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.9,
    rating_count: 32,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#0d9488" },
    items: [
      {
        id: "cita-1",
        business_id: "demo-biz-4",
        title: "Limpieza Dental Ultrasonido y Profilaxis",
        description: "Eliminación de sarro, manchas de café/té y aplicación de flúor remineralizante. Duración: 45 min.",
        price: 150,
        image_url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&auto=format&fit=crop&q=80",
        category: "Profilaxis",
        status: "disponible",
        sort_order: 1,
        metadata: { duracion_min: 45 },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "cita-2",
        business_id: "demo-biz-4",
        title: "Evaluación y Diagnóstico con Cámara Intraoral",
        description: "Revisión completa de cavidad bucal, fotografía diagnóstica y plan de tratamiento detallado.",
        price: 50,
        image_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80",
        category: "Diagnóstico",
        status: "disponible",
        sort_order: 2,
        metadata: { duracion_min: 30 },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  "mecanica-el-quirquincho": {
    id: "demo-biz-5",
    slug: "mecanica-el-quirquincho",
    name: "Taller Mecánico El Quirquincho",
    niche: "agenda",
    catalog_mode: "vitrina",
    description: "Diagnóstico automotriz computarizado, afinado de motores a inyección, frenos y mantenimiento preventivo.",
    logo_url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80",
    address: "Av. Circunvalación y Villarroel, Zona Norte, Oruro",
    city: "Oruro",
    whatsapp: "59176789012",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.7,
    rating_count: 19,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#4f46e5", category: "taller" },
    items: [
      {
        id: "taller-1",
        business_id: "demo-biz-5",
        title: "Escaneo Computarizado OBD2 y Diagnóstico",
        description: "Lectura y reseteo de códigos de falla del motor, ABS, airbags y prueba de sensores en tiempo real.",
        price: 80,
        image_url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80",
        category: "Diagnóstico",
        status: "disponible",
        sort_order: 1,
        metadata: { duracion_min: 40 },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  "cafe-andino-oruro": {
    id: "demo-biz-6",
    slug: "cafe-andino-oruro",
    name: "Café Andino de Altura",
    niche: "comercio",
    catalog_mode: "carrito",
    description: "Café de especialidad de los Yungas tostado en Oruro, repostería artesanal tradicional, pasteles de quinua y chocolate caliente.",
    logo_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&auto=format&fit=crop&q=80",
    address: "Plaza 10 de Febrero, Calle Presidente Montes",
    city: "Oruro",
    whatsapp: "59177890123",
    maps_url: "https://maps.google.com/?q=Oruro",
    rating_avg: 4.8,
    rating_count: 41,
    is_active: true,
    parent_id: null,
    theme: { primary_color: "#78350f" },
    items: [
      {
        id: "cafe-1",
        business_id: "demo-biz-6",
        title: "Bolsa de Café de Especialidad 250g (Grano o Molido)",
        description: "Origen Caranavi, tostado medio, notas a chocolate amargo y frutas secas.",
        price: 45,
        image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        category: "Café en Grano",
        status: "disponible",
        sort_order: 1,
        metadata: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
};
