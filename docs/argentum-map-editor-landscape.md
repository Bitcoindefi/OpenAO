# Investigación: formatos y editores de mapas de Argentum Online

> Fecha de consulta: 2026-08-16. Investigación basada únicamente en repositorios y archivos públicos; no se copió código.

## Resultado ejecutivo

Los tres referentes no exponen un formato común listo para importar en OpenAO:

- El WorldEditor oficial trabaja con un formato binario legado (`.map` + `.inf` + `.dat`) y tiene soporte explícito para capas, bloqueo, triggers, salidas, NPCs, objetos, partículas y luces.
- AO-Libre distribuye un corpus de mapas binarios (`Mapas/Alkon/Mapa*.map`) y recursos `.ind`/`.dat`; su documentación pública describe un cliente VB6, no un editor web ni un formato JSON.
- lambdaclass/argentum usa los recursos históricos `.grh/.ind/.csm`, carga mapas `.csm` en el servidor y mantiene la colisión en una estructura densa; su licencia es Apache-2.0.
- OpenAO ya tiene un modelo JSON claro y separable: `meta.json`, `terrain.json` (100×100, paleta + filas), `npcs.json` y `specials.json` (salidas).

Recomendación: construir un importador por adaptadores, empezando por `.map/.inf/.dat` del WorldEditor, sin reutilizar código fuente de terceros. El importador debe producir el JSON nativo de OpenAO y detenerse ante datos ambiguos o fuera de rango.

## Método y límites

Se revisaron README, licencias, árboles de directorios y archivos de serialización públicos. Se distinguen hechos observados (`D`), inferencias técnicas (`I`) y recomendaciones (`R`). No se afirma compatibilidad binaria entre proyectos sin una prueba de conversión.

## Comparación

| Proyecto | Evidencia pública | Representación observable | Bloqueo/triggers/salidas | Licencia observada |
|---|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | `WorldEditor.vbp`, `Codigo/modMapIO.bas`, `WorldEditor.ini` | VB6; `.map` binario más `.inf` y `.dat` auxiliares | Sí: capas 1–4, `Blocked`, `Trigger`, `TileExit`, NPC y objetos | [AGPL-3.0](https://github.com/ao-org/argentum-online-worldeditor/blob/master/licence.txt) |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | README, `Mapas/Alkon/Mapa*.map`, `INIT/*.{ind,dat,ini}` | Cliente VB6 con mapas binarios y recursos separados | El árbol contiene `INIT/Triggers.ini`; la semántica completa no está documentada en README | [AGPL-3.0](https://github.com/ao-libre/ao-cliente/blob/master/LICENSE) |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | README y estructura `server/apps/arena`/`client` | `.csm` históricos convertidos a paquetes de mapas; colisión con `TileGrid` | Salidas y reglas se ejecutan en servidor; no se declara editor colaborativo | [Apache-2.0](https://github.com/lambdaclass/argentum/blob/main/LICENSE) |
| OpenAO (destino) | [meta.json](https://github.com/Bitcoindefi/OpenAO/blob/main/api/src/mapas_source/mapa_1/meta.json), [terrain.json](https://github.com/Bitcoindefi/OpenAO/blob/main/api/src/mapas_source/mapa_1/terrain.json), [npcs.json](https://github.com/Bitcoindefi/OpenAO/blob/main/api/src/mapas_source/mapa_1/npcs.json), [specials.json](https://github.com/Bitcoindefi/OpenAO/blob/main/api/src/mapas_source/mapa_1/specials.json) | JSON: metadatos, paleta+filas 100×100, NPCs por coordenada y salidas por coordenada | `blocked` en la paleta; salidas en `specials.json`; NPCs separados | Licencia del destino debe seguir sus reglas de contribución |

## Hallazgos por fuente

### 1. WorldEditor oficial

`Codigo/modMapIO.bas` muestra dos familias de serialización:

1. El archivo `.map` guarda una cabecera y luego una celda por coordenada. La máscara de flags indica bloqueo, presencia de capas gráficas 2–4, trigger, partículas y luces; la capa gráfica 1 se guarda siempre.
2. El archivo `.inf` guarda, según flags, destinos de salida (`TileExit.Map/X/Y`), NPCs y objetos con cantidades.
3. El archivo `.dat` guarda los metadatos del mapa. `frmMapInfo.frm` expone nombre, versión, música, terreno, zona, PK y restricciones.

`Codigo/modEdicion.bas` confirma operaciones de edición sobre bloqueo, capas, NPCs, objetos, salidas y triggers, además de deshacer. `WorldEditor.ini` contiene `Triggers=1`. El directorio público `Mapas Convertidos` sólo contiene `.gitkeep` al momento de consulta: no hay una muestra convertida que pueda usarse como conversor de referencia.

**Implicación:** el importador debe tratar `.map`, `.inf` y `.dat` como un conjunto; importar sólo `.map` perdería salidas, NPCs, objetos y metadatos.

### 2. AO-Libre

El README documenta un cliente Visual Basic 6 y advierte sobre finales de línea del proyecto. El árbol público contiene muchos archivos `Mapas/Alkon/Mapa*.map`, además de `INIT/Cabezas.ind`, `INIT/Graficos.ind`, `INIT/Armas.dat`, `INIT/Triggers.ini` y otros recursos. Esto evidencia una distribución binaria/INI de legado, pero no define por sí solo el layout interno de cada `.map`.

**Implicación:** usar AO-Libre para fixtures de compatibilidad sólo después de obtener una especificación o leer el código de carga con una prueba controlada; no asumir que su `.map` es idéntico al del WorldEditor.

### 3. lambdaclass/argentum

Su README declara que el pipeline convierte recursos `.grh/.ind/.csm` del cliente VB6 a hojas de sprites y paquetes de mapas; el servidor carga mapas `.csm` y el NIF `TileGrid` mantiene una rejilla densa de colisión. La arquitectura es moderna (Elixir/TypeScript/Pixi), pero el README no documenta un editor de mapas ni colaboración en vivo.

**Implicación:** es una referencia de arquitectura de runtime y colisión, no una fuente para copiar un formato ni una solución de editor.

## Compatibilidad con OpenAO

OpenAO separa responsabilidades de forma más explícita:

- `meta.json`: identidad y reglas generales del mapa.
- `terrain.json`: `width=100`, `height=100`, `rows` de 100 filas y una `palette` que asocia un ID a una lista `graphics` y, opcionalmente, `blocked`.
- `npcs.json`: `{mapNum, x, y, npcIndex, movement?}`.
- `specials.json`: salidas indexadas por coordenada, con `{map, x, y}`.

Una conversión segura puede mapear directamente metadatos, NPCs y salidas. La parte difícil es convertir cada celda binaria a una entrada de paleta sin perder capas ni bloqueo; la paleta debe deduplicar combinaciones de gráficos y conservar el orden de capas.

## Diseño mínimo recomendado del importador

1. **Adaptador de entrada:** `WorldEditorV2Reader` lee sólo `.map/.inf/.dat`; no mezcla formatos ni reutiliza clases de terceros.
2. **Decodificación aislada:** little-endian explícito, límites de tamaño, contador de celdas esperado y rechazo de cabeceras desconocidas.
3. **Modelo intermedio:** una celda con `graphics[1..4]`, `blocked`, `trigger`, `exit`, `npc`, `object`, `particles` y `light`.
4. **Mapeo OpenAO:** metadatos → `meta.json`; celdas de terreno → `palette` + `rows`; NPCs → `npcs.json`; salidas → `specials.json`.
5. **Pérdidas declaradas:** partículas, luces y objetos que no tengan representación destino deben generar un informe; nunca descartarse silenciosamente.
6. **Validación:** dimensiones 100×100, coordenadas 1–100, gráficos no negativos, destinos existentes o marcados como pendientes, NPCs no colocados sobre celdas bloqueadas, y round-trip JSON estable.
7. **Previsualización y revisión:** producir un diff legible de celdas, conteos por tipo y un mapa de errores antes de escribir archivos.

## ¿Vale la pena soportar importación?

Sí, pero como herramienta offline y reversible, no como edición en vivo en la primera versión. El valor inmediato es reducir la recreación manual de mapas existentes. La exportación inversa hacia `.map/.inf/.dat` no debe prometerse hasta disponer de una especificación completa de versión y pruebas con el WorldEditor real.

## Riesgos y límites

- La extensión `.map` no identifica una única versión; hay al menos las rutas V2/V3 en el código del WorldEditor.
- El WorldEditor y AO-Libre están bajo AGPL-3.0; este documento usa observaciones y enlaces, no código derivado.
- La licencia Apache-2.0 de lambdaclass/argentum permite reutilización conforme a sus términos, pero no elimina diferencias de formato.
- No se encontró evidencia pública de colaboración multiusuario o edición en vivo en los README consultados; esto es ausencia de documentación, no prueba de inexistencia.
- Las recompensas de la issue son una señal pública de oportunidad, no una garantía de escrow o pago.

## Criterios de aceptación para una implementación posterior

- [ ] Fixture binario pequeño de cada versión soportada.
- [ ] Conversión reproducible a los cuatro JSON nativos de OpenAO.
- [ ] Rechazo explícito de cabecera o versión desconocida.
- [ ] Conteos antes/después para capas, bloqueos, triggers, salidas, NPCs y objetos.
- [ ] Prueba de round-trip del modelo intermedio y snapshot del resultado.
- [ ] Informe de pérdidas (partículas, luces, objetos o triggers sin destino).

## Fuentes primarias

- [WorldEditor README](https://github.com/ao-org/argentum-online-worldeditor/blob/master/README.md)
- [WorldEditor map I/O](https://github.com/ao-org/argentum-online-worldeditor/blob/master/Codigo/modMapIO.bas)
- [WorldEditor editing operations](https://github.com/ao-org/argentum-online-worldeditor/blob/master/Codigo/modEdicion.bas)
- [WorldEditor map settings](https://github.com/ao-org/argentum-online-worldeditor/blob/master/Codigo/frmMapInfo.frm)
- [WorldEditor converted maps directory](https://github.com/ao-org/argentum-online-worldeditor/tree/master/Mapas%20Convertidos)
- [AO-Libre README](https://github.com/ao-libre/ao-cliente/blob/master/README.md)
- [AO-Libre maps directory](https://github.com/ao-libre/ao-cliente/tree/master/Mapas/Alkon)
- [AO-Libre triggers and resources](https://github.com/ao-libre/ao-cliente/tree/master/INIT)
- [lambdaclass/argentum README](https://github.com/lambdaclass/argentum/blob/main/README.md)
- [OpenAO map source example](https://github.com/Bitcoindefi/OpenAO/tree/main/api/src/mapas_source/mapa_1)