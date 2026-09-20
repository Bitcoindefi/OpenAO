# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes the map editing approaches used by three notable Argentum Online projects:

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **argentum-online-worldeditor** | https://github.com/ao-org/argentum-online-worldeditor | Official desktop editor | Visual Basic 6 (VB6) | AGPL‑3.0 |
| **lambdaclass/argentum** | https://github.com/lambdaclass/argentum | Web client (includes a map viewer/editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **ao-libre/ao-cliente** | https://github.com/ao-libre/ao-cliente | Community client (includes map utilities) | JavaScript (Node/Electron) | GPL‑3.0 |

The goal is to understand their map formats, layer models, editing capabilities, and licensing implications to inform the design of the **construction mode** for this repository.

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-----------------------|--------------------|--------------------------------------------------------------------------|
| **argentum-online-worldeditor** | `.map` (binary) | - Header with map dimensions, version, and checksum.<br>- Sequential blocks: **Terrain**, **Objects**, **NPCs**, **Triggers**, **Specials**.<br>- Uses fixed‑size records (e.g., 2‑byte tile IDs). | Very close to our format. The binary layout maps 1‑to‑1 to the four logical layers we already expose. Only difference: the official editor stores **blocking** information inside the terrain block (high‑bit flag) and **trigger** data in a separate block. Converting to our JSON‑based representation is straightforward (read binary → populate `meta`, `terrain`, `npcs`, `specials`). |
| **lambdaclass/argentum** | `.json` (custom) | - Top‑level object with keys: `meta`, `terrain`, `npcs`, `triggers`, `specials`.<br>- `terrain` is a 2‑D array of tile IDs.<br>- `triggers` are objects with `x`, `y`, `type`, `data`.<br>- No explicit blocking flag; blocking is inferred from tile ID ranges. | Compatible with our schema, but **blocking** is not a separate field. To import, we must map tile IDs that are considered “blocked” in the client to our `meta.blocked` array. The `triggers` section corresponds to our `specials`. |
| **ao-libre/ao-cliente** | `.map` (binary, same as official) & `.dat` (aux) | - Re‑uses the same binary format as the official editor (see above).<br>- Provides a small JS parser that reads the binary into a JS object with `terrain`, `objects`, `npcs`, `triggers`. | Directly compatible. The parser already outputs a structure similar to our JSON representation, so we can reuse it for import/export. |

**Take‑away:** The official binary `.map` format is the de‑facto standard across the ecosystem. The web client’s JSON format is essentially a serialized version of the same logical layers. Therefore, implementing import/export for the binary format will give us maximum compatibility.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

### Layers

| Layer | Description | Storage in `.map` |
|-------|-------------|-------------------|
| **Meta** | Map dimensions, name, version, background music, etc. | Header (first 64 bytes). |
| **Terrain** | 2‑D grid of tile IDs (0‑65535). | Sequential 2‑byte entries (width × height). |
| **Objects** | Static objects (e.g., trees, rocks). | After terrain, each record: `x`, `y`, `objectId`. |
| **NPCs** | NPC spawn points. | After objects, each record: `x`, `y`, `npcId`, `direction`. |
| **Triggers** (aka Specials) | Event zones, warp points, etc. | After NPCs, each record: `x`, `y`, `type`, `data`. |

### Blocking

- The **high‑order bit** of a terrain tile ID (bit 15) indicates *blocking*.
- The editor also allows a **“Block” checkbox** per tile which sets this bit automatically.
- In the UI, blocked tiles are shown with a red overlay.

### Triggers / Specials

- Stored as a separate block with a **type enum** (e.g., `0 = Warp`, `1 = Item`, `2 = Script`).
- Each trigger contains a **payload** (`data`) whose format depends on the type.
- The editor provides a **grid view** where each cell can have multiple trigger flags; the UI merges them into a single record per cell (the last edited wins).

### Decisions Worth Copying

1. **Bit‑flag blocking inside terrain** – simple, no extra data structure, and works well with existing tile sets.
2. **Separate trigger block** – keeps terrain clean and allows unlimited trigger types without expanding the terrain record size.
3. **Header metadata** – storing map dimensions and version at the start simplifies validation and future extensions.
4. **Binary format with fixed‑size records** – fast to load/save, deterministic size, easy to stream.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **argentum-online-worldeditor** | No. The editor is a classic desktop app; changes are saved to disk only. | No. No networking layer. | N/A – design focused on single‑user offline editing. |
| **lambdaclass/argentum** | No built‑in live editing; the map viewer is read‑only. | No. The web client does not expose editing UI. | N/A – the project’s scope is a **client**, not an editor. |
| **ao-libre/ao-cliente** | No live editing; only map loading. | No collaborative features. | N/A – community client aims to be lightweight. |

**Conclusion:** None of the existing projects attempted live or collaborative map editing. The lack of such features is mainly due to the complexity of synchronizing binary map state and the limited demand within the community. If we decide to implement collaborative editing later, we should design a **server‑side authoritative map state** (e.g., using WebSockets) and keep the binary format as the canonical storage, converting to/from a diff‑based JSON representation for network traffic.

---

## 4. Import / Export Tools Between Formats

| Project | Export Options | Import Options | Notes |
|---------|----------------|----------------|-------|
| **argentum-online-worldeditor** | *Export* → `.map` (binary) only. Can also **export to CSV** for terrain (via a hidden menu). | *Import* → `.map` (binary) only. No direct JSON import. | The source code (VB6) includes a `MapFile` class that reads/writes the binary format. |
| **lambdaclass/argentum** | *Export* → JSON (via `saveMap()` utility). | *Import* → JSON (via `loadMap()` utility). | The JSON schema matches our logical layers, making conversion trivial. |
| **ao-libre/ao-cliente** | *Export* → Binary `.map` (uses the same writer as the official editor). | *Import* → Binary `.map` (built‑in parser). | The repo contains a small Node script `tools/map-converter.js` that can read a binary map and output a JSON representation compatible with our format. |

**Opportunity:** By re‑using the `tools/map-converter.js` from `ao-libre/ao-cliente` (MIT‑compatible), we can provide a **one‑click import** of official maps into our construction mode. The script can be added to this repository under `scripts/` and exposed via an npm script.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **argentum-online-worldeditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be licensed under AGPL‑3.0 and provide source code. Directly copying code (e.g., the VB6 `MapFile` class) would require our whole repo to be AGPL‑3.0. However, **ideas, file format specifications, and data structures** are not protected by copyright, so we can implement our own parser/serializer without violating the license. |
| **lambdaclass/argentum** | **MIT** | Very permissive. We can copy utility functions or the JSON schema verbatim, provided we retain the MIT notice. |
| **ao-libre/ao-cliente** | **GPL‑3.0** | Similar to AGPL but without the network‑use clause. Reusing code would require our repo to be GPL‑3.0 compatible. The `map-converter.js` is a small utility; we can either rewrite it ourselves (to avoid license coupling) or keep it under GPL‑3.0 and note the dual‑license in our `LICENSE` file. |

**Recommendation:**  
- Implement our own binary parser/serializer based on the publicly documented format (derived from the official editor).  
- Reuse the JSON schema from the Lambdaclass project (MIT) for import/export of JSON maps.  
- Optionally, include the GPL‑3.0 `map-converter.js` as a separate tool under its own license, clearly marked, so the core repository remains under its existing license (presumably MIT or Apache).

---

## 6. Action Items for Construction Mode

1. **Add a binary map parser/writer** (`src/map/binary.ts`) that follows the official `.map` spec (header + terrain + objects + npcs + triggers).  
2. **Expose a CLI tool** (`scripts/import-map.ts`) that converts a `.map` file to our internal JSON representation (`meta`, `terrain`, `npcs`, `specials`).  
3. **Document the format** (this file) and reference the parser implementation.  
4. **Add unit tests** for round‑trip conversion (binary → JSON → binary) using a small sample map.  
5. **Update README** to point developers to this documentation for guidance on map compatibility.

--- 

*Prepared by the OpenAO contributors – September 2026.*
