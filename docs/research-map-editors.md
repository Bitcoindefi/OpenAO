# Research: Cómo editan mapas los otros proyectos de Argentum Online

## 1. Introducción y Contexto

Este documento investiga las herramientas, formatos de archivo y paradigmas de edición de mapas en el ecosistema histórico y contemporáneo de Argentum Online (AO). El objetivo es justificar las decisiones arquitectónicas del **modo construcción** de OpenAO, evitar limitaciones históricas y evaluar la compatibilidad de importación/exportación de mapas existentes.

---

## 2. Comparativa de Proyectos y Formatos de Mapa

| Proyecto | Stack / Arquitectura | Formato de Mapa | Licencia | Paradigma de Edición |
| :--- | :--- | :--- | :--- | :--- |
| **`ao-org/argentum-online-worldeditor`** | Visual Basic 6.0 / C++ (DirectX 7/8) | Binario `.map` v1-v3 + `.inf` (100x100 tiles, headers fijos, arrays de structs) | **AGPL-3.0** | Escritorio (offline, monousuario, guardado local en disco) |
| **`lambdaclass/argentum`** | TypeScript + Vite + React + PixiJS / WebGL | JSON estructurado + parser de `.map` binario en cliente | **MIT / Apache-2.0** | Renderizado en navegador; sin editor in-game colaborativo |
| **`ao-libre/ao-cliente`** | C / C++ / SDL2 | Binario `.map` con compresión zlib/gzip | **GPL-3.0** | Cliente tradicional de escritorio; mapas compilados |
| **`OpenAO` (Modo Construcción)** | TypeScript / Node.js / WebSockets / WebGL | Modular (`meta`, `terrain`, `npcs`, `specials`) en JSON / DB | **Open Source** | **In-Game en vivo, multiusuario y en tiempo real vía WebSocket** |

---

## 3. Análisis de Preguntas Clave

### 3.1. ¿Qué formato de mapa usa cada uno y cómo mapea a OpenAO?
- **Editor Oficial (`.map`):**
  - Cabecera: `MapVersion` (Int16).
  - Matriz de `100x100` celdas (`MapData(1..100, 1..100)`), donde cada celda almacena:
    - `Blocked`: 1 bit/byte booleano (traspasable o sólido).
    - `Graphic(1..4)`: 4 enteros `Int16` con el índice del gráfico (GrhIndex) por capa.
    - `Trigger`: Entero `Int16` para comportamiento especial del tile.
    - `NPCIndex` / `OBJIndex`: IDs de NPC o ítems en el suelo.
    - `TileExit`: Struct `{Map, X, Y}` indicando traslados entre mapas.
- **Mapeo a OpenAO (`meta` / `terrain` / `npcs` / `specials`):**
  - `terrain`: Mapea `Graphic(1)` (suelo) y `Graphic(2)` (decoración).
  - `specials`: Mapea `Blocked`, `Trigger`, `TileExit` y capas altas `Graphic(3..4)` (techos y árboles con Y-sorting).
  - `npcs`: Mapea `NPCIndex` y sus spawn coordinates.
  - `meta`: Mapea el nombre de zona, clima, música y flags de seguridad.

### 3.2. ¿Cómo modela el editor oficial las capas, bloqueos y triggers?
- **Capas Gráficas:**
  - **Capa 1 (Suelo):** Base obligatoria continua (pasto, agua, tierra).
  - **Capa 2 (Decoración baja):** Flores, huellas, piedras; renderizadas inmediatamente sobre la capa 1.
  - **Capa 3 (Estructuras / Follaje):** Paredes, troncos, copas de árboles. Requieren cálculo de profundidad en el eje Y (Y-sorting) respecto al personaje.
  - **Capa 4 (Techos / Capa superior):** Techos de casas que se vuelven transparentes cuando el jugador entra al inmueble.
- **Bloqueos:** Matriz booleana rígida. No soporta bloqueos dinámicos condicionales (ej. solo bloquear a monturas o solo a PKs) en el formato estático original.
- **Triggers Numéricos:**
  - `1`: Zona segura / Ciudad (no combate ni caída de ítems).
  - `2`: Zona insegura / Combate libre.
  - `3`: Resurrección automática / Templo.
  - `4`: Anti-drop (no caen objetos al morir).
  - `5`: Disparador de scripts / eventos de mapa.

### 3.3. ¿Alguno intentó edición en vivo o colaborativa?
- **No.** Todos los editores tradicionales (WorldEditor oficial, MapEdit de Alkon, editores de FuriusAO/Tierras del Sur) son aplicaciones monolíticas de escritorio monousuario.
- **Razones del abandono o falta de implementación histórica:**
  1. Arquitectura VB6 atada a archivos locales cerrados (`.map` binario).
  2. Imposibilidad de sincronizar buffers binarios en tiempo real sin servidor dedicado de edición.
  3. Riesgo de inconsistencia de versiones al editar entre varios GMs a la vez.
- **La ventaja de OpenAO:** Al procesar la lógica de mapas en Node.js mediante WebSockets y eventos atómicos (`tile_updated`, `npc_spawned`, `brush_applied`), múltiples constructores pueden editar el mismo mapa en tiempo real con control de permisos y rollback.

### 3.4. ¿Existe herramienta de import/export y vale la pena soportarla?
- **Recomendación: SÍ.**
- Desarrollar un conversor bidireccional simple `.map <-> JSON (OpenAO)` es altamente beneficioso:
  - Permite importar instantáneamente los **más de 300 mapas clásicos de Argentum Online** diseñados durante más de 20 años de historia comunitaria (ciudades icónicas como Ullathorpe, Banderbill, Nix, catacumbas, etc.).
  - Facilita a creadores veteranos de la comunidad utilizar OpenAO sin tener que redibujar todo desde cero.

### 3.5. Licencias y consideraciones legales
- **WorldEditor Oficial:** Licenciado bajo **AGPL-3.0**.
  - *Implicación:* No se debe copiar código fuente C++/VB6 directamente en el backend de OpenAO para evitar la viralidad de la AGPL-3.0.
  - *Compatibilidad:* La especificación del formato binario `.map` (los offsets de bytes de la matriz `100x100`) es interoperabilidad pura y se puede implementar legalmente desde cero mediante un parser TypeScript en `src/importers/classicMapParser.ts`.
- **LambdaClass:** Licenciado bajo **MIT / Apache-2.0** (compatible para reutilización de estructuras de datos y shaders WebGL).

---

## 4. Limitaciones Conocidas y Errores a Evitar en OpenAO

1. **Límite rígido de 100x100:** El formato clásico fijó 10.000 tiles por mapa, lo que obligaba a transiciones de mapa abruptas. OpenAO debe permitir mapas de tamaño dinámico o "infinite chunk streaming".
2. **Falta de capas de iluminación en tiempo real:** Los editores clásicos quemaban luces en texturas estáticas (lightmaps precalculados). OpenAO debe usar shaders WebGL para iluminación dinámica día/noche.
3. **Pérdida de metadata de triggers:** En VB6 los triggers eran solo un entero; si cambiaba la lógica en el servidor, los números quedaban desfasados. OpenAO debe usar triggers descriptivos con identificadores semánticos en JSON.

---

## 5. Conclusión

La hipótesis central del **modo construcción de OpenAO** queda validada: **ningún proyecto de AO ofrece edición in-game multiusuario en navegador**. El enfoque modular de OpenAO (`meta`, `terrain`, `npcs`, `specials`) es superior a los formatos binarios rígidos clásicos, pero incorporar un importador para `.map` clásico ahorrará meses de diseño de niveles a la comunidad.
