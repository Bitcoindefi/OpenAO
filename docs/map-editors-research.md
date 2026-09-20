# Investigación: cómo editan mapas otros proyectos de Argentum Online

> Parte de la issue #2 (modo construcción). Documento de investigación sin dependencias.
>
> Objetivo: documentar cómo edita mapas el resto del ecosistema de Argentum Online para
> no repetir errores ya cometidos y para justificar las decisiones de diseño del modo
> construcción de `openao`.

## Proyectos revisados

| Proyecto | Qué es | Stack | Licencia |
|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial de mapas | VB6, escritorio | AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente web | Vite + TypeScript + React + Pixi.js | (ver sección 5) |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de la comunidad | (varía por rama) | (ver sección 5) |

> **Nota de alcance.** Este documento se basa en la estructura pública de cada repositorio
> y en el conocimiento del formato binario `.map` de Argentum Online. Cuando un dato no
> pueda confirmarse con certeza, se marca explícitamente como *por confirmar* en lugar de
> inventarse.

---

## 1. Formato de mapa por proyecto

### 1.1 Formato de referencia: el `.map` binario de Argentum

El formato nativo del juego (y del editor oficial) es un archivo binario `.map`. Su
estructura general, reconstruida a partir de la comunidad, es:

| Campo | Tipo | Descripción |
|---|---|---|
| `width` | `uint16` | Ancho en tiles |
| `height` | `uint16` | Alto en tiles |
| `terrain[]` | `uint16[]` | Índice de tile de terreno por celda (w*h) |
| `blocking[]` | `uint8[]` | Flag de bloqueo por celda (0/1) |
| `triggers[]` | struct[] | Lista de triggers (posición, tipo, parámetros) |
| `npcs[]` | struct[] | Lista de NPCs (posición, sprite, id) |
| `specials[]` | struct[] | Lista de objetos especiales / decoraciones |

El tamaño de cada struct de `triggers`, `npcs` y `specials` depende de la versión del
cliente y **no está documentado de forma oficial**. Esto es la principal fuente de
incompatibilidad entre herramientas.

### 1.2 Formato de `openao` (nuestro)

`openao` usa un formato **declarativo y legible** (JSON) con cuatro secciones de primer
nivel:

