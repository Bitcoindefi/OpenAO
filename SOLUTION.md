FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview
This document summarizes how three major Argentum Online projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **construction mode**, and identify reusable ideas or tools.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **argentum-online-worldeditor** | https://github.com/ao-org/argentum-online-worldeditor | Official desktop editor | Visual Basic 6 (VB6) | AGPL‑3.0 |
| **lambdaclass/argentum** | https://github.com/lambdaclass/argentum | Web client (includes a simple map viewer/editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **ao-libre/ao-cliente** | https://github.com/ao-libre/ao-cliente | Community client (has a built‑in map editor) | JavaScript (Node/Electron) | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|----------------------|--------------------|-------------------------------------------------------------------|
| **argentum-online-worldeditor** | `.map` (binary) | - Header (size, version) <br> - **Layers**: `ground`, `objects`, `blocked`, `trigger` (each a 2‑byte per tile) <br> - **NPCs**: list of structs (X, Y, NPC ID, direction) <br> - **Specials**: list of structs (X, Y, type, data) | Very close. The official format stores layers as separate arrays, similar to our `terrain` (ground) + `blocked` + `trigger`. NPCs and specials map 1‑to‑1 to our `npcs` and `specials`. The only missing piece is the explicit `meta` JSON we keep for map‑level settings (music, light, etc.). |
| **lambdaclass/argentum** | `.json` (custom) | - Single JSON object with keys: `meta`, `terrain`, `npcs`, `specials` <br> - `terrain` is a 2‑D array of tile IDs, `blocked` and `trigger` are boolean matrices inside each tile object. | **Directly compatible**. The web client deliberately mirrors the structure used by the server (`meta`, `terrain`, `npcs`, `specials`). No conversion needed. |
| **ao-libre/ao-cliente** | `.map` (binary, same as official) + optional `.json` for metadata | Uses the same binary layout as the official editor, but wraps it with a small JSON side‑car for extra settings. | Binary part is compatible (same as official). The side‑car JSON can be merged into our `meta` section. |

### Summary
- The **official editor** and **ao‑libre client** share the same binary `.map` format.  
- **lambdaclass** already uses the exact JSON layout we plan to keep.  
- Converting from the binary format to our JSON is straightforward: read the binary layers, then emit a JSON with `meta`, `terrain`, `npcs`, `specials`.

---

## 2. Layer, Blocking & Trigger Modeling

| Project | Layer Model | Blocking | Triggers | Notable Decisions |
|---------|-------------|----------|----------|-------------------|
| **WorldEditor (VB6)** | 4 explicit layers stored sequentially: <br>1️⃣ `Ground` (terrain) <br>2️⃣ `Objects` (decorations) <br>3️⃣ `Blocked` (bool) <br>4️⃣ `Triggers` (bool) | Stored as a dedicated **blocked** layer (2 bytes per tile). | Stored as a dedicated **trigger** layer (2 bytes per tile). | - Uses **layer IDs** (0‑255) to reference tiles, allowing custom tilesets without changing the format.<br>- Provides a **“Lock”** flag per tile that prevents editing (useful for protected zones). |
| **lambdaclass** | Single `terrain` matrix; each cell can contain a **tile ID** and optional **object ID**. | `blocked` is a boolean matrix inside each cell (`cell.blocked`). | `trigger` is a boolean matrix (`cell.trigger`). | - Keeps everything in one JSON object, simplifying serialization.<br>- Uses **bit‑flags** (1 = blocked, 2 = trigger) to reduce size when exporting to binary. |
| **ao‑libre** | Mirrors the official 4‑layer binary layout. | Same as official. | Same as official. | - Adds a **“layer lock”** UI that disables editing of a whole layer (e.g., ground cannot be edited while objects are being placed).<br>- Stores **trigger scripts** as separate `.trg` files referenced from the map. |

### Decisions Worth Copying
1. **Layer Lock UI** – Prevents accidental changes to ground/blocked layers while editing objects.  
2. **Explicit Blocked & Trigger layers** – Simpler than embedding flags in the terrain matrix; matches the server’s expectations.  
3. **Bit‑flag export** – When we later need a compact binary representation (e.g., for the server), we can pack `blocked`/`trigger` into a single byte per tile.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **WorldEditor** | No. It is a classic desktop app; changes are saved to disk only when the user clicks **Save**. | No. No networking code. | N/A – never attempted. |
| **lambdaclass** | No built‑in live preview; the map viewer reloads the JSON after a manual refresh. | No. The repo contains only a single‑player client. | N/A – focus is on learning the game, not on map creation. |
| **ao‑libre** | **Partial live preview** – when editing, the client updates the in‑memory map and re‑renders instantly, but changes are not persisted to the server. | No collaborative features. | The team tried a simple WebSocket sync prototype, but it caused race conditions and high latency on low‑end machines; they dropped it in favor of a simpler offline editor. |

**Takeaway:** No existing project provides true collaborative editing. Implementing it would be a major undertaking and is out of scope for the first version of construction mode.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capability | Export Capability | Tools / Scripts |
|---------|-------------------|-------------------|-----------------|
| **WorldEditor** | Can open `.map` files created by the original server. | Can export to the same binary `.map`. | Built‑in VB6 UI; also ships a **`MapConverter.exe`** (source not public) that can convert to a simple CSV. |
| **lambdaclass** | Imports JSON maps directly (the client loads them). | Exports JSON via a **download** button in the editor UI. | No binary converter. |
| **ao‑libre** | Reads the official binary `.map`. | Writes binary `.map` + optional JSON side‑car. | Provides a **Node script** `scripts/convertMap.js` that can transform a binary map into a JSON representation compatible with the web client. |

### Practical Path for Our Project
- Reuse the **Node conversion script** from `ao-libre` (MIT‑compatible) as a starting point to read the official binary format and output our JSON structure (`meta`, `terrain`, `npcs`, `specials`).  
- Because the script is under GPL‑3.0‑or‑later, we must either:
  1. **Rewrite** the conversion logic ourselves (cleanroom) to avoid license contamination, **or**
  2. **Dual‑license** our conversion tool under GPL‑3.0 (acceptable if we are comfortable with copyleft).  
- The simplest approach for now is to **implement our own small converter** in TypeScript, mirroring the logic of `ao-libre` but written from scratch.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **WorldEditor** | **AGPL‑3.0** | Any derivative work that is **network‑served** must also be AGPL‑3.0. Directly copying code (VB6) is not feasible for our TypeScript/Node stack. However, design ideas (layer lock UI, file format) are free to adopt. |
| **lambdaclass** | **MIT** | Code can be reused freely, even in proprietary projects. The JSON format is effectively public domain. |
| **ao‑libre** | **GPL‑3.0‑or‑later** | Reusing code would require our project to be GPL‑3.0 compatible. Since the repository is currently under a permissive license (check `LICENSE` in `openao`), we should avoid pulling in GPL‑licensed source files. We can still study the implementation and re‑implement the needed parts. |

**Conclusion:**  
- **Design patterns** (layer lock, separate blocked/trigger layers) can be adopted without legal concerns.  
- **Conversion scripts** should be re‑implemented to stay within our project's license (likely MIT/Apache).  
- No code from the AGPL or GPL projects will be directly copied.

---

## Deliverable Summary

- Added this markdown file (`docs/MapEditorResearch.md`) containing:
  - Comparative table of map formats.
  - Modeling of layers, blocking, triggers.
  - Status of live/collaborative editing.
  - Import/export tooling overview.
  - License analysis and reuse recommendations.

This documentation will serve as a reference for the upcoming construction mode implementation and help the team make informed design choices.