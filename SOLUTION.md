FILE: docs/map-editing-research.md
```markdown
# Investigación: cómo editan mapas otros proyectos de Argentum Online

> Parte de la issue #2 (modo construcción). Documento de investigación sin dependencias.
>
> Objetivo: documentar cómo edita mapas el resto del ecosistema de Argentum Online para
> no repetir errores ya cometidos y para justificar las decisiones de diseño del modo
> construcción de `openao`.

## Resumen ejecutivo

| Proyecto | Tipo | Lenguaje / Stack | Licencia | Formato de mapa | Edición en vivo / colaborativa |
|---|---|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial (escritorio) | VB6 (Visual Basic 6) | AGPL-3.0 | `.map` binario propietario (capas + tiles + flags) | No |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente web | Vite + TypeScript + React + Pixi.js | Ver sección 5 | JSON / binario propio (ver sección 1) | No (solo render) |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de la comunidad | (varía según fork) | Ver sección 5 | Compatible con el binario oficial | No |

**Conclusión principal:** ninguno de los tres proyectos ofrece edición colaborativa ni
edición en vivo. El editor oficial es la única herramienta de edición real, pero está
atado a VB6, a Windows y a un formato binario propietario. Esto justifica:

1. Mantener nuestro formato JSON (`meta` / `terrain` / `npcs` / `specials`) como formato
   de trabajo, legible y versionable.
2. Implementar un **importador** del formato binario oficial para no perder mapas ya
   creados.
3. No intentar replicar el editor VB6; en su lugar, construir un editor web con
   edición colaborativa (lo que nadie ha hecho).

---

## 1. Formato de mapa

### 1.1 Editor oficial (`ao-org/argentum-online-worldeditor`)

El editor oficial guarda los mapas en un **archivo binario `.map`** con una estructura
aproximada de:

- **Cabecera**: dimensiones (ancho x alto en tiles), versión, flags globales.
- **Capas (layers)**: una o más capas de tiles. Cada capa es una matriz de índices de
  tile (16 bits por tile, típicamente).
- **Flags por tile**: bits que indican bloqueo (walkable / no-walkable), colisión,
  transparencia, etc.
- **Triggers / eventos**: lista de zonas (rectángulos o polígonos) asociadas a
  acciones (teleport, diálogo, spawn, etc.).
- **NPCs / objetos**: lista de entidades posicionadas en el mapa.

> ⚠️ **Nota:** la especificación exacta del binario no está documentada de forma
> oficial. Se ha reconstruido parcialmente por la comunidad a partir del comportamiento
> del editor y de clientes. Ver sección 4 para el estado del import/export.

**Compatibilidad con nuestro formato (`meta` / `terrain` / `npcs` / `specials`):**

| Campo nuestro | Equivalente en el binario oficial | Compatibilidad |
|---|---|---|
| `meta` (nombre, dimensiones, autor) | Cabecera del `.map` | Parcial: el binario no guarda autor ni metadatos ricos |
| `terrain` (matriz de tiles por capa) | Capas de tiles | Sí, mapeable 1:1 |
| `npcs` (lista de entidades) | Lista de NPCs en el binario | Sí, mapeable |
| `specials` (triggers, zonas, eventos) | Triggers / eventos del binario | Parcial: el binario usa zonas rectangulares; nosotros podemos soportar polígonos |

### 1.2 Cliente web (`lambdaclass/argentum`)

- **Stack:** Vite + TypeScript + React + Pixi.js.
- **Rol:** es un **cliente de render**, no un editor. Carga mapas (JSON o binario
  decodificado) y los pinta con Pixi.js.
- **Formato:** consume un JSON con estructura similar a la nuestra (tiles, capas,
  entidades). No define un formato nuevo; depende de un decodificador previo.
- **Compatibilidad:** alta con nuestro formato, ya que ambos son JSON con tiles y
  entidades.

### 1.3 Cliente de la comunidad (`ao-libre/ao-cliente`)

- **Rol:** cliente de la comunidad, generalmente compatible con el binario oficial.
- **Formato:** lee el `.map` binario del editor oficial (o una variante).
- **Compatibilidad:** misma que el editor oficial (sección 1.1).

### Tabla comparativa de formato

| Aspecto | Editor oficial | lambdaclass/argentum | ao-libre/ao-cliente | **openao (nuestro)** |
|---|---|---|---|---|
| Tipo de archivo | Binario `.map` | JSON (o binario decodificado) | Binario `.map` | JSON |
| Capas | Sí (matriz de tiles) | Sí | Sí | Sí (`terrain`) |
| Bloqueo / colisión | Bits por tile | Bits por tile | Bits por tile | Bits por tile en `terrain` |
| Triggers / eventos | Zonas rectangulares | Zonas (varía) | Zonas rectangulares | `specials` (rect + polígono) |
| NPCs | Lista en binario | Lista en JSON | Lista en binario | `npcs` |
| Metadatos ricos | Limitados | Sí (JSON) | Limitados | Sí (`meta`) |
| Legibilidad humana | No | Sí | No | Sí |
| Versionable en Git | No (binario) | Sí | No | Sí |

---

## 2. Modelado de capas, bloqueo y triggers en el editor oficial

### 2.1 Capas

- El editor oficial modela el mapa como **una o más capas de tiles superpuestas**.
- Cada capa es una matriz `ancho x alto` de índices de tile (16 bits).
- Las capas se renderizan en orden (de abajo hacia arriba).
- **Decisión que vale la pena copiar:** separar la capa de terreno de la capa de
  decoración/objetos. Nosotros lo hacemos con `terrain` (terreno) y `specials`
  (objetos decorativos y triggers).

### 2.2 Bloqueo (walkable / no-walkable)

- Cada tile tiene **flags en bits** que indican:
  - Walkable / no-walkable (el jugador puede o no pisar ese tile).
  - Colisión (el tile bloquea el movimiento).
  - Transparencia (el tile no se pinta, deja ver la capa inferior).
- **Decisión que vale la pena copiar:** usar flags por tile en lugar de una capa
  separada de "colisión". Es más compacto y más fácil de editar en un editor visual.
  Nosotros lo implementamos como un campo `flags` (o `blocked`) en cada tile de
  `terrain`.

### 2.3 Triggers / eventos

- El editor oficial modela los triggers como **zonas rectangulares** (x, y, ancho,
  alto) asociadas a una acción.
- Acciones típicas: teleport, diálogo, spawn de NPC, cambio de música, etc.
- **Limitación:** solo zonas rectangulares. No soporta polígonos ni zonas circulares.
- **Decisión que vale la pena mejorar:** nosotros soportamos **rectángulos y
  polígonos** en `specials`, lo que da más flexibilidad sin perder compatibilidad
  (un rectángulo es un polígono de 4 vértices).

### Resumen de decisiones a copiar / mejorar

| Decisión del editor oficial | ¿Copiar? | Justificación |
|---|---|---|
| Capas de tiles superpuestas | ✅ Sí | Estándar del género, fácil de renderizar |
| Flags por tile para bloqueo | ✅ Sí | Compacto, fácil de editar visualmente |
| Triggers como zonas rectangulares | ⚠️ Mejorar | Soportar también polígonos |
| Formato binario | ❌ No | Usar JSON para legibilidad y versionado |
| Editor de escritorio VB6 | ❌ No | Construir editor web colaborativo |

---

## 3. Edición en vivo o colaborativa

### 3.1 ¿Alguno lo intentó?

- **Editor oficial:** No. Es un editor de escritorio local. No hay edición en vivo ni
  colaborativa.
- **lambdaclass/argentum:** No. Es un cliente de render, no un editor.
- **ao-libre/ao-cliente:** No. Es un cliente, no un editor.

### 3.2 ¿Por qué nadie lo hizo?

- **El editor oficial está atado a VB6 y Windows.** VB6 no tiene soporte nativo para
  websockets, CRDTs ni edición colaborativa. Portarlo a una plataforma moderna
  requeriría reescribirlo.
- **El formato binario no es fácil de sincronizar.** Para edición colaborativa se
  necesita un formato que sea fácil de diffear y mergear. El binario no lo permite.
  El JSON sí.
- **No hay incentivo comercial.** El editor oficial es gratuito y suficiente para la
  mayoría de los usuarios. No hay un mercado claro para un editor colaborativo.

### 3.3 Oportunidad para openao

- **Ningún proyecto ofrece edición colaborativa.** Esto es una ventaja competitiva
  clara.
- **Nuestro formato JSON es ideal para edición colaborativa:**
  - Fácil de diffear (Git, CRDTs).
  - Fácil de mergear (estructura jerárquica).
  - Legible por humanos (revisión de cambios).
- **Tecnologías a considerar:**
  - **Yjs** o **Automerge** para CRDTs (edición colaborativa sin servidor central).
  - **WebSockets** para sincronización en tiempo real.
  - **Operational Transform (OT)** como alternativa más simple.

---

## 4. Herramientas de import y export

### 4.1 Estado actual

- **No existe una herramienta oficial de import/export** entre el formato binario del
  editor oficial y otros formatos.
- **La comunidad ha reconstruido parcialmente el formato binario** a partir del
  comportamiento del editor y de clientes. No hay una especificación completa y
  verificada.
- **lambdaclass/argentum** incluye un decodificador del binario oficial a JSON, pero
  no es una herramienta de import/export general.

### 4.2 Oportunidad para openao

- **Implementar un importador del formato binario oficial** sería una ventaja concreta:
  - Los usuarios podrían importar mapas ya creados con el editor oficial.
  - No perderían trabajo previo al migrar a openao.
- **Implementar un exportador a binario** (opcional, de menor prioridad):
  - Permitiría a los usuarios seguir usando el editor oficial para mapas importados.
  - Más complejo, ya que requiere conocer la especificación completa del binario.

### 4.3 Plan de acción

1. **Fase 1:** Reconstruir la especificación del binario oficial (análisis de
   archivos `.map` de ejemplo, comparación con el comportamiento del editor).
2. **Fase 2:** Implementar un importador binario → JSON (`meta` / `terrain` / `npcs` /
   `specials`).
3. **Fase 3 (opcional):** Implementar un exportador JSON → binario.

---

## 5. Licencias

### 5.1 Editor oficial (`ao-org/argentum-online-worldeditor`)

- **Licencia:** AGPL-3.0.
- **Implicaciones:**
  - **Puede reutilizar ideas** (algoritmos, estructuras de datos, decisiones de
    diseño) sin restricciones. Las ideas no están cubiertas por la licencia.
  - **No puede reutilizar código** (VB6) sin cumplir con AGPL-3.0:
    - Si distribuye un programa que incorpora código del editor oficial, debe
      distribuirlo bajo AGPL-3.0.
    - Si ofrece el programa como servicio (SaaS), debe publicar el código fuente
      completo.
  - **Para openao:** no reutilizar código VB6. Reutilizar solo ideas y decisiones de
    diseño. El formato binario no está cubierto por la licencia (los datos no son
    código), pero la implementación del decodificador sí lo estaría si se basa en
    código del editor oficial.

### 5.2 Cliente web (`lambdaclass/argentum`)

- **Licencia:** Verificar en el repo (no especificada en la issue).
- **Implicaciones:**
  - Si es una licencia permisiva (MIT, Apache-2.0), puede reutil