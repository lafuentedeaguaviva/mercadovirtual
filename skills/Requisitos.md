Necesito que me ayudes a construir una plataforma web completa para preparar a maestros bolivianos para el examen de ascenso de categoría. Es una iniciativa privada. La plataforma debe ser inteligente, usar diagnóstico inicial, repetición espaciada con curva del olvido, formatos variados de repaso, y adaptarse al comportamiento del maestro.

A continuación te doy todos los requerimientos detallados. Quiero que me entregues:

1. El código completo de la base de datos (SQL) con todas las tablas y relaciones.
2. El código del backend (API) en el lenguaje que recomiendes
3. El código del frontend (puede ser HTML/CSS/JS simple, pero que sea funcional, amigable y responsive).
4. El algoritmo completo de repetición espaciada con curva del olvido, incluyendo días mínimo y máximo, adaptación al comportamiento, y selección de formatos.

6. Instrucciones claras de instalación y despliegue.

---

## 📋 REQUERIMIENTOS FUNCIONALES

### 1. Registro de maestros (tabla `usuarios`)
- Nombre, apellido, email, celular, departamento, especialidad, categoría actual, escuelas o colegios, nivel educativo, grado
- Plan: gratuito o premium.
- Fecha de registro automática.

### 2. Banco de preguntas (tabla `preguntas`)
Cada pregunta debe tener:
- ID único.
- Área (Legislación, Pedagogía, Didáctica, Evaluación, Psicología, Especialidad).
- Dificultad (básico, intermedio, avanzado).
- Texto de la pregunta.
- 4 opciones (A, B, C, D).
- Respuesta correcta (A, B, C o D).
- Explicación de por qué es correcta.
- Pista para la respuesta
- Fuente (ley, libro, autor).
- Activa (sí/no).

### 3. Diagnóstico inicial
- El maestro responde un número de preguntas por área.
- Se guarda en `simulacros` (tipo = "diagnostico") y `detalle_simulacro`.
- Al terminar, se calcula el dominio por área y se guarda en `progreso_usuario`.
### 4. Simulacros normales
- El maestro puede hacer simulacros con tiempo límite (ej: 90 minutos, 80 preguntas).
- Se guardan en `simulacros` (tipo = "simulacro").
- No afectan `progreso_usuario` (a menos que se configure).

### 5. Repasos programados (plan de estudio)
- Tabla `plan_estudio` con: ID, usuario_id, área, formato, fecha_programada, fecha_completado, completado, dominio_inicial, dominio_final.
- Tabla `parametros_olvido` con reglas de días de espera según dominio.

### 6. Algoritmo de repetición espaciada (curva del olvido)
- Días mínimo entre repasos: 1 día.
- Días máximo:20 días o hasta la fecha del examen (lo que sea menor).
- Fórmula: Días ideales = Días_base × Multiplicador_repasos × Ajuste_comportamiento.
- Días_base según dominio actual (ej: 40% → 1 día, 80% → 14 días).
- Multiplicador_repasos según número de repasos exitosos (ej: 0-2 → ×1.0, 3-5 → ×1.3).
- Ajuste_comportamiento según si el maestro ignora o repasa voluntariamente (ej: ignora → ×0.7, repasa más → ×1.3).

### 7. Formatos de repaso 
- Preguntas tipo examen.
- Audio + preguntas (MP3 de 3-5 minutos).
- Sopa de letras con términos clave.
- Diapositivas (flashcards).
- Lectura corta + pregunta abierta.
- Video corto con explicacion del tema
- Podcast
- Examen corto
- Y otros recursos que pueda elegir cual estudiar
- El Pdf

### 8. Menú diario (libertad guiada)
- Mostrar hasta 3 áreas sugeridas con prioridad: crítica (rojo), recomendada (amarillo), opcional (verde).
- El maestro puede elegir cuál hacer o ignorar.
- Si ignora, el algoritmo reprograma con mayor prioridad.
- Sección de "práctica libre" donde el maestro elige área y formato.

### 9. Radar de dominio (visualización)
- Gráfico tipo telaraña con todas las áreas.
- Mostrar nivel actual y evolución (línea de diagnóstico anterior).

### 10. Pregunta diaria por WhatsApp
- Tabla `preguntas_diarias` con: ID, pregunta_id, fecha_asignacion, veces_enviada.
- Script automático que envía una pregunta por WhatsApp cada día.

---

## 🗃️ ESTRUCTURA DE BASE DE DATOS (SQL)

Necesito las tablas con estos campos y relaciones:

1. `usuarios` (id, nombre, apellido, email, ci, departamento, especialidad, categoria_actual, plan, fecha_registro)
2. `preguntas` (id, area, dificultad, texto, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, fuente, anio_referencia, activa)
3. `simulacros` (id, usuario_id, fecha_inicio, tipo, total_preguntas, tiempo_limite, tiempo_usado, puntaje_obtenido, porcentaje, aprobado)
4. `detalle_simulacro` (id, simulacro_id, pregunta_id, respuesta_elegida, es_correcta)
5. `progreso_usuario` (id, usuario_id, area, preguntas_intentadas, preguntas_acertadas, porcentaje_acierto, ultima_actualizacion)
6. `plan_estudio` (id, usuario_id, area, formato, fecha_programada, fecha_completado, completado, dominio_inicial, dominio_final, origen)
7. `parametros_olvido` (id, rango_min, rango_max, dias_espera, nombre_rango)
8. `preguntas_diarias` (id, pregunta_id, fecha_asignacion, veces_enviada)
9. `repasos_ignorados` (id, usuario_id, plan_estudio_id, fecha_programada, fecha_ignorado, veces_reprogramado)

Relaciones:
- `simulacros.usuario_id` → `usuarios.id`
- `detalle_simulacro.simulacro_id` → `simulacros.id`
- `detalle_simulacro.pregunta_id` → `preguntas.id`
- `progreso_usuario.usuario_id` → `usuarios.id`
- `plan_estudio.usuario_id` → `usuarios.id`
- `repasos_ignorados.usuario_id` → `usuarios.id`
- `repasos_ignorados.plan_estudio_id` → `plan_estudio.id`
- `preguntas_diarias.pregunta_id` → `preguntas.id`

---

## 🔄 FLUJOS COMPLETOS QUE DEBE TENER EL SISTEMA

### Flujo 1: Registro → Diagnóstico → Plan de estudio
1. El maestro se registra.
2. Hace diagnóstico de preguntas.
3. Se calcula dominio por área.
4. Se programan repasos iniciales según nivel.

### Flujo 2: Repaso diario (menú)
1. El maestro abre la plataforma.
2. Ve menú con áreas críticas, recomendadas y opcionales.
3. Elige una o más.
4. Al completar, se actualiza dominio y se programa próximo repaso.
5. Si ignora, se registra en `repasos_ignorados` y se reprograma con mayor prioridad.

### Flujo 3: Simulacro normal
1. El maestro elige "simulacro".
2. Selecciona número de preguntas y tiempo.
3. Responde y al final ve puntaje y explicaciones.
4. No afecta `progreso_usuario` (solo histórico).

### Flujo 4: Radar y progreso
1. El maestro ve gráfico de radar con todas las áreas.
2. Puede comparar con diagnóstico anterior.
3. Los datos vienen de `progreso_usuario`.

Pudes sugerir otras

## ⚙️ TECNOLOGÍA SUGERIDA (pero puedes recomendar otra)

- Backend: 
- Frontend: 
- Base de datos: PostgreSQL, supabase.
-
---

## 📝 ENTREGABLES QUE ESPERO

1. **Script SQL completo** con todas las tablas, relaciones, e índices.
2. **Código backend** con todas las rutas/endpoints:
   - Registro de usuario.
   - Crear diagnóstico (seleccionar preguntas).
   - Guardar respuestas (una por una o al final).
   - Finalizar diagnóstico (calcular dominio, actualizar progreso, programar repasos).
   - Obtener menú diario.
   - Completar repaso (actualizar dominio, programar siguiente).
   - Obtener radar de progreso.
   - Crear simulacro normal.
   - Obtener historial.
   - Cargar preguntas (admin).
   - Script para pregunta diaria por WhatsApp.
3. **Código frontend** (páginas):
   - Registro / Login.
   - Dashboard con menú diario y radar.
   - Página de examen (diagnóstico o simulacro).
   - Página de práctica libre.
   - Historial de simulacros.
   - Perfil del maestro.
   - Panel de administrador para cargar preguntas.
4. **Algoritmo completo** de repetición espaciada en el backend (con las reglas de mínimo, máximo, adaptación, y rotación de formatos).
5. **Script de carga** con 50 preguntas de ejemplo (basadas en Ley 070, Pedagogía, Evaluación, etc.).
6. **Instrucciones de instalación y despliegue** (paso a paso).

---


---

## 🎯 OBJETIVO FINAL

Quiero un sistema funcional que:
- Diagnostique el nivel del maestro.
- Programe repasos inteligentes para que no olvide.
- Ofrezca formatos variados para mantener el interés.
- Se adapte al comportamiento del maestro (si repasa mucho, espacia más; si ignora, insiste).
- Permita simulacros para entrenar como el examen real.
- Muestre el progreso claramente (radar y estadísticas).
- Envíe preguntas diarias por WhatsApp para mantener el hábito.

Estoy listo para recibir el código completo, las instrucciones y cualquier recomendación adicional que tengas.

## Usuarios
1. Usuario normal (maestro): puede hacer todo menos cargar preguntas.
2. Administrador (admin): puede hacer todo, incluyendo cargar preguntas y ver estadísticas de todos los usuarios.
## Plan de Estudio
Debe poder Llenarse la materia y una materia tiene sub materias y estas a su vez sub materias
es decir se apunta a la misma como por ejemplo:
- Areas de la Educacion Superior
  - Areas de la Educacion Superior 1
    - Areas de la Educacion Superior 1.1
    - Areas de la Educacion Superior 1.2
  - Areas de la Educacion Superior 2
    - Areas de la Educacion Superior 2.1
    - Areas de la Educacion Superior 2.2
  - Areas de la Educacion Superior 3
    - Areas de la Educacion Superior 3.1
    - Areas de la Educacion Superior 3.2
Algo asi
## Preguntas
1. Debe estar associado a una Plan de estudios

Tambien un diccionario de conceptos que este organizado por el plan de estudios osea temas y subtemas, seria bien que haya una opcion como explicado con detalle algo asi

Tambien seria bien un chat de consulta que minimice y si es posible responda preguntas puntuales sobre el tema que se esta estudiando por ejemplo si el maestro tiene una duda sobre una pregunta o un tema en especifico el chat responda y si no puede que recomiende un video, un podcast o un articulo sobre el tema., que responda pero mejor si no usa mucha ia que optimice tokens

