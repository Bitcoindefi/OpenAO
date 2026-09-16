# Notas de licencia

## Referencia conceptual: AO-object-editor

Este modo construccion se inspira en el proyecto de referencia:

- Repositorio: https://github.com/elpatoenlasolas/AO-object-editor
- Licencia del repositorio: **sin licencia declarada** (sin LICENSE, sin README
  de licencia al momento de escribir estas notas).

Por ese motivo todo el codigo de esta implementacion es **original**: no se
copio codigo, texto, assets ni estructura interna del repositorio de
referencia. Se uso unicamente como fuente de informacion conceptual sobre el
flujo de edicion de mapas (paleta de terreno, catalogo de objetos y NPCs,
pintado de tiles, vista previa en vivo, publicacion de cambios).

Cualquier coincidencia en nombres de archivos o de componentes es generica
(editor, paleta, browser) y no deriva de la obra de referencia.

## Datos de juego (api/src/jsons)

- `objs.json`: copiado de `frontend/public/init/objs.json`, que es parte del
  propio repositorio (datos del juego Argentum Online original).
- `npcs.json`: datos del juego Argentum Online original, obtenidos del branch
  `fix/npcs-json-seed` del PR #98 del repositorio principal, que restaura el
  archivo faltante del seed. Los datos de juego de Argentum Online son de
  codigo abierto (GPL) desde sus origenes.

## Dependencias

No se agregaron dependencias nuevas; se usan las ya presentes
(pixi.js, next, react) con sus licencias existentes.
