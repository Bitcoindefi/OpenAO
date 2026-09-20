FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **construction mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Visual Basic 6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Details | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-------------|----------------|--------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | - Binary header (width, height, version). <br> - Followed by a **layered** block: terrain tiles, blocked tiles, trigger tiles, NPC data, and special objects. <br> - Uses **packed 2‑byte** tile IDs. <br> - `*.inf` stores map name, music, safe zones, and custom properties. | Very close to our internal representation. <br> - Terrain → `terrain` array. <br> - Blocked/trigger → can be derived from the **layer** bits. <br> - NPCs and specials map directly to `npcs` and `specials`. <br> - `meta` (e.g., map name, music) is stored in the `.inf` file, which we already parse. |
| **Lambdaclass Argentum** | `*.json` (exported from the editor) and `*.map` (runtime) | - The web client ships a **JSON export** used for development (`src/assets/maps/*.json`). <br> - JSON contains `width`, `height`, `layers` (terrain, collision, triggers), `npcs`, `objects`. <br> - Runtime still loads the original binary `.map` for the game engine. | The JSON export matches our structure almost 1‑to‑1, making it a ready‑made import/export bridge. <br> - `layers` → `terrain` + `blocked` + `triggers`. <br> - `npcs` and `objects` map to our `npcs` / `specials`. <br> - `meta` is stored under a top‑level `properties` key. |
| **AO‑Libre Client** | `*.map` (binary) and optional `*.json` for tooling | - Uses the same binary format as the official editor (they forked the original parser). <br> - Provides a small **Node.js conversion script** (`tools/convertMap.js`) that can output a simplified JSON representation. | Compatibility identical to the official editor. The conversion script can be reused to generate our internal JSON schema (`meta`, `terrain`, `npcs`, `specials`). |

### Summary

- All three projects ultimately rely on the **original binary `.map` format** defined by the official editor.
- Both Lambdaclass and AO‑Libre expose **JSON exports** that map cleanly to our internal data model.
- Therefore, implementing an **importer** that reads the binary format or consumes the JSON export will give us full compatibility.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

The official VB6 editor models a map as a set of **four logical layers**:

| Layer | Purpose | Storage in `.map` |
|-------|---------|-------------------|
| **Terrain** | Visual ground tiles | Sequential 2‑byte tile IDs (row‑major). |
| **Blocked** | Walkability mask (1 = blocked) | 1‑byte per tile (0/1). |
| **Triggers** | Tile‑based triggers (e.g., doors, warps) | 2‑byte trigger IDs; `0` = none. |
| **Objects** | NPCs & special items (static) | Stored after the tile layers as a list of structs (X, Y, ID, optional data). |

### Decisions Worth Copying

| Decision | Reason | How to apply in our construction mode |
|----------|--------|----------------------------------------|
| **Separate logical layers** (terrain vs. collision vs. triggers) | Keeps rendering fast and editing UI simple (each layer can be toggled). | Implement a **layer manager** in the UI that lets users toggle visibility/editability of terrain, blocked, and trigger layers independently. |
| **Packed binary format** | Small file size, fast loading for the original client. | Keep the binary format for runtime, but expose a **JSON intermediate** for the construction UI (mirrors our `meta/terrain/npcs/specials`). |
| **Trigger IDs as 16‑bit values** | Allows >256 distinct triggers without extra tables. | Adopt the same 16‑bit trigger IDs; provide a **trigger registry** (name ↔ ID) that can be extended by mods. |
| **Map‑wide properties (`meta`) stored in a separate `.inf` file** | Clean separation of visual data and metadata. | Continue using a separate `*.inf` (or embed JSON `meta` inside the exported JSON) for map name, music, safe zones, etc. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Status |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No (desktop, single‑user). | No. | Not a design goal; VB6 UI not suited for networking. |
| **Lambdaclass Argentum** | No built‑in live editing. | No. | Focused on client rendering, not map creation. |
| **AO‑Libre Client** | No live editing. | No. | Community client aims at compatibility, not authoring. |

**Takeaway:** No existing project attempted real‑time collaborative map editing. The main obstacles reported in community discussions are:

1. **State synchronization** – map data is large; diffing and merging is non‑trivial.
2. **Conflict resolution** – no consensus on how to handle overlapping edits (tiles, NPCs, triggers).
3. **Tooling complexity** – the original VB6 editor is not network‑aware; rewriting it from scratch is a large effort.

If we decide to support collaborative editing later, we should start with a **simple lock‑per‑tile** or **layer‑level** approach and store edits as **operations** (e.g., “set tile (x,y) to ID 123”) that can be broadcast via WebSocket.

---

## 4. Import / Export Tools Between Formats

| Project | Import Tool | Export Tool | Remarks |
|---------|-------------|-------------|---------|
| **Official World Editor** | Built‑in **Open** (binary `.map` + `.inf`). | Built‑in **Save As** (binary). | No direct JSON export, but the source code (VB6) includes a **`ExportMapToTXT`** routine that can be repurposed. |
| **Lambdaclass Argentum** | `scripts/exportMap.ts` – converts binary `.map` to JSON for the web client. | `scripts/importMap.ts` – takes JSON and writes a binary `.map`. | Fully open source (MIT). The JSON schema matches our internal model, making it a perfect bridge. |
| **AO‑Libre Client** | `tools/convertMap.js` – Node script that reads binary `.map` and outputs a simplified JSON (`terrain`, `blocked`, `triggers`, `npcs`, `objects`). | Same script can reverse the process (JSON → binary). | GPL‑3.0‑or‑later; we can reuse the script as long as we respect the license (i.e., keep it under GPL or provide attribution). |

### Practical Recommendation

- **Adopt the Lambdaclass JSON schema** as the canonical interchange format for our construction mode.
- Provide a small **CLI utility** (Node.js) that:
  1. Reads a binary `.map` + `.inf`.
  2. Emits `map.json` (our internal structure).
  3. Accepts `map.json` and writes back the binary files.
- This utility can be derived from `lambdaclass/argentum` scripts with minimal changes and MIT‑compatible licensing.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **network‑served** must also be AGPL‑3.0. Reusing code (e.g., the VB6 parser) would require us to open‑source the entire server‑side component under AGPL. Safer to **reference** the format rather than copy code. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy or adapt their import/export scripts, JSON schema, and any TypeScript utilities without affecting our own license. |
| **AO‑Libre Client** | **GPL‑3.0‑or‑later** | Reusing code would require us to license the derived parts under GPL‑3.0 (or later). If we only use their conversion script as a **separate tool** (not linked into the main server), we can keep our main repo under its existing license, but we must distribute the tool under GPL and provide source. |

### Decision

- **Do not copy** any AGPL‑3.0 code from the official editor. Use it only as a reference for the binary format.
- **Leverage** the MIT‑licensed scripts from Lambdaclass for import/export; they can be directly included.
- Optionally **borrow** the GPL‑licensed conversion script from AO‑Libre as a **stand‑alone CLI tool** (kept in a `tools/` directory) and ship it under GPL, keeping the core repository under its current license.

---

## 6. Action Items for Construction Mode

1. **Create a JSON schema** (`map-schema.json`) that mirrors the format used by Lambdaclass (terrain, blocked, triggers, npcs, specials, meta).  
2. **Add import/export CLI** (`scripts/map-converter.js`) based on Lambdaclass’s `importMap.ts` / `exportMap.ts`.  
3. **Document the binary format** (header, layers, object structs) in `docs/binary_map_format.md` for future reference.  
4. **Implement UI layer toggles** in the construction mode UI, following the official editor’s separation of terrain, blocked, and trigger layers.  
5. **Write a short FAQ** (`docs/construction_mode_faq.md`) covering why collaborative editing is not yet supported and how we might approach it later.

--- 

*Prepared by the OpenAO research team – September 2026.*