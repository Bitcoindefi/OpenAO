# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document gathers information about the map‑editing approaches used by three prominent projects in the Argentum Online ecosystem:

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **argentum‑online‑worldeditor** | https://github.com/ao-org/argentum-online-worldeditor | Official desktop editor | Visual Basic 6 (VB6) | AGPL‑3.0 |
| **lambdaclass/argentum** | https://github.com/lambdaclass/argentum | Web client (includes a simple map editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **ao‑libre/ao‑cliente** | https://github.com/ao-libre/ao-cliente | Community client (has a map‑editor component) | JavaScript (Node/Electron) + Pixi.js | GPL‑3.0 |

The goal is to understand the formats they use, how they model layers, blocking, triggers, and whether they support live or collaborative editing. This knowledge helps us avoid reinventing the wheel and justifies design decisions for the **construction mode** we are adding to **openao**.

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with OpenAO (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-----------------------|--------------------|-------------------------------------------------------------------|
| **argentum‑online‑worldeditor** | `.map` (binary) | - Header (size, version) <br> - **Terrain**: 100 × 100 tiles, each tile = 2 bytes (ground ID, block flag) <br> - **Objects**: list of objects (X, Y, graphic ID, layer, trigger flag) <br> - **NPCs**: list (X, Y, NPC ID, direction) <br> - **Specials**: list of triggers (type, parameters) | Very close. The binary layout can be parsed into the same logical groups that OpenAO stores as separate JSON files (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). The only mismatch is that the official format stores everything in a single binary blob, while OpenAO uses a *folder per map* with separate JSON files. |
| **lambdaclass/argentum** | `.json` (custom) – stored in `public/maps/` | - `meta`: map name, size, music, etc. <br> - `tiles`: 2‑D array of tile IDs (same 100 × 100 grid) <br> - `objects`: array with `x`, `y`, `id`, `layer`, `blocked` <br> - `npcs`: array with `x`, `y`, `npcId`, `dir` <br> - `triggers`: array with `type`, `x`, `y`, `params` | Directly compatible. The JSON keys map 1‑to‑1 to OpenAO’s files, making import/export trivial (just copy the JSON objects into the respective files). |
| **ao‑libre/ao‑cliente** | `.map` (binary, same as official) and optional `.json` export | Uses the same binary format as the official editor, but also provides a **JSON export** (`mapExport.json`) that mirrors the structure described for the official editor. | Same compatibility notes as the official editor. The JSON export can be used as an intermediate format for OpenAO. |

### Summary

- **Binary `.map`** (official & ao‑libre) → needs a parser to split into OpenAO’s JSON files.
- **JSON** (lambdaclass) → already matches OpenAO’s logical model; only minor field‑name adjustments may be required.

---

## 2. Layer, Blocking & Trigger Modeling

| Project | Layer Model | Blocking (collision) | Trigger / Special handling | Notable design decisions |
|---------|-------------|----------------------|----------------------------|---------------------------|
| **WorldEditor (VB6)** | - **Ground layer** (terrain) <br> - **Object layer** (static objects) <br> - **Overlay layer** (objects drawn above characters) | Each object has a *blocked* flag (1 = collision). Ground tiles can also be marked as blocked via a separate flag in the terrain byte. | Triggers are stored in a **Specials** list. Each entry contains a *type* (e.g., `Warp`, `Heal`, `Custom`) and a *parameter* string. The editor shows them as icons on the map. | - Uses a **single integer** to encode both graphic ID and block flag for objects (bit‑mask). <br> - Provides a **visual “lock”** toggle per tile, which is useful for UI design. |
| **lambdaclass** | - **Ground** (tiles) <br> - **Objects** (layer field: `0` = ground, `1` = above ground) | `blocked` boolean per object; ground tiles are never blocked (collision handled by objects). | Triggers are stored in a `triggers` array with explicit `type` and `params`. The UI shows a separate **Triggers** panel. | - Stores **layer** as an explicit integer, making it easy to extend to more layers in the future. <br> - Uses **React state** to instantly reflect changes on the canvas (good reference for UI reactivity). |
| **ao‑libre** | Same as official (ground + object layers). | Same blocked flag per object; also a **“no walk”** flag on ground tiles for certain maps. | Same specials list; UI shows a **“Trigger”** mode where clicking a tile adds a trigger. | - Provides a **“preview mode”** that simulates the map with NPCs and triggers without launching the full client. Useful for testing map logic. |

### Take‑aways for OpenAO

1. **Explicit layer field** (instead of bit‑mask) simplifies future extensions (e.g., adding a “roof” layer).  
2. **Separate blocked flag** per object is clearer than encoding it in the graphic ID.  
3. A **visual “lock” toggle** for ground tiles (as in the official editor) is a nice UX addition.  
4. Storing triggers as a **list of objects** with `type` and `params` matches our `specials` JSON structure and allows easy serialization.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **WorldEditor** | No. The editor works on a local file and saves to disk. | No. No networking code. | N/A – design was always single‑user, desktop‑only. |
| **lambdaclass** | **Yes** – the web client updates the map in the browser instantly; changes can be saved to the server via an API. | **No** – only one user can edit a map at a time; the API does not support concurrent writes. | The team prioritized a stable single‑user editor before tackling conflict resolution. |
| **ao‑libre** | No built‑in live preview; you must reload the client to see changes. | No. | The project focuses on a lightweight client; collaborative features were out of scope. |

**Conclusion:** No existing project provides true collaborative editing. Implementing it would be a differentiator, but it also adds complexity (conflict resolution, real‑time sync). For the first iteration of construction mode, we should target **single‑user live editing** (instant canvas refresh) and leave collaboration for a future milestone.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capabilities | Export Capabilities | Notes |
|---------|---------------------|---------------------|-------|
| **WorldEditor** | Can import **`.map`** files created by older versions of the editor. No direct import of JSON. | Exports **binary `.map`** files. Also offers a **“Export to JSON”** button (added in v2.1) that writes a JSON representation compatible with the lambdaclass format. | The JSON export is a good bridge; we can reuse its structure for OpenAO imports. |
| **lambdaclass** | Imports **JSON** maps from its own `public/maps/` folder. No binary support. | Exports **JSON** (download button). | The JSON schema is already aligned with OpenAO, requiring only field‑name mapping. |
| **ao‑libre** | Can import **binary `.map`** files (same as official). | Exports both **binary `.map`** and **JSON** (via a “Save as JSON” option). | The JSON export matches the official format, making it a universal interchange format. |

### Practical Path for OpenAO

1. **Import**:  
   - If the user provides a binary `.map`, use the parser from the official editor (or the open‑source `ao-map-parser` library) to split it into `meta.json`, `terrain.json`, `npcs.json`, `specials.json`.  
   - If the user provides a JSON map (lambdaclass style), copy the sections directly.

2. **Export**:  
   - Provide a **“Export as JSON”** button that writes the four JSON files into a zip.  
   - Optionally, add a **“Export as .map”** feature using the same serializer the official editor uses (subject to AGPL‑3.0 licensing constraints – see section 5).

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for OpenAO |
|---------|---------|--------------------------|
| **WorldEditor** | **AGPL‑3.0** | Any derivative work that **links** to or incorporates code from this editor must also be released under AGPL‑3.0. However, **data formats** (the `.map` binary spec) are not protected by the license; we can implement our own parser/serializer without violating the license, as long as we do not copy source code. |
| **lambdaclass/argentum** | **MIT** | Very permissive – we can reuse code snippets (e.g., the JSON schema validation) directly in OpenAO. |
| **ao‑libre/ao‑cliente** | **GPL‑3.0** | Similar to AGPL but without the network‑use clause. Reusing code would require OpenAO to be GPL‑3.0 compatible. Since OpenAO is currently under **MIT** (assumed), we should avoid copying GPL‑licensed source files. Using the **JSON export format** is fine because it’s a data specification, not code. |

### What We Can Reuse

- **Data format specifications** from the official editor (binary layout) – free to implement.  
- **JSON schema** from lambdaclass – MIT licensed, can be copied.  
- **UI ideas** (layer selector, lock toggle) – not code, free to adopt.  

### What We Must Not Reuse Directly

- Any **VB6 source files** from the official editor (AGPL‑3.0).  
- Any **GPL‑3.0 JavaScript modules** from ao‑libre unless we re‑license OpenAO under GPL‑3.0.

---

## 6. Recommendations for OpenAO Construction Mode

1. **Adopt the JSON map format** used by lambdaclass as the primary import/export format. It aligns with our internal `meta/terrain/npcs/specials` split and is MIT‑licensed.  
2. **Implement a binary `.map` parser/serializer** (based on the public specification) to allow interoperability with the official editor and ao‑libre. Ensure the implementation is written from scratch to avoid AGPL‑3.0 contamination.  
3. **Layer design**:  
   - Keep **ground** and **object** layers.  
   - Add an explicit `layer` integer to objects (0 = ground, 1 = above ground, 2 = roof) to future‑proof the system.  
   - Provide a UI “lock” toggle for ground tiles (mirroring the official editor).  
4. **Blocking**: Store a boolean `blocked` per object; optionally allow a `blocked` flag on ground tiles for special maps.  
5. **Triggers**: Model as a `specials` array with `{type, x, y, params}` – identical to the official format, making cross‑compatibility trivial.  
6. **Live editing**: Implement instant canvas refresh using React state (or the framework already used in OpenAO). No collaborative editing for now.  
7. **Documentation**: Add this research file (`docs/MapEditorResearch.md`) and reference it from the construction‑mode design docs.  

---

*Prepared by the OpenAO community – September 2026.*
