# Cómo editan mapas los otros proyectos de Argentum Online

Investigación para #14 (modo construcción, ver #2). Todas las afirmaciones sobre
código ajeno están ancladas a un commit fijo de cada repositorio para que se
puedan verificar línea por línea; no se especula sobre versiones futuras ni
sobre ramas que no se revisaron.

Commits de referencia usados en esta investigación:

- `ao-org/argentum-online-worldeditor` @ [`8917c23`](https://github.com/ao-org/argentum-online-worldeditor/commit/8917c236888a84db5454822071512716b250e66b)
- `lambdaclass/argentum` @ [`1699a66`](https://github.com/lambdaclass/argentum/commit/1699a662e6352bfcc9ea5905c6d6f2c0157cb1e7)
- `ao-libre/ao-cliente` @ [`7d32d61`](https://github.com/ao-libre/ao-cliente/commit/7d32d61759d6b95069aba72ae12bed03c1d13700)

## 1. Tabla comparativa de formatos de mapa

| Proyecto | Qué es | Formato de mapa | Tamaño | Capas de gráfico | Bloqueo | Trigger | Licencia |
|---|---|---|---|---|---|---|---|
| **ao-org/argentum-online-worldeditor** | Editor oficial, VB6, escritorio | Binario propio: `.map` (header de clima/música) + `.inf` (datos por tile) + `.dat` texto (nombre, zona, etc., vía `MapInfo_Guardar`) | Fijo 100×100 (`XMaxMapSize`/`YMaxMapSize = 100`, `Public Const ... As Byte`) | 4 (`Graphic(1..4)`, capas 2–4 opcionales con flag de "¿usada?") | 1 bit por tile (`Blocked`) | 1 byte por tile (`Trigger`), además de exits/objetos/NPCs en el `.inf` | **AGPL-3.0** |
| **lambdaclass/argentum** | Cliente + servidor web: Rust/Elixir en el backend, TypeScript/React/Pixi.js en el cliente | **No define un formato propio.** `Arena.Map.CsmParser` parsea el binario heredado `.csm` ("Custom Screen Map", mismo linaje VB6: Int16/Int32 little-endian, 4 capas, bloqueo por flags, triggers, exits, NPCs, objetos) | 100×100 (constante del parser; `tiles` es una lista plana de 10000 bytes) | 4 (`layers: [[], [], [], []]` en `MapData`) | Byte de flags por tile (bits norte/este/sur/oeste/GM, no booleano simple) | Lista `triggers` separada, igual que exits/npcs/objects | **Apache-2.0** |
| **ao-libre/ao-cliente** | Cliente de la comunidad, VB6 | Mismo modelo conceptual que el editor oficial: `Blocked` booleano y `Graphic(1)`/`Graphic(2)` por tile en `mPooMap.bas`, enum `eTrigger` (`BAJOTECHO`, `CASA`, ...) | No se localizó una constante de tamaño distinta a 100×100; no se revisó el loader binario completo (no se encontró un `modMapIO.bas` equivalente en el árbol del repo) | 4 (mismo patrón `Graphic(1..4)`) | Booleano (`Map_GetBlocked`/`Map_SetBlocked`) | Enum de triggers por tile | **AGPL-3.0** |
| **OpenAO (este repo)** | Web, edición en vivo vía WebSocket | JSON: `meta.json` + `terrain.json` (`palette` + `rows` indexados) + `specials.json` (`exits`/`objects`/`npcs`/`triggers`) + `npcs.json`, en `api/src/mapas_source/mapa_<id>/` | Mapas reales medidos en 100×100 (`terrain.json.width/height`) | La paleta admite 1 o varios gráficos por entrada (`graphics` es número o array; ~42% de las 65 523 entradas de paleta revisadas en los mapas actuales usan array, es decir más de una capa) | Booleano por entrada de paleta (`blocked`) | `specials.json.triggers`, separado de `exits`/`objects`/`npcs` (71 de 294 mapas revisados tienen al menos un trigger) | Sin licencia declarada a nivel de repo |

**Compatibilidad con el formato de OpenAO:** ninguno de los tres es compatible
byte a byte ni campo a campo. Los tres proyectos AO (oficial, lambdaclass,
ao-libre) comparten el mismo modelo conceptual heredado de VB6 (4 capas de
gráfico, bloqueo, trigger, exits/objetos/NPCs por separado), que es
básicamente el mismo que ya eligió OpenAO para `terrain.json`/`specials.json`.
La diferencia real es solo de serialización: binario de ancho fijo con
`Put`/`Get` posicional vs. JSON con paleta indexada. Esto hace que escribir un
importador sea un problema de parseo acotado, no un rediseño de modelo.

## 2. Respuestas a las preguntas de la issue

**1. ¿Qué formato usa cada uno y es compatible con el nuestro?**
Ver tabla. El editor oficial y `ao-libre/ao-cliente` son binarios VB6
(`.map`/`.inf`/`.dat`); `lambdaclass/argentum` no diseñó un formato propio,
sino que escribió un parser Elixir (`csm_parser.ex`) para el mismo binario
heredado bajo el nombre `.csm`. Ninguno es compatible directamente con el
JSON de OpenAO, pero el modelo de datos subyacente es equivalente.

**2. ¿Cómo modela el editor oficial las capas, el bloqueo y los triggers? ¿Hay algo que valga la pena copiar?**
4 capas de gráfico por tile (la 1 siempre presente, 2–4 marcadas como
"usada" o no para ahorrar espacio), 1 bit de bloqueo, 1 byte de trigger,
y un **undo de 30 pasos** (`maxDeshacer = 30`, `MapData_Deshacer`) que guarda
una copia del estado anterior del área editada — no se encontró un
"Rehacer" (redo) equivalente. Lo que vale la pena copiar conceptualmente: el
límite explícito y fijo de historial de undo (evita crecimiento ilimitado de
memoria) y la separación de "capa usada / no usada" para no gastar espacio en
las capas 2–4 cuando no hacen falta — OpenAO ya resuelve esto distinto (el
`graphics` de la paleta es número o array), así que no hay una migración
directa, pero el límite fijo de historial es aplicable a cualquier futura
pila de undo del modo construcción.

**3. ¿Alguno intentó edición en vivo o colaborativa? ¿Por qué la abandonaron?**
No se encontró evidencia de edición en vivo ni colaborativa en ninguno de
los tres. El editor oficial es una app de escritorio de un solo usuario sobre
archivos locales. `lambdaclass/argentum` no tiene ningún módulo de edición de
mapas en su árbol (se buscó `editor`/`map_editor` en todo el repo y no
aparece); solo consume mapas ya generados. `ao-libre/ao-cliente` es un
cliente de juego, no un editor. No hay registros de que alguno lo haya
intentado y abandonado — simplemente nunca se construyó, lo cual es distinto
de "se abandonó". No corresponde afirmar un motivo de abandono que no existe.

**4. ¿Hay una herramienta de import/export entre formatos?**
No se encontró ninguna en los tres repositorios revisados. El parser más
cercano a un "importador" es `Arena.Map.CsmParser` de lambdaclass, pero lee
el binario legado para que el propio servidor lo use en runtime, no para
convertirlo a otro formato de autoría ni para exportarlo.

**5. ¿Qué licencia tiene cada uno y qué implica?**

- Editor oficial: **AGPL-3.0**.
- `lambdaclass/argentum`: **Apache-2.0**.
- `ao-libre/ao-cliente`: **AGPL-3.0**.
- OpenAO: sin licencia declarada en el repo (no hay archivo `LICENSE`).

AGPL-3.0 es copyleft fuerte y de red: si OpenAO copiara código fuente del
editor oficial o de `ao-libre/ao-cliente` (no solo el formato, sino
implementación), el modo construcción completo tendría que licenciarse como
AGPL-3.0 y OpenAO tendría que ofrecer su código fuente a cualquier usuario que
lo use por red. El patrón que ya sigue `docs/licensing-notes.md` en este
repo —usar un proyecto de licencia incompatible solo como referencia
conceptual, sin copiar código— es el correcto y debería aplicarse igual
aquí: cualquier importador de `.map`/`.inf`/`.dat` tiene que ser una
reimplementación propia del parseo binario a partir de la especificación de
campos, no una traducción de `modMapIO.bas`. Apache-2.0 (`lambdaclass/argentum`)
sí permite tomar código directamente con atribución, pero como se explica en
la pregunta 4 no hay ningún módulo de edición ahí para reutilizar — solo el
parser de lectura del `.csm`, que de todos modos no aplica (OpenAO no
necesita leer `.csm`, sino `.map`/`.inf`/`.dat`).

## 3. Qué se puede reutilizar y bajo qué licencia

- **Nada de código binario se puede copiar del editor oficial ni de
  `ao-libre/ao-cliente`** sin arrastrar AGPL-3.0 a todo el modo construcción.
  Lo reutilizable de ahí es únicamente la **especificación de campos**
  (orden de bytes, tamaños, significado), que es un hecho técnico y no una
  expresión protegida por copyright de la misma forma que el código.
- De `lambdaclass/argentum` (Apache-2.0) se podría tomar código con
  atribución si hiciera falta, pero no hay nada en su módulo de mapas que
  OpenAO necesite: no tiene editor ni formato de autoría propio.
- Conclusión práctica: cualquier importador que escriba OpenAO debe ser
  código nuevo basado en la especificación de bytes, documentado igual que
  ya se documentó `AO-object-editor` en `docs/licensing-notes.md`.

## 4. Recomendación sobre importar el formato del editor oficial

**Sí vale la pena, pero como importador de solo lectura y en una fase
posterior, no como parte de la issue de investigación ni del modo
construcción inicial.** Razones:

- El formato `.map`/`.inf`/`.dat` es binario de ancho fijo y ya está
  documentado campo por campo en `modMapIO.bas` (`MapaV3_Cargar`,
  líneas ~524–696 del commit citado): no hace falta ingeniería inversa, solo
  transcribir el parseo.
- El modelo de datos (4 capas, bloqueo, trigger, exits/objetos/NPCs) ya
  coincide con lo que OpenAO modela en `terrain.json`/`specials.json`, así
  que no se necesita rediseñar el esquema interno, solo escribir un
  conversor de un lado al otro.
- El riesgo real no es el parseo sino la pérdida de información: cosas como
  el clima/música del header `.map`, el `Trigger` de 1 byte (hay más de un
  tipo de trigger en el juego original) y el `.dat` de texto no tienen todavía
  un lugar 1:1 en el esquema de OpenAO. Un importador debería emitir un
  **reporte de pérdidas** explícito (qué campos no se pudieron mapear) en vez
  de descartarlos en silencio.
- No conviene meterlo en el alcance de #2 porque no es necesario para que el
  modo construcción funcione; es una ventaja de adopción (mapas ya hechos
  por la comunidad), no un bloqueante.

No se recomienda, en cambio, invertir en el `.csm` de `lambdaclass/argentum`
como fuente de import: es el mismo formato binario legado visto desde otro
parser, no una fuente adicional de mapas distinta, y hoy no hay mapas de la
comunidad distribuidos específicamente en ese contenedor fuera de su propio
repo.

## 5. Errores conocidos o limitaciones encontradas en el código ajeno

Todo lo siguiente se verificó leyendo el código fuente citado, no son
suposiciones:

- **Guardado no atómico en el editor oficial.** `MapaV2_Guardar`
  (`modMapIO.bas`, líneas ~374–386) borra (`Kill`) el `.map` y el `.inf`
  viejos **antes** de terminar de escribir los nuevos. Si el proceso se
  interrumpe (crash, disco lleno) entre el `Kill` y el último `Put`, el mapa
  queda corrupto o vacío sin backup automático. OpenAO, al guardar en una
  base de datos transaccional en vez de sobrescribir archivos sueltos, ya
  evita esta clase de error por diseño; vale la pena mantenerlo así a
  propósito si en algún momento se agrega export a archivo.
- **Undo de profundidad fija y sin redo.** El editor oficial soporta 30 pasos
  de deshacer (`maxDeshacer = 30`) pero no se encontró un mecanismo de
  rehacer. Si el modo construcción agrega una pila de undo, fijar un límite
  explícito es una decisión ya probada en el ecosistema, pero agregar redo
  sería una mejora real sobre lo que existe.
- **Tamaño de mapa fijo en 100×100 en los tres proyectos AO.** Ninguno
  soporta mapas de otro tamaño; es una limitación estructural heredada, no
  una elección de diseño reciente. OpenAO hoy también usa 100×100 en sus
  mapas reales, así que no es una divergencia, pero tampoco hay en el
  ecosistema un precedente de cómo migrar a tamaños variables si hiciera
  falta en el futuro.
- **Ningún proyecto separa claramente "archivo de autoría" de "formato de
  runtime".** El editor oficial y `ao-libre/ao-cliente` leen y escriben el
  mismo binario que después carga el servidor de juego; no hay una capa de
  edición intermedia. Esto es exactamente lo que el modo construcción de
  OpenAO evita al tener `meta`/`terrain`/`specials`/`npcs` como fuente y una
  tubería de publicación hacia el runtime — es una validación del enfoque
  actual, no una corrección pendiente.

## 6. Confirmación de la hipótesis

**Confirmada, con la evidencia revisada.** En los tres repositorios no se
encontró ningún módulo de edición de mapas en vivo ni colaborativa: el
editor oficial es una aplicación de escritorio de un solo usuario sobre
archivos locales, `lambdaclass/argentum` no incluye ningún editor de mapas en
absoluto (solo consume el binario legado en runtime), y `ao-libre/ao-cliente`
es un cliente de juego sin funciones de edición. Ningún repositorio muestra
tampoco una arquitectura cliente-servidor pensada para edición en navegador.
Esto no demuestra que sea imposible que exista en otra parte del ecosistema
AO no cubierta por esta issue (hay muchos forks y variantes no listados
aquí), pero dentro del alcance pedido —los tres proyectos de la tabla— el
modo construcción de OpenAO no tiene un precedente directo que lo haga
redundante.
