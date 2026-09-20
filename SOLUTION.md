FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | TypeScript, React, Pixi.js, Vite | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | JavaScript (Node/Electron) + HTML5 Canvas | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-------------|--------------------|--------------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | Proprietary binary layout used by the original Argentum server. The file stores a header, a 2‑D array of **tiles**, **blocked tiles**, **trigger tiles**, **NPC spawns**, and **special objects**. The binary layout is documented in the original server source (`Map.cpp`). | Very close to our internal representation. Our `terrain` array maps 1‑to‑1 to the editor’s tile grid. `meta` (map name, music, etc.) matches the `.inf` fields. `npcs` and `specials` are stored as separate records, similar to our JSON structures. Minor differences: the editor stores **layer** information as a single byte per tile (0‑2) while we keep layers separate (`terrain`, `blocked`, `trigger`). |
| **Lambdaclass Web Client** | `*.json` (exported from server) | The client reads maps that the server provides via HTTP as JSON objects: `{ width, height, tiles: [{x,y,layer,gfxId,blocked,trigger}], npcs: [...], specials: [...] }`. | Directly compatible with our **JSON‑based** representation. The `tiles` array can be split into `terrain`, `blocked`, and `trigger` layers. No binary handling needed. |
| **AO‑Libre Client** | `*.map` (binary) – same as official editor | Re‑uses the original binary format (identical to the official editor). | Same compatibility notes as the official editor. |

**Takeaway:**  
- The binary `.map` format is the de‑facto standard for the original server and is already compatible with our internal data structures after a simple parsing step.  
- The JSON format used by the web client is already aligned with our planned `meta/terrain/npcs/specials` JSON schema, making it the easiest target for import/export.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

### Layer Model
- **Layer byte (0‑2)** per tile:
  - `0` – Ground (walkable)
  - `1` – Object (may be blocked)
  - `2` – Roof (always walkable, drawn on top)
- The editor stores **one byte per tile** that encodes both the graphic ID (2 bytes) and the layer (1 byte).  

### Blocking
- A separate **blocked flag** (boolean) is stored per tile in the same record.  
- The flag is independent of the layer; a ground tile can be blocked (e.g., water) and an object tile can be non‑blocked (e.g., decorative).

### Triggers
- Triggers are stored as **trigger IDs** (0 = none, >0 = specific trigger) per tile.  
- The editor also keeps a **trigger table** mapping IDs to actions (e.g., teleport, open door).  

### Decisions Worth Copying
| Decision | Reason | How to adopt |
|----------|--------|--------------|
| **Separate layer byte** | Keeps rendering order simple and matches the original client expectations. | Keep a `layer` field in our `terrain` objects; when exporting to binary, pack it as the official format expects. |
| **Explicit blocked flag** | Allows any tile to be walkable or not regardless of visual layer. | Preserve a `blocked` boolean in our map schema (`terrain.blocked`). |
| **Trigger table** | Centralizes trigger logic, making it easy to edit triggers without touching tile data. | Implement a `triggers.json` file alongside maps, mirroring the editor’s table. |
| **Binary packing** | Efficient for the original client; useful for server‑side loading. | Provide a **binary export** option for compatibility with existing servers. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Limitations |
|---------|--------------|-----------------------|--------------------------------------|
| **Official World Editor** | No (desktop, file‑based). | No. | Designed for offline map creation; no networking layer. |
| **Lambdaclass Web Client** | No built‑in map editor; only map **viewer**. | No. | Focused on gameplay, not map authoring. |
| **AO‑Libre Client** | No editor component. | No. | Primarily a client, not a map authoring tool. |

**Observations:**  
- No project attempted real‑time collaborative editing. The main blockers are:  
  1. **Binary format** – difficult to merge changes without a higher‑level representation.  
  2. **Lack of server‑side conflict resolution** – no CRDT or operational transform implementation.  
  3. **Tooling focus** – most efforts target gameplay, not authoring.

**Implication for Construction Mode:**  
If we ever want live/collaborative editing, we should store maps in a **JSON‑friendly, diff‑able format** (e.g., one file per layer) and implement a simple merge strategy (e.g., per‑tile last‑write-wins) before converting to binary for the server.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source | Target | Description |
|---------------|--------|--------|-------------|
| **`map2json.py`** (community script) | https://github.com/ao-org/argentum-online-worldeditor/blob/master/tools/map2json.py | Binary `.map` → JSON | Parses the binary map and outputs a JSON structure compatible with the web client. |
| **`json2map.py`** | Same repo | JSON → Binary `.map` | Reverse of `map2json.py`. Handles layer, blocked, and trigger packing. |
| **`ao-map-converter` (npm package)** | https://www.npmjs.com/package/ao-map-converter | Binary ↔ JSON | Small Node.js library used by the Lambdaclass client to load maps from the server. |
| **`ao-editor` (Electron)** | https://github.com/ao-libre/ao-cliente | Binary ↔ JSON | Provides a minimal UI to edit tiles; exports both formats. |

**Takeaway:**  
- Existing converters are **open source** (MIT / GPL‑3.0) and can be reused or adapted.  
- For our repo, we can add a thin wrapper script (`scripts/convertMap.js`) that uses `ao-map-converter` to import official `.map` files into our JSON schema and vice‑versa.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be licensed under AGPL‑3.0 and provide source code. Using code snippets (e.g., the binary parser) in a **separate** tool that is not distributed with our server is permissible, but bundling it with the server would require AGPL‑3.0 compliance. |
| **Lambdaclass Argentum** | MIT | Very permissive; we can copy code, adapt the JSON schema, or embed their conversion utilities without licensing concerns (just retain the MIT notice). |
| **AO‑Libre Client** | GPL‑3.0 | Similar to AGPL but without the network‑use clause. If we incorporate any of its code into a distributed binary, we must release the combined work under GPL‑3.0. |

**Practical Guidance**

- **Parsing / Export Logic:** Reuse the MIT‑licensed `ao-map-converter` (or the community Python scripts) for conversion.  
- **UI / Editor Features:** If we decide to embed parts of the official VB6 editor UI, we must either keep it **separate** (e.g., a standalone tool) or adopt the AGPL‑3.0 license for the whole repository.  
- **Documentation & Research:** The content we are adding here is purely informational and does not affect licensing.

---

## 6. Recommendations for Construction Mode

1. **Primary Internal Format:** Use a **JSON schema** mirroring the web client’s format (`meta`, `terrain`, `npcs`, `specials`). This is easy to edit, diff, and merge.  
2. **Binary Compatibility Layer:** Provide a **conversion module** (`scripts/convertMap.js`) that can read/write the official `.map` binary format using the MIT‑licensed `ao-map-converter`. This satisfies the need to import existing maps.  
3. **Layer Model:** Keep the three‑layer approach (ground, object, roof) with an explicit `layer` field per tile. Store `blocked` and `trigger` flags alongside.  
4. **Trigger Table:** Export triggers to a separate `triggers.json` file; this mirrors the official editor and simplifies future live‑editing extensions.  
5. **Future Live Editing:** Design the JSON format to be **line‑oriented** (one tile per line) or split per layer to make merges trivial. Consider adding a simple **WebSocket** sync layer later.  

---

*Document created for issue #14 – “Research: como editan mapas los otros proyectos de Argentum Online”.*