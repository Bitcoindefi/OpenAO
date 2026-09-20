FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document gathers information about the map‑editing approaches used by the most relevant projects in the Argentum Online ecosystem.  
The goal is to avoid reinventing the wheel, to justify design decisions for the **construction mode** we are adding, and to identify possible import/export tools.

---

## 1. Map formats used by each project

| Project | Repository | Primary map format | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|------------|--------------------|--------------------------------------------------------------------------|
| **argentum‑online‑worldeditor** (official editor) | <https://github.com/ao-org/argentum-online-worldeditor> | Binary **`.map`** files (the original AO format). The file contains a header, a **terrain** layer (tile IDs), a **blocked** layer (bool), a **trigger** layer (trigger IDs), a **warp** layer, and a **NPC** layer (NPC IDs + data). | The `.map` format stores everything in a single binary file. Our current format splits data into separate JSON/YAML files (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). The data can be mapped one‑to‑one, but conversion code is required. |
| **lambdaclass/argentum** (web client) | <https://github.com/lambdaclass/argentum> | Uses the same **`.map`** binary format as the official client (loaded via a custom parser written in TypeScript). | Same as above – binary → in‑memory structures that can be exported to our split JSON representation. |
| **ao‑libre/ao‑cliente** (community client) | <https://github.com/ao-libre/ao-cliente> | Also consumes the original **`.map`** binary format (with a Rust/JS parser). | Same compatibility considerations as the other two projects. |

> **Bottom line:** All three projects rely on the original binary `.map` format. Our “split” format is not natively understood by any of them, but the data is directly translatable.

---

## 2. How the official editor models layers, blocking and triggers

| Concept | Implementation in **WorldEditor** | Observations / Potentially useful decisions |
|---------|-----------------------------------|----------------------------------------------|
| **Layers** | - **Terrain**: 2‑D array of tile IDs (0‑255). <br> - **Blocked**: 2‑D boolean array (same dimensions). <br> - **Trigger**: 2‑D array of trigger IDs (0‑255). <br> - **Warp**: separate list of warp objects (source X/Y, destination map, X/Y). <br> - **NPC**: list of NPC objects (ID, X, Y, direction, respawn). | The separation of *blocked* and *trigger* from the visual terrain layer makes it easy to edit collision and event logic without touching graphics. Replicating this separation in our construction mode (e.g., a “Collision” tab and a “Triggers” tab) will feel familiar to existing map creators. |
| **Blocking** | Stored as a single bit per tile in the **blocked** layer. The editor shows a red overlay for blocked tiles. | Using a dedicated boolean layer is a clean design; we can expose it as a simple “paint brush” that toggles the flag. |
| **Triggers** | Each tile can hold a trigger ID (0 = none). The editor provides a dropdown of trigger names (e.g., `Trigger 1 – Open Door`). | The trigger‑ID‑to‑name mapping lives in `trigger.dat`. Re‑using the same mapping file will keep compatibility with the server. |
| **Warp points** | Not a per‑tile layer; stored as a list with explicit source coordinates. The editor visualises them with a distinct icon. | Keeping warps as a list rather than a layer simplifies serialization and avoids wasting a whole 2‑D array for sparse data. |
| **NPC placement** | NPCs are objects with a reference to an entry in `npc.dat`. The editor lets you drag‑and‑drop NPC icons onto the map. | The drag‑and‑drop UI pattern is worth copying for our construction mode. |

**Take‑away:** The official editor’s data model is already well‑structured for a construction UI. Our implementation can mirror the same logical layers while persisting them in our split JSON files.

---

## 3. Live / collaborative editing attempts

| Project | Live editing? | Collaborative editing? | Reason for abandonment (if any) |
|---------|---------------|------------------------|---------------------------------|
| **WorldEditor** | No – it is a classic desktop editor that works on a local file. | No. | N/A – design goal was a simple offline tool. |
| **lambdaclass/argentum** | No built‑in map editor; only a viewer. | No. | N/A – the repo focuses on the client, not on map creation. |
| **ao‑libre/ao‑cliente** | No map editor component. | No. | N/A – same reason as above. |

**Conclusion:** No existing project attempted real‑time or collaborative map editing. If we want to support it, we will be pioneering this feature in the AO ecosystem. The main challenges are synchronising binary map state and handling conflicts; starting with a simple “save‑and‑reload” workflow is advisable.

---

## 4. Import / export tools between formats

| Tool / Script | Source → Destination | Notes |
|---------------|----------------------|-------|
| **WorldEditor** (built‑in) | Binary `.map` ↔︎ **binary** (no conversion) | Can export to `.map` directly; cannot output our split JSON format. |
| **ao‑map‑converter** (community script) | Binary `.map` → **JSON** (terrain, blocked, triggers, warps, npcs) | Small Node.js utility found in the AO‑Libre community. It can be adapted to produce the exact structure we use (`meta.json`, `terrain.json`, …). |
| **lambdaclass/argentum** – `map-parser.ts` | Binary `.map` → **JS objects** | The parser can be reused server‑side to read `.map` files and then write our JSON representation. |
| **No official exporter** | **Our JSON** → Binary `.map` | Not present yet. Implementing a reverse converter will be a valuable addition (allows users to edit maps with WorldEditor and then load them in our construction mode). |

**Actionable item:** Add a small conversion script (`scripts/convertMap.js`) that can read a `.map` file and output the four JSON files we expect. This will be useful for testing and for users who already have maps created with the official editor.

---

## 5. Licenses and reuse implications

| Project | License | Implications for us |
|---------|---------|---------------------|
| **argentum‑online‑worldeditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. We can **reference** the design and even copy small snippets (fair use) but cannot incorporate the editor’s source code into a non‑AGPL project without complying with the license. Using the format description is fine. |
| **lambdaclass/argentum** | **MIT** | Very permissive; we can reuse the TypeScript parser or any utility code directly, provided we keep the original copyright notice. |
| **ao‑libre/ao‑cliente** | **GPL‑3.0** (or LGPL‑3.0 depending on the repo) | GPL‑compatible with our project if we keep the whole repository under GPL‑compatible terms. Re‑using code would require us to license the combined work under GPL‑3.0 or a compatible license. |

**Design decision:** Our construction mode will be released under **MIT** (the repository’s default). Therefore we will **not** copy any AGPL‑3.0‑licensed source files, but we can freely adopt the *data model* and *UI concepts* described above. For the conversion script we will write our own implementation, possibly inspired by the MIT‑licensed parser from `lambdaclass/argentum`.

---

## 6. Summary & Recommendations for Construction Mode

1. **Adopt the same logical layers** (terrain, blocked, trigger, warp, NPC) as the official editor. Store them in separate JSON files (`terrain.json`, `blocked.json`, `triggers.json`, `warps.json`, `npcs.json`) inside a map folder. This mirrors the official binary layout while fitting our split‑file approach.
2. **Provide a conversion utility** (`scripts/convertMap.js`) to import existing `.map` files into our format and, later, an exporter to go back to `.map`. This gives us immediate interoperability with the world editor.
3. **UI inspiration:** Use the red overlay for blocked tiles, a dropdown for trigger IDs, and drag‑and‑drop NPC icons – all proven patterns from WorldEditor.
4. **Licensing:** Keep all newly written code under MIT. Do not copy AGPL‑3.0 source files; only reuse the *concepts*.
5. **Future work:** If collaborative editing becomes a requirement, we can build on top of the split JSON representation (easier to merge) and later add a WebSocket‑based sync layer.

--- 

*Document created on 2026‑09‑20 to satisfy Issue #14.*