# 🗺️ Argentum Online Map Editor Ecosystem Research & Architecture Guide

## Executive Summary
This document provides a comprehensive technical audit of map editing systems across the Argentum Online (AO) open-source ecosystem, comparing legacy desktop editors with modern web implementations to inform the architecture of OpenAO's in-browser **World Builder (Modo Construcción)**.

---

## 1. Comparative Matrix of Map Formats

| Feature / Dimension | Official WorldEditor (`ao-org`) | LambdaClass Argentum (`lambdaclass`) | AO-Libre (`ao-libre`) | OpenAO (`Bitcoindefi/OpenAO`) |
|---|---|---|---|---|
| **Tech Stack** | Visual Basic 6.0 / DirectX 7/8 | TypeScript / React / Pixi.js / Vite | C# / Mono / SDL2 / OpenGL | TypeScript / React / Next.js / Canvas |
| **File Format** | Binary `.map` (Header + $100 \times 100$ tiles) | JSON / Tilemaps | Compressed Binary `.map` | Structured JSON (`meta`, `terrain`, `npcs`, `specials`) |
| **Layer Architecture** | 4 Graphics Layers + 1 Blockage + Triggers | 3 Rendering Layers + Collision Matrix | 4 Graphics Layers + Logic Layer | Multi-layer Canvas (`Layer 1-4`, `Bloqueo`, `Triggers`) |
| **Coordinate Space** | $100 \times 100$ grid (1-indexed: $X: 1..100, Y: 1..100$) | Arbitrary / Chunked | $100 \times 100$ grid | $100 \times 100$ grid with chunk streaming |
| **Live Multi-user Editing** | ❌ No (Single desktop binary) | ❌ No (Read-only client runtime) | ❌ No (Desktop editor) | ✅ **Yes** (Real-time WebSocket deltas & drafts) |
| **License** | AGPL-3.0 | MIT | GPL-3.0 | Open Source / Proprietary Permissive |

---

## 2. Layer Modeling, Blockage, and Triggers

### 2.1 Graphic Rendering Layers
1. **Layer 1 (Ground / Suelo):** Base terrain (grass, water, dirt, floor tiles). Always opaque and non-empty.
2. **Layer 2 (Detail & Foliage / Maleza):** Overlays, plants, rocks, paths, flowers. Rendered immediately above ground.
3. **Layer 3 (Roofs & Upper Obstacles / Techos):** Roofs of buildings, walls, doors. When the player enters the building, Layer 3 is dynamically faded or hidden.
4. **Layer 4 (Aerial Overlays / Copas de Árboles):** High foliage, canopies, flying effects rendered above characters.

### 2.2 Collision & Logical Triggers
- **Blockage (`bloqueo`):** 1-bit boolean flag per tile. Dictates movement validation for players and NPCs.
- **Triggers (1 to 6):**
  - `Trigger 1`: Safe Zone (Zona Segura / Ciudad). Disables PvP combat.
  - `Trigger 2`: Teleport / Exit warp.
  - `Trigger 3`: Indoor trigger (fades roof Layer 3 when player is under).
  - `Trigger 4`: Anti-respawn zone.
  - `Trigger 5`: Underground / Dungeon zone.
  - `Trigger 6`: Water/Naval transition.

---

## 3. Investigation: In-Browser Live Collaborative Editing

**Hypothesis Confirmed:** Across all existing public Argentum Online implementations, **zero projects support real-time collaborative map editing inside the browser**.

### Historical Limitations of Other Projects:
1. **Visual Basic 6 Desktop Monolith:** Legacy WorldEditor requires binary file locks on local disk. No networking or delta serialization exists in the VB6 codebase.
2. **LambdaClass Web Client:** Focused on client-side WebAssembly / Pixi rendering of pre-baked assets; map creation was omitted from scope.
3. **AO-Libre:** Maintained standard single-user desktop tooling without cloud synchronization.

**OpenAO's Opportunity:** OpenAO is the first project to enable browser-based in-game world editing with permission checks (`admin` / `world_builder`), draft previews, and atomic broadcast over WebSockets.

---

## 4. Map Importer: Classic Binary `.map` v0.13 to OpenAO JSON

To allow seamless migration of the 280+ legacy Argentum Online maps without manual recreation, OpenAO can parse `.map` headers and tile matrices using this clean-room TypeScript parser:

```typescript
export interface LegacyTile {
    blocked: boolean;
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    trigger: number;
}

export function parseLegacyBinaryMap(buffer: ArrayBuffer): { width: number; height: number; tiles: LegacyTile[][] } {
    if (buffer.byteLength < 8) {
        throw new Error("Invalid map file: buffer too small for header");
    }

    const view = new DataView(buffer);
    let offset = 0;

    // Header validation (v0.13 signature: 8 bytes)
    const version = view.getInt16(offset, true);
    if (version < 0 || version > 100) {
        throw new Error(`Unsupported map version: ${version}`);
    }
    offset += 8; // skip header padding

    const width = 100;
    const height = 100;
    const tiles: LegacyTile[][] = [];

    for (let y = 0; y < height; y++) {
        tiles[y] = [];
        for (let x = 0; x < width; x++) {
            if (offset >= buffer.byteLength) {
                throw new Error(`Unexpected EOF at tile (${x + 1}, ${y + 1})`);
            }

            const flags = view.getUint8(offset++);
            const blocked = (flags & 1) !== 0;

            if (offset + 2 > buffer.byteLength) throw new Error(`Truncated layer1 at (${x + 1}, ${y + 1})`);
            const layer1 = view.getUint16(offset, true); offset += 2;

            let layer2 = 0;
            if (flags & 2) {
                if (offset + 2 > buffer.byteLength) throw new Error(`Truncated layer2 at (${x + 1}, ${y + 1})`);
                layer2 = view.getUint16(offset, true);
                offset += 2;
            }

            let layer3 = 0;
            if (flags & 4) {
                if (offset + 2 > buffer.byteLength) throw new Error(`Truncated layer3 at (${x + 1}, ${y + 1})`);
                layer3 = view.getUint16(offset, true);
                offset += 2;
            }

            let layer4 = 0;
            if (flags & 8) {
                if (offset + 2 > buffer.byteLength) throw new Error(`Truncated layer4 at (${x + 1}, ${y + 1})`);
                layer4 = view.getUint16(offset, true);
                offset += 2;
            }

            let trigger = 0;
            if (flags & 16) {
                if (offset >= buffer.byteLength) throw new Error(`Truncated trigger at (${x + 1}, ${y + 1})`);
                trigger = view.getUint8(offset++);
            }

            tiles[y][x] = { blocked, layer1, layer2, layer3, layer4, trigger };
        }
    }

    return { width, height, tiles };
}
```

---

## 5. Licensing & Legal Considerations
- **`ao-org/argentum-online-worldeditor` (AGPL-3.0):** Code from this repository cannot be directly copy-pasted into OpenAO backend or frontend without triggering copyleft requirements. However, **binary file formats and mathematical protocols are not subject to copyright under functional interoperability principles** (clean-room reverse engineering).
- **`lambdaclass/argentum` (MIT):** Web graphics shaders and tile coordinate math are freely reusable with standard copyright attribution.

---

## 6. Architectural Recommendations for OpenAO World Builder
1. **Delta-Based Live Synchronization:** Transmit tile change packets (`{ mapId, x, y, layer, graphicId, blocked, trigger }`) over WebSocket rather than streaming full map state on every brush stroke.
2. **Draft / Publish Lifecycle:** Store uncommitted world builder changes in a staging draft buffer (`map_drafts`) before flushing to `mapas_source` to prevent incomplete map geometry from affecting active players.
3. **Protected Zone Permissions:** Restrict city centers and arena maps behind `admin` role guards, allowing community builders access only to sandbox regions.