# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, to justify design decisions for the upcoming **construction mode**, and to identify reusable tools or ideas.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor (VB6) | Visual Basic 6 (Win32) | **AGPL‑3.0** |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (includes a map viewer/editor) | Vite + TypeScript + React + Pixi.js | **MIT** |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (includes map loading utilities) | JavaScript (Node/Electron) | **GPL‑3.0** |

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-----------------------|--------------------|-----------------------------------------------------------------------|
| **Official World Editor** | `.map` (binary) | - Header (size, version) <br> - **Layers**: `Terrain`, `Objects`, `Triggers` <br> - Each layer stores a flat array of 2‑byte tile IDs <br> - Separate sections for NPCs and special objects (e.g., doors, warps) stored as structs with X/Y, ID, and extra data. | Very close. The editor’s binary layout maps 1‑to‑1 to our `terrain` (tiles), `npcs`, and `specials`. The only missing piece is the explicit `meta` JSON we keep for extra map‑level settings (music, safe zones, etc.). Converting is straightforward: read the binary, fill our JSON structures, and write back to binary if needed. |
| **Lambdaclass Argentum** | `.json` (exported from the web client) | - Top‑level object with `tiles`, `npcs`, `triggers`, `metadata`. <br> - `tiles` is a 2‑D array of tile IDs. <br> - `npcs` and `triggers` are arrays of objects with `x`, `y`, `id`, `params`. | Directly compatible with our format. The JSON mirrors our `meta` / `terrain` / `npcs` / `specials` layout, only differing in naming (`tiles` ↔ `terrain`). A thin adapter can rename keys. |
| **AO‑Libre Client** | `.map` (binary, same as official) | Uses the same binary layout as the official editor (they reverse‑engineered it). | Identical to the official format, thus compatible as described above. |

**Takeaway:** All three projects ultimately rely on the same binary `.map` format defined by the original Argentum server. The web client adds a JSON export for convenience. Our current format (`meta` + `terrain` + `npcs` + `specials`) can be generated from or persisted to that binary without loss.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

### Layers
| Layer | Purpose | Representation |
|-------|---------|----------------|
| **Terrain** | Ground tiles (walkable / non‑walkable) | 2‑byte tile ID per cell |
| **Objects** | Decorative / interactive objects (trees, rocks) | 2‑byte tile ID per cell; some IDs are flagged as “blocking” in the server’s tile data table |
| **Triggers** | Special zones (doors, warps, NPC spawn points) | Stored as separate structs, not a tile layer. Each trigger has X, Y, type, and parameters. |

### Blocking
* The server’s **tile data table** (`tiles.dat`) defines for each tile ID whether it blocks movement. The editor does **not** store a separate “blocked” flag per cell; it relies on that table.
* For objects that need custom blocking (e.g., a door that can be opened), the editor writes a **trigger** of type `BLOCK` with a `duration` parameter.

### Triggers
* Triggers are stored in a **linked list** inside the `.map` file. Each entry contains:
  * `type` (e.g., `Warp`, `Door`, `NPC`, `Block`, `Custom`)
  * `x`, `y`
  * `data1`, `data2` (type‑specific parameters)
* The editor UI groups triggers by type and shows a **grid overlay** to visualize them.

### Decisions Worth Copying
1. **Single source of truth for blocking** – reuse the server’s tile data table instead of duplicating a “blocked” flag per cell. This reduces file size and keeps client/server logic aligned.
2. **Separate trigger list** – keep triggers out of the terrain layer. It simplifies path‑finding and allows multiple triggers on the same tile (e.g., a warp and a custom script).
3. **Layered visualisation** – the editor lets users toggle visibility of each layer. Implement the same toggles in our construction UI to avoid clutter.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a **stand‑alone desktop** tool that writes to a local file. | No. No networking layer. | N/A – design goal was a simple offline editor. |
| **Lambdaclass Argentum** | No built‑in live map editing. The web client only **renders** maps. | No. | N/A – focus on gameplay, not map authoring. |
| **AO‑Libre Client** | No. It only loads maps. | No. | N/A – community client is read‑only. |

**Why no live/collaborative editing?**  
All three projects treat map editing as an **offline** activity, primarily because:

* The original server expects a **static** map file loaded at startup.
* Real‑time synchronization would require a custom protocol and conflict‑resolution logic, which adds considerable complexity.
* The community has historically used version‑control (Git) to share map files, which already provides collaboration.

If we want live editing, we would need to design a **server‑side map cache** and a **WebSocket** protocol, which is out of scope for the current bounty.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capability | Export Capability | Notes |
|---------|-------------------|-------------------|-------|
| **Official World Editor** | Can **import** binary `.map` files (including those generated by other tools). | Can **export** to the same binary format. | No direct JSON export, but the binary can be parsed with community scripts. |
| **Lambdaclass Argentum** | Provides a **JSON export** from the in‑browser map viewer. No import UI, but the JSON can be uploaded to the server via a custom endpoint. | **JSON export** (full map data). | The JSON schema matches our internal representation; a simple conversion script can turn it into our binary `.map`. |
| **AO‑Libre Client** | Uses the same binary format, so any `.map` file can be loaded. | Can **save** edited maps back to binary (through the editor component they forked). | No dedicated conversion tool, but the code is open‑source under GPL‑3.0. |

**Opportunity:**  
Create a small **CLI utility** (`scripts/convert_map.js`) that:

* Reads a binary `.map` file (official format).
* Emits a JSON file matching our `meta` / `terrain` / `npcs` / `specials` schema.
* Performs the reverse conversion.

Because the binary format is public domain (used by the original server) and the AGPL‑3.0 editor only **reads** it, this utility can be licensed under **MIT** (no code is copied from the editor).

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that **links** or **copies** code must be released under AGPL‑3.0. However, **reverse‑engineering** the binary format is allowed (the format is de‑facto public). We can **reuse ideas** and **write our own implementation** without violating the license. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy snippets, adapt the JSON schema, or reuse utility functions directly. |
| **AO‑Libre Client** | **GPL‑3.0** | Similar to AGPL but without the network‑use clause. Direct code reuse would require GPL‑3.0 licensing of our derivative. Again, we can study the implementation and re‑implement it ourselves. |

**Conclusion:**  
We can safely **borrow concepts** (layer toggles, trigger list, tile‑blocking model) and **re‑implement** the import/export logic without violating any license. The only code we must avoid copying verbatim from the official editor is the VB6 source; instead, we’ll write a fresh parser in TypeScript/JavaScript.

---

## 6. Recommendations for Construction Mode

1. **Adopt the same binary `.map` format** for persistence. This ensures compatibility with existing tools and the server.
2. **Expose a JSON view** (`meta`, `terrain`, `npcs`, `specials`) in the UI for easier debugging and for potential integration with the Lambdaclass JSON export.
3. **Implement layer toggles** (Terrain, Objects, Triggers) mirroring the official editor.
4. **Use the server’s tile data table** to determine walkability, avoiding a duplicated “blocked” flag.
5. **Provide a CLI converter** (`scripts/convert_map.js`) to go between binary and JSON formats – a concrete advantage for map creators.
6. **Document the format** (as done here) in `docs/` so future contributors have a single source of truth.

--- 

*Prepared by the OpenAO research team – 2026-09-20.*
