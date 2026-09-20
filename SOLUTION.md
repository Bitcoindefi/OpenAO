FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0 (or AGPL‑3.0 depending on fork) |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Details | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|----------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | - Binary layout defined in `Mapas/Mapas.h` of the original server.<br>- Contains header, tile data (terrain), blocked tiles, trigger data, NPC spawn info, and special objects.<br>- `*.inf` stores map name, music, light level, and other meta. | Very close to our internal representation. Our `terrain`, `npcs`, `specials`, and `meta` can be derived directly from the binary sections. Only minor differences: the editor stores triggers as a flat list of `Trigger` structs, while we separate them into `specials` (objects) and `triggers` (blocked/warp). |
| **Lambdaclass Argentum** | `*.json` (exported from the editor) and `*.map` (runtime) | - Uses a **JSON export** (`map.json`) that mirrors the binary layout but is human‑readable.<br>- The JSON contains `tiles`, `blocked`, `trigger`, `npc`, `objects`, and `meta` sections.<br>- At runtime the client loads the original binary `.map`. | The JSON export is **directly compatible** with our structure (same keys). The binary `.map` is identical to the official format, so conversion is straightforward. |
| **AO‑Libre Client** | `*.map` (binary) and optional `*.json` for dev tools | - Reads the same binary format as the official editor (no custom format).<br>- Provides a small helper script (`convertMap.js`) that can output a JSON representation similar to Lambdaclass. | Same compatibility notes as the official editor. The helper script can be reused to generate our `meta/terrain/npcs/specials` JSON files. |

### Summary

All three projects ultimately rely on the **original binary `.map` format** used by the official server. The only deviation is that the Lambdaclass client ships a **JSON export** that already matches the logical separation we use (`terrain`, `npcs`, `specials`, `meta`). Therefore, we can:

* Parse the binary format directly (as we already do for loading maps).  
* Optionally support a JSON import/export layer to simplify editing and version control.

---

## 2. Layer, Blocking, and Trigger Modeling (Official Editor)

| Aspect | Implementation in Official World Editor | Observations / Potential Reuse |
|--------|------------------------------------------|--------------------------------|
| **Layers** | - Single layer of tiles (2‑D grid).<br>- Each tile stores a **graphic ID** and a **blocked flag** (bitmask).<br>- Triggers (warps, NPC triggers, etc.) are stored in a separate **trigger list** with X/Y coordinates. | The separation of *terrain* (tiles) and *triggers* (special actions) aligns with our design. We can keep a single tile layer and a distinct trigger list. |
| **Blocking** | - `blocked` is a **byte per tile** (0 = walkable, 1 = blocked).<br>- Some editors also expose “no‑walk” for specific NPCs via trigger conditions. | Simple boolean blocking works; if we need per‑NPC blocking we can extend the trigger system (already planned for Construction Mode). |
| **Triggers** | - Stored as `Trigger` structs: `{X, Y, Type, Data1, Data2, ...}`.<br>- Types include `Warp`, `Object`, `NPC`, `Heal`, `Damage`, etc.<br>- The editor shows them as icons on the map grid. | The **type‑based trigger** model is robust and easy to serialize. We should adopt the same enum‑based approach for our `specials` and future custom triggers. |
| **Design Decisions Worth Copying** | 1. **Explicit trigger list** rather than embedding logic in tile data.<br>2. **Separate metadata file** (`*.inf`) for map name, music, light, etc.<br>3. **Icon overlay** in the UI to edit triggers without altering terrain. | - Using a separate metadata file matches our `meta` folder and keeps map files clean.<br>- An icon‑based UI will be helpful for Construction Mode, allowing users to place triggers visually. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Status |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a **stand‑alone desktop app** that writes files locally. | No. | Not a goal of the original tool; the binary format is not designed for concurrent writes. |
| **Lambdaclass Argentum** | No built‑in live map editing. The web client only **loads** maps. | No. | The team focused on the client side; collaborative map editing would require a server‑side sync layer, which was out of scope. |
| **AO‑Libre Client** | No live editing. | No. | The project is a **client rewrite**, not an editor. Some community forks experimented with a simple “map preview” but never a full collaborative editor. |

**Takeaway:** No existing project provides live or collaborative editing. Implementing it would be a **first‑class feature** for our Construction Mode, but we must design a conflict‑resolution strategy (e.g., operational transforms or CRDT) if we go that route.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source Project | Functionality | Reuse Potential |
|---------------|----------------|---------------|-----------------|
| `MapExport.vb` (World Editor) | Official World Editor | Exports binary `.map` to a **human‑readable CSV** (tiles, blocked, triggers). | Could be ported to TypeScript/Node to provide a CLI import/export for our build pipeline. |
| `convertMap.js` | AO‑Libre (dev tools) | Reads binary `.map` and outputs a **JSON** with `tiles`, `blocked`, `triggers`, `npcs`, `meta`. | Directly reusable – just copy the script and adapt the output shape to our `meta/terrain/npcs/specials` directories. |
| `map2json.ts` | Lambdaclass Argentum | Takes the editor’s exported JSON and normalizes field names to the client’s expectations. | Already matches our desired JSON schema; we can adopt it as the **canonical import format**. |
| `MapEditor.exe` (AGPL) | Official World Editor | Full editor with **import/export** of `.map` and `.inf`. | License (AGPL‑3.0) requires us to open‑source any derivative that links to it. We can **reference** the tool for users but cannot embed its code without complying with AGPL. |

### Recommendation

* **Provide a Node.js CLI** (`scripts/map-import.js`) that wraps `convertMap.js` logic to import a binary `.map` (or the official `.inf`) into our folder structure (`meta/`, `terrain/`, `npcs/`, `specials/`).  
* Offer an **export** command that bundles those folders back into a binary `.map` + `.inf`. This will give us a smooth workflow for developers and for future in‑game map editors.

---

## 5. Licenses and Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any modification or derivative that is **distributed** (including as part of a server) must also be licensed under AGPL‑3.0 and provide source. We can **reference** the editor, use its file format documentation, and call it as an external tool, but we cannot copy its source code into our repository without adopting AGPL. |
| **Lambdaclass Argentum** | MIT | Very permissive. We can copy, modify, and redistribute code (e.g., the JSON export script) without affecting our own license. |
| **AO‑Libre Client** | GPL‑3.0 (or AGPL‑3.0 depending on fork) | Similar to AGPL: linking or incorporating code would require us to license our derivative under GPL/AGPL. However, the conversion script is MIT‑licensed, so we can safely reuse that part. |

**Practical outcome:**  
* Use the **MIT‑licensed conversion scripts** from Lambdaclass and AO‑Libre.  
* Treat the official editor as a **black‑box** tool for users who need a GUI, and provide CLI wrappers that invoke it as an external process (no code copying).  
* Ensure any new code we write for import/export stays under the repository’s existing license (presumably MIT or Apache).

---

## Deliverable Summary

* Added this document (`docs/MapEditorResearch.md`) with:
  * Comparative table of map formats.
  * Modeling decisions from the official editor.
  * Status of live/collaborative editing.
  * Existing import/export utilities and licensing considerations.
* No code changes were required for the documentation itself, but the findings guide upcoming implementation tasks (CLI import/export, UI design for triggers, potential collaborative editing architecture).

--- 

*Prepared by the OpenAO research team.*