# Investigación: cómo editan mapas otros proyectos de Argentum Online

Parte de #2 (modo construcción). Documento de investigación, sin cambios de código.

## Alcance y método

Se revisaron los tres proyectos listados en la issue a partir de su código público, su
estructura de archivos y su documentación. **No se ejecutó ninguno de ellos**: el objetivo
es entender el modelo de datos y las decisiones de diseño, no validar comportamiento en
runtime. Donde la conclusión depende de lectura parcial del código se marca con
`(verificar)` para que quien retome la issue lo confirme antes de citarlo como hecho.

Proyectos revisados:

| Proyecto | Qué es |
|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial, VB6, escritorio, AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente web: Vite + TypeScript + React + Pixi.js |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de la comunidad |

## Nuestro formato, para poder comparar

OpenAO no usa el `.map` binario. Cada mapa vive en `api/src/mapas_source/mapa_<id>/`
partido en cuatro archivos JSON:

| Archivo | Contenido |
|---|---|
| `meta.json` | Cabecera: id, nombre, música, terreno, zona, restricciones, flags (pk, backup, magiaSinEfecto, maxLevel) |
| `terrain.json` | Grilla de tiles del mapa (capas gráficas + bloqueo) |
| `npcs.json` | Lista plana de `{mapNum, x, y, npcIndex, movement?}` |
| `specials.json` | `exits` con clave `"x,y"` y destino `{map, x, y}` o `destinations[]` |

Consecuencias directas de este formato, relevantes para el modo construcción:

- Es **texto y diffeable**: dos personas pueden editar mapas distintos en paralelo sin
  conflictos binarios, y un PR de mapa se revisa línea a línea.
- `specials.json` ya separa el trigger del tile: el trigger es dato, no un byte escondido
  en una capa.
- El costo es tamaño y velocidad de parseo frente a un binario de 100×100×4 bytes.

## Tabla comparativa de formatos

| Proyecto | Formato de mapa | Capas | Bloqueo | Triggers / salidas | Edición en vivo o colaborativa | Import / export | Licencia |
|---|---|---|---|---|---|---|---|
| **OpenAO (nosotros)** | JSON por mapa (`meta`/`terrain`/`npcs`/`specials`) | Explícitas en `terrain.json` | Flag por tile en `terrain.json` | `specials.json`, clave `"x,y"` → destino | No implementada (objetivo del modo construcción) | No | — |
| **Editor oficial (VB6)** | `.map` binario: cabecera + 100×100×4 bytes + NPCs + objetos + salidas | 3 capas gráficas + capa de bloqueo, en el mismo bloque de tiles | Byte de bloqueo por tile, editado con pincel | Salidas como registros con mapa/x/y destino | No: escritorio monousuario, sin locking ni merge | No hay herramienta pública; el `.map` es el único puente | AGPL-3.0 |
| **lambdaclass/argentum** | `.map` binario del ecosistema, parseado en TypeScript para renderizar | Las del binario | Las del binario | Las del binario | No (el cliente solo lee) `(verificar)` | No | MIT `(verificar)` |
| **ao-libre/ao-cliente** | `.map` binario del ecosistema | Las del binario | Las del binario | Las del binario | No | No | GPL-3.0 `(verificar)` |

Conclusión de la tabla: **los tres proyectos comparten el mismo formato binario** y ninguno
aporta un modelo de edición alternativo. La diversidad que la issue esperaba encontrar no
existe; lo que sí existe es un formato de facto que conviene poder importar.

## Respuestas a las preguntas de la issue

### 1. Formato de cada uno y compatibilidad con el nuestro

Los tres usan el `.map` binario del ecosistema. **Ninguno es compatible con nuestro JSON**
ni de forma directa ni mediante una capa de nombres: la diferencia no es de esquema sino de
representación (binario contiguo vs. archivos JSON separados). Cualquier compatibilidad
requiere un conversor explícito, que hoy no existe en ninguno de los tres.

### 2. Cómo modela el editor oficial capas, bloqueo y triggers

El editor oficial trata el mapa como un buffer plano de 100×100 tiles donde cada tile son
cuatro bytes consecutivos: tres capas gráficas y un byte de bloqueo. El bloqueo **no es una
capa lógica separada**, es el cuarto byte del mismo tile, y se pinta con la misma herramienta
que los gráficos. Los triggers y salidas van después del bloque de tiles, como registros con
coordenada y destino.

Decisiones que vale la pena copiar:

- **Bloqueo por tile y adyacente al gráfico**: al editar se ve el bloqueo del mismo tile que
  se está pintando, sin cambiar de modo. Nuestro `terrain.json` debería mantener el flag en
  la misma entrada que las capas para conservar esa ergonomía.
- **Salidas como registros con destino completo** (`map`, `x`, `y`): ya es lo que hace
  `specials.json`; no hay que cambiarlo.

Decisiones que **no** conviene copiar:

- **Bloqueo como byte dentro del tile**: impide bloquear sin gráfico y obliga a reescribir el
  tile entero. En JSON el flag puede ser independiente sin costo.
- **Cabecera y tiles en el mismo archivo**: hace que cambiar el nombre del mapa toque el
  binario completo. Nuestro `meta.json` separado es mejor para diffs.

### 3. Edición en vivo o colaborativa

Ninguno de los tres la intentó. El editor oficial es una app de escritorio VB6 monousuario:
se abre el `.map`, se guarda el `.map`, sin locking ni merge. Los dos clientes son de solo
lectura. No hay por tanto un intento abandonado del que sacar un post-mortem; lo que hay es
una **ausencia**, y esa ausencia es la justificación del modo construcción.

El riesgo conocido de la edición colaborativa en AO no viene de ningún proyecto, viene del
formato: al ser binario, dos ediciones concurrentes del mismo mapa no se pueden fusionar y
una gana. Nuestro JSON elimina ese problema de raíz.

### 4. Herramientas de import / export

No hay ninguna pública. El único puente real entre formatos es el propio `.map`: si
queremos mapas existentes, hay que escribir el importador nosotros.

Importar mapas del editor oficial sí es una ventaja concreta y acotada: el binario es
estable y conocido, y el resultado sería un mapa jugable sin trabajo manual. Propuesta de
alcance mínimo, como herramienta de una sola dirección (`.map` → JSON, nunca al revés):

1. Leer cabecera y validar versión y número de mapa.
2. Volcar los tiles a `terrain.json` conservando capas y flag de bloqueo.
3. Volcar NPCs a `npcs.json` y salidas a `specials.json`.
4. Escribir `meta.json` con los campos de cabecera mapeados.
5. Marcar el mapa como importado para no reimportar encima de ediciones manuales.

La vuelta JSON → `.map` no es necesaria mientras el servidor lea JSON.

### 5. Licencias y qué implican

| Proyecto | Licencia | Qué implica |
|---|---|---|
| Editor oficial | **AGPL-3.0** | Copiar código VB6 al repo arrastra AGPL al conjunto. Reimplementar a partir del formato no. |
| lambdaclass/argentum | MIT `(verificar)` | Reutilizable con atribución; es la fuente más cómoda para mirar un parser de `.map`. |
| ao-libre/ao-cliente | GPL-3.0 `(verificar)` | Copiar código obliga a GPL-3.0 en el derivado; las ideas son libres. |

Regla práctica para el proyecto: **inspirarse en el formato y en las ideas es seguro;
copiar archivos de código solo es seguro desde lambdaclass (MIT) y con atribución.** Si
alguna vez se copia código del editor oficial, hay que asumir AGPL-3.0 y revisarlo antes de
mezclarlo con el resto.

## Decisiones de diseño que esta investigación respalda

- **JSON por mapa y por responsabilidad**: ningún proyecto revisado lo hace, y es lo que
  habilita edición en paralelo y revisión por PR.
- **Triggers como dato en `specials.json`**: coincide con el modelo del editor oficial y
  evita triggers escondidos en capas.
- **Bloqueo como flag propio**: el editor oficial lo mete en el tile por limitación del
  binario; nosotros no tenemos esa limitación.
- **Importador de una sola dirección**: cubre el caso real (traer mapas existentes) sin
  comprometernos a mantener un exportador que nadie pidió.

## Pendientes

- Confirmar licencias de lambdaclass/argentum y ao-libre/ao-cliente antes de citar código.
- Confirmar si lambdaclass/argentum tiene algún editor además del visor `(verificar)`.
- Abrir issue aparte para el importador `.map` → JSON con el alcance de arriba.
