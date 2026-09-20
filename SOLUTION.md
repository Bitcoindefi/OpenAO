FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, to justify design decisions for the upcoming **Construction Mode**, and to identify reusable tools or ideas.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0 (or AGPL‑3.0 depending on fork) |

---

## 1. Map Formats Used

| Project | Map File(s) | Structure | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|-----------|-----------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | - Header with map dimensions, version, and checksum.<br>- Sequential blocks: **Terrain**, **Objects**, **NPCs**, **Triggers**, **Layers**.<br>- Uses a **layer mask** (bits) to indicate which layers are blocked for movement. | - Terrain → our `terrain`.<br>- Objects (tiles) → can be mapped to `meta` (static tiles).<br>- NPCs → our `npcs`.<br>- Triggers → our `specials` (but stored as separate trigger records).<br>- No explicit separation of `meta` vs `terrain`; both are stored in the same tile block, so conversion is needed. |
| **Lambdaclass Argentum** | `*.json` (exported from the editor) and `*.map` (runtime) | - JSON wrapper around the same binary layout used by the official editor (mostly for the web client).<br>- Provides a **layer array** (`layers: [{id, blocked, tiles[]}]`). | - Directly maps to our four JSON files if we split the layer array: <br>  - `layers[i].tiles` → `terrain` (ground) or `meta` (overlays) depending on `layerId`.<br>  - `npcs` and `specials` are kept as separate arrays, matching our format. |
| **AO‑Libre Client** | Uses the same binary `*.map` format as the official editor (no custom format). | - Reads the binary map and builds an in‑memory representation with **layers**, **blocked tiles**, and **triggers**. | - Identical to the official editor, so the same conversion considerations apply. |

**Take‑away:** All three projects ultimately rely on the original binary `*.map` format. The only “friendly” format is the JSON export used by the Lambdaclass web client, which can serve as an intermediate conversion step to our split‑file structure.

---

## 2. Layer, Blocking & Trigger Modelling (Official Editor)

| Aspect | Implementation in Official Editor | Observations / Potential Reuse |
|--------|-----------------------------------|--------------------------------|
| **Layers** | Each map can have up to **4 layers** (ground, objects, overlays, collision). The layer data is stored sequentially in the map file. | Our current design separates ground (`terrain`) from static objects (`meta`). We could keep the 4‑layer concept but expose it as separate JSON files for clarity. |
| **Blocking** | A **layer mask** (16‑bit) per tile indicates which layers block movement. The mask is stored in the **collision layer** (layer 3). | This mask is a compact way to represent walkability without duplicating data. We could adopt a similar bitmask in `terrain` or a dedicated `collision.json`. |
| **Triggers** | Stored as a list of **trigger records** (`x, y, type, data`). Types include `Warp`, `Heal`, `Custom`. | Our `specials` already hold trigger‑like data. Aligning the schema (e.g., using `type` and `params`) would simplify import/export. |
| **Design Decisions Worth Copying** | - **Binary + JSON export**: Keep the fast binary for runtime, provide a JSON export for editors.<br>- **Layer mask** for collision: reduces redundancy.<br>- **Separate trigger table**: clean separation of map logic from visual layers. | Implement a **converter** that reads the official binary, extracts layers into our four JSON files, and writes back a binary for the server/client. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing? | Collaborative? | Reason for Abandonment (if any) |
|---------|---------------|----------------|---------------------------------|
| **Official World Editor** | No. It is a **stand‑alone desktop app** that writes files locally. | No. | Not designed for networking; the original AO client expects static map files. |
| **Lambdaclass Argentum** | The web client loads maps via HTTP; editing is done offline and then uploaded. | No built‑in collaboration. | The team focused on a **single‑player editor** to keep the UI simple. |
| **AO‑Libre Client** | No live editing; only map loading. | No. | The client is a **viewer**; collaborative editing would require a server component that does not exist in the repo. |

**Conclusion:** No project currently supports live or collaborative map editing. Implementing such a feature would require a dedicated synchronization server and conflict‑resolution logic, which is out of scope for the initial construction mode.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source | Target | Description |
|---------------|--------|--------|-------------|
| **`map2json.py` (official editor repo)** | Binary `*.map` | JSON (`map.json`) | Simple Python script that parses the binary layout and outputs a JSON representation (includes layers, NPCs, triggers). |
| **`json2map.py`** | JSON (`map.json`) | Binary `*.map` | Reverse of `map2json.py`. Handles layer masks and writes the correct checksum. |
| **Lambdaclass Web Export** | In‑browser editor | JSON (`exported_map.json`) | The web client can export the current map as JSON, which matches the structure used by `map2json.py`. |
| **AO‑Libre Importer** | Binary `*.map` | In‑memory objects | Not a standalone tool, but the code can be extracted to reuse the parsing logic. |

**Opportunity:** By bundling `map2json.py` and `json2map.py` (or re‑implementing them in TypeScript), we can provide **import/export** commands in our CLI, allowing users to bring maps created with the official editor directly into the construction mode.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derived work that is **distributed** must also be licensed under AGPL‑3.0 and provide source code. Using the editor’s **code** (e.g., parsing logic) in our repository would require us to adopt AGPL‑3.0 for the whole project, which may be undesirable. However, **ideas**, **file format specifications**, and **documentation** are free to reuse. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy or adapt their TypeScript parsing/export code without affecting our license. |
| **AO‑Libre Client** | **GPL‑3.0** (or AGPL‑3.0 depending on fork) | Similar to AGPL, but less strict for network‑only use. Reusing code would require GPL‑3.0 compatibility. The parsing logic is straightforward, so we can re‑implement it ourselves to avoid license constraints. |

**Recommendation:**  
- **Do not copy** code from the official editor or AO‑Libre client directly.  
- **Leverage** the MIT‑licensed scripts from the Lambdaclass repo (or re‑implement the logic) for import/export.  
- Document the binary format based on publicly available specifications; this is allowed under any license.

---

## 6. Summary & Action Items for Construction Mode

1. **Adopt a 4‑layer model** internally, mirroring the official editor, but expose them as separate JSON files (`terrain.json`, `meta.json`, `collision.json`, `overlays.json`).  
2. **Implement a conversion CLI** (`npm run map:import` / `map:export`) that uses the MIT‑licensed Python/TS scripts to translate between the official binary format and our JSON split‑file format.  
3. **Store collision as a bitmask** per tile (same as the official editor) to keep compatibility with existing maps.  
4. **Keep triggers in a dedicated `specials.json`** with a schema compatible with the official trigger records (`type`, `params`).  
5. **Document the format** in `docs/map_format.md` (this file) and reference the conversion tools in the README.  
6. **Avoid live/collaborative editing** for now; focus on a robust offline editor that can later be extended.

--- 

*Prepared by the OpenAO research team – 2026‑09‑20.*