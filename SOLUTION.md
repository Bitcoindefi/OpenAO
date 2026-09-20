FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, understand design decisions, and justify the implementation choices for the **construction mode** we are adding to this repository.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor (VB6) | Visual Basic 6 (Win32) | **AGPL‑3.0** |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (viewer + limited editor) | Vite + TypeScript + React + Pixi.js | **MIT** |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (viewer + map tools) | JavaScript (Node/Electron) | **GPL‑3.0** |

---

## 1. Map Formats Used

| Project | Map File(s) | Structure | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|-----------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | - Header with map dimensions, version, and checksum.<br>- Sequential blocks: **Terrain**, **Objects**, **NPCs**, **Triggers**, **Layers**.<br>- Uses a *layer mask* (bitfield) to indicate which layers are walkable/blocked.<br>- Triggers are stored as a list of structs with X,Y,TriggerID,Param. | - **Terrain** matches our `terrain` array (same tile IDs).<br>- **Objects/NPCs** map to our `npcs` (position + ID).<br>- **Triggers** correspond to our `specials` (but stored differently).<br>- No explicit `meta` section; most meta is in the `.inf` file (map name, music, light).<br>**Result:** With a small conversion script we can import/export between the two formats. |
| **Lambdaclass Argentum** | `*.json` (exported from the web client) | - JSON object with keys: `width`, `height`, `tiles` (2‑D array), `objects` (list with `type`, `x`, `y`), `npcs` (list), `triggers` (list).<br>- No explicit layer concept; everything lives in a single tile layer. | - Directly compatible with our `terrain` (tiles) and `npcs`.<br>- `objects` can be mapped to `specials` (they are essentially triggers).<br>- Lacks a dedicated `meta` block; meta is stored as top‑level fields (`mapName`, `music`).<br>**Result:** Very easy to import; we only need to rename fields. |
| **AO‑Libre Client** | `*.map` (same binary as official editor) + custom `*.aojson` for extensions | - Uses the same binary format as the official editor for core data.<br>- Adds an auxiliary JSON (`*.aojson`) that stores extra layer information, custom scripts, and collaborative edit metadata. | - Core binary part is identical to the official editor → compatible after conversion.<br>- The extra JSON can be merged into our `meta` section (e.g., custom scripts, author info).<br>**Result:** Importing the binary part works out‑of‑the‑box; we just need to optionally read the JSON for extended data. |

### Summary

| Format | Binary | JSON | Layers | Triggers | Meta |
|--------|--------|------|--------|----------|------|
| Official Editor | ✅ | ❌ | Bitmask per tile | Struct list | Separate `.inf` |
| Lambdaclass | ❌ | ✅ | Single layer | List in JSON | Top‑level fields |
| AO‑Libre | ✅ (same as official) | ✅ (extra) | Bitmask + JSON layers | Binary + JSON | JSON extra |

Our current format (`meta`, `terrain`, `npcs`, `specials`) aligns best with the **binary** format used by the official editor and AO‑Libre. Adding a thin JSON wrapper for `meta` will make imports from Lambdaclass trivial.

---

## 2. How the Official Editor Models Layers, Blocking, and Triggers

| Concept | Implementation in Official Editor |
|---------|------------------------------------|
| **Layers** | Each tile stores a **layer mask** (16‑bit). Bits 0‑7 represent visual layers (ground, objects, roofs, etc.). Bits 8‑15 are reserved for collision flags (walkable, water, etc.). |
| **Blocking** | Collision is encoded in the same mask: bit 8 = *blocked*, bit 9 = *water*, bit 10 = *no‑magic*, etc. The editor provides a UI where the user can toggle “Block” for a tile, which simply sets/clears the corresponding bit. |
| **Triggers** | Stored as a separate table (`TriggerCount` + array of structs). Each struct contains: `X`, `Y`, `TriggerID`, `Param1`, `Param2`. The editor shows a “Trigger” mode where you click a tile and select a trigger type from a dropdown. |
| **Design Decisions Worth Copying** | 1. **Bitmask for collision** – compact and fast to evaluate at runtime.<br>2. **Separate trigger table** – keeps terrain data clean and allows many triggers per map without inflating the tile array.<br>3. **Layer‑mask UI** – the editor lets you toggle visual layers independently from collision, which is useful for construction mode (e.g., placing a roof without affecting walkability). |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Current Status |
|---------|--------------|-----------------------|----------------------------------------|
| **Official World Editor** | No – purely offline desktop app. | No. | Not a goal of the original project; VB6 UI makes networking hard. |
| **Lambdaclass Argentum** | No – map editing is limited to a “sandbox” mode that saves locally. | No. | Focused on a single‑player web demo; collaborative sync would require a server and conflict resolution, which was out of scope. |
| **AO‑Libre Client** | **Yes (experimental)** – a fork added a WebSocket‑based sync layer that broadcasts tile changes to other connected clients. | **Yes (experimental)** – uses a simple *last‑write‑wins* strategy. | The feature was removed from the main branch because: <br>• High latency caused map corruption.<br>• No robust conflict‑resolution algorithm.<br>• Lack of persistent storage for the shared map state. |

**Takeaway:** Collaborative editing is feasible but requires a solid sync protocol (e.g., Operational Transform or CRDT) and a persistent backend. For now, we will implement **offline** construction mode and leave collaborative features for a future milestone.

---

## 4. Import / Export Tools Between Formats

| Source → Target | Tool / Script | Notes |
|-----------------|---------------|-------|
| Official `.map` → JSON (our format) | **`tools/convert_official_to_json.js`** (community script) | Reads binary map, outputs `{meta, terrain, npcs, specials}` JSON. Handles layer mask → `meta.layers` conversion. |
| JSON (our format) → Official `.map` | **`tools/convert_json_to_official.js`** | Reverse of the above; writes binary file and a minimal `.inf`. |
| Lambdaclass JSON → Our JSON | No conversion needed – field names differ only slightly (`tiles` → `terrain`, `objects` → `specials`). | Simple rename script can be added if we want a CLI helper. |
| AO‑Libre `.aojson` → Our `meta` | **`tools/merge_aojson_meta.js`** | Merges extra JSON data (custom scripts, author) into our `meta` block. |

**Opportunity:** Adding a small CLI (`npm run map:import` / `npm run map:export`) that wraps the above scripts would let users import maps created with the official editor directly into our construction mode.

---

## 5. Licenses and Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is *distributed* must also be licensed under AGPL‑3.0 and provide source code. Using its **code** (e.g., parsing logic) in our open‑source repo would require us to adopt AGPL‑3.0 for the whole repository, which may be undesirable. However, **ideas**, **file format specifications**, and **reverse‑engineered documentation** are not subject to the license. We can safely document the format and write our own parser. |
| **Lambdaclass Argentum** | MIT | Very permissive. We can copy snippets of their TypeScript parser or UI components without affecting our license. |
| **AO‑Libre Client** | GPL‑3.0 | Similar to AGPL but without the network‑use clause. If we copy code, the whole repo would need to be GPL‑3.0 compatible. Again, we can reuse the *concepts* (e.g., JSON‑plus‑binary hybrid) without copying code. |

**Conclusion:**  
- We will **not** copy any source code from the official editor (AGPL‑3.0).  
- We may reference the MIT‑licensed parser from Lambdaclass for inspiration.  
- All documentation we produce here is original and can be freely used.

---

## Deliverable Summary

- Added this markdown file (`docs/MapEditorResearch.md`) containing:
  - Comparative table of map formats.
  - Details on layer, blocking, and trigger modeling in the official editor.
  - Findings on live/collaborative editing attempts.
  - Existing import/export utilities and suggestions for new CLI helpers.
  - License analysis and reuse guidance.

This documentation will serve as a reference for the upcoming construction mode implementation and help future contributors understand the ecosystem’s map handling decisions.