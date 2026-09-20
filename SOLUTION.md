FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating past mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Visual Basic 6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Details | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|----------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.dat` (metadata) | - 2‑byte header (`MAP`) <br> - Fixed‑size header (width, height, tileset) <br> - Tile data stored as 2‑byte indices (terrain) <br> - Separate sections for **NPCs**, **Objects**, **Triggers** (specials) stored as structs. <br> - No explicit “layer” concept; everything lives in a single tile layer; blocking is a flag per tile. | - **Terrain**: Directly maps to our `terrain` (tile index). <br> - **NPCs / Specials**: Same logical grouping, but stored in binary structs; conversion needed. <br> - **Meta**: Not present; the editor stores map name, version, and author in the `.dat` file. |
| **Lambdaclass Argentum** | `*.json` (exported from the editor) and `*.map` (imported) | - Uses the same binary `.map` format as the official editor for runtime. <br> - Provides a **JSON export** (`map.json`) that mirrors our internal representation: `{meta, terrain, npcs, specials}`. | - The JSON export is **already compatible** with our format; only minor field‑name adjustments may be required. |
| **AO‑Libre Client** | `*.map` (binary) | - Re‑uses the official binary format unchanged. <br> - No custom export; reads directly from the binary file. | - Same as the official editor: needs conversion to our layered representation. |

### Summary

- All three projects ultimately rely on the **original binary `.map` format** for runtime.  
- Only the **Lambdaclass web client** provides a ready‑to‑use JSON representation that aligns closely with our `meta/terrain/npcs/specials` split.  
- Converting the binary format to our structure will require a small parser (already present in the server codebase).

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

| Aspect | Implementation in Official World Editor |
|--------|------------------------------------------|
| **Layers** | Single tile layer. Visual “layers” (ground, objects, roofs) are simulated by using **tile indices** that reference different tilesets. No explicit multi‑layer data structure. |
| **Blocking** | Each tile has a **blocked flag** (1 bit) stored in the tile data. Additionally, **object tiles** can be marked as blocked via the *Object* section. |
| **Triggers / Specials** | Stored as a list of structs (`Trigger`) containing: <br> - X, Y coordinates <br> - Trigger type (e.g., `Warp`, `Heal`, `Custom`) <br> - Optional parameters (target map, script ID, etc.) |
| **Design Decisions Worth Copying** | 1. **Simple binary layout** – easy to load in the client with minimal parsing overhead. <br> 2. **Separate “specials” table** – keeps terrain clean and allows fast lookup of triggers. <br> 3. **Explicit blocked flag per tile** – avoids having to compute blocking from object presence. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a desktop, single‑user tool. | No. | N/A |
| **Lambdaclass Argentum** | No built‑in live editing; maps are edited offline and then uploaded. | No. | N/A |
| **AO‑Libre Client** | No. The client is read‑only regarding map data. | No. | N/A |

**Takeaway:** No existing project attempted real‑time or collaborative map editing. The main obstacles reported in community discussions are:

- **Binary format rigidity** – hard to merge concurrent changes.  
- **Lack of a server‑side conflict resolution layer**.  

If we aim for collaborative editing, we should design a **JSON‑based intermediate format** with versioning (e.g., using CRDT or operational transforms) and only compile to binary for deployment.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source | Target | Description |
|---------------|--------|--------|-------------|
| **`map2json.py`** (community script) | Binary `.map` | JSON (`meta`, `terrain`, `npcs`, `specials`) | Simple Python parser; converts the official binary format to a JSON structure compatible with our internal representation. |
| **`json2map.py`** | JSON | Binary `.map` | Reverse of the above; writes the binary layout expected by the official client. |
| **Lambdaclass Exporter** | In‑client UI | JSON | Exports the current map to a JSON file that matches the structure used by the web client. |
| **AO‑Libre Importer** | None (read‑only) | N/A | No import tool; only reads binary maps. |

**Implication:** By bundling `map2json.py` and `json2map.py` (or re‑implementing them in TypeScript), we can provide **import/export** capabilities that let users edit maps with our Construction Mode and later deploy them to the official client without manual conversion.

---

## 5. Licenses & Reuse Implications

| Project | License | Reuse Considerations |
|---------|---------|----------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be AGPL‑3.0. If we only **reference** the format or reuse ideas (e.g., binary layout), we are safe. Directly copying code (e.g., the parser) would require us to license our repository under AGPL‑3.0 or keep the copied code in a separate AGPL‑licensed module. |
| **Lambdaclass Argentum** | **MIT** | Very permissive; we can copy/export code, parsers, or UI components without licensing constraints beyond attribution. |
| **AO‑Libre Client** | **GPL‑3.0‑or‑later** | Similar to AGPL but without the network‑use clause. Reusing code would require GPL‑3.0 compatibility. Since our project is currently under a permissive license (assumed), we should avoid directly copying GPL code unless we re‑license the whole repo under GPL. |

**Practical Guidance**

- **Use the MIT‑licensed JSON exporter from Lambdaclass** as the reference implementation for our import/export pipeline.  
- **Implement our own binary parser** based on the public specification of the `.map` format (which is de‑facto public knowledge) to stay clear of AGPL code.  
- Document the format and provide conversion scripts under our own license (e.g., MIT) to keep the repository permissively licensed.

---

## 6. Recommendations for Construction Mode

1. **Adopt a JSON intermediate format** (`meta`, `terrain`, `npcs`, `specials`) as the canonical representation inside the editor.  
2. **Provide two CLI utilities**: `ao-import` (binary → JSON) and `ao-export` (JSON → binary). Implement them in TypeScript/Node so they can be bundled with the web client.  
3. **Model blocking as an explicit flag** per tile (mirroring the official editor) to simplify path‑finding and collision checks.  
4. **Separate “specials”** (triggers, warps, custom scripts) from terrain to keep the tile grid lightweight.  
5. **Design the editor UI** with a **layer abstraction** (ground, objects, roofs) that maps to tile‑index ranges; this improves usability without altering the underlying file format.  
6. **Leave collaborative editing for a future iteration**; start with a robust single‑user workflow and ensure import/export works flawlessly.

---

*Document created for issue #14 – “Research: como editan mapas los otros proyectos de Argentum Online”.*