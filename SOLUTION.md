FILE: docs/map_editor_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how three notable Argentum Online projects handle map editing, the formats they use, and the design decisions they make. The goal is to avoid repeating mistakes, justify the design choices for the upcoming **Construction Mode**, and identify reusable ideas or tools.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Visual Basic 6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Details | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|----------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (text) | - Binary `.map` stores a 100 × 100 tile grid (2 bytes per tile) with layer, block, trigger flags.<br>- `.inf` holds metadata (map name, music, light, etc.) and NPC definitions. | - **Terrain**: Directly matches our `terrain` (tile ID + flags).<br>- **Meta**: Most fields map 1‑to‑1 (music, light, map name).<br>- **NPCs**: Stored in `.inf` as a list; can be transformed to our `npcs` JSON.<br>- **Specials/Triggers**: Encoded as part of the tile flags; need conversion to our `specials` array. |
| **Lambdaclass Argentum** | `maps/*.json` (generated at build) | JSON representation mirroring the server’s map format: `{ "tiles": [...], "npcs": [...], "objects": [...] }`. The tile array contains `id`, `blocked`, `trigger` fields. | - **Terrain**: Directly compatible (`id`).<br>- **Meta**: Stored in a separate `meta.json` per map (music, light, etc.).<br>- **NPCs**: Same shape as our `npcs` (position, id, direction, script).<br>- **Specials**: Represented as `objects` with type and parameters – aligns with our `specials`. |
| **AO‑Libre Client** | `assets/maps/*.dat` (custom binary) | Custom binary similar to the original AO client: 100 × 100 tiles, each tile = 2 bytes (tile ID + flags). Metadata is embedded in the same file header. NPCs are stored after the tile matrix. | - **Terrain**: Same 2‑byte tile encoding → compatible after extracting flags.<br>- **Meta**: Header fields map to our `meta` (music, light, etc.).<br>- **NPCs**: Same structure as the original server; can be mapped to our `npcs` JSON.<br>- **Specials**: Flags are stored per‑tile; conversion needed to our `specials` list. |

**Takeaway:** All three projects ultimately rely on the classic AO tile matrix (100 × 100, 2 byte per tile) plus auxiliary metadata. Our current format (`meta`, `terrain`, `npcs`, `specials`) is a thin JSON wrapper around that data, so conversion scripts are straightforward.

---

## 2. Layer, Blocking & Trigger Modeling

| Project | Layer Model | Blocking | Triggers / Specials | Notable Decisions |
|---------|-------------|----------|---------------------|-------------------|
| **Official World Editor** | Single visual layer (tile ID). Additional “over‑layer” is simulated by using higher tile IDs that contain graphical overlays. | `blocked` flag stored in the high‑byte of the tile word (bit 0). | `trigger` flag stored in the high‑byte (bit 1). Special objects (e.g., doors, warps) are stored in a separate “Objects” list in the `.inf` file. | - **Explicit Objects List**: Keeps triggers separate from the tile matrix, simplifying runtime checks.<br>- **Layer Emulation via Tile IDs**: Allows visual stacking without extra layers. |
| **Lambdaclass Argentum** | `tiles` array + optional `objects` array. Objects act as a second layer (e.g., trees, furniture). | `blocked` property on each tile (`true/false`). | `objects` have a `type` field (`trigger`, `warp`, `door`, …) and optional parameters. | - **Separate Objects Layer**: Mirrors the official editor’s object list, making it easy to edit in a UI.<br>- **Typed Objects**: Each object knows its purpose, reducing the need for bit‑mask gymnastics. |
| **AO‑Libre Client** | Same as original client: single tile layer; visual overlays are encoded as separate tile IDs. | `blocked` flag is bit 0 of the high‑byte. | `trigger` flag is bit 1; other bits are used for “no‑walk”, “no‑magic”, etc. No separate object list – everything is encoded in tile flags. | - **Compact Encoding**: No extra structures, but makes live editing harder because you must manipulate bits directly. |

**What to copy?**

* **Separate Objects List** – Both the official editor and Lambdaclass use an explicit objects list for triggers, doors, warps, etc. This design simplifies UI editing (you can drag a “door” onto the map without fiddling with bits) and aligns well with our `specials` array.
* **Typed Objects** – Giving each special a clear `type` (e.g., `warp`, `npc_spawn`, `item`) makes future extensions (new trigger types) trivial.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. The editor writes files locally; the server must be restarted to load changes. | No. Single‑user desktop app. | N/A – design choice predates modern web‑based collaboration. |
| **Lambdaclass Argentum** | No built‑in live reload. Maps are compiled into the client bundle; changes require a rebuild. | No. The repo is a typical open‑source project with PR‑based contributions. | N/A – focus is on a stable web client, not on map authoring. |
| **AO‑Libre Client** | No live editing; the client only reads maps. | No. Community client only consumes maps. | N/A – the client is not an editor. |

**Implications:** None of the surveyed projects attempted live or collaborative editing. The main obstacles reported in community discussions are:

* **Performance:** Real‑time synchronization of a 100 × 100 tile matrix can be bandwidth‑heavy.
* **Conflict Resolution:** No consensus on how to merge concurrent edits (tile‑level vs. object‑level).
* **Tooling Gap:** Existing editors are desktop‑only, making web‑based collaboration a non‑trivial engineering effort.

For our Construction Mode we can start with **single‑user offline editing** and later explore a WebSocket‑based live preview, reusing the same JSON format.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capabilities | Export Capabilities | Notes |
|---------|---------------------|---------------------|-------|
| **Official World Editor** | Can open `.map` + `.inf` files (its native format). | Exports to the same binary format. No built‑in JSON exporter. | Community scripts exist (Python, C#) that read the binary format and dump JSON – useful for us. |
| **Lambdaclass Argentum** | Reads JSON maps directly (used at runtime). | Can export the in‑memory map to JSON (via a dev‑tool button). | The JSON schema is already compatible with our `meta/terrain/npcs/specials` layout. |
| **AO‑Libre Client** | Reads the custom binary `.dat`. No import UI. | Writes the same binary format (used by the original server). | No public converter, but the source includes a parser that can be repurposed to generate our JSON. |

**Opportunity:** Implement a small CLI tool (`scripts/convert-worldeditor.js`) that:

1. Parses the official `.map` + `.inf` binary files.
2. Emits a JSON file matching our internal schema.

This would let map creators continue using the familiar VB6 editor while allowing us to load maps directly in the new Construction Mode.

---

## 5. Licenses & Reuse Implications

| Project | License | Reuse Constraints |
|---------|---------|-------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be licensed under AGPL‑3.0. Using code snippets (e.g., the binary parser) in our server would require us to open‑source the whole server under AGPL‑3.0, which may be undesirable. However, the *ideas* and *file format* are not protected; we can implement our own parser without copying code. |
| **Lambdaclass Argentum** | **MIT** | Very permissive – we can copy code, adapt the JSON schema, or reuse their conversion utilities without licensing concerns. |
| **AO‑Libre Client** | **GPL‑3.0‑or‑later** | Similar to AGPL but without the network‑use clause. Incorporating code would require GPL‑3.0 licensing of the combined work. Again, we can freely study the format and re‑implement it. |

**Conclusion:**  
* We should **avoid copying code** from the official editor to stay clear of AGPL obligations.  
* We can safely borrow the **JSON schema** and **object‑layer design** from the Lambdaclass project (MIT).  
* Any conversion tool we write should be original implementation (e.g., using Node.js Buffer APIs) to keep the repository under our chosen license (currently MIT).

---

## 6. Summary & Recommendations for Construction Mode

1. **Adopt a JSON‑based map format** identical to the one used by Lambdaclass Argentum (`meta`, `terrain`, `npcs`, `specials`). This ensures compatibility with existing web tools and simplifies future extensions.
2. **Model triggers and doors as typed objects** in the `specials` array, mirroring the official editor’s separate objects list. This makes UI editing intuitive.
3. **Provide an import CLI** (`scripts/convert-worldeditor.js`) that reads the official binary format and outputs our JSON. This leverages the community’s existing editor without violating AGPL.
4. **Start with single‑user offline editing** (e.g., a React‑based map builder) and keep the architecture open for later live‑collaboration features.
5. **Document the format** clearly (this file) and add a short README in `docs/` for contributors.

--- 

*Document created on 2026‑09‑20.*