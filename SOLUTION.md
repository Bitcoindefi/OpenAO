FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **construction mode**, and identify opportunities for interoperability (import/export) with existing tools.

---

## Projects Reviewed

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor (VB6) | Visual Basic 6 (Win32) | AGPL‑3.0 |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (includes map viewer/editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (includes map loading) | JavaScript (Node/Electron) | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-------------|--------------------|--------------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) | Classic Argentum map format (version 1). Contains header, tile data (terrain), blocked tiles, triggers, NPC data, and special objects in a single binary blob. | Directly compatible – our current format is a **de‑serialization** of this binary into separate JSON sections (`meta`, `terrain`, `npcs`, `specials`). |
| **Lambdaclass Argentum** | `*.json` (custom) | Stores map data as a JSON object with keys `meta`, `tiles`, `npcs`, `triggers`. Uses the same logical layers as the original binary but flattened for easy consumption in the web client. | Almost 1‑to‑1 mapping. `tiles` → `terrain`, `triggers` → `specials`. Minor differences: uses `walkable` boolean instead of a numeric block flag. |
| **AO‑Libre Client** | `*.map` (binary) + optional `*.json` for overrides | Reads the original binary format (same as official editor). Some community patches add a side‑car JSON for extra metadata. | Same as official editor – fully compatible with our split JSON representation after conversion. |

**Takeaway:** All three projects ultimately rely on the *original binary map format* defined by the official server. Our split‑JSON representation is a convenient abstraction, so any import/export routine can target the binary format as the canonical source.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

| Aspect | Implementation in Official Editor | Observations / Potential Reuse |
|--------|-----------------------------------|--------------------------------|
| **Layers** | Single layer of 64×64 tiles. Each tile stores: <br>• Terrain ID (0‑255) <br>• Block flag (0 = walkable, 1 = blocked) <br>• Trigger ID (0 = none, >0 = trigger reference) | Simplicity works well for classic AO. For construction mode we may want **multiple visual layers** (ground, objects, overlay). The editor stores triggers as separate records, which we can keep. |
| **Blocking** | Stored as a byte per tile (`blocked` flag). The UI shows a “lock” icon; toggling updates the byte. | Re‑using this binary flag is trivial. In our JSON we expose it as `blocked: true/false`. |
| **Triggers** | Trigger records are stored after the tile matrix. Each record contains: <br>• X, Y coordinates <br>• Type (e.g., `warp`, `heal`, `npc`) <br>• Parameters (target map, script, etc.) | The editor groups triggers by type in the UI. For construction mode we could adopt the same **type‑based grouping** to simplify UI/logic. |
| **NPCs** | NPC list follows triggers. Each entry: <br>• NPC ID <br>• X, Y <br>• Direction <br>• Respawn flag | Straightforward mapping to our `npcs` JSON array. |
| **Special Objects** | Stored in a separate “specials” section (e.g., doors, chests). Each has its own struct. | Our `specials` JSON mirrors this. No extra work needed. |

**Design suggestions to copy:**

* **Explicit “type” field for triggers** – makes UI filtering easy.  
* **Separate visual “layer” flag** – even if the underlying format is single‑layer, we can keep a virtual overlay layer for construction tools.  
* **Lock icon for blocking** – intuitive for map creators.

---

## 3. Live / Collaborative Editing

| Project | Live Editing Attempt | Outcome | Reason for Abandonment (if any) |
|---------|----------------------|---------|---------------------------------|
| **Official World Editor** | No live editing; purely offline desktop app. | N/A | Not in scope for original VB6 tool. |
| **Lambdaclass Argentum** | Implemented a **WebSocket‑based preview** where changes in the editor UI update the in‑browser map view instantly. | Works for a single user; no multi‑user sync. | Collaborative sync was deemed out of scope; complexity of conflict resolution and server‑side validation. |
| **AO‑Libre Client** | Experimented with **hot‑reload** of map files during development (watcher reloads map when the binary changes). | Useful for developers, not for end‑users. | No UI for editing, only for testing. |

**Takeaway:** No project has a fully‑fledged collaborative map editor. The main blockers are:

* **Conflict resolution** – map tiles are a dense grid; merging concurrent edits is non‑trivial.  
* **Server validation** – the server expects a consistent binary map; live changes would need a staging area or versioning system.  

If we aim for collaborative editing in the future, we should consider a **CRDT‑style approach** or a lock‑per‑tile system, but it is not required for the first iteration of construction mode.

---

## 4. Import / Export Tools Between Formats

| Tool / Feature | Source Project | Target Compatibility | Notes |
|----------------|----------------|----------------------|-------|
| **Binary ↔ JSON Converter** (internal to `argentum-online-worldeditor`) | Official editor includes a **“Export to JSON”** option used by community scripts. | Converts binary `.map` → JSON with `meta`, `terrain`, `npcs`, `specials`. | Not officially documented; source code in VB6 can be ported to Node/TS. |
| **Map Loader** (Lambdaclass) | Reads JSON directly; also ships a small **`map2bin.js`** script that writes the classic binary format. | Allows importing JSON maps created by the web client into the server. | MIT‑licensed – reusable. |
| **AO‑Libre “Map Patcher”** | Small Node script that patches binary maps (e.g., adds new triggers). | Works on official binary files. | GPL‑3.0 – can be used in our project if we keep GPL compatibility. |

**Opportunity:** By bundling the `map2bin.js` logic (MIT) into our repo we can provide a **one‑click import** of maps created with the official editor (binary → our JSON) and **export** back to binary for server deployment.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **network‑served** must also be AGPL‑3.0. Re‑using code (e.g., the VB6 parser) would require us to open‑source the entire server if we expose it over a network. However, **ideas, data formats, and documentation** are free to use. |
| **Lambdaclass Argentum** | **MIT** | Very permissive – we can copy code (e.g., the JSON↔binary converter) directly into our project without affecting our license. |
| **AO‑Libre Client** | **GPL‑3.0** | Re‑using code would require our repo to be GPL‑3.0 compatible. Since the main repository is currently **MIT** (assumed), we should avoid pulling GPL‑licensed source files. Using only the *concepts* is fine. |

**Conclusion:**  
*We will implement our import/export utilities based on the MIT‑licensed Lambdaclass converter. Documentation of the binary format will be derived from the AGPL‑3.0 editor (allowed). No GPL code will be copied.*

---

## Deliverable Summary

* Added **`docs/MapEditorResearch.md`** containing:
  * Comparative table of map formats.
  * Detailed notes on layer, blocking, and trigger modeling in the official editor.
  * Findings on live/collaborative editing attempts.
  * Overview of existing import/export tools and licensing considerations.
* This documentation will guide the design of the new construction mode and help future contributors understand interoperability constraints.

--- 

*Prepared by the OpenAO research team.*