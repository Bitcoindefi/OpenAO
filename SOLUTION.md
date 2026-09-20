FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document gathers information about the map‑editing approaches used by the most relevant projects in the Argentum Online ecosystem.  
The goal is to avoid reinventing the wheel, to justify design decisions for the upcoming **Construction Mode**, and to identify possible interoperability opportunities.

---

## 1. Map Formats Used by Each Project

| Project | Repository | Primary Map Format | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|------------|--------------------|--------------------------------------------------------------------------|
| **argentum-online-worldeditor** | <https://github.com/ao-org/argentum-online-worldeditor> | **`.map` binary (original AO format)** – a packed structure containing header, terrain tiles, blocked tiles, NPC data, triggers, and special objects. | Directly compatible. Our current format is a **de‑composition** of the same binary: `meta.json`, `terrain.bin`, `npcs.json`, `specials.json`. The editor reads/writes the original `.map` and can be converted to/from our split representation with a simple serializer. |
| **lambdaclass/argentum** (web client) | <https://github.com/lambdaclass/argentum> | **JSON‑based map definition** (`map.json`) that mirrors the original binary but is fully textual. It contains `tiles`, `blocked`, `npcs`, `triggers`, `objects`. | Very close. The JSON keys map 1‑to‑1 to our split files. Only difference is that the web client stores everything in a single JSON file, while we keep binary terrain for performance. Converting is trivial (split/merge). |
| **ao-libre/ao-cliente** (community client) | <https://github.com/ao-libre/ao-cliente> | Uses the **original `.map` binary** (same as the official editor). Some forks also support a **`.mapa`** text dump for debugging. | Same compatibility considerations as the official editor. |

### Summary

- All three projects ultimately rely on the **original AO binary `.map`** format.
- The web client provides a **single JSON** representation that is essentially a serialized version of the binary.
- Our current **split representation** (`meta`, `terrain`, `npcs`, `specials`) can be generated from or collapsed into the binary without loss of information.

---

## 2. Layer, Blocking & Trigger Modelling in the Official Editor

### Layers
- **Ground Layer** – 100 × 100 tiles (default 48 × 48 pixels). Stored as a flat array of `UInt16` tile IDs.
- **Blocked Layer** – Boolean mask (1 bit per tile) stored after the ground layer.
- **Object Layer** – Contains NPCs, triggers, and special objects. Each entry has:
  - `X`, `Y` (tile coordinates)
  - `Type` (NPC, Trigger, Item, etc.)
  - `Data` (NPC ID, trigger script index, etc.)

### Blocking
- Implemented as a **bitfield** (`blockedTiles`) where a set bit means the tile is *impassable*.
- The editor exposes a “lock” brush that toggles the bit for the selected tile.

### Triggers
- Stored in the **Object Layer** with a specific `type = 2` (trigger).  
- Each trigger references a **script index** (0‑based) that points to a line in the `scripts.dat` file.
- The editor shows a separate “Triggers” tab where users can edit:
  - **Trigger type** (e.g., `OnEnter`, `OnExit`, `OnUse`).
  - **Associated script** (text editor embedded).

### Decisions Worth Copying
| Decision | Why It’s Valuable | How to Adopt |
|----------|-------------------|--------------|
| **Separate “blocked” bitfield** | Minimal memory footprint; fast collision checks. | Keep our `terrain.bin` as raw tile IDs and add a parallel `blocked.bin` (or embed the bitfield in `meta.json`). |
| **Object layer unified for NPCs, triggers, specials** | Simplifies serialization and UI handling. | Our current split (`npcs.json`, `specials.json`) can be merged into a single `objects.json` for the editor UI, then split again on save. |
| **Script index indirection** | Allows re‑using scripts across many triggers without duplication. | Preserve the same index‑based reference in our `specials` definition. |
| **“Lock brush” UI** | Intuitive visual feedback for walkability. | Implement a similar toggle brush in the construction mode UI. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **argentum-online-worldeditor** | No (desktop‑only). | No. | N/A – not a web‑based tool. |
| **lambdaclass/argentum** | No built‑in live preview; maps are loaded at client start. | No. | The focus is on a **single‑player** web client; adding real‑time sync would require a server component that is out of scope. |
| **ao-libre/ao-cliente** | No. | No. | Community client aims to be a drop‑in replacement; collaborative editing is considered a separate project (e.g., “AO Map Studio”). |

**Takeaway:** No existing project provides live or collaborative map editing. Implementing it would be a **first‑in‑class** feature for our construction mode, but it also introduces complexity (conflict resolution, networking, persistence). If we decide to pursue it, we should start with a **local live preview** (auto‑reload map in the client) before tackling multi‑user sync.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source Project | Supported Conversions | Remarks |
|---------------|----------------|-----------------------|---------|
| **WorldEditor → `.map`** | Official editor | Binary `.map` ↔︎ (none) | Native export; can be read by our parser. |
| **`map2json.py`** (community script) | Various forks | `.map` → JSON (`map.json`) | Simple one‑way export, useful for debugging. |
| **`json2map.py`** | Community | JSON → `.map` | Re‑creates binary; loses any custom binary extensions. |
| **`ao-map-converter` (npm package)** | Not official, third‑party | `.map` ↔︎ JSON, CSV | Actively maintained; can be used in CI to generate our split files. |
| **`lambdaclass/argentum` build pipeline** | Web client | JSON ↔︎ binary (via `map-serializer.ts`) | Open source, MIT‑licensed – can be reused for import/export. |

**Implication:** By leveraging `ao-map-converter` (MIT) or the TypeScript serializer from the web client, we can provide a **one‑click import** of official `.map` files into our split representation, and an **export** back to the original format for compatibility with existing servers.

---

## 5. Licenses & Reuse Implications

| Project | License | Reuse Constraints |
|---------|---------|-------------------|
| **argentum-online-worldeditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. Direct code reuse (e.g., UI components) would require our whole repository to be AGPL‑3.0, which may conflict with our current licensing. However, **ideas, file format specifications, and UI/UX patterns** are free to adopt. |
| **lambdaclass/argentum** | **MIT** | Very permissive. We can copy code (e.g., the JSON ↔︎ binary serializer) without affecting our license. |
| **ao-libre/ao-cliente** | **GPL‑3.0** (or mixed) | Reusing code would require GPL‑3.0 compatibility. Similar to AGPL, but less strict about network use. Safer to avoid direct code copy unless we are willing to re‑license. |

**Conclusion:**  
- **Format specifications** and **design decisions** can be borrowed from any project.  
- For **implementation**, we should prefer the **MIT‑licensed** serializer from `lambdaclass/argentum` and the **MIT‑licensed `ao-map-converter`** npm package.  
- Avoid copying VB6 source from the official editor due to AGPL‑3.0 constraints.

---

## 6. Recommendations for Construction Mode

1. **Adopt the same underlying binary format** (`.map`) for persistence. Internally keep the convenient split representation (`meta`, `terrain`, `npcs`, `specials`).  
2. **Implement import/export utilities** using the MIT‑licensed TypeScript serializer or the `ao-map-converter` CLI. Provide CLI commands:
   - `npm run map:import <file.map>`
   - `npm run map:export <folder>`
3. **Model objects** (NPCs, triggers, specials) in a **single “objects” layer** in the UI, then split on disk. This mirrors the official editor’s approach and simplifies UI logic.  
4. **Add a “lock brush”** that toggles the blocked‑tile bitfield directly in the terrain view.  
5. **Start with a local live preview**: after each edit, automatically reload the map in the client (no networking needed). This gives immediate feedback and differentiates us from existing tools.  
6. **Document the format** in `docs/map_format.md` (future work) and reference this research file.

--- 

*Document created on 2026‑09‑20 by the OpenAO research team.*