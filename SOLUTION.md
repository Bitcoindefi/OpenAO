FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview
This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating past mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor (VB6) | Visual Basic 6 (Win32) | **AGPL‑3.0** |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (includes a map viewer/editor) | Vite + TypeScript + React + Pixi.js | **MIT** |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (includes a simple map editor) | JavaScript (Node/Electron) | **GPL‑3.0** |

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-----------------------|--------------------|-------------------------------------------------------------------|
| **Official World Editor** | `.map` (binary) | - Header (size, version) <br> - **Layers**: `Terrain`, `Objects`, `Triggers` <br> - Each tile stores: `GraphicID`, `Blocked` flag, `TriggerID` <br> - Separate sections for NPC spawns and special objects (e.g., doors) | The binary format is **not directly compatible** with our JSON‑based format. However, the logical separation (terrain, NPCs, specials) maps 1‑to‑1 to our `terrain`, `npcs`, `specials`. A conversion script is required. |
| **Lambdaclass Argentum** | `.json` (custom) | - Root object: `{ meta, terrain, npcs, specials }` <br> - `terrain` is a 2‑D array of tile objects `{ gfx, blocked, trigger }` <br> - `npcs` and `specials` are arrays with position and type | **Fully compatible** with our format. The project re‑uses the same logical schema, only the file extension differs (`.json`). |
| **AO‑Libre Client** | `.map` (binary, same as official) | Same as official editor (see above) | Same incompatibility as the official editor. The client includes a small parser that converts the binary into an in‑memory structure similar to our JSON schema, but it does **not** expose an export routine. |

### Take‑aways
* The **official editor** and **AO‑Libre** share the same binary format. If we want to import maps created with those tools, we need a **binary → JSON converter**.
* The **Lambdaclass** client already uses the exact JSON schema we plan to adopt, making it a reference implementation for serialization/deserialization.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

* **Layers** – The editor stores three logical layers:
  1. **Terrain** – Ground tiles (walkable or not).  
  2. **Objects** – Decorative/interactive tiles (e.g., trees, rocks).  
  3. **Triggers** – Separate table mapping tile coordinates to a trigger ID.

* **Blocking** – Each tile has a single `Blocked` byte (0 = walkable, 1 = blocked). The editor does **not** support per‑layer blocking; the flag applies to the final rendered tile.

* **Triggers** – Stored in a dedicated “Trigger” section. A trigger ID is an index into a global trigger list (script name, parameters). The editor allows only **one trigger per tile**.

### Decisions Worth Copying
| Decision | Reason | Recommendation |
|----------|--------|----------------|
| **Separate trigger table** | Keeps tile data small and allows re‑using the same trigger on many tiles. | Adopt the same approach: a `triggers` object keyed by `triggerId` with metadata, and a `triggerId` field on each tile. |
| **Binary format for speed** | Useful for the original client (resource‑constrained). | Not needed for our web‑based construction mode; JSON is more developer‑friendly. |
| **Single blocked flag per tile** | Simplicity, matches the original server logic. | Keep this model; our server already expects a single `blocked` boolean per tile. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a standalone desktop app. | No. | N/A – design focused on offline map creation. |
| **Lambdaclass Argentum** | No built‑in live editing; maps are edited offline and then uploaded. | No. | N/A – the project’s scope is a client, not an editor. |
| **AO‑Libre Client** | No. The client can load maps at runtime but does not edit them. | No. | N/A – the client is a viewer/player, not an editor. |

**Conclusion:** No existing project attempted live or collaborative editing. The main obstacles reported in community discussions are:

* **Synchronization complexity** – keeping server state consistent while multiple users modify the same map.
* **Performance** – real‑time binary diff transmission is non‑trivial.
* **Lack of a central authoritative map service** – the original server expects static map files.

If we decide to implement collaborative editing later, we should start with a **WebSocket‑based diff protocol** and store maps in a **JSON** format to simplify merging.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source | Target | Description |
|---------------|--------|--------|-------------|
| **`map2json.py`** (community gist) | Official `.map` binary | JSON (`meta`, `terrain`, `npcs`, `specials`) | Simple Python script that parses the binary header and tile data, then writes a JSON file compatible with Lambdaclass schema. |
| **`json2map.exe`** (part of AO‑Libre) | JSON → Binary | Generates a `.map` file that the official client can load. | Limited to a subset of features (no custom triggers). |
| **Lambdaclass `MapSerializer.ts`** | JSON ↔ In‑memory objects | Provides `loadMap(json)` and `saveMap()` functions for the web client. | Directly usable in our TypeScript codebase. |

### Recommendation
* **Integrate `map2json.py`** (or rewrite it in TypeScript) as a CLI tool under `tools/convert-map`. This will let us import existing community maps without rewriting them.
* Provide a **reverse converter** (`json2map`) for users who need to edit maps with the official editor and then bring them back to our system.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be licensed under AGPL‑3.0 and provide source code. Using the binary format or ideas is fine, but copying code (e.g., the parser) would require AGPL compliance. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy code, adapt the JSON schema, and even re‑license our own project under any license. |
| **AO‑Libre Client** | **GPL‑3.0** | Derivative works must be GPL‑3.0 compatible. Since our repository is currently under **MIT** (as per the root `LICENSE`), we can **link** to GPL code only if we re‑license the whole project under GPL‑3.0, which we likely want to avoid. Therefore, we should not copy code from AO‑Libre, but we can study its design. |

### Practical Take‑aways
* **Use the MIT‑licensed Lambdaclass code** as the reference implementation for JSON handling.
* **Do not copy** the VB6 source from the official editor; instead, re‑implement needed parsers in our own language (TypeScript/Node) to stay clear of AGPL obligations.
* Any **conversion utilities** we write can be MIT‑licensed, as they are original implementations.

---

## 6. Summary & Action Items

| Item | Owner | Deadline |
|------|-------|----------|
| Add `tools/convert-map/map2json.ts` – TypeScript version of the binary → JSON converter. | TBD | Sprint 3 |
| Write unit tests for the converter (sample `.map` files in `test/fixtures`). | TBD | Sprint 3 |
| Update `README.md` with a section on “Importing legacy maps”. | TBD | Sprint 3 |
| Review the trigger model and ensure our JSON schema includes a `triggers` dictionary. | TBD | Sprint 2 |
| Document any future decisions about live/collaborative editing in `docs/CollaborationPlan.md`. | TBD | Post‑Sprint 4 |

--- 

*Document created on 2026‑09‑20.*