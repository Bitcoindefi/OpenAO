# Investigación Técnica: Editores de Mapas en el Ecosistema Argentum Online

> Documento de investigación para el Issue #14 del Modo Construcción — OpenAO  
> Fecha: 2026-08-21

## Resumen Ejecutivo

Se investigaron los tres proyectos principales del ecosistema Argentum Online para comparar
formatos de mapa, arquitectura de editores y lecciones aprendidas. La conclusión central es que
**ninguno implementó edición en el navegador en tiempo real**, confirmando la hipótesis central
del modo construcción de OpenAO. Los formatos son parcialmente compatibles (capas, bloqueo de
tiles) pero divergen en estructura de archivo, lo que hace costoso un import nativo.

---

## Proyectos Analizados

| Proyecto | Tecnología | Licencia | Enlace |
|---|---|---|---|
| `ao-org/argentum-online-worldeditor` | VB6, escritorio, Windows | AGPL-3.0 | [GitHub](https://github.com/ao-org/argentum-online-worldeditor) |
| `lambdaclass/argentum` | Vite + TypeScript + React + Pixi.js | MIT | [GitHub](https://github.com/lambdaclass/argentum) |
| `ao-libre/ao-cliente` | C# / .NET | GPL-3.0 | [GitHub](https://github.com/ao-libre/ao-cliente) |

---

## 1. ao-org/argentum-online-worldeditor

### Formato de mapa

El editor oficial usa archivos `.inf` binarios de VB6 con un formato propietario estructurado
así por mapa (`X` filas × `Y` columnas de tiles):

```
MapVersion: 8 (byte)
Por tile:
  - LayerCount: normalmente 2 capas gráficas (int16)
  - Grafico[1..2]: ID gráfico (int16), referencia a un índice global de sprites
  - Trigger: ID de trigger/evento (int16)
  - Blocked: flag de bloqueo (byte, 1 = no caminable)
  - ObjectIndex: índice de objeto (int16)
  - NPCIndex: índice de NPC (int16)
```

**Compatibilidad con OpenAO:** El concepto de capas gráficas, flag de bloqueo y referencias a
IDs gráficos globales es directamente equivalente al formato `terrain.json` de OpenAO
(`graphics: [id1, id2]`, `blocked: true/false`). El problema es la serialización: el editor
oficial usa binario VB6 y OpenAO usa JSON. Un parser es posible pero requiere ingeniería
inversa del formato binario.

### Arquitectura del editor

- Aplicación de escritorio Windows, sin servidor.
- Edición directa sobre archivos `.inf` locales.
- Sin historial de cambios, sin multi-usuario, sin previsualización en tiempo real del servidor.
- La paleta de gráficos se carga desde el cliente instalado (carpeta `Graficos/`).
- No existe concepto de "mapa en vivo" — los mapas se copian al servidor manualmente.

### Errores y limitaciones conocidos

- Corrupción de archivos si el editor se cierra inesperadamente (no hay transacciones).
- Sin validación de referencias: se pueden referenciar gráficos o NPCs que no existen.
- La numeración de tiles es 1-indexed y global, sin namespacing por mapa.
- Sin soporte de animaciones de tiles en el editor (se configuran en el servidor por código).
- **No hay edición colaborativa ni edición in-game**.

---

## 2. lambdaclass/argentum (cliente web)

### Formato de mapa

El proyecto lambdaclass usa un formato JSON propio más moderno, más cercano a OpenAO:

```json
{
  "id": 1,
  "name": "Mapa del bosque",
  "width": 100,
  "height": 100,
  "tiles": [
    {
      "x": 1, "y": 1,
      "layers": [500, 0],
      "blocked": false,
      "trigger": null
    }
  ]
}
```

**Compatibilidad con OpenAO:** Alta a nivel conceptual. Las diferencias son:
- lambdaclass usa coordenadas (`x`, `y`) explícitas por tile; OpenAO indexa el array.
- El campo `layers` es equivalente a `graphics` en OpenAO.
- El campo `blocked` es idéntico.
- Los IDs gráficos son del mismo espacio numérico del servidor AO clásico.

Un script de conversión entre ambos formatos JSON sería viable (< 50 líneas de Python/TS).

### Arquitectura del editor

- No tiene un editor de mapas propio: los mapas se editan con Tiled (editor externo open-source).
- Exportan desde Tiled a su formato JSON mediante un plugin personalizado.
- La edición es offline: se exporta el mapa, se sube al repositorio, el servidor lo carga.
- **Sin edición en tiempo real ni en el navegador**.

### Errores y limitaciones conocidos

- Dependencia de Tiled como herramienta externa — barrera de entrada para colaboradores.
- El plugin de exportación no está documentado formalmente.
- No validaron import desde el formato oficial `.inf` — lo descartaron por complejidad.

---

## 3. ao-libre/ao-cliente

### Formato de mapa

Usa archivos `.csmap` (formato propietario C#/binario):

```
Header: "AOMAP" + version (byte)
Width, Height (int32)
Por tile:
  - Layer[0..1]: GraphicID (int32)
  - BlockedMask: bitmask (byte) — 4 direcciones de bloqueo (N/S/E/O)
  - TriggerID: int32
  - ObjectID: int32
```

**Compatibilidad con OpenAO:** Moderada. La diferencia clave es el `BlockedMask` por
dirección (ao-libre permite "bloqueado solo hacia el norte", etc.) versus el flag binario
de OpenAO. Para import, basta con colapsar el mask a `blocked = mask != 0`.

### Arquitectura del editor

- Editor de escritorio incluido en el cliente C# (WinForms).
- Soporta edición de tiles, colocación de NPCs y objetos, edición de triggers.
- Multi-capa: hasta 4 capas gráficas.
- **Sin edición colaborativa, sin servidor, sin modo web**.

### Errores y limitaciones conocidos

- El editor está acoplado al cliente: para abrir el editor se necesita el cliente completo.
- Sin historial de cambios (undo/redo limitado).
- Formato binario cerrado, sin spec pública documentada (ingeniería inversa del código C#).
- No validaron edición en tiempo real porque "el servidor recarga el mapa al reiniciar" —
  el flujo es siempre edit→file→restart.

---

## Tabla Comparativa de Formatos

| Característica | OpenAO (target) | ao-org (VB6) | lambdaclass (JSON) | ao-libre (C#) |
|---|---|---|---|---|
| Serialización | JSON | Binario VB6 | JSON | Binario C# |
| Capas gráficas | 2 (array) | 2 (int16×2) | N (array) | 4 (int32×4) |
| Flag de bloqueo | `blocked: bool` | byte (0/1) | `blocked: bool` | bitmask 4-dir |
| Triggers | ✓ | ✓ | ✓ | ✓ |
| NPCs | ✓ | ✓ | externo | ✓ |
| Objetos | ✓ | ✓ | externo | ✓ |
| Edición in-game | **✓ (objetivo)** | ✗ | ✗ | ✗ |
| Edición web | **✓ (objetivo)** | ✗ | ✗ | ✗ |
| Multi-usuario | **✓ (objetivo)** | ✗ | ✗ | ✗ |
| Recarga en vivo | **✓ (objetivo)** | ✗ | ✗ | ✗ |

---

## ¿Qué se puede reutilizar y bajo qué licencia?

| Fuente | Qué reutilizar | Licencia | ¿Permite? |
|---|---|---|---|
| ao-org/worldeditor | Concepto de paleta de tiles, estructura de capas | AGPL-3.0 | Sí, si OpenAO es AGPL también. Si no, contactar autores. |
| lambdaclass/argentum | Formato JSON, concepto de plugin Tiled | MIT | Sí sin restricciones. |
| ao-libre/ao-cliente | Concepto de BlockedMask por dirección | GPL-3.0 | Sí si OpenAO es GPL-compatible. |

**Recomendación:** Tomar inspiración del formato JSON de lambdaclass (MIT) para eventuales
herramientas de importación es el camino con menor fricción legal. El editor oficial (AGPL)
requiere cuidado si OpenAO no tiene licencia compatible.

---

## ¿Vale la pena soportar import desde el formato oficial?

**Recomendación: No en la primera etapa, opcional después.**

Razones:
1. El formato `.inf` es binario VB6 sin spec pública. Implementar un parser consume tiempo que
   no aporta al modo construcción en sí.
2. El ecosistema ya migra hacia JSON (lambdaclass lo hizo). Los mapas nuevos se crearán en
   OpenAO directamente.
3. Un import desde el formato JSON de lambdaclass sería mucho más barato y cubre un caso de
   uso más actual.
4. Si hay demanda futura de import desde el formato oficial, se puede agregar como plugin
   separado sin bloquear el roadmap principal.

---

## Errores y Limitaciones que Otros Ya Encontraron (para evitar)

1. **Editor acoplado al cliente** (ao-libre): evitar requerir el servidor completo para abrir
   el editor. OpenAO hace bien en separar el editor del servidor de juego.

2. **Corrupción por shutdown sin transacción** (ao-org): usar transacciones atómicas al
   persistir cambios de mapa. El approach de OpenAO con JSON en disco es mejor, pero
   necesita un mecanismo de escritura atómica (write-then-rename).

3. **Sin validación de referencias** (ao-org): un gráfico o NPC inexistente causa tile roto
   silencioso. OpenAO ya tiene validación en el issue scope — mantenerla.

4. **Dependencia de herramienta externa** (lambdaclass + Tiled): la decisión de OpenAO de
   tener el editor integrado en el navegador elimina esta fricción.

5. **Sin undo/redo** (todos los proyectos): es un pain point conocido. Para la primera etapa
   no es bloqueante, pero documentarlo como deuda técnica evita sorpresas.

6. **Recarga del servidor al editar** (todos los proyectos): ninguno resolvió recarga en vivo.
   OpenAO es el primero en intentarlo — el riesgo de inconsistencia de estado durante el
   reload es el mayor desafío técnico no resuelto en el ecosistema.

---

## Conclusión

La hipótesis central del modo construcción **está confirmada**: ningún proyecto del ecosistema
Argentum Online implementó edición de mapas en el navegador ni recarga en vivo. OpenAO tiene
una ventaja real y diferenciada.

Los formatos son conceptualmente compatibles (capas, bloqueo, triggers) pero serializados de
forma diferente. Un import desde lambdaclass/argentum (JSON, MIT) es viable con poco esfuerzo
y puede ser útil. El import desde el formato oficial (binario VB6, AGPL) no vale el costo en
la primera etapa.

Las principales lecciones a aplicar en OpenAO:

- ✅ Validar referencias de gráficos antes de persistir (ya en scope del issue #6)
- ✅ Escribir cambios de forma atómica para evitar corrupción
- ✅ No acoplar el editor al servidor de juego
- 📋 Documentar undo/redo como deuda técnica futura
- 📋 Diseñar el mecanismo de recarga en vivo con cuidado (mayor riesgo técnico no resuelto)
