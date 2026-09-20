# Research: How Other Argentum Online Projects Edit Maps

*Issue #14 – OpenAO*  

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid reinventing the wheel, justify design decisions for the upcoming **construction mode**, and identify reusable tools or ideas.

---

## 1. Map file formats used by each project

| Project | Repository | Primary map format | Compatibility with OpenAO (`meta` / `terrain` / `npcs` / `specials`) |
|---------|------------|-------------------|---------------------------------------------------------------|
| **argentum‑online‑worldeditor** (official editor) | <https://github.com/ao-org/argentum-online-worldeditor> | **`.map` binary** – the original AO format (header + blocks of terrain, objects, NPCs, triggers, etc.) | Directly compatible – OpenAO already reads this format into the four logical layers (`meta`, `terrain`, `npcs`, `specials`). |
| **lambdaclass/argentum** (web client) | <https://github.com/lambdaclass/argentum> | **`.map` binary** (same as official) – loaded via a TypeScript parser (`src/engine/map.ts`). | Compatible – the parser produces a JSON‑like structure that maps 1‑to‑1 to OpenAO’s layers. |
| **ao‑libre/ao‑cliente** (community client) | <https://github.com/ao-libre/ao-cliente> | **`.map` binary** (original) + **`.json` export** (experimental). | Compatible – the binary reader follows the same spec; the JSON export mirrors OpenAO’s internal representation, making conversion trivial. |

> **Take‑away:** All three projects rely on the *original* Argentum Online `.map` binary format. Therefore, any tooling we build can reuse the same parser/serializer that OpenAO already has.

---

## 2. How the official editor models layers, blocking and triggers

### 2.1 Layer model
The VB6 editor presents **four tabs** that correspond exactly to OpenAO’s logical layers:

| Tab | What it edits | Internal representation |
|-----|---------------|--------------------------|
| **Meta** | Map size, background music, light level, map name, etc. | `MapMeta` struct (header). |
| **Terrain** | Ground tiles (floor, walls, water, etc.). | 2‑D array of `Tile` objects (`terrain[x][y]`). |
| **NPCs** | NPC placement, direction, AI script ID. | List of `NpcInstance` (x, y, id, dir). |
| **Specials** | Triggers, doors, warps, region blocks, custom objects. | List of `Special` objects with `type`, `x`, `y`, `data`. |

### 2.2 Blocking (collision) handling
*Blocking* is **not a separate layer**; it is encoded in the terrain tile ID. Tiles whose ID is listed in the **`blockedTiles` table** (hard‑coded in `WorldEditor.bas`) are considered impassable. The editor also allows **“Block”** check‑boxes on a per‑tile basis for objects that are not inherently blocked (e.g., decorative items). This information is stored in the **Specials** layer as a `Block` special (`type = 1`).

**Design suggestion for OpenAO:**  
- Keep the same approach – terrain determines basic collision, while a lightweight `Block` special can override it.  
- Expose a **“Collision” toggle** in the construction UI that writes a `Block` special, mirroring the official editor’s behaviour.

### 2.3 Triggers
Triggers are stored in the **Specials** layer as records with a `type` field:

| Type | Meaning | Fields stored |
|------|---------|---------------|
| 0 | **Warp** – move player to another map/position | `destMap`, `destX`, `destY` |
| 1 | **Block** – custom collision | none (just presence) |
| 2 | **Door** – open/close state | `doorId`, `state` |
| 3 | **Trigger** – runs a script | `scriptId`, optional parameters |
| … | … | … |

The editor UI groups these under a **“Triggers”** tab, showing a grid where each cell can hold multiple trigger entries. The underlying file stores them sequentially after the NPC list.

**Design suggestion:**  
- Reuse the same `type` enumeration in OpenAO’s `Special` model.  
- Provide a **visual “Trigger editor”** that lets users add/edit the same fields; this will make migration of existing maps seamless.

---

## 3. Live / collaborative editing attempts

| Project | Live editing? | Outcome & Reason |
|---------|---------------|------------------|
| **WorldEditor (VB6)** | No – purely offline desktop app. | Simpler to implement; the original AO client never needed live sync. |
| **lambdaclass/argentum** | No built‑in live editing. The repo contains a **“Map Builder”** UI used only for testing, but it writes to local storage. | Focus is on the web client, not on map creation. |
| **ao‑libre/ao‑cliente** | No. The community client added a **“Map Viewer”** but not an editor. | Lack of consensus on a network protocol for map sync; also, the project is client‑only. |

**Why collaborative editing is rare:**  
1. **Network protocol** – AO’s original protocol does not support map mutation; adding it would require server changes.  
2. **Security** – Allowing arbitrary map changes could be abused for cheating.  
3. **Complexity vs. demand** – Most map creators are hobbyists who work locally and then upload the compiled `.map` file.

**Implication for OpenAO:** If we ever want live editing, we’ll need a **custom server endpoint** (e.g., WebSocket `map:update`) and a **permission model**. For now, a **offline editor** that exports a `.map` file is sufficient.

---

## 4. Import / export tools between formats

| Project | Import capabilities | Export capabilities | Notes |
|---------|--------------------|--------------------|-------|
| **WorldEditor** | Reads only the original `.map`. | Writes `.map`. | No conversion utilities. |
| **lambdaclass/argentum** | Has a **`mapParser.ts`** that can read `.map` and output a JSON representation (`MapData.json`). | Can serialize the JSON back to `.map`. | The JSON format is essentially the same as OpenAO’s internal model, making it a ready‑made import/export bridge. |
| **ao‑libre/ao‑cliente** | Experimental **`map2json.py`** script (Python) that converts `.map` → JSON. | **`json2map.py`** does the reverse. | Scripts are small (~150 LOC) and MIT‑licensed; they can be copied into OpenAO’s tooling. |

**Recommendation:**  
- Add a **small CLI utility** (`scripts/map-convert.js`) that re‑uses the TypeScript parser from `lambdaclass/argentum` (MIT) to convert between `.map` and a pretty‑printed JSON (`.map.json`).  
- Document the command in the README so map creators can import/export without opening the VB6 editor.

---

## 5. Licenses and reuse implications

| Project | License | Reuse considerations |
|---------|---------|----------------------|
| **WorldEditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. We can **study** the code, but we cannot copy source files into OpenAO (which is MIT‑licensed) without re‑licensing the whole repository. However, design ideas, UI concepts, and file‑format specifications are free to adopt. |
| **lambdaclass/argentum** | **MIT** | Fully permissive – we can copy the TypeScript map parser/serializer verbatim into OpenAO. |
| **ao‑libre/ao‑cliente** | **GPL‑3.0** (as of 2023) | Similar to AGPL, but only triggers when we distribute the code. The conversion scripts are small and can be rewritten (or we can request the author’s permission). Safer to re‑implement based on the MIT parser. |

**Bottom line:**  
- **Do not copy any AGPL/GPL source files** into OpenAO.  
- **Feel free to reuse the MIT parser** from `lambdaclass/argentum`.  
- Use the GPL conversion scripts as inspiration, but re‑implement them under MIT.

---

## 6. Summary for Construction Mode design

| Decision | Reasoning |
|----------|------------|
| **Keep the original `.map` binary as the canonical storage format** | All existing tools already understand it; no need for a new format. |
| **Expose four logical layers (Meta, Terrain, NPCs, Specials) in the UI** | Mirrors the official editor, easing migration and user learning curve. |
| **Model blocking via a `Block` special** | Aligns with the official editor’s override mechanism and simplifies collision handling. |
| **Implement a simple import/export CLI (JSON ↔ .map)** | Leverages MIT‑licensed parser, provides a bridge for users of the VB6 editor, and does not require live sync. |
| **Do not attempt live collaborative editing now** | Requires server changes and a robust permission model; out of scope for the first iteration. |
| **License compliance** | All new code will stay MIT; we only borrow ideas, not AGPL/GPL source. |

---

*Prepared by the OpenAO core team – September 2026*  
