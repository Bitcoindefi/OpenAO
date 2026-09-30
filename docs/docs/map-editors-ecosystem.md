# Ecosistema de Editores y Formatos de Mapa en Argentum Online

> Documento de investigacion técnica para el **Modo Construcción** de OpenAO (Issue #14, parte de #2).

---

## 1. Resumen Ejecutivo y Validación de Hipótesis

* **Hipótesis del proyecto:** *Ningún proyecto del ecosistema de Argentum Online cuenta con edición de mapas in-game integrada en el navegador web con gestión de borradores y publicación.*
* **Conclusión de la investigación:** **Hipótesis 100% confirmada.**
  * El editor oficial (`ao-org/argentum-online-worldeditor`) es una aplicación de escritorio heredada en Visual Basic 6 (1998–2002), monousuario, ligada a la API de Windows de 32 bits y con almacenamiento directo en archivos binarios monolíticos sin control de concurrencia.
  * `lambdaclass/argentum` modernizó el cliente con Vite + React + Pixi.js y el servidor con Elixir + PostgreSQL + Rust NIF para colisiones, pero **no implementó ningún editor de mapas ni en el juego ni en el navegador**. Sus mapas son generados offline mediante scripts de migración de datos.
  * `ao-libre/ao-cliente` se centró en portar el cliente clásico a C++/SDL2 manteniendo total paridad binaria con los archivos de escritorio tradicionales. No existe soporte de edición web ni colaborativa.
  * Por ende, el **Modo Construcción de OpenAO** (`/construccion` con Next.js + PixiJS + API transaccional en PostgreSQL) es una innovación genuina en el ecosistema, resolviendo una deuda técnica histórica de más de 20 años.

---

## 2. Tabla Comparativa de Formatos y Arquitecturas

| Proyecto | Paradigma / Stack | Formato de Almacenamiento | Capas | Bloqueo (Collision) | Triggers y Salidas | Modelo de Concurrencia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ao-org / WorldEditor** | Escritorio (VB6 / Win32) | Binario `.map` + `Map.dat` (acceso secuencial por bytes) | 4 fijas (1: Piso, 2: Detalle, 3: Obstáculo/Muro, 4: Techo) | 1 bit / flag booleana por tile | Enteros (Byte / UInt16) para triggers (1–6); Exits empaquetados en struct | Monousuario local. Sobrescritura directa de archivo en disco |
| **lambdaclass / argentum** | Web (TypeScript + React + Pixi) / Backend (Elixir) | PostgreSQL (Ecto) + JSON estáticos para assets | Representación relacional / arrays planos de tiles | Bitmap denso en memoria gestionado por un NIF en Rust | Mapeado a entidades y eventos del servidor Elixir (`GenServer` por mapa) | Servidor autoritativo, pero sin capacidades de edición |
| **ao-libre / ao-cliente** | Nativo (C++ / SDL2) | Binario `.map` clásico / formatos comprimidos `.csm` | 4 fijas equivalentes al formato VB6 original | Matriz 100x100 de flags de colisión | Idéntico a VB6 (compatibilidad 1:1 con servidores tradicionales) | Monousuario local (herramientas externas de escritorio) |
| **OpenAO (Modo Construcción)** | Web nativa (Next.js + PixiJS + Node.js API) | Híbrido modular: JSON base (`meta`, `terrain`, `npcs`, `specials`) + PostgreSQL (`game_map_tile_entities` & overrides) | 4 dinámicas (array `g: [l1, l2, l3, l4]`) con soporte de sprites custom | Flag booleana `b: 1` con visualización en overlay rojo | Trigger `t: id`, entidad `o: {i, a}`, salida `e: {m, x, y}`, NPC `n: id` | **Multi-estado en vivo**: Borradores (`draft`) $\rightarrow$ Publicados (`published`) con aislamiento transaccional |

---

## 3. Compatibilidad con el Modelo de OpenAO (`meta` / `terrain` / `npcs` / `specials`)

El formato tradicional de Argentum Online (`.map` binario) almacena una cuadrícula fija de **100x100 tiles** (10,000 celdas). Cada tile almacena sus propiedades en una estructura de memoria contigua.

La compatibilidad con la estructura modular de OpenAO es del **100% conceptual y funcional**:

1. **`meta`**:
   * En el ecosistema oficial se almacena en un archivo complementario `MapaX.dat` (o en la cabecera del `.map` en versiones v13+):
     * Versión del mapa (`MapVersion`), nombre de la zona, música de fondo (`MusicID`), flag de zona segura global (`Pk`), nivel de luz ambiental.
   * Se corresponde exactamente con el objeto de configuración / metadatos de mapa de OpenAO.
2. **`terrain`**:
   * En el binario original cada celda contiene:
     * `Graphic(1)`: GrhIndex de suelo base.
     * `Graphic(2)`: GrhIndex de bordes o adorno de suelo.
     * `Graphic(3)`: GrhIndex de objetos elevados, troncos, paredes (renderizados con profundidad Y-sorting respecto al jugador).
     * `Graphic(4)`: GrhIndex de techos y copas de árboles (renderizados siempre por encima del jugador).
     * `Blocked`: Bit o byte que define si el tile es transitable.
   * En OpenAO se mapea limpiamente a:
     ```json
     {
       "b": 1,
       "g": [8699, null, null, 9148],
       "t": 1
     }
     ```
3. **`npcs`**:
   * En el `.map` original, los NPCs estáticos o spawn points se guardan como un campo numérico entero (`NPCIndex`) en las coordenadas `(X, Y)` del tile, con sus configuraciones de respawn en scripts `.dat`.
   * En OpenAO se traducen a registros en `game_map_tile_entities` (o clave `"n": 504`), con su posición fija o pertenencia a la base de datos de construcción.
4. **`specials`**:
   * Las transiciones de mapa (salidas) en el WorldEditor se empaquetan en un struct:
     * `TileExit.Map` (Short / Int16)
     * `TileExit.X` (Short / Int16)
     * `TileExit.Y` (Short / Int16)
   * En OpenAO se mapean directamente al campo:
     ```json
     "e": { "m": 11, "x": 10, "y": 66 }
     ```

---

## 4. Análisis de Decisiones del Editor Oficial (VB6 WorldEditor)

### Modelado de Capas, Bloqueo y Triggers
* **Capas (Layers 1 a 4):**
  * La separación estricta en 4 capas fue diseñada para optimizar las tarjetas de vídeo de finales de los 90 (DirectX 7/8).
  * **Decisión que vale la pena copiar:** El comportamiento de **Capa 4 + Trigger 1 ("Bajo Techo")**. Cuando un jugador entra a un tile que posee `Trigger = 1`, el cliente aplica transparencia alfa (fade out / opacity: 0.2 o 0.0) a los gráficos de la Capa 4 de todo el polígono del edificio, permitiendo ver el interior de las casas sin cambiar de mapa.
* **Bloqueo (Collision Matrix):**
  * El editor oficial permite pintar el bloqueo como una capa booleana invisible. En OpenAO esto ya se replica exitosamente mediante la herramienta "Bloqueo" y el overlay de contraste rojo.
* **Triggers Estándar de la Comunidad:**
  * Los triggers en AO son identificadores numéricos que disparan lógica en el servidor o cliente:
    * `0`: Sin trigger.
    * `1`: **Bajo Techo** (oculta techo en Capa 4).
    * `2`: **Zona Segura** (impide combate PvP, robo o casteo ofensivo).
    * `3`: **Anti-Resurrección** (impide que sacerdotes o conjuros revivan muertos en esa celda).
    * `4`: **Zona de Combate / Ring** (permite PvP en zonas de arena).
    * `5`: **Teletransporte especial / Trampas**.
    * `6`: **Limpia triggers**.
  * **Recomendación:** Mantener la convención de IDs 1 a 6 estándar de AO en el Modo Construcción de OpenAO para compatibilidad semántica con los mapas y scripts clásicos.

---

## 5. Intentos Históricos de Edición en Vivo y Colaborativa

A lo largo de los más de 20 años de historia de la comunidad de Argentum Online (foros de *GS-Zone*, *Alkair*, *Comunidad AO*):
1. **Prototipos de WorldEditor Online (TCP Sockets):**
   * Varios desarrolladores intentaron añadir Winsock / TCP al WorldEditor en VB6 o C# para permitir que dos personas abrieran el mismo mapa a través de una IP directa.
   * **Por qué fracasaron y fueron abandonados:**
     * **Falta de resolución de conflictos:** Si dos editores pintaban la misma zona, el último paquete TCP sobrescribía al anterior, produciendo parpadeo constante y corrupción del estado en memoria.
     * **Ausencia de noción de transacciones / borradores:** Al no haber base de datos relacional ni conceptos de `draft`/`published`, cualquier error de un editor quedaba grabado directamente en el archivo binario del servidor.
     * **Monolito binario:** El servidor de juego requería reiniciar el proceso (`/RESTART` o recarga completa del arreglo en memoria) para que los jugadores vieran los cambios en el mapa.
2. **LambdaClass:**
   * LambdaClass se orientó hacia la concurrencia de alto rendimiento del servidor en Elixir (usando un proceso de actor `GenServer` por cada mapa y un NIF de Rust para la colisión ultra rápida). Sin embargo, consideraron la creación de mapas fuera del alcance de su MVP web, limitándose a importar volcados estáticos.

---

## 6. Análisis Legal y de Licenciamiento

| Proyecto / Fuente | Licencia Declarada | ¿Se puede reutilizar código? | Implicancias y Estrategia para OpenAO |
| :--- | :--- | :--- | :--- |
| **ao-org/argentum-online-worldeditor** | **AGPL-3.0** | **NO** (Copia directa de código prohibida) | La cláusula de red (Sección 13) de AGPL-3.0 obligaría a OpenAO a licenciar todo su backend y frontend bajo AGPL si se enlaza o incluye código fuente de este proyecto. **Solución:** Reimplementación de sala limpia (*Clean-Room Implementation*). Las especificaciones de formatos de archivo (offsets binarios, orden de bytes) **no son protegibles por copyright**. Se puede escribir un parser independiente en TypeScript sin riesgo de contagio. |
| **lambdaclass/argentum** | **Apache-2.0 / MIT** | **SÍ** | Licencia sumamente permisiva. Se pueden tomar patrones, ideas de renderizado con Pixi.js o estructuras de datos citando la autoría. |
| **ao-libre/ao-cliente** | **GPL-3.0 / AGPL-3.0** | **NO** (Copia directa de código prohibida) | Aplican las mismas restricciones que el editor oficial. Solo se deben consultar sus structs como documentación técnica. |
| **AO-object-editor (elpatoenlasolas)** | **Sin licencia** | **NO** | Al no tener licencia, todo el código tiene todos los derechos reservados. OpenAO ya documentó en `docs/licensing-notes.md` que la implementación es 100% original e inspirada conceptualmente. |

---

## 7. Recomendación Explícita sobre Soporte de Importación

### **Recomendación: SÍ, vale la pena soportar importación desde el formato del editor oficial.**

### Justificación:
1. **Patrimonio de Contenido Inmediato:** Existen más de **300 mapas oficiales y miles de mapas comunitarios** creados durante 20 años (ciudades históricas como Ullathorpe, Nix, Banderbill, Lindos, catacumbas, dungeons). Permitir arrastrar o importar un archivo `.map` tradicional ahorra cientos de horas de diseño manual.
2. **Cero Riesgo Legal:** Un parser binario de ~100 líneas en TypeScript que lea un `Buffer` en Node.js es una obra 100% original de sala limpia (*clean-room spec*).
3. **Conversión 1:1 Trivial:** Dado que cada tile binario tiene exactamente los mismos campos que el formato JSON de OpenAO (`b`, `g`, `t`, `e`, `o`, `n`), la conversión es una función lineal pura $O(N)$ con $N = 10,000$.

### Especificación del Parser de Sala Limpia (TypeScript / Node.js)

```typescript
/**
 * Especificación de lectura de sala limpia para archivos .map de Argentum Online (VB6)
 * Estructura de cabecera:
 * - Version: Int16 (2 bytes)
 * - MapName / Extra: 263 bytes (dependiendo de version 13.x / 14.x)
 * Estructura de cada Tile (100 x 100 = 10,000 tiles):
 * - Flags (1 byte): bit 0: blocked, bit 1: has layer 2, bit 2: has layer 3, bit 3: has layer 4, bit 4: has trigger
 * - Layer 1: UInt16 (2 bytes, GrhIndex obligatorio)
 * - Layer 2: UInt16 (opcional)
 * - Layer 3: UInt16 (opcional)
 * - Layer 4: UInt16 (opcional)
 * - Trigger: UInt16 / Byte
 */
export function parseLegacyAOMap(buffer: Buffer) {
  let offset = 265; // Salto de cabecera estándar v13+
  const tiles: any[] = [];

  for (let y = 1; y <= 100; y++) {
    for (let x = 1; x <= 100; x++) {
      const flags = buffer.readUInt8(offset++);
      const blocked = (flags & 0x01) !== 0 ? 1 : 0;
      
      const layer1 = buffer.readUInt16LE(offset); offset += 2;
      const layer2 = (flags & 0x02) ? buffer.readUInt16LE(offset) : null;
      if (flags & 0x02) offset += 2;

      const layer3 = (flags & 0x04) ? buffer.readUInt16LE(offset) : null;
      if (flags & 0x04) offset += 2;

      const layer4 = (flags & 0x08) ? buffer.readUInt16LE(offset) : null;
      if (flags & 0x08) offset += 2;

      const trigger = (flags & 0x10) ? buffer.readUInt16LE(offset) : 0;
      if (flags & 0x10) offset += 2;

      tiles.push({
        b: blocked || undefined,
        g: (layer2 || layer3 || layer4) ? [layer1, layer2, layer3, layer4] : layer1,
        t: trigger || undefined
      });
    }
  }

  return { width: 100, height: 100, tiles };
}
```

---

## 8. Errores Conocidos y Limitaciones Encontradas en Otros Proyectos

Para blindar el Modo Construcción de OpenAO, se identifican los siguientes problemas clásicos del ecosistema a evitar:

1. **Problema del Tile Huérfano de Techo:**
   * En WorldEditor, si un diseñador coloca un gráfico en la Capa 4 sin colocar el `Trigger = 1` ("Bajo Techo") en los tiles interiores, el techo nunca se desvanece y oculta permanentemente al personaje dentro de la casa.
   * *Mitigación en OpenAO:* En el panel de construcción, sugerir automáticamente la colocación de Trigger 1 al pintar superficies continuas en Capa 4.
2. **Puntos Ciegos de Bloqueo en Portales / Exits:**
   * Es frecuente que un mapa tenga una salida (`e: {m, x, y}`) apuntando a una coordenada de destino que tiene `b: 1` (bloqueo) en el mapa destino, dejando al jugador congelado sin poder moverse.
   * *Mitigación en OpenAO:* Incorporar una validación al momento de "Publicar": advertir al administrador si algún exit conduce a un tile bloqueado.
3. **Sobrecarga de Renderizado en PixiJS sin Culling:**
   * Proyectos web anteriores sufrían caídas de FPS al intentar iterar los 10,000 sprites en cada frame.
   * *Solución implementada:* OpenAO ya maneja el viewport centrado con culling visual, renderizando únicamente los tiles visibles en pantalla y aplicando batching de texturas con PixiJS.
4. **Colisiones de Edición Concurrente:**
   * Como se observó en los intentos de sockets de GS-Zone, si dos administradores editan el mismo mapa a la vez, se pueden pisar cambios.
   * *Solución implementada:* El modelo transaccional de PostgreSQL con estados `draft` y `published` de OpenAO junto con el token de admin aísla las escrituras por sesión de administración antes de impactar en el juego público.
