# Rango reservado de graficos subidos (#6)

## Contrato

| Espacio | Rango | Fuente |
| --- | --- | --- |
| Graficos originales del motor | IDs presentes en `frontend/public/init/graficos(_optimized).json` (hoy hasta ~52k; comentarios legacy mencionan 320151) | Archivo estatico |
| Graficos subidos (modo construccion) | `>= 1_000_000` (`UPLOADED_GRAPHIC_INDEX_START`) | Tabla `game_uploaded_graphics` |

La constante `UPLOADED_GRAPHIC_INDEX_START = 1_000_000` se comparte entre:

- `api/src/lib/graphicCatalog.ts`
- `api/src/repositories/worldBuilder.ts`
- `frontend/utils/gameLoader.ts`
- `CHECK (grh_index >= 1000000)` en `api/schema.sql`

## Por que no `50000–99999`

Ese rango **colisiona** con indices reales del catalogo optimizado (max observado > 52000). El puente PNG→motor usa `1_000_000+` a proposito.

## Resolucion en el cliente

1. El cliente carga `graficos_optimized.json` / `graficos.json`.
2. `mergeUploadedGraphics` pide `GET /game-data/graphics` y agrega cada PNG subido al mismo catalogo en memoria, con forma compatible (`numFile` = indice, frame completo).
3. Alternativa explicita: `GET /game-data/graphics/index` devuelve el mismo shape graficos.json para merge manual.

## Paleta

`PUT /admin/game-data/maps/:mapNum/palette` crea/actualiza una entrada (`graphics` 1–4 capas + `blocked`) tras validar cada ID contra el catalogo real (no solo un techo numerico). Las entradas viven en `game_map_palette_overrides` y se fusionan en `GET /admin/game-data/maps/:mapNum/terrain`.
