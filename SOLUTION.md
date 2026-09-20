FILE: docs/MapEditorResearch.md
```
# Research: How other Argentum Online projects edit maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing, the formats they use, and the implications for our construction mode implementation.

| Project | Repository | Type | Language / Tech | License |
|---------|------------|------|-----------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor | Visual Basic 6 (Win32) | AGPL‑3.0 |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (includes map viewer/editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (includes map loader) | JavaScript (Node/Electron) | GPL‑3.0‑or‑later |

---

## 1. Map format used by each project

| Project | Map file format | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|----------------|-----------------------------------------------------------------------|
| **Official World Editor** | **`.map`** binary format (the same format used by the original Argentum server). It stores a header, a 2‑D array of tiles (terrain), a list of NPCs, and a list of special objects (triggers, warps, etc.). The format is **compatible** with our current loader – we already parse `terrain`, `npcs` and `specials` from it. The only missing piece is the optional `meta` block (map name, music, light level) which the editor stores in the same header but we ignore. |
| **Lambdaclass Argentum** | Uses the **same `.map` binary format** for loading maps on the client. For the web editor they convert the binary file to a JSON representation (`MapData.json`) at build time. The JSON mirrors the binary structure (`tiles`, `npcs`, `objects`). This JSON is **not directly compatible** with our binary loader, but can be transformed back to `.map`. |
| **AO‑Libre Client** | Also reads the **original `.map` binary**. The client contains a small TypeScript parser that extracts terrain, NPCs and specials. No extra `meta` block is used. |

**Conclusion:** All three projects rely on the original `.map` binary format. Our internal representation (`meta` / `terrain` / `npcs` / `specials`) is a thin abstraction over that format, so we can reuse the same parser. The only addition we need is a proper `meta` block handling (map name, music, light, etc.) which the official editor already supports.

---

## 2. How the official editor models layers, blocking and triggers

| Concept | Implementation in the official editor |
|---------|----------------------------------------|
| **Layers** | The editor shows three logical layers: **Terrain**, **Objects** (static items, doors, etc.) and **Triggers/NPCs**. Internally they are stored in the same tile array; each tile has a `GraphicID` and a `Blocked` flag. Objects that occupy the same cell are stored in the *Objects* list with their own X/Y coordinates. |
| **Blocking** | Each tile has a **`Blocked` byte** (0 = walkable, 1 = blocked). Additionally, objects can have a `Blocked` flag that overrides the tile. The editor provides a “Block” toggle that sets this flag on the selected tile or object. |
| **Triggers** | Triggers are stored in the **`Specials`** section of the `.map` file. Each entry contains: `TriggerType` (e.g., `Warp`, `Heal`, `Message`), `X`, `Y`, `Param1`, `Param2`, `Param3`. The editor exposes a UI where you pick a trigger type and fill the parameters. |
| **Design decisions worth copying** | - **Unified tile + object model**: keep a single 2‑D array for terrain and a separate list for objects; this matches the server expectations and simplifies serialization. <br> - **Explicit “Blocked” flag per tile and per object**: allows fine‑grained control without needing a separate collision map. <br> - **Trigger UI with parameter validation**: the editor validates that required parameters are present (