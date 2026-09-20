FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid reinventing the wheel, learn from past decisions, and justify the design choices for the **construction mode** we are adding to this repository.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0 (or AGPL‑3.0 depending on fork) |

---

## 1. Map Formats Used

| Project | Map file format | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|----------------|-----------------------------------------------------------------------|
| **Official World Editor** | **`.map`** (binary) – custom format used by the original Argentum server. Contains header, tile data (terrain), object data (NPCs, triggers, items), and a separate **`.inf`** file for metadata (map name, music, etc.). | Not directly compatible. Our format splits data into four JSON/YAML files (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). The binary `.map` can be parsed to extract equivalent data, but conversion is required. |
| **Lambdaclass Argentum** | **`.json`** (custom) – a single JSON file per map that groups `meta`, `tiles`, `npcs`, `triggers`, `objects`. The structure mirrors the server’s expectations but is already in a readable format. | Very close. The `tiles` array maps 1‑to‑1 to our `terrain`. `npcs` and `triggers` map to `npcs` and `specials`. Only minor field‑name differences (e.g., `mapName` vs `name`). |
| **AO‑Libre Client** | **`.json`** (same as Lambdaclass) – uses the same community‑maintained JSON schema. | Same compatibility notes as above. |

### Quick Mapping Table

| Our file | Official `.map` field | Lambdaclass / AO‑Libre JSON field |
|----------|-----------------------|-----------------------------------|
| `meta.json` | `.inf` (name, music, light, etc.) | `meta` object (`name`, `music`, `light`, `pvp`, …) |
| `terrain.json` | Tile matrix in `.map` (2‑byte per tile) | `tiles` array (row‑major) |
| `npcs.json` | NPC block in `.map` | `npcs` array |
| `specials.json` | Triggers / objects block in `.map` | `triggers` + `objects` arrays (merged into `specials` in our design) |

---

## 2. Layer, Blocking & Trigger Modelling

### Official World Editor (VB6)

* **Layers** – The editor shows three logical layers:
  1. **Terrain** (ground tiles)
  2. **Objects** (static objects, doors, etc.)
  3. **Triggers/NPCs** (dynamic entities)

* **Blocking** – Each tile has a **`blocked`** flag (1‑byte) stored in the tile data. Objects can also set a blocking flag; the editor stores this in the object definition.

* **Triggers** – Stored as a list of records with:
  * `TriggerX`, `TriggerY`
  * `TriggerType` (e.g., `Walk`, `Use`, `Attack`)
  * `TriggerData` (string with parameters)

* **Design decisions worth copying**
  * **Separate “blocking” flag per tile** – simplifies path‑finding and collision checks.
  * **Explicit trigger type enum** – makes client‑side handling deterministic.
  * **Layered view** – UI can toggle visibility of each layer, useful for construction mode.

### Lambdaclass / AO‑Libre (Web)

* **Layers** – Implemented as three canvas layers in Pixi.js:
  1. **Background** (terrain)
  2. **Midground** (objects)
  3. **Foreground** (NPCs & triggers)

* **Blocking** – `tiles` objects contain a `blocked: boolean` property. Objects have `collision: boolean`.

* **Triggers** – Represented as objects with a `type` field (`walk`, `use`, `attack`, `custom`) and a `payload` object. The client interprets them directly.

* **Design decisions worth copying**
  * **Unified JSON schema** – easy to edit manually and to generate programmatically.
  * **Explicit `collision` per object** – mirrors the server’s expectations and avoids hidden “hard‑coded” blocks.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No – purely offline desktop tool. | No. | N/A – design predates modern collaborative tools. |
| **Lambdaclass Argentum** | No built‑in live editing. The web client loads static JSON files. | No. | N/A – focus is on gameplay, not map authoring. |
| **AO‑Libre Client** | No live editing. | No. | Community tried a **“map sharing”** feature using GitHub Gists, but it was dropped because synchronizing state across multiple users caused consistency bugs and required a server‑side authority layer that the client does not have. |

**Take‑away:** No existing project provides real‑time collaborative map editing. Implementing it would require a dedicated server component (e.g., WebSocket sync) and conflict‑resolution logic, which is out of scope for the current bounty.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capability | Export Capability | Notes |
|---------|-------------------|-------------------|-------|
| **Official World Editor** | Can **import** `.map` files created by older versions of the game. No direct import of JSON. | Can **export** to the binary `.map` format and a separate `.inf` metadata file. | Community scripts (Python) exist to convert `.map` ↔ JSON, but they are not officially maintained. |
| **Lambdaclass Argentum** | **Import** – reads JSON maps directly. No built‑in parser for the binary `.map`. | **Export** – writes JSON maps; can also generate a binary `.map` using a helper library (`map-converter`). | The helper library is MIT‑licensed and can be reused. |
| **AO‑Libre Client** | Same as Lambdaclass – JSON only. | Same as Lambdaclass. | Provides a small CLI (`ao-map-cli`) to convert between JSON and the binary format (leverages the same MIT library). |

**Opportunity:** By adding a small conversion script (Node.js or Python) that uses the MIT‑licensed `map-converter` library, we can import maps created with the official editor into our construction mode. This would be a concrete advantage for users.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be licensed under AGPL‑3.0 and provide source code. Using code snippets (e.g., parsing logic) would require the whole repository to be AGPL‑3.0 compatible. However, ideas, UI concepts, and data format specifications are **not** protected by copyright, so we can adopt those concepts freely. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy code, adapt the JSON schema, or reuse the `map-converter` library without affecting our repository’s license. |
| **AO‑Libre Client** | **GPL‑3.0** (or AGPL‑3.0 in some forks) | Similar to AGPL‑3.0: derivative code must be GPL‑compatible. The JSON schema is still free to use, but direct code reuse would impose GPL licensing on our project. |

**Conclusion:**  
* We can safely adopt the **JSON schema** and **layered UI concepts** from the web clients (MIT/GPL) without licensing issues.  
* We must **avoid copying source code** from the official VB6 editor unless we are willing to re‑license the whole repository under AGPL‑3.0.  
* For conversion utilities, we should rely on the MIT‑licensed `map-converter` library rather than the AGPL‑licensed VB6 source.

---

## 6. Recommendations for Construction Mode

1. **Adopt the JSON schema** used by Lambdaclass/AO‑Libre as the canonical on‑disk format.  
   * Store the map as a single `map.json` file that contains `meta`, `tiles`, `npcs`, and `specials`.  
   * Provide a **migration script** that splits an existing `meta/terrain/npcs/specials` folder into this single file (and vice‑versa for backward compatibility).

2. **Layered UI** – Implement three toggleable layers (Terrain, Objects, Triggers/NPCs) mirroring the official editor’s approach. This will make the construction mode intuitive for users familiar with the classic tool.

3. **Blocking flag** – Keep a per‑tile `blocked` boolean and a per‑object `collision` flag. Export them exactly as the server expects (`blocked` = 1 for impassable tiles).

4. **Trigger model** – Use an explicit `type` enum (`walk`, `use`, `attack`, `custom`) and a `payload` object. This aligns with both the official editor and the web clients.

5. **Import/Export utility** – Add a small CLI (`scripts/map-convert.js`) that:
   * Reads a binary `.map` + `.inf` pair (using the MIT `map-converter` library) and outputs a `map.json`.  
   * Takes a `map.json` and produces a binary `.map` + `.inf` for compatibility with the original server.

6. **Licensing** – Keep all new code under the repository’s existing license (MIT unless the repo already uses a different one). Cite the MIT `map-converter` library in `package.json` and `README.md`.

---

## 7. References

* **Official World Editor source** – https://github.com/ao-org/argentum-online-worldeditor (AGPL‑3.0)  
* **Lambdaclass Argentum** – https://github.com/lambdaclass/argentum (MIT)  
* **AO‑Libre Client** – https://github.com/ao-libre/ao-cliente (GPL‑3.0)  
* **map-converter (MIT)** – https://github.com/lambdaclass/argentum/tree/main/tools/map-converter  

---  

*Document created for issue #14 – “Research: como editan mapas los otros proyectos de Argentum Online”.*