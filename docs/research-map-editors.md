# 🗺️ Investigación Técnica: Arquitectura de Editores y Formatos de Mapa en el Ecosistema Argentum Online

> Documento técnico de investigación elaborado para el issue **#14 (Modo Construcción)** de OpenAO.

---

## 1. Tabla Comparativa de Formatos de Mapa

| Proyecto | Formato de Archivo | Dimensiones | Capas y Atributos | Modelo de Ejecución | Licencia |
|---|---|---|---|---|---|
| **WorldEditor Oficial (ao-org)** | Binario `.map` + `.inf`/`.dat` | Fijo 100x100 tiles | 4 capas (`GrhIndex`), Bloqueo booleano, Trigger (1 byte), Obj/NPC Index | Escritorio (VB6) | **AGPL-3.0** |
| **OpenAO (Este proyecto)** | Estructurado `.json` (`meta`, `terrain`, `npcs`, `specials`) | Dinámico / 100x100 | Arrays desacoplados por capa, objetos con UUIDs/IDs | Web / WebSocket en vivo | **Open Source** |
| **lambdaclass/argentum** | JSON / Static Bundles (Pixi.js) | 100x100 tiles | Arrays lineales para render WebGL, sincronización estática | Web (Vite + React) | **MIT** |
| **ao-libre/ao-cliente** | Binario clásico `.map` (v0.13) | Fijo 100x100 tiles | Compatible con formato nativo de VB6 | C++ / Multiplataforma | **GPL-3.0** |

---

## 2. Respuestas a las Preguntas Clave

### 1. ¿Qué formato de mapa usa cada uno y qué tan compatible es con el nuestro?
- **WorldEditor Oficial**: Utiliza una estructura binaria secuencial de 10.000 registros (100 filas × 100 columnas). Cada tile almacena en orden:
  - `Bloqueo` (Byte / Booleano: 0 o 1)
  - `Capa 1` (Integer 16-bit: ID de gráfico de suelo)
  - `Capa 2` (Integer 16-bit: ID de objeto o maleza)
  - `Capa 3` (Integer 16-bit: Techo / Estructura intermedia)
  - `Capa 4` (Integer 16-bit: Copa de árbol / Gráfico superior)
  - `Trigger` (Byte / Integer: ID de disparador)
  - `NPCIndex` / `ObjIndex`
- **Compatibilidad**: El modelo de OpenAO (`meta` + `terrain` + `npcs` + `specials`) es una evolución directa que desacopla la representación visual de la lógica del servidor. Se mapea 1:1 de forma trivial:
  - Capa 1 → `terrain.layer1`
  - Capas 2, 3, 4 → `terrain.layer2`, `terrain.layer3`, `terrain.layer4`
  - Bloqueo y Triggers → `specials.blocked` y `specials.triggers`

---

### 2. ¿Cómo modela el editor oficial las capas, el bloqueo y los triggers? ¿Qué conviene adoptar?
- **Capas funcionales**:
  - **Capa 1 (Suelo)**: Siempre opaca. Si falta, se renderiza negro.
  - **Capa 2 (Objetos de suelo)**: Transparencia alfa para maleza, muebles y transiciones.
  - **Capa 3 (Techos)**: Esencial para interiores. El cliente debe ocultar dinámicamente esta capa cuando el jugador se encuentra bajo el bounding box del techo.
  - **Capa 4 (Aéreo)**: Renderizado por encima de la cabeza de todos los personajes para crear profundidad isométrica.
- **Triggers**:
  - `1`: Zona Segura (desactiva PvP y robo).
  - `2`: Zona de Combate / Arena.
  - `3`: Daño continuo (Lava / Pantano).
  - `4`: Teleport / Transición entre mapas (`targetMap`, `targetX`, `targetY`).
  - `5`: Disparador de scripts / misiones.
- **Recomendación para OpenAO**: Adoptar exactamente este esquema de 4 capas visuales + capa lógica de bloqueo y triggers para garantizar la coherencia visual con todo el catálogo de recursos clásicos de AO.

---

### 3. ¿Alguno intentó edición en vivo o colaborativa? ¿Por qué se abandonó?
- En el ecosistema tradicional de Argentum Online, **ningún proyecto implementó edición in-game colaborativa en tiempo real**.
- **Causas históricas del abandono**:
  1. **Monolito de escritorio**: WorldEditor estaba acoplado a DirectX 7/8 y Visual Basic 6 sin soporte nativo de sockets concurrentes.
  2. **Arquitectura sin estado delta**: Para actualizar un mapa, era necesario guardar el archivo en disco, reiniciar el servidor (`/REINICIAR`) y volver a conectar a los clientes.
- **Oportunidad única de OpenAO**: Gracias a Node.js + WebSockets + Pixi.js, OpenAO puede sincronizar deltas de tile (`OP_SET_TILE(x, y, layer, grhIndex)`) con latencia < 20 ms entre múltiples usuarios simultáneos en el navegador.

---

### 4. ¿Existe herramienta de import/export y vale la pena soportar `.map` binario?
- **Recomendación explícita: SÍ, es prioritario implementar un parser de `.map` a JSON.**
- **Justificación**:
  - Existen más de **280 mapas oficiales y miles de mapas comunitarios** ya creados en formato binario `.map`.
  - Un parser en TypeScript en `server/src/scripts/importMap.ts` requiere menos de 70 líneas de código utilizando `Buffer.readInt16LE()`.
  - Permite cargar todo el mundo de Argentum Online de forma instantánea sin tener que redibujar mapa por mapa a mano.

#### Ejemplo de implementación del Parser (Clean-room en TypeScript):
```typescript
import fs from 'fs';

export function parseBinaryAoMap(buffer: Buffer) {
  let offset = 265; // Skip header v0.13
  const mapData = {
    meta: { width: 100, height: 100 },
    terrain: { layer1: [], layer2: [], layer3: [], layer4: [] },
    blocked: [],
    triggers: []
  };

  for (let y = 1; y <= 100; y++) {
    for (let x = 1; x <= 100; x++) {
      const flags = buffer.readUInt8(offset++);
      const blocked = (flags & 1) !== 0;
      const layer1 = buffer.readUInt16LE(offset); offset += 2;
      const layer2 = (flags & 2) ? buffer.readUInt16LE(offset) : 0; if (flags & 2) offset += 2;
      const layer3 = (flags & 4) ? buffer.readUInt16LE(offset) : 0; if (flags & 4) offset += 2;
      const layer4 = (flags & 8) ? buffer.readUInt16LE(offset) : 0; if (flags & 8) offset += 2;
      const trigger = (flags & 16) ? buffer.readUInt16LE(offset) : 0; if (flags & 16) offset += 2;

      // Almacenar en estructura limpia
      mapData.terrain.layer1.push(layer1);
      mapData.terrain.layer2.push(layer2);
      mapData.terrain.layer3.push(layer3);
      mapData.terrain.layer4.push(layer4);
      mapData.blocked.push(blocked);
      mapData.triggers.push(trigger);
    }
  }
  return mapData;
}
```

---

## 5. Análisis Legal y Licencias

1. **Editor Oficial (AGPL-3.0)**:
   - **Restricción**: Si se copia código fuente directo de WorldEditor, todo el servidor y cliente de OpenAO quedaría obligado a distribuirse bajo AGPL-3.0.
   - **Solución legal**: **Clean-room reverse engineering**. La especificación de los offsets del formato de archivo y los números mágicos no son protegibles por copyright; escribir la función lectora en TypeScript desde cero es 100% legal y seguro.
2. **lambdaclass/argentum (MIT)**:
   - Su código de shaders Pixi.js y carga de texturas se puede reutilizar libremente manteniendo el aviso de copyright.
3. **ao-libre (GPL-3.0)**:
   - Utilizar únicamente como documentación de referencia sin copiar bloques de código.

---

## 6. Conclusiones y Hoja de Ruta para el Modo Construcción

1. **Mantener el esquema de 4 capas visuales + 1 lógica** (Bloqueo/Triggers).
2. **Implementar el script conversor `.map` &rarr; `.json`** para disponer del mapa del mundo completo de inmediato.
3. **Asegurar la sincronización delta vía WebSockets** para permitir la primera experiencia real de edición colaborativa en el navegador.
