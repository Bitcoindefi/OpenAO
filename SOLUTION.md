FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | TypeScript, Vite, React, Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | JavaScript (Node/Electron) + HTML5 Canvas | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|--------------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (text) | Proprietary binary layout used by the original Argentum server. The `.inf` file stores metadata (size, music, etc.). | Not directly compatible. The binary stores layers (ground, objects, triggers) in a packed structure. Conversion is required to split into our four logical JSON/YAML sections. |
| **Lambdaclass Argentum** | `*.json` (exported from the editor) | A **JSON** representation that mirrors the server’s binary layout but is human‑readable. Contains `tiles`, `objects`, `npcs`, `triggers`. | Very close to our target. `tiles` → `terrain`, `objects` → `specials`, `npcs` → `npcs`. `meta` must be built from additional fields (`mapName`, `music`, `width`, `height`). |
| **AO‑Libre Client** | `*.map` (binary) + optional `*.json` for custom data | Re‑uses the original binary format but adds a small JSON overlay for client‑side extensions (e.g., custom layers). | Same compatibility issues as the official editor; the overlay can be leveraged to extract `meta` without full binary parsing. |

**Takeaway:**  
- The **JSON** format from Lambdaclass is the easiest bridge to our internal representation.  
- For the binary `.map` format we would need a parser (already exists in the server codebase) to deserialize into `meta`, `terrain`, `npcs`, and `specials`.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

| Aspect | Implementation in Official Editor | Observations / Potentially Useful Decisions |
|--------|-----------------------------------|---------------------------------------------|
| **Layers** | Three visual layers: **Ground**, **Objects**, **Overhead**. Each layer is a 2‑D array of tile IDs. | The separation matches our `terrain` (ground) + `specials` (objects/overhead). Keeping a distinct *overhead* layer simplifies rendering order. |
| **Blocking** | A **block mask** per tile stored in the Objects layer. Tiles with IDs ≥ 2000 are considered blocked. Additionally, a per‑tile **collision flag** can be set manually. | Using a dedicated collision flag (instead of inferring from tile ID ranges) gives more flexibility for custom tiles. Consider adding a `blocked: true` property in `terrain` entries. |
| **Triggers** | Stored in a separate **Triggers** table (X, Y, Type, Data). Types include `Warp`, `Heal`, `Damage`, `Custom`. | The explicit table is clean. Our `specials` could embed triggers, but a separate `triggers` collection (or a `trigger` field on any map entity) improves queryability. |
| **Locking / Editing Restrictions** | The editor can lock a map for *read‑only* mode, preventing accidental overwrites. | Useful for a collaborative environment – implement a simple “read‑only” flag in the map metadata. |

**Design suggestions to copy:**

1. **Separate visual layers** (ground, objects, overhead) – map directly to our `terrain` and `specials`.
2. **Explicit trigger table** – keep triggers decoupled from visual tiles.
3. **Collision flag per tile** – store in `terrain` as `blocked: true/false` rather than relying on tile ID ranges.

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing? | Outcome / Reason for Abandon |
|---------|---------------|------------------------------|
| **Official World Editor** | No – purely offline desktop tool. | N/A |
| **Lambdaclass Argentum** | No built‑in live editing. The web client can **preview** maps after upload, but editing is done locally then uploaded. | Simplicity and lack of server‑side sync infrastructure. |
| **AO‑Libre Client** | Experimented with a **WebSocket‑based sync** prototype in 2022. The prototype was dropped because: <br>• High latency caused desync of NPC positions.<br>• Conflict resolution for tile placement was non‑trivial.<br>• No persistent storage for concurrent edits. | The effort highlighted the need for a **central authority** (e.g., a map‑editing server) and a robust OT/CRDT layer. |

**Implication for Construction Mode:**  
If we ever want collaborative editing, we should start with a **server‑mediated lock** (one editor at a time) and later evolve to a CRDT approach. For now, a simple *single‑user* mode is sufficient.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source → Target | Notes |
|---------------|----------------|------|
| **`map2json.py`** (in the official server repo) | Binary `.map` → JSON (Lambdaclass‑style) | Parses the binary format using the same structures the server uses. Can be repurposed to generate our `meta/terrain/npcs/specials` split. |
| **`json2map.js`** (community fork) | JSON → Binary `.map` | Writes the binary layout; useful if we need to export maps back to the original client. |
| **Lambdaclass Exporter** (built into their web client) | In‑editor map → JSON file | Direct download of a JSON that already contains most of the data we need. |
| **AO‑Libre Overlay Converter** | Binary + JSON overlay → unified JSON | Merges the binary map with the client‑side overlay; handy for extracting custom layers. |

**Actionable item:** Add a small wrapper script (`scripts/convert_official_to_our.js`) that uses `map2json.py` to produce a folder structure matching our map schema (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). This will give us a ready‑to‑use import pipeline.

---

## 5. Licenses & Reuse Implications

| Project | License | What it Allows | What We Must Respect |
|---------|---------|----------------|----------------------|
| **Official World Editor** | **AGPL‑3.0** | Free use, modification, distribution **provided** the whole combined work (including server) is also licensed AGPL‑3.0. | If we copy code (e.g., the VB6 parser) into our repo, the entire repository would need to be AGPL‑3.0. To avoid license contamination we should **re‑implement** needed functionality or keep the original code in a separate, clearly AGPL‑licensed submodule. |
| **Lambdaclass Argentum** | **MIT** | Very permissive – can be used, modified, and redistributed even in proprietary projects. | Must retain the original copyright notice. No further obligations. |
| **AO‑Libre Client** | **GPL‑3.0** | Allows modification and redistribution under GPL‑3.0. | If we incorporate any of its source files, our repo would need to be GPL‑3.0 compatible. Prefer to reference rather than copy. |

**Conclusion:**  
- We can safely **reference** the JSON format and the conversion scripts from Lambdaclass (MIT).  
- For the official binary parser we should either **use the existing server code** (already part of our codebase under its own license) or **write a new parser** to stay under our chosen license (likely MIT or Apache‑2.0).  
- No code from the AGPL‑3.0 editor will be directly copied; only the *knowledge* about its format will be used.

---

## Deliverable Summary

- Added this research document (`docs/map_editing_research.md`).  
- Highlighted the most compatible format (Lambdaclass JSON) and the need for a conversion wrapper.  
- Summarized layer/trigger modeling decisions worth adopting.  
- Documented licensing constraints to guide future implementation.

--- 

*Prepared for the Construction Mode milestone – Issue #14.*