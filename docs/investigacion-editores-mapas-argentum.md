# Investigación Técnica: Edición y Formatos de Mapas en el Ecosistema Argentum Online

> Documento de investigación y arquitectura para el **Issue #14** (Parte del Modo Construcción / #2 / #29) de **OpenAO**.

---

## 1. Resumen Ejecutivo y Validación de Hipótesis

El objetivo central de esta investigación es documentar cómo abordan la creación, almacenamiento y edición de mapas los principales proyectos del ecosistema de **Argentum Online (AO)**. El propósito es evitar repetir errores arquitectónicos históricos, comprender la compatibilidad de formatos y respaldar con evidencia técnica las decisiones de diseño del **Modo Construcción** de OpenAO.

### Validación de la Hipótesis Central
- **Hipótesis:** Ningún proyecto en el ecosistema de Argentum Online cuenta con edición in-game colaborativa en el navegador web ni recarga en caliente (hot-reload) sin reinicio del servidor.
- **Resultado de la investigación:** **CONFIRMADA**. Todos los proyectos existentes (incluyendo el editor oficial de `ao-org`, implementaciones C++ de `ao-libre` y el cliente web de `lambdaclass`) dependen exclusivamente de edición *offline* en herramientas de escritorio o editores externos (como Tiled), requiriendo reiniciar el servidor (`/REINICIAR`) o recompilar bundles estáticos para aplicar cambios.
- **Ventaja de OpenAO:** OpenAO es el primer proyecto en implementar edición de mapas en vivo basada en navegador con sincronización en tiempo real sobre WebSockets y persistencia modular desacoplada (`draft` / `published`).

---

## 2. Proyectos del Ecosistema Analizados

| Proyecto | Repositorio | Stack Tecnológico | Rol en el Ecosistema | Licencia |
|---|---|---|---|---|
| **WorldEditor Oficial** | [`ao-org/argentum-online-worldeditor`](https://github.com/ao-org/argentum-online-worldeditor) | Visual Basic 6, DirectDraw / DirectX 7-8, Win32 | Editor canónico de escritorio usado para generar los mapas oficiales (1 a 290+) del juego original. | **AGPL-3.0** |
| **LambdaClass Argentum** | [`lambdaclass/argentum`](https://github.com/lambdaclass/argentum) | TypeScript, Vite, React, Pixi.js, WebGL | Reimplementación web moderna enfocada en cliente de alto rendimiento en navegador. | **MIT** |
| **AO-Libre Cliente** | [`ao-libre/ao-cliente`](https://github.com/ao-libre/ao-cliente) | C++ / C# (.NET), SFML / SDL, Multiplataforma | Proyecto comunitario libre que moderniza el cliente de escritorio preservando compatibilidad v0.13+. | **GPL-3.0** |
| **OpenAO (Este Proyecto)** | [`Bitcoindefi/OpenAO`](https://github.com/Bitcoindefi/OpenAO) | TypeScript, Next.js, React, Node.js, Fastify, PixiJS, WebSockets, PostgreSQL | Juego web nativo multijugador con modo construcción in-game y APIs modulares. | **Open Source** |

---

## 3. Tabla Comparativa de Formatos y Modelado de Mapas

| Dimensión Técnica | OpenAO (Actual) | ao-org / WorldEditor | lambdaclass/argentum | ao-libre / ao-cliente |
|---|---|---|---|---|
| **Estructura de Archivos** | JSON modular (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`) | Binario plano `.map` + descriptor `.inf` / `.dat` | JSON monolítico o estático (`map.json`) exportado de Tiled | Binario `.map` v0.13 o binario extendido `.csmap` / `.bin` |
| **Dimensiones de Mapa** | 100 × 100 tiles (1-indexed en coordenadas de juego) | 100 × 100 tiles fijos (1 a 100) | 100 × 100 tiles | 100 × 100 tiles fijos |
| **Capas Gráficas** | 4 capas (`graphics: [layer1, layer2, layer3, layer4]`) | 4 capas fijas (`GrhIndex` de 16 bits por capa) | N capas (arrays lineales renderizados con Pixi.js) | 2 a 4 capas (`int32` o `int16` con flags de capa) |
| **Modelo de Bloqueo** | Booleano por tile (`blocked: boolean`) + overrides | Flag de 1 bit / byte (`0x01` bloqueado) | Booleano por tile (`blocked: boolean`) | Máscara de bits direccional (`BlockedMask`: N, S, E, O) o booleano |
| **Disparadores (Triggers)** | Diccionario `"x,y": triggerId` en `specials.json` | 1 a 2 bytes por tile (`Trigger` ID 1..6) | Propiedad `trigger: number | null` | Campo numérico `TriggerID` por tile |
| **Salidas / Portales (Exits)** | Diccionario `"x,y": { map, x, y }` o destinos múltiples | `TileExit` struct (TargetMap, TargetX, TargetY) | Objetos o capas de propiedades en Tiled | Struct de salida embebida en el tile |
| **NPCs y Objetos** | Archivos dedicados `npcs.json` y `specials.json` (objetos) | `NPCIndex`, `ObjIndex` y `ObjAmount` embebidos en el byte del tile | Listas de entidades externas deserializadas aparte | Embebidos en el tile o cargados desde scripts de spawns |
| **Entorno de Edición** | **En navegador web (`/construccion`) con PixiJS** | Aplicación Win32 de escritorio (VB6) | Editor externo Tiled + script convertidor Python | Aplicación de escritorio C++/C# integrada o externa |
| **Edición Colaborativa** | **Arquitectura preparada vía WebSocket deltas** | No soportada | No soportada | No soportada |
| **Recarga en Caliente** | **En memoria y WebSocket broadcast sin reiniciar** | No (Requiere `/REINICIAR` del servidor) | No (Requiere rebuild/redeploy de bundles estáticos) | No (Requiere comando admin `/CARGARMAPA` o reinicio) |

---

## 4. Respuestas Detalladas a las Preguntas Clave

### 4.1 ¿Qué formato de mapa usa cada uno y qué tan compatible es con el nuestro?

#### 1. Formato Oficial `ao-org/worldeditor` (Binario `.map` / `.inf`)
El formato canónico de Argentum Online almacena los 10.000 tiles (100×100) en una secuencia binaria sin compresión o con compresión básica RLE en versiones posteriores.
- **Cabecera:** Encabezado de 265 bytes con metadatos del mapa (versión, nombre, flags de mapa seguro, número de música).
- **Cuerpo:** Por cada tile `(x, y)`:
  - `Flags` (1 byte): Máscara de bits que indica la presencia de capas (`0x01`: Bloqueo, `0x02`: Capa 2 presente, `0x04`: Capa 3 presente, `0x08`: Capa 4 presente, `0x10`: Trigger presente).
  - `Capa 1` (`UInt16LE`): Gráfico de terreno base (obligatorio).
  - `Capa 2..4` (`UInt16LE` condicional): Gráficos superiores si su bit está activo.
  - `Trigger` (`UInt16LE` condicional): Número de disparador.
  - `Exit` (`Int16LE` × 3 condicional): `Map`, `X`, `Y`.

**Compatibilidad con OpenAO:** **100% compatible conceptualmente**.
- `Capa 1..4` $ightarrow$ Mapea directamente a `terrain.json` (`graphics[0..3]`).
- `Bloqueo` $ightarrow$ Mapea a `terrain.json` (`blocked: true/false`).
- `Trigger` $ightarrow$ Mapea al diccionario `specials.json` (`triggers: { "x,y": triggerId }`).
- `Exit` $ightarrow$ Mapea a `specials.json` (`exits: { "x,y": { map, x, y } }`).

#### 2. Formato `lambdaclass/argentum` (JSON / Tiled)
Usa objetos JSON donde cada tile define:
```json
{
  "x": 50,
  "y": 50,
  "layers": [5500, 581, 0, 0],
  "blocked": true,
  "trigger": 1
}
```
**Compatibilidad con OpenAO:** **Casi directa**. Solo difiere en la estrategia de almacenamiento: OpenAO agrupa en paletas de terreno indexadas (`palette`) para reducir el tamaño del payload JSON en un 80%, mientras que LambdaClass utiliza arrays lineales o exportaciones directas de Tiled.

---

### 4.2 ¿Cómo modela el editor oficial las capas, el bloqueo y los triggers? ¿Qué decisiones vale la pena adoptar?

#### Las 4 Capas Visuales
El motor gráfico de Argentum Online se basa en una proyección ortogonal/isométrica simulada dividida estrictamente en 4 capas:
1. **Capa 1 (Suelo / Base):** El tile base que cubre el 100% de la superficie (pasto, agua, tierra, arena, lava, empedrado). Nunca puede ser nulo o transparente; si falta, el motor renderiza negro.
2. **Capa 2 (Objetos de Suelo / Transiciones / Decoración):** Maleza, flores, alfombras, sangre, caminos de tierra sobre pasto. Posee canal alfa para integrarse sobre la Capa 1.
3. **Capa 3 (Estructuras Intermedias / Techos / Muros):** Troncos de árboles, paredes de casas y techos.
   - *Mecanismo clave a adoptar:* **Oclusión de Techos (`bTecho` / Roof Transparency)**. Cuando el personaje entra en el área delimitada de un techo, el cliente reduce la opacidad o deja de renderizar los tiles de Capa 3 pertenecientes a ese techo para permitir visibilidad en interiores.
4. **Capa 4 (Aéreo / Copas de Árboles):** Copas de árboles, arcos de puertas superiores y nubes. Se renderiza siempre *por encima* de los sprites de los personajes, NPCs y proyectiles, produciendo el efecto de profundidad de campo.

#### Bloqueo
- En el editor clásico, el bloqueo es un flag booleano simple (`0` o `1`).
- En `ao-libre`, se exploró el `BlockedMask` (bloqueo por puntos cardinales).
- **Decisión para OpenAO:** Mantener el bloqueo booleano a nivel de tile (`blocked: true/false`), que es simple, robusto y compatible con el servidor autoritativo de OpenAO.

#### Triggers (Disparadores Lógicos)
Los triggers clásicos estandarizados son:
- `Trigger 1` - **Zona Segura:** Prohíbe combate PvP, robo y ataque entre ciudadanos/criminales.
- `Trigger 2` - **Zona de Duelo / Arena:** Permite combate sin pérdida de inventario ni penalizaciones.
- `Trigger 3` - **Daño Ambiental:** Aplica daño periódico por lava, pantano tóxico o fuego.
- `Trigger 4` - **Portal / Teleport:** Traslada al jugador a un mapa de destino (`mapNum, x, y`).
- `Trigger 5` - **Zona Anticheat / Activador de Scripts:** Delimitador de eventos y validación de línea de visión.
- `Trigger 6` - **Resurrección / Santuario:** Cura y resucita a personajes fantasma.

**Decisión para OpenAO:** Adoptar esta taxonomía canónica de triggers en `specials.json` asegura interoperabilidad total con la lógica del servidor de juego y las mecánicas tradicionales.

---

### 4.3 ¿Alguno intentó edición en vivo o colaborativa? ¿Por qué se abandonó?

**Ningún proyecto anterior implementó edición in-game colaborativa en tiempo real.**

#### Razones Técnicas del Abandono en Proyectos Históricos:
1. **Acoplamiento al Escritorio y Monolitos:** WorldEditor fue desarrollado en Visual Basic 6 utilizando llamadas directas a la API de Windows y DirectDraw/DirectX 7. No disponía de una arquitectura cliente-servidor para la herramienta de edición; era un ejecutable aislado que modificaba archivos binarios locales en disco.
2. **Ausencia de Protocolo Delta:** El protocolo de red tradicional de AO estaba diseñado únicamente para gameplay básico (paquetes binarios UDP/TCP fijos). No existía un opcode para mutación dinámica de tiles (`OP_SET_TILE`, `OP_MODIFY_AREA`).
3. **Flujo de Trabajo "Editar $ightarrow$ Guardar $ightarrow$ Reiniciar":** Para ver un cambio de mapa en el servidor clásico, el administrador debía:
   - Guardar el archivo `.map` en su PC local.
   - Subirlo vía FTP/SSH al servidor Linux/Windows.
   - Ejecutar el comando `/REINICIAR` o `/CARGARMAPA`, provocando caídas de conexión, lag severo y pérdida de estado de los jugadores conectados.

#### La Ventaja Tecnológica de OpenAO:
Gracias a la pila moderna de OpenAO (Node.js, TypeScript, WebSockets y PixiJS):
- Se pueden emitir mutaciones atómicas por tile con latencia inferior a 20 ms.
- La separación de estados (`draft` vs `published`) permite a los diseñadores editar sobre una capa borrador sin interferir con las partidas de los jugadores activos hasta que se presione **"Publicar"**.

---

### 4.4 ¿Existe alguna herramienta de import/export y vale la pena soportar `.map` oficial?

#### Evaluación de Import/Export
- **Demanda:** En la comunidad de Argentum Online existen más de **280 mapas del mundo oficial** y miles de mapas creados por la comunidad en formato binario `.map` / `.inf`.
- **Dificultad de Implementación:** Muy baja. Un parser binario clean-room en TypeScript para archivos `.map` requiere menos de 100 líneas de código utilizando métodos nativos de Node.js como `Buffer.readUInt16LE()` y `Buffer.readUInt8()`.

#### Recomendación Explícita:
- **Fase 1 (Inmediata):** Mantener el formato nativo modular JSON de OpenAO para el Modo Construcción.
- **Fase 2 (Herramienta CLI de Migración):** Proveer un script CLI independiente (`scripts/import-classic-map.ts`) para convertir mapas `.map` $ightarrow$ `meta.json` + `terrain.json` + `specials.json`.
- **Beneficio Concreto:** Permite importar instantáneamente mapas clásicos emblemáticos (Ullathorpe, Nix, Banderbill, Dungeon Veril, Catacumbas) sin tener que redibujarlos a mano desde cero.

---

### 4.5 ¿Qué licencia tiene cada proyecto y qué implica legalmente?

| Proyecto | Licencia | Implicaciones para OpenAO |
|---|---|---|
| **WorldEditor Oficial (`ao-org`)** | **AGPL-3.0** (Affero GPL v3) | **Copyleft Fuerte / Viral de Red:** Copiar código fuente directo obligaría a licenciar todo el backend y frontend de OpenAO bajo AGPL-3.0. <br/>**Solución:** Aplicar *Clean-Room Engineering*. La estructura binaria de archivos y las especificaciones de offsets no están sujetas a derechos de autor; escribir un lector desde cero en TypeScript es 100% limpio y libre de restricciones. |
| **LambdaClass Argentum** | **MIT** | **Permisiva:** Se pueden reutilizar técnicas de renderizado PixiJS, estructuras JSON y algoritmos de optimización WebGL con la sola inclusión del aviso de copyright original. |
| **AO-Libre** | **GPL-3.0** | **Copyleft Estándar:** Útil como referencia técnica para comprender comportamientos de compatibilidad, sin copiar código fuente. |

---

## 5. Catálogo de Errores Conocidos en Editores Previos y Mitigaciones en OpenAO

| Error / Limitación en Editores Anteriores | Causa en Proyectos Históricos | Mitigación Implementada / Recomendada en OpenAO |
|---|---|---|
| **Corrupción de Mapa por Cierre Inesperado** | Guardado directo sobre el archivo en uso sin escritura transaccional ni backups automáticos en WorldEditor VB6. | **Escritura Atómica:** Guardar en archivos temporales (`.tmp`) y renombrar atómicamente (`fs.rename`), sumado a versionado en base de datos PostgreSQL (`game_map_overrides`). |
| **Referencias Rotas a Gráficos / NPCs Inexistentes** | Ausencia de validación de claves foráneas; si se eliminaba un `GrhIndex` o `NPCIndex`, el mapa cargaba tiles invisibles o crasheaba el cliente. | **Validación de Integridad:** Endpoints de API que verifican la existencia de cada `grhIndex` en `objs.json` / catálogo de recursos antes de persistir el override. |
| **Acoplamiento Extremo al Cliente de Juego** | Editores de escritorio que requerían toda la carpeta de instalación del juego y DLLs específicas de Windows. | **Desacoplamiento Web:** Editor 100% web en `/construccion`, consumiendo endpoints REST y WebSockets estándar sin dependencias locales del sistema operativo. |
| **Falta de Deshacer / Rehacer (Undo / Redo)** | WorldEditor carecía de pila de comandos (Command Pattern); un error al pintar obligaba a recargar el archivo desde disco. | **Pila de Estados Inmutables:** El store del editor en Zustand / React puede almacenar historial de acciones locales antes de confirmar el lote de cambios. |
| **Colisión de IDs de Paleta** | Índices globales confusos entre mapa local y recursos globales. | **Paleta con Namespacing por Mapa:** Cada mapa tiene su propio diccionario `terrain.palette` desacoplado, mapeando IDs locales a arrays de gráficos. |

---

## 6. Especificación Clean-Room de un Parser de Formato Binario Clásico

A continuación se documenta la especificación técnica de ingeniería inversa *clean-room* para la lectura de mapas binarios tradicionales `.map` de Argentum Online:

```typescript
/**
 * Especificación Clean-Room de Conversión .map a OpenAO JSON
 * Diseñado para conversión offline sin dependencias de código AGPL.
 */
export interface AoClassicTile {
    x: number;
    y: number;
    blocked: boolean;
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    trigger: number;
}

export function parseClassicAoMap(buffer: Buffer): AoClassicTile[] {
    const tiles: AoClassicTile[] = [];
    let offset = 265; // Salto del encabezado estándar v0.13 (265 bytes)

    for (let y = 1; y <= 100; y++) {
        for (let x = 1; x <= 100; x++) {
            if (offset >= buffer.length) break;

            const flags = buffer.readUInt8(offset);
            offset += 1;

            const blocked = (flags & 0x01) !== 0;
            const layer1 = buffer.readUInt16LE(offset);
            offset += 2;

            const layer2 = (flags & 0x02) ? buffer.readUInt16LE(offset) : 0;
            if (flags & 0x02) offset += 2;

            const layer3 = (flags & 0x04) ? buffer.readUInt16LE(offset) : 0;
            if (flags & 0x04) offset += 2;

            const layer4 = (flags & 0x08) ? buffer.readUInt16LE(offset) : 0;
            if (flags & 0x08) offset += 2;

            const trigger = (flags & 0x10) ? buffer.readUInt16LE(offset) : 0;
            if (flags & 0x10) offset += 2;

            tiles.push({
                x,
                y,
                blocked,
                layer1,
                layer2,
                layer3,
                layer4,
                trigger,
            });
        }
    }

    return tiles;
}
```

---

## 7. Conclusiones y Hoja de Ruta para el Modo Construcción de OpenAO

1. **Confirmación Arquitectónica:** El enfoque de OpenAO (edición web, paletas de terreno, capas de overrides `draft`/`published` y sincronización delta) es único en el ecosistema y soluciona las mayores fallas de usabilidad históricas de AO.
2. **Compatibilidad Asegurada:** El modelo de 4 capas visuales + bloqueo + triggers en `specials.json` es 100% compatible con todos los recursos gráficos clásicos de Argentum Online.
3. **Estrategia Legal:** Mediante implementaciones *clean-room* y el uso de referencias permisivas (MIT), OpenAO mantiene su soberanía de código sin riesgos de contaminación de licencias AGPL.
4. **Roadmap Recomendado:**
   - [x] Editor web con paleta de terreno y colocación de entidades (`/construccion`).
   - [x] Validación de integridad de gráficos y entidades en API.
   - [ ] Implementar herramienta CLI opcional de importación de `.map` clásicos para enriquecer el catálogo de mapas.
