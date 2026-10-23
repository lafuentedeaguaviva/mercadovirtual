# Ideas de Nuevos Nichos y Modelos Multi-Tienda — MercadoVirtual Oruro

Documento de referencia con ideas de expansión estratégica para la plataforma **MercadoVirtual Oruro**, utilizando la arquitectura multi-inquilino jerárquica (Complejos Matrices y Puestos Hijos con catálogos independientes y pedidos/citas directas por WhatsApp).

---

## 1. Galerías Comerciales & Centros de Moda (Modelo *"Shopping / Feria"*)

* **Mercado objetivo en Oruro:** Galería Florida, Mercado Fermín López, Galería Campero, Feria 6 de Agosto.
* **Estructura jerárquica:**
  - **Negocio Padre:** La Galería o Centro Comercial (ej: *Galería Florida Oruro*).
  - **Puestos Hijos:** Locales independientes dentro de la galería (ej: *Tienda 104 - Ropa Deportiva*, *Tienda 210 - Calzados Urbanos*, *Tienda 15 - Bolsos y Carteras*).
* **Mecánica de uso:**
  - Búsqueda unificada en toda la galería (ej. cliente escribe *"tenis blancos talla 38"*).
  - La plataforma le muestra qué locales de esa galería tienen el producto en stock, su precio en Bolivianos y fotos reales.
  - El cliente aparta la prenda con un toque por WhatsApp para recogerla en el local o solicitar envío local.

---

## 2. Patio Constructor & Complejos de Ferreterías (Venta y Acopio)

* **Mercado objetivo en Oruro:** Corredores ferreteros de la Av. del Ejército, corralones y distribuidoras de materiales.
* **Estructura jerárquica:**
  - **Negocio Padre:** El Complejo Constructor o Asociación Ferretera.
  - **Puestos Hijos:** Especialistas por rubro (*Ferretería Pesada: fierro y cemento*, *Acabados y Cerámicas*, *Electricidad e Iluminación*, *Pinturas y Aditivos*).
* **Mecánica de uso:**
  - Carrito multicotizador: el maestro albañil o propietario selecciona materiales de varias ferreterías del complejo.
  - Se genera una cotización unificada desglosada para solicitar despacho conjunto en camión a la obra.

---

## 3. Centro Médico & Policlínico de Especialistas

* **Mercado objetivo en Oruro:** Edificios de consultorios médicos privados (ej: Edificio El Carmen, Galería San Agustín, policlínicos de consulta externa).
* **Estructura jerárquica:**
  - **Negocio Padre:** El Centro Médico o Edificio de Especialidades.
  - **Puestos Hijos:** Consultorios y laboratorios individuales (*Pediatría*, *Traumatología*, *Laboratorio de Análisis Clínicos*, *Ecografías*).
* **Mecánica de uso:**
  - El paciente busca por síntoma o especialidad (ej: *"dolor de muela"*, *"análisis de sangre"*, *"control prenatal"*).
  - Selecciona la fecha y franja horaria en la agenda del especialista.
  - El turno se confirma y se notifica al WhatsApp de recepción del consultorio específico.

---

## 4. Complejo Mecánico & Repuestos (Taller Multimarca)

* **Mercado objetivo en Oruro:** Corredor automotriz de la Av. Villarroel, Circunvalación y talleres de mantenimiento.
* **Estructura jerárquica:**
  - **Negocio Padre:** El Taller Integral o Asociación Mecánica.
  - **Puestos Hijos:** *Puesto de Lubricantes y Filtros*, *Puesto de Frenos y Suspensión*, *Taller de Escaneo Electrónico y Sensores*.
* **Mecánica de uso:**
  - Búsqueda por modelo y año de vehículo (ej: *"Toyota Hilux 2018"* o *"Suzuki Grand Vitara"*).
  - La plataforma lista repuestos compatibles en stock y permite agendar turno para instalación en el mismo recinto.

---

## 5. Urbanización / Condominio Cerrado (Mapa Técnico de Lotes)

* **Mercado objetivo en Oruro:** Proyectos de loteamiento y urbanizaciones cerradas en Vinto, Challapampa, o Doble Vía Oruro-La Paz.
* **Estructura jerárquica:**
  - **Negocio Padre:** Urbanización matriz o Inmobiliaria Desarrolladora.
  - **Puestos Hijos / Sectores:** Fases o manzanos de venta (*Fase 1 - Entrega Inmediata*, *Fase 2 - Preventa a Crédito Directo*).
* **Mecánica de uso:**
  - Filtro por zona, manzano, número de lote, rango de superficie ($m^2$) y precio por metro cuadrado ($Bs/m^2$).
  - Códigos de color de disponibilidad (*Verde = Disponible*, *Amarillo = Reservado*, *Rojo = Vendido*).
  - Botón para anotarse a **Lista de Espera** en caso de que un lote reservado se libere.

---

## 6. Mercado de Productores del Altiplano (Feria Agropecuaria)

* **Mercado objetivo en Oruro:** Productores de hortalizas de Caracollo, quinua real de Salinas, charque y carne de camélidos de Curahuara, quesos de Challapata.
* **Estructura jerárquica:**
  - **Negocio Padre:** Feria o Asociación de Productores Rurales.
  - **Puestos Hijos:** Puesto de cada familia o comunidad productora.
* **Mecánica de uso:**
  - Selector de venta por menor (kilos, amarros) y al por mayor (arrobas, quintales).
  - Calendario de entregas semanales programadas en puntos de acopio de la ciudad de Oruro.

---

*Fecha de registro: 23 de Octubre de 2026*  
*Base técnica: Plataforma Phygital Next.js 15 + Supabase + Tailwind CSS*
