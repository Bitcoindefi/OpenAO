FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes the map‑editing approaches used by three notable projects in the Argentum Online ecosystem:

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop editor (VB6) | Visual Basic 6 | AGPL‑3.0 |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (desktop/web) | C++ (Qt) + JavaScript bindings | GPL‑3.0 |

The goal is to understand the map formats they use, how they model layers, blocking, triggers, and whether any live‑collaborative editing exists. This knowledge will guide the design of the **construction mode** for OpenAO.

---

## 1. Map Formats Used

| Project | Map File Extension(s) | Internal Structure | Compatibility with OpenAO (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-----------------------|--------------------|-------------------------------------------------------------------|
| **Official World Editor** | `.map` (binary) | - Header with map dimensions, version, and checksum.<br>- Sequential blocks for **terrain**, **blocked tiles**, **NPCs**, **objects**, **triggers**, **warps**, **light**, **music**, **ambient**.<br>- Uses a *layered* approach: terrain (ground), objects (overhead), and special data stored in separate tables. | The binary format is **not directly compatible** with OpenAO’s JSON‑based `meta`, `terrain`, `npcs`, `specials`. However the logical separation matches: <br>• Terrain ↔ `terrain`<br>• Blocked tiles ↔ `meta.blocked`<br>• NPC definitions ↔ `npcs`<br>• Triggers/warps ↔ `specials`. |
| **Lambdaclass Argentum** | `.json` (custom) | - Single JSON file per map.<br>- Top‑level keys: `size`, `tiles`, `objects`, `npcs`, `triggers`.<br>- `tiles` is a 2‑D array of tile IDs (terrain).<br>- `objects` contains overlay tiles with `x`, `y`, `layer` (0 = ground, 1 = above ground).<br>- `blocked` is a boolean matrix inside `meta`. | Very close to OpenAO’s structure. The only difference is that **layers** are expressed as a `layer` field per object rather than separate files. Converting is straightforward: <br>• `tiles` → `terrain`<br>• `objects` with `layer: 1` → `specials` (overhead)<br>• `blocked` → `meta.blocked`. |
| **AO‑Libre Client** | `.map` (binary, same as official) & `.aoe` (exported XML) | - Uses the same binary format as the official editor for runtime.<br>- Provides an **export** to XML (`.aoe`) that contains `<terrain>`, `<blocked>`, `<npcs>`, `<triggers>` elements. | The XML export is **easier to parse** and can be mapped to OpenAO’s JSON schema with a simple transformer. The binary format remains incompatible without a parser. |

### Summary

| Format | OpenAO‑Ready? | Effort to Convert |
|--------|---------------|-------------------|
| Official `.map` (binary) | No | Write a binary parser or use the existing C++ parser from AO‑Libre as a reference. |
| Official `.aoe` (XML) | Yes (with conversion) | Simple XSLT/JS/TS script to produce the four JSON files. |
| Lambdaclass JSON | Yes | Direct mapping, only layer handling needs a small script. |

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

### Layers

* The editor stores **two visual layers**:
  1. **Ground layer** – terrain tiles (walkable or not).
  2. **Overlay layer** – objects that appear **above** the character (e.g., trees, walls).

* Each tile entry contains a **`blocked` flag** (bitmask) that determines if the tile is walkable.

### Blocking

* Blocking is stored per‑tile in a **byte** where bits represent:
  * `0x01` – Impassable (solid)
  * `0x02` – Water (special movement)
  * `0x04` – No‑PVP zone, etc.

* The editor also supports **region‑based blocking** via “blocked zones” that are stored as rectangles in a separate table (used for large impassable areas).

### Triggers

* Triggers are stored as **records** with fields:
  * `X`, `Y` – position.
  * `TriggerType` – enum (e.g., `Warp`, `Heal`, `Custom`).
  * `Data1`, `Data2` – type‑specific payload (destination map, amount, script ID).

* The editor groups triggers by **type**, which simplifies UI filtering.

### Decisions Worth Copying

| Decision | Why It’s Valuable for OpenAO |
|----------|------------------------------|
| **Separate overlay layer** | Keeps rendering order simple and mirrors the original game engine. |
| **Bitmask for blocking** | Allows future extensions (e.g., water, no‑magic) without changing the schema. |
| **Trigger type enum + generic payload** | Provides a flexible, extensible way to add new trigger behaviours without schema changes. |
| **Region‑based blocking** | Reduces file size for large maps and makes bulk editing easier in construction mode. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No – purely offline desktop tool. | No. | N/A – design goal was a single‑author editor. |
| **Lambdaclass Argentum** | No – maps are edited offline and bundled with the client. | No. | N/A – focus on a lightweight web client, not on map creation. |
| **AO‑Libre Client** | No – only loads maps at runtime. | No. | N/A – community client aims to be a drop‑in replacement, not a creator. |

**Takeaway:** No existing project attempted real‑time collaborative map editing. Implementing it would be a **first‑in‑class** feature for OpenAO, but it would require a server‑side sync layer, conflict resolution, and UI considerations beyond the current scope.

---

## 4. Import / Export Tools Between Formats

| Source → Target | Tool / Script | Status |
|-----------------|---------------|--------|
| Official `.map` → XML (`.aoe`) | Built‑in **Export** button in the World Editor. | Works, but requires the Windows VB6 binary. |
| XML (`.aoe`) → OpenAO JSON | No official tool. Community members have small Python scripts (e.g., `aoe2json.py`) that parse the XML and output the four JSON files. | **Needs documentation** and inclusion in the repo. |
| Lambdaclass JSON → OpenAO JSON | Direct copy; only layer field conversion needed. | Trivial – can be done with a one‑liner script. |
| OpenAO JSON → Official `.map` | No public converter. Would require implementing the binary writer (reverse of the parser used by AO‑Libre). | Not available; would be a valuable contribution. |

**Recommendation:** Add a small Node.js/TypeScript utility (`scripts/convert-aoe-to-openao.ts`) that reads an `.aoe` XML file and writes the four JSON files expected by OpenAO. This will give us immediate import capability for maps created with the official editor.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for OpenAO |
|---------|---------|--------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be licensed under AGPL‑3.0 and provide source code. Re‑using code (e.g., binary parser) would require OpenAO to adopt AGPL‑3.0 or keep the parser as a separate, clearly AGPL‑licensed component. Using the *format* is fine; only code reuse is restricted. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. Code snippets, UI ideas, or conversion scripts can be copied directly into OpenAO with attribution. |
| **AO‑Libre Client** | **GPL‑3.0** | Similar to AGPL but without the network‑use clause. Incorporating code would require OpenAO to be GPL‑3.0 compatible. Using the XML export format is allowed; copying the parser would bring GPL obligations. |

**Design Decision:**  
- **Do not copy** any AGPL‑3.0 or GPL‑3.0 source code into the core of OpenAO unless we are willing to re‑license the whole project under a compatible license.  
- **Leverage** the *format specifications* (which are not copyrighted) and the permissively‑licensed tools from the Lambdaclass project.  
- Implement our own lightweight parser/serializer for the official `.aoe` XML format (or reuse a MIT‑licensed library for XML parsing) to stay MIT/GPL‑compatible.

---

## Deliverable Summary

- Added this research document (`docs/map_editing_research.md`).  
- Highlighted the map formats, layer modeling, lack of live editing, import/export gaps, and licensing constraints.  
- Suggested a concrete next step: a small conversion script for `.aoe` → OpenAO JSON (to be added in a future PR).  

This documentation will help the team make informed decisions when designing the **construction mode** and when planning any future interoperability features.