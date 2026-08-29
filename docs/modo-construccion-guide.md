# Modo construccion — guia de prueba manual y mensaje de PR

## Guia de prueba manual (paso a paso)

Requisitos locales:

1. PostgreSQL local con la base `aoweb` y `schema.sql` aplicado.
2. API en `http://127.0.0.1:3001` con variables de entorno:
   - `GAME_DATA_ADMIN_EMAIL=admin@local.test`
   - `GAME_DATA_ADMIN_ACCOUNT_ID=<id de la cuenta admin>`
   - `GAME_DATA_ADMIN_PROXY_TOKEN=admin-proxy-token`
3. Frontend en `http://localhost:3000` con:
   - `API_BASE_URL=http://127.0.0.1:3001`
   - `GAME_DATA_ADMIN_PROXY_TOKEN=admin-proxy-token`

Casos:

### 1. Acceso y carga

- Iniciar sesion con la cuenta admin.
- El menu superior muestra el link "Construccion" (solo con sesion iniciada).
- Entrar a `/construccion`:
  - Se ven la barra de herramientas, el panel izquierdo con pestanas
    Terreno / Objetos / NPCs, el lienzo con el mapa 1 centrado y la tira de
    recientes vacia.
  - El panel "Terreno" muestra la paleta del mapa (entradas con numero y
    punto rojo si estan bloqueadas).

### 2. Pincel de terreno

- En el panel Terreno, elegir un tile cualquiera. Hacer clic en el lienzo:
  el tile cambia y aparece el marcador "Aplicando cambios...".
- Arrastrar el mouse sobre varios tiles: se pinta en lote (una sola llamada).
- Verificar en el panel izquierdo "Actualizando..." y que el contador de
  Borradores en la barra suba.
- Probar zoom con la rueda (se ancla al cursor) y paneo con
  Shift+click o boton central.

### 3. Objetos

- Pestana "Objetos": buscar "espada" o por id. Cada item muestra miniatura,
  nombre y tipo.
- Seleccionar uno y hacer clic en el lienzo: aparece el objeto anclado al
  piso del tile (con la posicion del juego).
- El item queda en "Recientes"; hacer clic en el chip vuelve a seleccionar
  la herramienta.

### 4. NPCs

- Pestana "NPCs": se ven los NPCs con su personaje (cuerpo y cabeza).
- Seleccionar uno y colocarlo: se renderiza con un tinte violeta
  (se distingue de los objetos).
- En "Recientes" aparece con la miniatura de su cabeza.

### 5. Borrar

- Herramienta "Borrar": clic sobre un tile editado quita el override (las
  cuatro capas) o el borrador de la entidad.
- Nota: los cambios ya publicados no se borran con esta herramienta; se
  revierten con el boton "Revertir".

### 6. Publicar, descartar y revertir

- "Publicar": los borradores pasan a publicados; el contador de Publicados
  sube y Borradores baja. Recargar la pagina: los cambios persisten.
- Sin sesion de admin (o visitante anonimo), `/maps/1/overrides` sigue
  devolviendo solo lo publicado (vista de jugador).
- "Revertir": restaura el ultimo estado publicado (quita overrides y
  entidades publicados).
- "Descartar borradores": elimina los borradores sin tocar lo publicado
  (deshabilitado si no hay borradores).

### 7. Grilla y bloqueo

- Alternar "Grilla" y "Bloqueo" (botones arriba a la derecha del lienzo).
- El overlay de bloqueo muestra en rojo los tiles bloqueados del mapa base y
  en rojo mas intenso los bloqueados por override.

### 8. Subir PNG

- En el panel Terreno, "Subir PNG nuevo", elegir un PNG de 32x32 o multiplo
  de 32 (los de otro tamano se rechazan con mensaje claro).
- El grafico aparece en la seccion "Subidos" y se puede pintar en el mapa.

### 9. Cambio de mapa

- En la barra, cambiar el numero de mapa: el lienzo, la paleta, el estado y
  los recientes de ese mapa se recargan.

### 10. Seguridad

- Con sesion de un usuario NO admin: el proxy devuelve 403 y la pagina
  muestra el error ("El modo construccion no esta habilitado." / error de la
  API) sin romper el resto del sitio.
- Sin sesion: 401.

## Mensaje del PR

```markdown
## Que incluye

Implementacion del modo construccion (issue #29): un editor visual de mapas
con paleta de terreno, catalogo de objetos y NPCs, pintado de tiles, vista
previa en vivo y publicacion de cambios.

### Cliente (`frontend/`)

- Pagina `/construccion` con lienzo PixiJS (zoom con rueda, paneo con
  Shift+click o boton central, grilla, overlay de tiles bloqueados).
- Paleta de terreno por mapa (terrain.json + graficos subidos), con subida de
  PNG nuevos.
- Catalogos de objetos (con tipo y grhIndex) y de NPCs (cuerpo/cabeza) con
  busqueda, filtro por tipo y lista virtualizada.
- Herramientas de pincel de terreno (lote de hasta 500 tiles), colocacion de
  objetos/NPCs, borrado, y acciones Publicar / Descartar borradores / Revertir.
- Tira de elementos recientes (persistida en localStorage).
- Proxy `app/api/editor/[...path]` que reenvia al API con la sesion del
  usuario y el token de proxy de admin (`GAME_DATA_ADMIN_PROXY_TOKEN`,
  ya previsto como build arg en el Dockerfile). El token nunca llega al
  navegador.

### API (`api/`)

- Tabla `game_map_tile_entities` para objetos/NPCs colocados, con estado
  draft/published (mismo modelo que los overrides de tiles).
- Endpoints admin nuevos: `GET /admin/game-data/maps/:n/overrides`
  (con borradores), `PUT/DELETE /admin/game-data/maps/:n/entities`,
  `GET /admin/game-data/maps/:n/terrain`.
- `publish`/`discard`/`revert`/`status` extendidos para incluir entidades.
- `GET /internal/game-data/objects|npcs?all=true` para catalogo completo.
- `grhIndex` agregado al resumen de objetos.
- Restaurados los seeds faltantes `api/src/jsons/objs.json` y
  `api/src/jsons/npcs.json` (cierra #83): sin ellos los endpoints internos
  devuelven 500 y el CI falla.
- Tests de integracion nuevos: 4 casos en `world-builder.integration.test.ts`.

### Documentacion

- `docs/licensing-notes.md`: notas de licencia (el proyecto de referencia
  no declara licencia; todo el codigo es original).

## Como probar

Ver `docs/modo-construccion-guide.md` (paso a paso) o en sintesis:

1. Levantar API con las env `GAME_DATA_ADMIN_*` y frontend con
   `API_BASE_URL` apuntando a la API.
2. Entrar a `/construccion` con la cuenta admin.
3. Pintar terreno, colocar un objeto y un NPC, y publicar; verificar que un
   jugador anonimo ve los cambios en el juego.

## Nota sobre PRs existentes

Los seeds `objs.json`/`npcs.json` tambien estan en los PRs #96, #98 y #100
(issue #83). Si se mergean antes, este PR conserva los archivos tal cual y el
conflicto, si aparece, se resuelve manteniendo el contenido identico.
```
