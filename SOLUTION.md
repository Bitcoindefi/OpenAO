FILE: docs/map_editor_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes the map‑editing approaches used by three prominent projects in the Argentum Online ecosystem:

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop editor (VB6) | Visual Basic 6 | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Web client | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client | JavaScript (Node/Electron) | GPL‑3.0 |

The goal is to understand the map formats, layering models, live‑editing capabilities, import/export tools, and licensing constraints so we can make informed decisions for the **construction mode** of OpenAO.

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with OpenAO (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-----------------------|--------------------|-------------------------------------------------------------------|
| **Official World Editor** | `.map` (binary) | - Header with map dimensions, version, and checksum.<br>- Sequential blocks: **Terrain**, **Objects**, **NPCs**, **Triggers**, **Specials**.<br>- Uses a custom packed format (little‑endian, 2‑byte integers for tile IDs, 1‑byte flags for blockability). | The binary layout is *similar* to OpenAO’s logical separation but not directly interchangeable. A conversion step is required to map the binary blocks to OpenAO’s JSON‑like `meta`, `terrain`, `npcs`, `specials` structures. |
| **Lambdaclass Argentum** | `.json` (exported from the editor) & `.map` (imported) | - When exported to JSON: an object with keys `meta`, `terrain`, `npcs`, `specials` mirroring OpenAO’s schema.<br>- When importing the original `.map`: the client parses the binary using the same logic as the official editor (see above). | The JSON export **is directly compatible** with OpenAO’s format. The binary import is not, but the client already contains a parser that can be reused to read `.map` files. |
| **AO‑Libre Client** | `.map` (binary) & `.json` (custom) | - Primarily reads the official binary `.map` format.<br>- Provides a small utility to convert a binary map to a plain JSON representation (`map2json.js`). | The JSON conversion yields a structure compatible with OpenAO’s `meta`/`terrain`/`npcs`/`specials`. The binary format is the same as the official editor, so the same compatibility considerations apply. |

**Take‑away:**  
- If we support **JSON** as a first‑class import/export format, we can interoperate with the Lambdaclass web client and AO‑Libre’s conversion script without licensing issues.  
- For **binary `.map`** files we need a dedicated parser (or reuse existing open‑source parsers) and a conversion routine to our internal representation.

---

## 2. Layering, Blocking & Triggers

### Official World Editor (VB6)

| Concept | Implementation |
|---------|----------------|
| **Layers** | - **Terrain Layer**: 2‑D array of tile IDs (0‑255).<br>- **Objects Layer**: List of objects with X/Y, graphic ID, and optional `blocked` flag.<br>- **NPC Layer**: List of NPC spawn points (X/Y, NPC ID, direction).<br>- **Triggers Layer**: List of trigger rectangles (`x1, y1, x2, y2`) with an associated script name.<br>- **Specials Layer**: Miscellaneous data (e.g., warps, doors). |
| **Blocking** | Each object can have a *blocked* boolean. The editor also allows setting a **global “walkable” flag** per tile in the terrain layer (via a separate “blocked tiles” list). |
| **Triggers** | Stored as rectangular zones with a script reference. The editor provides a UI to edit the rectangle coordinates and select a script from the project’s script folder. |
| **Design Decisions Worth Copying** | - **Explicit “blocked” flag per object** simplifies collision checks.<br>- **Separate trigger list** (instead of embedding scripts in tiles) keeps map files lightweight and decouples map data from game logic.<br>- **Version header** allows future‑proofing; we should keep a version field in our map JSON. |

### Lambdaclass Web Client

| Concept | Implementation |
|---------|----------------|
| **Layers** | Mirrors the JSON structure: `terrain`, `objects`, `npcs`, `triggers`, `specials`. The UI treats each as a separate editable layer. |
| **Blocking** | Uses the same `blocked` boolean on objects; terrain tiles are considered walkable unless an object with `blocked:true` occupies the cell. |
| **Triggers** | Represented as objects with `{x, y, width, height, script}`. The editor visualizes them with a semi‑transparent overlay. |
| **Design Decisions Worth Copying** | - **Layer toggling UI** (show/hide each layer) improves usability for map creators.<br>- **JSON schema validation** (via TypeScript interfaces) ensures data integrity before saving. |

### AO‑Libre Client

| Concept | Implementation |
|---------|----------------|
| **Layers** | Reads binary layers directly; the UI (when present) shows only terrain and objects. No built‑in trigger editor. |
| **Blocking** | Determined by object flags in the binary file. |
| **Triggers** | Not editable in the client; they are only read at runtime. |
| **Design Decisions Worth Copying** | - **Binary‑first approach** yields fast loading; we could keep a binary cache for production while using JSON for authoring. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. The editor is a standalone desktop app; maps are saved to disk and loaded by the server. | No. No networking features. | N/A |
| **Lambdaclass Argentum** | No built‑in live editing. Maps are edited locally and then uploaded to the server via a REST endpoint. | No. The web client does not implement real‑time collaboration. | N/A |
| **AO‑Libre Client** | No. Focuses on map consumption, not creation. | No. | N/A |

**Conclusion:** None of the existing tools provide live or collaborative editing. Implementing such a feature would be a **first** for the ecosystem and could be a differentiator, but it also introduces complexity (conflict resolution, real‑time sync, security). For the initial construction mode we should target **offline editing** with a simple import/export workflow.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capabilities | Export Capabilities | Notable Tools |
|---------|---------------------|---------------------|---------------|
| **Official World Editor** | Imports its own `.map` binary format only. | Exports `.map` (binary). | None external. |
| **Lambdaclass Argentum** | - Can import binary `.map` (via internal parser).<br>- Can import JSON exported from the editor. | - Exports JSON (compatible with OpenAO).<br>- Can export binary `.map` for server use. | `src/editor/mapIO.ts` (TypeScript) handles both formats. |
| **AO‑Libre Client** | - Reads binary `.map`.<br>- Provides `map2json.js` utility to convert binary to JSON. | - No direct export; relies on external tools. | `tools/map2json.js` (Node script). |

**Implication for OpenAO:**  
- Re‑using the **JSON export** logic from Lambdaclass gives us immediate compatibility with both the web client and AO‑Libre’s conversion script.  
- Implementing a **binary parser** (or borrowing the one from Lambdaclass) would let us import existing official maps without requiring users to first convert them.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for OpenAO |
|---------|---------|--------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that *links* to or incorporates code from the editor must be released under AGPL‑3.0. However, **ideas, file formats, and documentation are not copyrighted**; we can freely adopt the format description and UI concepts. Direct code reuse (e.g., VB6 parsing routines) would require AGPL compliance. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy TypeScript parsing code, JSON schema definitions, or UI patterns without licensing concerns, provided we retain the original copyright notice. |
| **AO‑Libre Client** | **GPL‑3.0** | GPL is copyleft but less restrictive than AGPL for non‑network‑served software. Reusing code would require OpenAO to be GPL‑3.0 compatible. Since OpenAO is currently MIT‑licensed, we should avoid pulling GPL‑licensed source files directly. Instead, we can reference their conversion script as an external tool or rewrite the needed functionality. |

**Recommendation:**  
- **Adopt the JSON schema** from Lambdaclass (MIT) as the canonical import/export format.  
- **Write our own binary `.map` parser** based on publicly documented specifications (or reverse‑engineered from the open‑source parsers) to stay MIT/GPL‑compatible.  
- Use the AGPL‑3.0 editor **only as a reference** for UI/UX decisions, not for code reuse.

---

## 6. Summary & Action Items for Construction Mode

1. **Define a JSON map schema** (`meta`, `terrain`, `npcs`, `specials`, `triggers`) that matches the structure used by Lambdaclass and AO‑Libre’s conversion script.  
2. **Implement a parser** for the official binary `.map` format (MIT‑compatible) to allow users to import existing maps.  
3. **Provide an export command** that writes the current map to both JSON (for editing) and binary `.map` (for server consumption).  
4. **Design the UI** with layer toggles, blocked‑object flags, and a trigger editor, borrowing the ergonomics from the official editor and the web client.  
5. **Document the format** (this file) and add a `README.md` in `docs/` linking to it.  

---  

*Document created on 2026‑09‑20.*