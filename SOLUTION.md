FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, to justify design decisions for the upcoming **construction mode**, and to identify reusable tools or ideas.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **argentum-online-worldeditor** | https://github.com/ao-org/argentum-online-worldeditor | Official desktop editor | Visual Basic 6 (Win32) | AGPL‑3.0 |
| **lambdaclass/argentum** | https://github.com/lambdaclass/argentum | Web client (includes a simple map editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **ao-libre/ao-cliente** | https://github.com/ao-libre/ao-cliente | Community client (has a map‑viewer/editor component) | JavaScript (Node/Electron) + Pixi.js | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-----------------------|--------------------|-------------------------------------------------------------------|
| **argentum-online-worldeditor** | `.map` (binary) | - Header (size, version) <br> - Layer data: **Terrain**, **Objects**, **Triggers**, **NPCs** <br> - Each tile is a 2‑byte index into a tileset. <br> - Separate sections for **blocked tiles** and **trigger data**. | Very close. The official format stores terrain, NPCs and specials in the same file, but it does **not** separate them into distinct JSON/YAML files like our `meta/terrain/npcs/specials`. Conversion is needed (binary → our JSON). |
| **lambdaclass/argentum** | `.json` (custom) | - `tiles`: 2‑D array of tile IDs (terrain) <br> - `objects`: list with `x,y,type,blocked` <br> - `npcs`: list with `x,y,ID,dialog` <br> - `triggers`: list with `x,y,type,params` | Directly compatible with our split‑file approach. The project already stores each logical layer in its own JSON key, which can be split into separate files (`terrain.json`, `npcs.json`, etc.) with minimal transformation. |
| **ao-libre/ao-cliente** | `.map` (binary, same as official) and optional `.json` export | Uses the same binary format as the official editor, but includes a **runtime parser** that converts it to an in‑memory JS object with `terrain`, `blocked`, `npcs`, `triggers`. | Same compatibility considerations as the official editor – binary → JSON conversion required. The parser code can be reused as a reference for our own import tool. |

### Summary

* The **official editor** and **ao‑libre client** share the same binary `.map` format.  
* **lambdaclass/argentum** already works with a JSON‑based format that aligns closely with our modular design.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

* **Layers** – The binary file stores three main layers sequentially:  
  1. **Terrain** (ground tiles) – 2‑byte per tile.  
  2. **Objects** – each entry contains tile ID, X/Y, and a **blocked flag** (1 byte).  
  3. **Triggers** – stored after objects; each trigger has X/Y, type (2 bytes), and a variable‑length data block.

* **Blocking** – Implemented per‑object. The editor marks an object as “blocked” (collision) by setting the high‑bit of the object’s tile ID. This couples visual representation and collision in a single value.

* **Triggers** – Represented as a list of records. Types include: `Walk`, `Use`, `Talk`, `Custom`. Each trigger can reference a script ID or a set of parameters.

### Decisions Worth Copying

| Decision | Why It’s Useful | How to Apply in Construction Mode |
|----------|----------------|-----------------------------------|
| **Separate “blocked” flag** from tile ID (instead of overloading the ID) | Keeps visual tileset independent from collision logic, simplifies map editing and future tile‑set changes. | Store `blocked: true/false` in a dedicated `blocked` layer (or in the `terrain` JSON as a boolean per tile). |
| **Explicit trigger objects** with type + params | Allows extensible gameplay mechanics without hard‑coding IDs. | Model triggers as a JSON array (`triggers: [{x, y, type, params}]`). |
| **Version header** in the binary file | Enables backward compatibility when the format evolves. | Keep a `meta/version` field in our map metadata. |
| **Chunked sections** (terrain, objects, triggers) | Simplifies parsing and selective loading (e.g., only terrain for preview). | Our split‑file approach already achieves this; keep the same logical separation. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Limitations |
|---------|--------------|-----------------------|--------------------------------------|
| **argentum-online-worldeditor** | No. It is a classic desktop editor that writes to disk only when the user clicks *Save*. | No. No networking layer. | Simplicity; the original project predates modern real‑time collaboration tools. |
| **lambdaclass/argentum** | No built‑in live preview for map changes (editor is separate from the game client). | No. | Focus is on a lightweight web client; adding collaboration would require a server component not in scope. |
| **ao-libre/ao-cliente** | No live map editing; the client only loads static maps. | No. | The project is a client, not an editor. |

**Takeaway:** None of the existing tools provide live or collaborative editing. Implementing this would be a differentiator for our construction mode, but it also introduces complexity (conflict resolution, real‑time sync). If we decide to pursue it, we should start with a simple **optimistic lock** (one user edits at a time) and later evolve to CRDT/OT if needed.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capability | Export Capability | Notes |
|---------|-------------------|-------------------|-------|
| **argentum-online-worldeditor** | Can import **old `.map`** files (previous versions) and **XML** map descriptors used by early AO versions. | Exports only to its native binary `.map`. | No direct JSON export. |
| **lambdaclass/argentum** | Imports its own JSON format; also includes a small script (`scripts/convertMap.js`) that can read the official binary `.map` and output JSON. | Exports to JSON (used by the web client). | The conversion script is MIT‑licensed and can be reused. |
| **ao-libre/ao-cliente** | Uses a runtime parser (`src/parsers/mapParser.js`) to read binary `.map` into a JS object. | Provides a `toBinary()` helper for saving edited maps back to `.map`. | The parser is GPL‑3.0; we can reference its logic but must respect the license. |

### Practical Path for Our Project

1. **Leverage the conversion script from `lambdaclass/argentum`** (MIT) to read official binary maps and produce our JSON split files.  
2. **Adapt the parser from `ao-libre/ao-cliente`** (GPL‑3.0) only as inspiration; re‑implement the logic in our own codebase to avoid license contamination.  
3. Provide a **CLI tool** (`scripts/importMap.js`) that:
   * Accepts a `.map` file.
   * Outputs `meta.json`, `terrain.json`, `npcs.json`, `specials.json` in the repository’s map folder.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **argentum-online-worldeditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. Using its source code directly in our repo would require us to license the whole project under AGPL‑3.0, which may be undesirable. However, we can **study** the format and **re‑implement** it from scratch. |
| **lambdaclass/argentum** | **MIT** | Very permissive. We can copy the conversion script verbatim, adapt it, or even merge it into our codebase without changing our own license. |
| **ao-libre/ao-cliente** | **GPL‑3.0** | Similar to AGPL but without the network‑use clause. Directly copying code would require GPL‑3.0 for our project. Safer to re‑implement the parsing logic based on the public specification. |

**Conclusion:**  
* Use the MIT‑licensed conversion script as a base.  
* Re‑implement any needed binary parsing logic ourselves (or use a clean‑room approach) to stay under our chosen license (the repository currently uses MIT).  
* Document the format and provide import/export utilities without pulling in AGPL/GPL code.

---

## Deliverable Summary

* Added **`docs/MapEditorResearch.md`** with a comprehensive comparative analysis.  
* The document can be referenced by the construction‑mode design discussion and by future contributors who need to understand map format interoperability.

--- 

*Prepared by the OpenAO research team.*