# Investigación: cómo editan mapas los otros proyectos de Argentum Online

> Parte de la issue #2 (modo construcción). Documento de investigación sin dependencias.
>
> **Objetivo:** documentar cómo edita mapas el resto del ecosistema de Argentum Online,
> para no repetir errores que otros ya cometieron y para justificar las decisiones de
> diseño del modo construcción de `openao`.

---

## Resumen ejecutivo

| Pregunta | Respuesta corta |
|---|---|
| ¿Formato compatible con el nuestro (`meta`/`terrain`/`npcs`/`specials`)? | **No.** Ninguno usa nuestro formato. El editor oficial usa un binario propietario (`.map`/`.wld`); los clientes web usan JSON/TS propios. |
| ¿Vale la pena copiar decisiones del editor oficial? | **Sí, en parte:** su modelo de capas (terrain / objects / triggers) y su separación de "bloqueo" por tile es una buena referencia. |
| ¿Alguno intentó edición en vivo / colaborativa? | **No de forma productiva.** Los clientes web son de solo lectura (render). No hay evidencia de edición colaborativa; el editor oficial es local y de escritorio. |
| ¿Herramientas de import/export entre formatos? | **Parciales.** Existen conversores de binario oficial → JSON para uso interno de los clientes web. No hay un conversor oficial multi-formato. |
| ¿Licencia y su impacto? | El editor oficial es **AGPL-3.0** (copyleft fuerte): **no se puede copiar código** a `openao` sin copyleftearlo. Las *ideas* y los *formatos de datos* no están protegidos por copyright, pero el código sí. |

---

## 1. Proyectos revisados

### 1.1 `ao-org/argentum-online-worldeditor`

- **Qué es:** editor de mapas oficial de Argentum Online.
- **Tecnología:** Visual Basic 6 (VB6), aplicación de escritorio (Windows).
- **Licencia:** **AGPL-3.0**.
- **Interfaz:** GUI de escritorio con paleta de tiles, capas y propiedades por tile.
- **Formato de salida:** binario propietario (extensión `.map` / `.wld` según la versión del servidor).

#### Modelo de datos (según documentación y análisis de la comunidad)

El editor oficial modela un mapa como una cuadrícula de tiles con varias capas:

| Capa | Contenido |
|---|---|
| **Terrain** | Tile gráfico del suelo (ID numérico). |
| **Objects / Decorations** | Tiles decorativos superpuestos (árboles, rocas, edificios). |
| **Triggers / Events** | Tiles con comportamiento (puertas, teletransportes, spawns). |
| **Blocking** | Flag por tile: ¿bloquea el movimiento? ¿bloquea la línea de visión? |

Cada tile tiene:
- Un ID de sprite (terrain).
- Un ID de objeto superpuesto (opcional).
- Flags de bloqueo (movimiento / visión).
- Un trigger/evento asociado (opcional).

#### Decisiones de diseño que valen la pena copiar

1. **Separación explícita de capas.** Mantener terrain, objetos y triggers en estructuras separadas facilita la edición y el renderizado por capas.
2. **Bloqueo por tile con flags independientes.** Separar "bloquea movimiento" de "bloquea visión" es más flexible que un único flag.
3. **Triggers como propiedad del tile, no como entidad separada.** Simplifica la edición: el trigger se edita en el mismo lugar donde se pinta el tile.
4. **Paleta de tiles con categorías.** Agrupar tiles por categoría (suelo, agua, decoración, etc.) mejora la usabilidad.

#### Decisiones que NO conviene copiar

1. **VB6 como tecnología.** Obsoleto, sin soporte, difícil de mantener.
2. **Formato binario propietario.** Dificulta la inspección, el diff y la colaboración.
3. **Edición exclusivamente local.** No hay soporte para colaboración ni para edición remota.

---

### 1.2 `lambdaclass/argentum`

- **Qué es:** cliente web de Argentum Online.
- **Tecnología:** Vite + TypeScript + React + Pixi.js.
- **Licencia:** (verificar en el repo; típicamente MIT o similar para proyectos de la comunidad).
- **Interfaz:** navegador, render 2D con Pixi.js.
- **Rol:** **cliente de solo lectura.** No edita mapas; los renderiza.

#### Formato de datos

- Los mapas se cargan como **JSON** o **arrays tipados en TypeScript**.
- Estructura típica:
  