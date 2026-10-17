# Investigación: cómo editan mapas otros proyectos de Argentum Online

**Issue:** [#14](https://github.com/Bitcoindefi/OpenAO/issues/14)  
**Fecha:** 2026-10-17  
**Alcance:** comparación de formatos y flujos de edición (sin proponer código nuevo).  
**Fuentes:** clones shallow de `ao-org/argentum-online-worldeditor`, `lambdaclass/argentum`, `ao-libre/ao-cliente` y el propio OpenAO (`mapas_source/`, `exportEditableMaps.ts`, `docs/modo-construccion-guide.md`, `docs/licensing-notes.md`).

## Resumen ejecutivo

La hipótesis del modo construcción —*nadie ofrece edición in-game en el navegador*— se sostiene con la evidencia revisada: el editor oficial es de escritorio (VB6), ao-libre es cliente VB6 sin editor de mapas, y lambdaclass/argentum reescribe servidor/cliente pero no publica un world editor web colaborativo. OpenAO ya tiene un formato editable JSON (`meta` / `terrain` / `npcs` / `specials`) y un pipeline de exportación desde mapas clásicos. **Sí vale la pena soportar import desde el formato del WorldEditor oficial**, como convertidor offline hacia `mapas_source/`, no como dependencia AGPL en runtime.

## Tabla comparativa de formatos de mapa

| Proyecto | Formato en disco | Capas / estructura | Bloqueo | Triggers / salidas | NPCs / objetos | ¿Edición en vivo / colaborativa? | Licencia |
|---|---|---|---|---|---|---|---|
| **OpenAO** (nosotros) | Carpeta `mapas_source/mapa_N/` con `meta.json`, `terrain.json`, `npcs.json`, `specials.json` | `terrain`: paleta + `rows` (índices); graphics por tile en paleta | `blocked` en entrada de paleta | `specials.exits` (`"x,y"` → `{map,x,y}`), `triggers`, `objects` | `npcs.json` lista `{mapNum,x,y,npcIndex}` (+ `specials.npcs`) | **Sí (in-browser)** vía `/construccion` (admin): pincel, objetos, NPCs, borradores; no es multi-usuario simultáneo documentado | Repo sin SPDX en root al momento del clone; datos AO históricos GPL (ver `licensing-notes.md`) |
| **ao-org/argentum-online-worldeditor** | Binario clásico `.map` + `.inf` (y metadatos); VB6 `MapData(X,Y)` | Hasta 4 capas Grh (`Graphic(1..4)`), luces, partículas | Flag `Blocked` en byte de flags del `.map` | `Trigger` en `.map`; `TileExit` (map/x/y) en `.inf` | `NPCIndex` y `OBJInfo` en `.inf` | **No**: editor de escritorio offline; sin colaboración en red | **AGPL-3.0** (`licence.txt`) |
| **lambdaclass/argentum** | Servidor Elixir por mapa; cliente Rust/Bevy (+ TS/Pixi congelado) | Topología/spatial grid de runtime; no expone el cuarteto JSON de OpenAO | Runtime de arena/map GenServer (no world-editor) | Protocolo de juego, no editor de tiles | Contenido de juego vía recursos VB6 heredados | **No encontrado**: no hay world editor web ni edición colaborativa de mapas en docs/código revisado | **Apache-2.0** |
| **ao-libre/ao-cliente** | Consume mapas del ecosistema AO (`Mapas/`); `MapData` en motor DX8 | Capas Grh + triggers (`BAJOTECHO`, `CASA`, …) al renderizar | `Map_GetBlocked` / `Blocked` | Triggers de techo/casa etc. | Objetos/chars en `MapData` | **No**: es cliente de juego, no editor | **AGPL-3.0** |

### Compatibilidad con OpenAO (`meta` / `terrain` / `npcs` / `specials`)

| Campo OpenAO | Equivalente WorldEditor / clásico | ¿Compatible 1:1? |
|---|---|---|
| `meta.json` (nombre, música, zona, pk, …) | `MapInfo` / `.dat` de mapa | Parcial: OpenAO ya exporta metadatos en `exportEditableMaps.ts` desde dats |
| `terrain.json` palette + rows | `Graphic(1..4)` + `Blocked` por celda | **No 1:1**: OpenAO colapsa a paleta + filas; el `.map` es celda-densa con flags |
| `npcs.json` | `NPCIndex` en `.inf` | Sí, tras conversión (OpenAO ya tiene export) |
| `specials.exits` / `objects` / `triggers` | `TileExit`, `OBJInfo`, `Trigger` | Sí a nivel semántico; claves `"x,y"` vs grilla binaria |

Conclusión de formato: **no son el mismo archivo**, pero **sí hay un mapeo semántico** y OpenAO ya implementa la dirección clásico → editable (`server/src/scripts/exportEditableMaps.ts` lee `mapa_N.json` / dats y escribe el cuarteto).

## Qué modela el editor oficial (capas, bloqueo, triggers) — qué copiar

Del WorldEditor (`modMapIO.bas` / `MapData`):

1. **Capas Grh 1–4** con flags de presencia en un byte; la capa 1 casi siempre existe.
2. **Blocked** como bit independiente del gráfico.
3. **Trigger** como entero opcional en el `.map`.
4. **TileExit / NPC / OBJ** viven en el `.inf`, no en el `.map`.
5. Extras modernos del editor: **luces** y **partículas** (flags 64/32) — OpenAO hoy no los modela en `specials`; si se importan, hay que decidir si se descartan o se extiende el esquema.

**Decisiones que sí vale la pena copiar conceptualmente** (ya alineadas con modo construcción):

- Separar “piso/bloqueo” de “cosas colocadas” (objetos/NPCs/salidas) — OpenAO ya lo hace con `terrain` vs `specials`/`npcs`.
- Mantener un **flujo offline de import** en lugar de embeber el editor VB6.

**No copiar:** UI VB6, rutas MSSCC, ni código AGPL.

## ¿Alguien intentó edición en vivo o colaborativa?

| Proyecto | Evidencia | Resultado |
|---|---|---|
| WorldEditor oficial | Escritorio, archivos locales | Sin colaboración |
| ao-libre cliente | Solo render/juego | Sin editor |
| lambdaclass/argentum | Rewrite de runtime; docs de parity/smoke; sin issue/docs de “map editor colaborativo” en el material clonado | Sin editor de mapas web |
| OpenAO | `/construccion` + API world-builder + borradores | **Único con edición in-browser**; colaboración simultánea multi-usuario **no** aparece documentada (hipótesis de “nadie más lo tiene” se confirma; “edición colaborativa perfecta” aún no está resuelta en el ecosistema) |
| AO-object-editor (referencia conceptual en `licensing-notes.md`) | Sin licencia clara; OpenAO **no copió código** | Solo inspiración de flujo |

No se encontró un proyecto abandonado con post-mortem público de “probamos live collab y falló”; la ausencia es de producto, no un fracaso documentado.

## Import/export entre formatos

| Herramienta | Dirección | Estado |
|---|---|---|
| OpenAO `exportEditableMaps.ts` | clásico/`mapa_N.json` + dats → `mapas_source/` | **Ya existe** en el repo |
| OpenAO `exportFrontendOptimizedMaps.ts` | editable → assets de frontend | Ya existe |
| WorldEditor | edita `.map`/`.inf` nativos | Estándar de la comunidad |
| Convertidor público genérico “`.map` → OpenAO JSON” empaquetado | — | No hay uno independiente documentado fuera de los scripts de OpenAO |

**Recomendación explícita:** **sí, soportar import desde el formato del editor oficial**, implementado como:

1. Mantener/ampliar el convertidor **offline** (scripts Node ya presentes) como camino soportado.
2. Documentar “exportá con WorldEditor → corré `exportEditableMaps` → abrí en `/construccion`”.
3. **No** linkear el WorldEditor AGPL como librería de runtime del servidor web (riesgo copyleft en red).
4. Tratar luces/partículas como “best-effort / drop con warning” en v1 del import.

Justificación: reutilizar mapas de la comunidad es una ventaja concreta; el costo legal se gestiona manteniendo la conversión como herramienta separada y código original en el camino web.

## Licencias y reutilización

| Obra | Licencia | Implicación práctica |
|---|---|---|
| WorldEditor oficial | **AGPL-3.0** | Podés estudiar el formato y escribir un importador limpio. Si copiás código o lo ofrecés como servicio de red derivado, AGPL exige ofrecer fuente correspondiente. Mejor: **reimplementar el lector**. |
| ao-libre/ao-cliente | **AGPL-3.0** | Igual: útil para entender triggers/blocked; no pegar código al stack Next/Pixi. |
| lambdaclass/argentum | **Apache-2.0** | Ideas/algoritmos de AoI/map GenServer son citables con atribución; **no aporta editor de mapas**. |
| OpenAO modo construcción | Código original (notas en `licensing-notes.md`); referencia AO-object-editor sin licencia → solo conceptual | Seguir sin copiar ese repo |

## Errores conocidos / limitaciones ajenas (útiles para no repetir)

1. **Encoding VB6 / Windows-1252:** clonar WorldEditor o ao-cliente como ZIP o sin cuidado de encoding corrompe `.bas`/`.cls` (ao-libre lo advierte en su README; el clone de WorldEditor también emitió errores de encoding). Cualquier toolchain de import debe asumir binarios `.map`/`.inf`, no fuentes VB.
2. **Formato denso vs paleta:** el `.map` guarda por-celda; OpenAO usa paleta. Un import ingenuo puede explotar el tamaño de `palette` si no deduplica tiles idénticos (el exportador de OpenAO ya construye paleta: seguir ese camino).
3. **Split `.map` / `.inf`:** olvidar el `.inf` pierde salidas, NPCs y objetos — el mapa “se ve” pero está vacío de gameplay.
4. **Triggers y extras (luz/partículas):** el editor oficial acumula flags; un visor web que ignore triggers rompe techos/casas; ignorar luces solo afecta estética.
5. **Sin collab en el ecosistema clásico:** no hay modelo maduro de OT/CRDT para mapas AO; si OpenAO agrega multi-cursor, será pioneer territory (conflicto de borradores ya es el riesgo principal).
6. **Licencia AGPL en red:** incrustar lógica del WorldEditor en el API público de OpenAO sería el error legal más caro; el convertidor batch lo evita.

## Respuestas directas a las 5 preguntas del issue

1. **Formatos:** OpenAO = JSON cuádruple; oficial = `.map`+`.inf` binario VB6; lambdaclass = runtime Elixir/Bevy sin ese cuarteto; ao-libre = cliente sobre mapas clásicos. **Compatible semánticamente vía conversión, no byte-a-byte.**
2. **Capas/bloqueo/triggers oficiales:** 4 Grh + Blocked + Trigger + TileExit/NPC/OBJ en `.inf`. **Copiar el modelo mental de separación; no el binario.**
3. **Live/colaborativo:** nadie más lo ofrece en navegador; OpenAO es el primero del set revisado. No hay post-mortem de abandono de collab.
4. **Import/export:** **sí existe camino** (scripts OpenAO). Recomendación: **soportar import oficial como feature de primer nivel documentada.**
5. **Licencias:** AGPL en editor y ao-libre ⇒ reimplementar lectores; Apache en lambdaclass ⇒ ok para ideas de runtime; no mezclar AGPL en el servicio web.

## Apéndice: rutas inspeccionadas

- OpenAO: `server/mapas_source/mapa_1/{meta,terrain,npcs,specials}.json`, `server/src/scripts/exportEditableMaps.ts`, `docs/modo-construccion-guide.md`, `docs/licensing-notes.md`
- WorldEditor: `Codigo/modMapIO.bas`, `licence.txt`, `README.md`
- lambdaclass/argentum: `README.md`, `LICENSE` (Apache-2.0); búsqueda de world-editor sin hallazgos
- ao-libre/ao-cliente: `README.md`, `LICENSE` (AGPL-3.0), `CODIGO/Areas/mPooMap.bas`
