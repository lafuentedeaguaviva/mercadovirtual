---
name: creador-de-habilidades
description: >
  Utiliza esta habilidad cuando el usuario te pida crear una nueva habilidad (skill) 
  o empaquetar un flujo de trabajo. Esta habilidad te guiará paso a paso para crear 
  el directorio de la habilidad, el archivo SKILL.md y cualquier script necesario, 
  asegurando que toda la documentación y la comunicación con el usuario sea en idioma español.
---

# Creador de Habilidades (Skill Creator)

Esta habilidad automatiza y estandariza la creación de nuevas habilidades dentro del espacio de trabajo, comunicándose siempre en español y documentando todo en español.

## Fase 1: Comprensión y Diseño

Antes de crear cualquier archivo, debes tener una conversación interactiva con el usuario para definir la habilidad:

1. **Propósito**: ¿Qué problema resuelve esta habilidad?
2. **Entradas y Salidas**: ¿Qué datos recibe y qué resultados produce?
3. **Tipo de Habilidad**: ¿Es puramente instruccional (solo texto/razonamiento) o requiere código (ej. llamadas a APIs, scripts en Python/PowerShell)?
4. **Nombre**: Sugiere un nombre en formato `kebab-case` (letras minúsculas y guiones, ej. `analista-de-datos`).

*No pases a la siguiente fase sin la aprobación explícita del usuario sobre el nombre y el alcance.*

## Fase 2: Implementación

Una vez aprobado el diseño, procede a crear los archivos en el espacio de trabajo. Por defecto, las habilidades se crean en un directorio `skills/` en la raíz del proyecto.

### Reglas de Creación
- Crea el directorio `skills/{nombre-de-la-habilidad}/`.
- Crea siempre el archivo principal `SKILL.md` dentro de ese directorio.
- Si se necesitan scripts, créalos en `skills/{nombre-de-la-habilidad}/scripts/`.

### Estructura Obligatoria de SKILL.md

```markdown
---
name: {nombre-de-la-habilidad}
description: >-
  {Breve descripción de lo que hace la habilidad. Máximo 1024 caracteres.}
---

# {Título en Español}

## Resumen
{Descripción clara de cuándo y para qué usar esta habilidad.}

## Flujo de Trabajo o Instrucciones
{Pasos numerados que el agente debe seguir al usar esta habilidad.}

## Dependencias (Si aplica)
{Lista de otras habilidades o herramientas requeridas.}

## Ejemplos de Uso
{Muestra cómo el usuario podría invocar esta habilidad.}
```

## Fase 3: Validación

1. Muestra al usuario los archivos creados.
2. Explícale cómo puede invocar la nueva habilidad en futuras conversaciones.
3. Pregunta si desea hacer alguna prueba rápida o si requiere algún ajuste.
