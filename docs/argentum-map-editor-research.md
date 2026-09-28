# Investigación: edición de mapas en el ecosistema Argentum Online

Issue: [#14](https://github.com/Bitcoindefi/OpenAO/issues/14) (modo construcción / GrantFox).

Fecha de revisión: 2026-09-28. Fuentes: repositorios públicos citados abajo y el árbol `server/mapas_source` de OpenAO en `main`.

## Resumen ejecutivo

| Proyecto | Rol | Formato de mapa | Edición en vivo / colaborativa | Licencia | ¿Import útil a OpenAO? |
|---|---|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial de escritorio (VB6) | Binario clásico AO (cargadores `MapaV2_Cargar` / `MapaV3_Cargar` en `Codigo/modMapIO.bas`); recursos en repo hermano `ao-org/Recursos` | No: herramienta offline de escritorio | **AGPL-3.0** | Sí, como **fuente de verdad histórica** vía convertidor offline → JSON OpenAO |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Reescritura Elixir + cliente Rust/Bevy (WASM/nativo) | Empaquetado cliente `AOMP` v1 (binario LE) + corpus `.csm` / `.dat` VB6; overlays de world-map aparte | No hay editor in-game en navegador documentado; el mapa se **simula** por GenServer y se **empaqueta** para el cliente | Apache-2.0 (repo) | Parcial: modelo de capas/blocked es valioso; el pack `AOMP` no es el editable de OpenAO |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente comunidad VB6 | Consume mapas/gráficos clásicos (`TileEngine`, UI de mapa); no define un editor | No | **AGPL-3.0** | Solo como referencia de consumo cliente |
| **OpenAO (este repo)** | Servidor TS + cliente web | Editable: `mapas_source/mapa_N/{meta,terrain,specials,npcs}.json`; runtime optimizado `mapa_N.json` | Hipótesis del modo construcción: edición in-game en navegador (en curso) | Ver `docs/licensing-notes.md` | — |

**Conclusión:** nadie del conjunto revisado ofrece hoy un **editor in-game colaborativo en el navegador**. El editor oficial sigue siendo VB6/desktop. Lambdaclass moderniza runtime y distribución de mapas, no el flujo creativo. OpenAO ya usa un formato JSON partido (`meta` / `terrain` / `specials` [+ `npcs`]) que **no es wire-compatible** con `.map`/`.csm`/AOMP; sí es un buen destino de **import offline** desde el formato oficial.

## Formato OpenAO (baseline)

Cargado por `server/src/loadMaps.ts` desde `server/mapas_source/mapa_<id>/`:

- `meta.json` — id, nombre, música, flags (`pk`, `backup`, `magiaSinEfecto`, …), terreno/zona.
- `terrain.json` — `width`/`height`, `palette` (graficos + `blocked`) y `rows` (índices de paleta).
- `specials.json` — `exits`, `objects`, `npcs`, `triggers` indexados por coordenada.
- `npcs.json` — datos de spawn/NPC asociados (presente en fuentes editables).

El frontend sirve un derivado compacto (`frontend/public/maps/mapa_<id>.json` con claves `id/w/h/d/cx`). La exportación editable está en `server/src/scripts/exportEditableMaps.ts`.

Ejemplo real (`mapa_1` / Ullathorpe): terreno 100×100, paleta ~869 entradas; `specials` con cientos de exits/triggers.

Esto responde la pregunta de compatibilidad del issue: **el editable OpenAO es JSON estructurado**, no el binario del WorldEditor ni el pack `AOMP`.

## 1. Editor oficial (`ao-org/argentum-online-worldeditor`)

Evidencia primaria:

- README del proyecto: instalación acoplada a `ao-org/Recursos` (assets) al mismo nivel de directorio.
- `Codigo/modMapIO.bas`: API de archivos de mapa; `AbrirMapa` elige `MapaV2_Cargar` vs `MapaV3_Cargar` según `FormatoIAO`.
- Formularios `frmMapInfo`, `frmAutoGuardarMapa` y carpeta `Mapas Convertidos` confirman flujo **abrir → editar → guardar/convertir** en escritorio.
- Licencia SPDX del repo: **AGPL-3.0**.

Implicaciones de diseño útiles a copiar (ideas, no código AGPL):

- Capas gráficas por tile + bloqueo + triggers/salidas como preocupaciones separadas (OpenAO ya las separa en `terrain` vs `specials`).
- Autoguardado y metadatos de mapa (`frmMapInfo`) como UX de editor.
- Conversión explícita entre versiones de formato (`Mapas Convertidos`) — patrón a imitar para un importador oficial→JSON.

No aparece edición colaborativa ni hot-reload multi-usuario: es un editor de un solo usuario sobre archivos locales.

### Limitaciones / errores conocidos del enfoque clásico

- Dependencia de VB6 + árbol de recursos hermano; frágil para contribuidores web.
- Formatos binarios versionados (`V2`/`V3`/`IAO`) sin esquema JSON auditable.
- AGPL-3.0: **reutilizar código o volcar traducciones literales del editor** obliga a AGPL en el derivado; las **ideas de UX/capa** y un convertidor propio clean-room están OK si no se copia código.

## 2. Lambdaclass Argentum

Evidencia primaria (README + `client-rs/crates/ao-core/src/mappack.rs` + `client-rs/assets/world-map/MANIFEST.md`):

- Servidor: un GenServer por mapa, AoI, Postgres; no un WorldEditor.
- Cliente producción: Rust/Bevy (WASM/nativo). El cliente TypeScript/Pixi queda como referencia congelada.
- Map pack cliente **`AOMP` v1**: magic `AOMP`, capas blocked + 4 capas GRH + npcs/objects/exits. Semántica de blocked **no booleana** (`0` walkable, `1` solid, `2` water navegable).
- Corpus crudo VB6 bajo `resources/raw/Mapas/*.csm` y `resources/raw/Dat/Map*.dat`.
- World-map overlay: asset aparte con presupuesto de textura; **no** es el formato de juego editable.

No documentan un editor in-game en el navegador. El trabajo de mapas es **pipeline de assets + runtime**, no construcción colaborativa.

Licencia del repo: Apache-2.0 (más permisiva para ideas/código propio inspirado; sigue sin autorizar copiar assets VB6 ajenos).

## 3. `ao-libre/ao-cliente`

Cliente VB6 comunitario. Árbol con `TileEngine`, UI de mapa y minimapas. Es **consumidor** del formato clásico, no un sustituto del WorldEditor. Licencia AGPL-3.0. Útil para validar que salidas/triggers/gráficos se comportan como el cliente legado espera tras un import.

## Respuestas a las preguntas del issue

1. **Formatos y compatibilidad con `meta`/`terrain`/`specials`:** WorldEditor y ao-libre usan binarios AO versionados; Lambdaclass añade `AOMP` + `.csm`. **Ninguno es drop-in compatible** con el JSON partido de OpenAO. La compatibilidad real es por **conversión**.
2. **Capas / bloqueo / triggers en el oficial:** capas gráficas + bloqueo + info de mapa en módulos VB6 (`modMapIO`, formularios de info). OpenAO ya factoriza bloqueo/gráficos en `terrain.palette` y triggers/exits/objects/npcs en `specials` — alineado conceptualmente.
3. **Edición en vivo o colaborativa:** no encontrada en estos tres proyectos. Lambdaclass hace hot-path de juego, no co-edición. La hipótesis de OpenAO (editor in-game web) **sigue sin refutarse** por un producto existente en este set.
4. **Import/export entre formatos:** el WorldEditor tiene camino de “Mapas Convertidos” y cargadores V2/V3; Lambdaclass parsea `.csm` hacia packs de cliente. **Recomendación:** invertir en un convertidor offline `WorldEditor/CSM → mapas_source/{meta,terrain,specials,npcs}.json` mantenido en este repo, no en leer binarios en el hot path del browser.
5. **Licencias:** WorldEditor y ao-libre = AGPL-3.0 (cuidado al reutilizar código). Lambdaclass = Apache-2.0. Assets originales AO tienen su propia cadena de derechos (ver también `docs/licensing-notes.md`).

## Recomendación explícita

- **Sí vale la pena** soportar **import desde el formato del editor oficial** (y/o `.csm` del corpus), implementado como herramienta de build/CLI con tests de golden files, escribiendo únicamente el JSON OpenAO.
- **No** acoplar el cliente web al binario VB6 ni al `AOMP` como formato editable.
- Tratar AGPL como frontera: convertidor clean-room + tests; no vendorear `modMapIO.bas`.
- Priorizar documentación de semántica de `blocked`/triggers (aprender del cuidado de Lambdaclass con agua=`2`) al pintar tiles en el modo construcción.

## Errores / trampas ya vistas en el ecosistema

- Confundir “byte blocked ≠ 0” con “sólido” rompe mapas marítimos (documentado en `mappack.rs` de Lambdaclass).
- Editor oficial inutilizable sin clonar `Recursos` al lado — onboarding frágil.
- Versionado silencioso V2/V3/IAO sin esquema — cualquier importador debe detectar versión y fallar cerrado.
- Empaquetados de cliente (`AOMP`, `mapa_N.json` optimizado) **no** son buenos targets de edición; editar siempre la fuente (`mapas_source`).

## Referencias

- OpenAO `server/src/loadMaps.ts`, `server/src/scripts/exportEditableMaps.ts`, `server/mapas_source/mapa_1/*`
- https://github.com/ao-org/argentum-online-worldeditor (README; `Codigo/modMapIO.bas`)
- https://github.com/ao-org/Recursos (assets del editor)
- https://github.com/lambdaclass/argentum (README; `client-rs/crates/ao-core/src/mappack.rs`; `client-rs/assets/world-map/MANIFEST.md`)
- https://github.com/ao-libre/ao-cliente
