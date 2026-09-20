# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid reinventing the wheel, understand design decisions, and justify the architecture of the **construction mode** we are adding to this repository.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | TypeScript, React, Pixi.js, Vite | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | JavaScript (Node/Electron) + HTML5 Canvas | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|--------------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.dat` (metadata) | Proprietary binary layout used by the original Argentum server. Contains layers for terrain, objects, NPCs, triggers, and a separate header for map dimensions and flags. | **Partial** – terrain and NPC data can be mapped to our `terrain` / `npcs`. However, the binary layout mixes layers (e.g., triggers are stored in the same block as objects) and does not expose a clean `specials` JSON. Conversion is required. |
| **Lambdaclass Argentum** | `*.json` (client‑side) and `*.map` (server‑side) | The client loads a **JSON** representation (`map.json`) that mirrors the server’s binary format but is fully textual. It contains `tiles`, `objects`, `npcs`, `triggers`, and a `meta` block with size, music, and flags. | **High** – The JSON structure aligns closely with our `meta` / `terrain` / `npcs` / `specials`. Only minor field‑name differences (e.g., `trigger` vs `special`) need mapping. |
| **AO‑Libre Client** | `*.map` (binary) + optional `*.json` for debugging | Re‑uses the original binary format but adds a **debug JSON export** (`map_debug.json`) that expands each layer into separate arrays. | **Medium** – The debug JSON can be used as a bridge to our format, but the primary binary format still requires parsing. |

### Take‑aways

* The **JSON format used by Lambdaclass** is the closest match to our internal representation.  
* The official editor’s binary format is the canonical source; a conversion tool would be valuable for importing legacy maps.  
* AO‑Libre’s debug JSON can serve as a reference implementation for parsing the binary format.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

The VB6 editor stores map data in three main sections:

| Section | Content | Notes |
|---------|---------|-------|
| **Header** | Width, Height, Music, Light, Flags (e.g., `NoPVP`, `SafeZone`) | Corresponds to our `meta`. |
| **Terrain Layer** | 2‑byte tile IDs per cell (X × Y grid) | Directly maps to `terrain`. |
| **Object Layer** | List of objects with X, Y, ID, and **blocking flag** (`1 = blocked`) | Blocking is per‑object, not per‑tile. Our design stores blocking in `terrain` (via a separate `blocked` boolean). |
| **NPC Layer** | NPC ID, X, Y, direction, AI script | Maps to `npcs`. |
| **Trigger Layer** | Trigger ID, X, Y, width, height, script name, **activation type** (step, click, etc.) | In our schema this belongs to `specials`. The editor treats triggers as a **fourth layer** with its own list. |

### Decisions Worth Copying

| Decision | Reason | How to Apply |
|----------|--------|--------------|
| **Separate “Object” and “Trigger” layers** | Keeps terrain clean and allows independent editing of interactive elements. | In construction mode, expose distinct UI panels for “Objects” (static, possibly blocking) and “Triggers/Specials”. |
| **Per‑object blocking flag** | Allows a single tile to be walkable while a placed object blocks movement (e.g., a tree). | Preserve this flag in our `terrain` representation by adding a `blockedByObject` field or by merging object blocking into the `specials` layer. |
| **Header flags for map‑wide properties** | Centralizes map‑wide settings (e.g., safe zone) without scattering them across layers. | Keep a `meta.flags` object mirroring the editor’s flag set. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Status |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No – purely offline desktop tool. | No – no networking code. | Not designed for multi‑user scenarios; VB6 limitations. |
| **Lambdaclass Argentum** | No – maps are edited offline and bundled at build time. | No – the repo contains only a viewer/editor for developers. | Focus on client rendering, not map authoring. |
| **AO‑Libre Client** | No – only a viewer/debugger. | No – no server‑side sync. | The project aims to provide a free client, not a collaborative editor. |

**Conclusion:** No existing project provides live or collaborative map editing. This opens an opportunity for our construction mode to explore real‑time sync (e.g., using WebSockets) if we decide to extend beyond offline editing.

---

## 4. Import / Export Tools Between Formats

| Source → Target | Tool / Script | Status | Remarks |
|-----------------|---------------|--------|---------|
| **Official `.map` → JSON** | `worldeditor/tools/MapToJson.exe` (VB6 compiled) | Works, but Windows‑only binary. | Requires the original editor installation. |
| **JSON → Official `.map`** | `MapEditor/JsonToMap.vb` (source in the repo) | Incomplete – only terrain conversion. | No support for objects/triggers. |
| **AO‑Libre Debug JSON ↔ Binary** | `ao-libre/tools/MapConverter.js` | Works for debugging, not production. | Uses Node.js; can be adapted. |
| **Lambdaclass JSON ↔ Server Binary** | None official; community scripts exist in `scripts/` folder of the repo. | Community‑maintained, MIT‑licensed. | Good starting point for a bidirectional converter. |

### Recommendation

* **Implement a small Node.js conversion utility** (`scripts/convert-official-to-json.js`) that parses the official binary format (using the open‑source parser from AO‑Libre) and outputs our JSON schema.  
* This utility can be bundled as an npm script, making map import trivial for developers.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is distributed must also be licensed under AGPL‑3.0 and provide source code. Using ideas is fine, but copying code (e.g., the binary parser) would require AGPL compliance. |
| **Lambdaclass Argentum** | **MIT** | Very permissive; we can copy code, adapt the JSON schema, or reuse their conversion scripts without licensing concerns (just retain the MIT notice). |
| **AO‑Libre Client** | **GPL‑3.0** | Derivative works must be GPL‑3.0. Reusing their parser code would require our repository to be GPL‑3.0 compatible. Since our repo is currently under an unspecified license, we should verify compatibility before copying. |

### Practical Guidance

* **Ideas & design patterns** (layer separation, per‑object blocking) can be freely adopted from any project.  
* **Code reuse** should be limited to MIT‑licensed assets (Lambdaclass) or rewritten from scratch.  
* If we decide to embed the official editor’s parser, we must either:  
  1. Release our repository under **AGPL‑3.0**, or  
  2. Write an independent parser (clean‑room) to avoid license contamination.

---

## 6. Summary & Action Items

1. **Adopt the JSON schema** used by Lambdaclass as the canonical external representation for maps.  
2. **Create a conversion script** (`scripts/convert-official-to-json.js`) that reads the official binary format (leveraging AO‑Libre’s open‑source parser) and outputs our JSON format.  
3. **Design the construction UI** with distinct panels for Terrain, Objects (with blocking flag), NPCs, and Triggers/Specials, mirroring the official editor’s layer model.  
4. **Document the import/export workflow** in the project README and add usage examples in `docs/`.  
5. **Consider future live‑editing**: the current research shows no existing solution, so we can prototype a collaborative mode using WebSockets without legal constraints.

--- 

*Prepared by the OpenAO research team – September 2026.*
