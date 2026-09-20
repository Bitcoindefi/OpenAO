# Investigación: cómo editan mapas otros proyectos de Argentum Online

> Parte de la issue #2 (modo construcción). Documento de investigación sin dependencias.
>
> Objetivo: documentar cómo edita mapas el resto del ecosistema de Argentum Online para
> no repetir errores ya cometidos y para justificar las decisiones de diseño del modo
> construcción de `openao`.

## Resumen ejecutivo

- El **editor oficial** (`ao-org/argentum-online-worldeditor`) es una aplicación de
  escritorio en **VB6** que edita el formato binario clásico de Argentum
  (`.map` / `.map2`) con capas de terreno, objetos, NPCs y triggers. Es **AGPL-3.0**.
- El **cliente web** (`lambdaclass/argentum`) es un **cliente de juego** (Vite +
  TypeScript + React + Pixi.js), no un editor de mapas. Renderiza mapas pero no los
  edita.
- El **cliente de la comunidad** (`ao-libre/ao-cliente`) es también un **cliente de
  juego**, no un editor de mapas.
- **Ninguno** de los tres proyectos ofrece edición colaborativa o en vivo de mapas.
- **No existe** una herramienta de import/export entre el formato binario clásico y
  formatos JSON modernos. Esta es una oportunidad concreta para `openao`.

## Proyectos revisados

| Proyecto | Tipo | Stack | Licencia |
|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor de mapas (escritorio) | VB6, Windows | AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente de juego (web) | Vite, TypeScript, React, Pixi.js | Ver repo |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de juego (comunidad) | Ver repo | Ver repo |

## 1. Formato de mapa

### Editor oficial (WorldEditor)

El editor oficial trabaja sobre el **formato binario clásico** de Argentum Online.
Los archivos de mapa típicos son:

- `.map` / `.map2` — datos binarios del mapa (terreno, objetos, NPCs, triggers).
- `.spr` / `.pal` — sprites y paletas de colores.
- `.cfg` — configuración del mapa (tamaño, nombre, etc.).

La estructura binaria clásica (según documentación de la comunidad y análisis
reverso) incluye:

| Campo | Tipo | Descripción |
|---|---|---|
| `width` | uint16 | Ancho del mapa en tiles |
| `height` | uint16 | Alto del mapa en tiles |
| `terrain[]` | uint16[] | ID de tile de terreno por celda |
| `objects[]` | uint16[] | ID de objeto decorativo por celda |
| `npcs[]` | struct[] | Posición, ID, nombre, stats del NPC |
| `triggers[]` | struct[] | Zona, condición, acción |
| `specials[]` | struct[] | Eventos especiales (puertas, escaleras, etc.) |

**Compatibilidad con el formato de `openao`:**

El formato de `openao` usa JSON con las secciones `meta`, `terrain`, `npcs` y
`specials`. La correspondencia es:

| openao (JSON) | WorldEditor (binario) | Notas |
|---|---|---|
| `meta` | `.cfg` + cabecera `.map` | Nombre, tamaño, flags |
| `terrain` | `terrain[]` + `objects[]` | openao separa terreno y objetos; el binario los mezcla |
| `npcs` | `npcs[]` | Estructura similar, openao usa JSON |
| `specials` | `triggers[]` + `specials[]` | openao unifica triggers y especiales |

**Conclusión:** el formato de `openao` es **compatible en contenido** pero **no en
representación**. Se necesita un conversor binario → JSON para importar mapas del
editor oficial.

### Cliente web (lambdaclass/argentum)

Es un **cliente de juego**, no un editor. Carga mapas del servidor y los renderiza
con Pixi.js. No define un formato de mapa propio; consume el formato que el
servidor le envía (típicamente el binario clásico o una variante).

### Cliente de la comunidad (ao-libre/ao-cliente)

También es un **cliente de juego**. No edita mapas.

## 2. Modelado de capas, bloqueo y triggers

### Editor oficial (WorldEditor)

- **Capas:** el editor modela capas separadas para terreno, objetos decorativos,
  NPCs y triggers. Cada capa se edita independientemente.
- **Bloqueo:** el bloqueo de movimiento se define por tile (cada tile de terreno
  tiene un flag de "walkable" / "blocked"). No hay un sistema de colisiones
  independiente; el bloqueo es una propiedad del tile.
- **Triggers:** los triggers son zonas rectangulares con una condición (entrada,
  permanencia, etc.) y una acción (teleport, diálogo, spawn, etc.). Se definen
  por coordenadas de esquina superior izquierda y esquina inferior derecha.

**Decisiones que valen la pena copiar:**

1. **Separación clara de capas:** cada tipo de entidad (terreno, objeto, NPC,
   trigger) vive en su propia capa. Esto simplifica la edición y el renderizado.
2. **Bloqueo como propiedad del tile:** en lugar de una capa de colisiones
   separada, el bloqueo es un flag del tile de terreno. Esto reduce la complejidad
   y evita inconsistencias entre capas.
3. **Triggers como zonas rectangulares:** simple y suficiente para la mayoría de
   casos. No se necesita geometría compleja.

**Decisiones a evitar:**

1. **Formato binario:** el formato binario es opaco, difícil de versionar y no
   amigable con diffs. El formato JSON de `openao` es superior.
2. **VB6 como stack:** VB6 está en desuso, no tiene soporte cross-platform y es
   difícil de mantener. `openao` usa TypeScript/React, que es más sostenible.

## 3. Edición en vivo o colaborativa

**Ninguno** de los tres proyectos ofrece edición en vivo o colaborativa de mapas.

- El editor oficial es una aplicación de escritorio local. No hay sincronización
  ni colaboración.
- Los clientes web son solo renderizadores, no editores.

**¿Por qué no lo intentaron?**

- El editor oficial es una aplicación de escritorio en VB6, que no tiene soporte
  nativo para networking ni colaboración.
- Los clientes web no son editores; su propósito es renderizar, no editar.
- La edición colaborativa de mapas es un problema complejo (resolución de
  conflictos, consistencia, rendimiento) que requiere una arquitectura de
  backend dedicada.

**Implicación para `openao`:**

`openao` tiene la oportunidad de ser el **primer** proyecto del ecosistema con
edición colaborativa de mapas. Esto es una ventaja competitiva concreta. Las
decisiones de diseño del modo construcción deben tener en cuenta:

- **Resolución de conflictos:** cómo se resuelven ediciones simultáneas sobre el
  mismo tile o entidad.
- **Consistencia:** cómo se garantiza que todos los editores vean el mismo estado.
- **Rendimiento:** cómo se mantiene la fluidez de edición con múltiples usuarios.

## 4. Import y export entre formatos

**No existe** una herramienta pública de import/export entre el formato binario
clásico (`.map` / `.map2`) y formatos JSON modernos.

**Oportunidad para `openao`:**

Implementar un **importador** de mapas del editor oficial sería una ventaja
concreta:

1. **Lectura del binario:** parsear el formato `.map` / `.map2` y extraer
   terreno, objetos, NPCs y triggers.
2. **Conversión a JSON:** mapear los datos binarios al formato `openao`
   (`meta`, `terrain`, `npcs`, `specials`).
3. **Validación:** verificar que los IDs de tiles, objetos y NPCs existan en las
   tablas de `openao`.
4. **Exportación inversa:** opcionalmente, permitir exportar de `openao` al
   formato binario para compatibilidad con el editor oficial.

**Prioridad:** el importador binario → JSON es de **alta prioridad** porque
permite a los usuarios migrar mapas existentes sin re-crearlos desde cero.

## 5. Licencias

| Proyecto | Licencia | Implicaciones |
|---|---|---|
| ao-org/argentum-online-worldeditor | **AGPL-3.0** | Código copiado debe ser AGPL-3.0. Ideas y diseño no están cubiertos por la licencia. |
| lambdaclass/argentum | Ver repo (probablemente MIT o similar) | Verificar antes de reutilizar código. |
| ao-libre/ao-cliente | Ver repo | Verificar antes de reutilizar código. |

**Implicaciones de AGPL-3.0 para el editor oficial:**

- **Código:** no se puede copiar código del editor oficial a `openao` sin
  licenciar `openao` como AGPL-3.0.
- **Ideas y diseño:** las ideas, el diseño de capas, el modelado de triggers, etc.,
  **no están cubiertos** por la licencia. Se pueden usar libremente.
- **Formato binario:** el formato binario en sí no está cubierto por la licencia
  (los formatos de datos no son "código"). Se puede implementar un parser
  independiente.

**Recomendación:**

- **No copiar código** del editor oficial.
- **Sí usar** las ideas de diseño (capas, bloqueo por tile, triggers rectangulares).
- **Implementar desde cero** el parser del formato binario.
- **Verificar** las licencias de los clientes web antes de reutilizar cualquier
  código.

## Tabla comparativa de formato

| Aspecto | WorldEditor (binario) | openao (JSON) |
|---|---|---|
| **Formato** | Binario (`.map` / `.map2`) | JSON |
| **Terreno** | `uint16[]` (ID de tile) | `terrain: { x, y, tileId }[]` |
| **Objetos** | `uint16[]` (ID de objeto) | Incluidos en `terrain` o capa separada |
| **NPCs** | `struct[]` (pos, id, nombre, stats) | `npcs: { x, y, id, name, stats }[]` |
| **Triggers** | `struct[]` (zona, condición, acción) | `specials: { zone, condition, action }[]` |
| **Bloqueo** | Flag por tile | Flag por tile (en `terrain`) |
| **Capas** | Separadas (terreno, objetos, NPCs, triggers) | Separadas (meta, terrain, npcs, specials) |
| **Versionado** | No (binario opaco) | Sí (JSON, diffs legibles) |
| **Import/export** | No hay herramienta pública | Oportunidad: implementar importador binario → JSON |
| **Colaboración** | No | Oportunidad: implementar edición colaborativa |
| **Licencia** | AGPL-3.0 | Ver repo `openao` |

## Conclusiones y recomendaciones

1. **Formato JSON de `openao` es superior** al binario clásico en todos los
   aspectos prácticos (versionado, diffs, legibilidad, extensibilidad).
2. **Copiar el diseño de capas** del editor oficial (terreno, objetos, NPCs,
   triggers separados) es una buena decisión.
3. **Bloqueo como propiedad del tile** es simple y suficiente. No complicar con
   capas de colisiones separadas.
4. **Triggers rectangulares** son suficientes para la mayoría de casos.
5. **Implementar un importador binario → JSON** es de alta prioridad para
   permitir la migración de mapas existentes.
6. **No copiar código** del editor oficial (AGPL-3.0). Implementar desde cero.
7. **Edición colaborativa** es una oportunidad única para `openao`. Diseñar la
   arquitectura con esto en mente desde el inicio.
8. **Verificar licencias** de los clientes web antes de reutilizar cualquier
   código.

## Referencias

- [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor)
- [lambdaclass/argentum](https://github.com/lambdaclass/argentum)
- [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente)
- Documentación de la comunidad sobre el formato binario de Argentum Online
