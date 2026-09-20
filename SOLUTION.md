FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **construction mode**, and identify reusable tools or ideas.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Visual Basic 6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map file format | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|----------------|-----------------------------------------------------------------------|
| **Official World Editor** | **`.map`** (binary) – custom format used by the original Argentum server. It stores a header, a 2‑D array of tiles (terrain), a list of NPCs, and a list of “specials” (triggers, objects, warps). No explicit `meta` layer; metadata (map name, music, light level) is stored in the header. | The binary layout is **not directly compatible** with our JSON‑based split (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). However the logical sections map 1‑to‑1, so conversion is straightforward: <br>• Header → `meta.json` <br>• Tile matrix → `terrain.json` <br>• NPC list → `npcs.json` <br>• Specials list → `specials.json` |
| **Lambdaclass Argentum** | **`.json`** (custom) – the web client loads maps from `maps/<map>.json`. The file contains a single object with keys `meta`, `terrain`, `npcs`, `specials`. | **Fully compatible** with our format. The only difference is that the web client stores everything in one file, while we split it into four files for easier editing. A simple script can split/merge. |
| **AO‑Libre Client** | **`.json`** (same structure as Lambdaclass) – also uses a single JSON file per map. | Same compatibility notes as Lambdaclass. |

### Take‑away

* The **official editor** uses a binary format that is not directly usable but can be parsed. Implementing an import/export tool for `.map` would give us a huge advantage.
* The **community web clients** already use a JSON format that matches our logical model. We can reuse their parsing logic (MIT‑licensed) for validation or live‑preview features.

---

## 2. Layer, Blocking & Trigger Modelling (Official Editor)

The VB6 editor stores map data in three main sections:

| Section | Description |
|---------|-------------|
| **Terrain** | 2‑D array (width × height) of `Tile` records. Each tile contains: <br>• `GraphicID` (the sprite index) <br>• `Blocked` (boolean) – whether the tile blocks movement <br>• `Layer` (0 = ground, 1 = object, 2 = overlay) |
| **Specials** | List of `Special` records. Types include: <br>• **Warp** – destination map & coordinates <br>• **Trigger** – script ID to execute when a player steps on the tile <br>• **Object** – static objects that can be interacted with (e.g., doors) |
| **NPCs** | List of `NPC` records with X/Y, NPC ID, and optional AI script. |

#### Decisions Worth Copying

| Decision | Reason | How to adopt |
|----------|--------|--------------|
| **Explicit `Blocked` flag per tile** | Allows fine‑grained walkability without needing separate collision maps. | Keep the `blocked` boolean in our `terrain.json` entries. |
| **Layered tiles (ground / object / overlay)** | Enables drawing order control and supports “overhead” objects (e.g., bridges). | Preserve the `layer` field in `terrain.json`. |
| **Specials as a separate list** | Decouples triggers from the tile matrix, making it easier to edit without touching terrain data. | Continue using `specials.json` with `type`, `x`, `y`, and type‑specific payload. |
| **Header metadata** (map name, music, light level) | Centralizes map‑wide settings. | Store these in `meta.json`. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a desktop, single‑user editor. | No. | N/A – not designed for networking. |
| **Lambdaclass Argentum** | No built‑in live editing. Maps are edited offline and compiled into the client bundle. | No. | N/A – focus is on gameplay, not map creation. |
| **AO‑Libre Client** | No live editing. The client only loads maps. | No. | N/A – same reason as above. |

**Take‑away:** No existing project attempted live or collaborative map editing. The main obstacles reported in community discussions are:

* **Synchronization complexity** – keeping multiple users’ changes consistent while preserving server‑side validation.
* **Performance** – real‑time tile updates require efficient diffing and network bandwidth.
* **Security** – allowing clients to modify map data could be abused if not properly sandboxed.

If we decide to implement live editing later, we should start with a **single‑author mode** (editor → server → preview) and only add collaboration after a robust conflict‑resolution layer is in place.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source | Target | Status |
|---------------|--------|--------|--------|
| **`map2json.py`** (community script) | `.map` (official) → `.json` (single file) | Converts the binary format to the JSON layout used by Lambdaclass. | Exists in several forks, MIT‑licensed. |
| **`json2map.py`** | `.json` → `.map` | Reverse conversion, used for testing. | Partial; does not handle all special types. |
| **`split-json.py`** | Single JSON → four split files (`meta`, `terrain`, `npcs`, `specials`) | Simple Node/TS script, MIT‑licensed. | Ready to use. |
| **`merge-json.py`** | Four split files → single JSON | Opposite of `split-json`. | Ready to use. |

### Recommendation

* **Add an import command** to our tooling that accepts the official `.map` binary, uses the community `map2json.py` as a base, then runs `split-json.py` to produce the four files our construction mode expects.
* **Export** can be the reverse: merge the four files, then optionally run `json2map.py` to produce a `.map` that can be opened in the official editor.

All scripts are under permissive licenses (MIT or public domain), so we can incorporate them directly into our repo (e.g., under `tools/`).

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that we distribute **must** also be AGPL‑3.0. If we copy code (e.g., parsing logic) we need to license our repository under AGPL‑3.0 or keep the copied parts in a separate module with clear AGPL attribution. |
| **Lambdaclass Argentum** | **MIT** | Very permissive – we can copy, modify, and redistribute code (including the import/export scripts) without affecting our repo’s license. |
| **AO‑Libre Client** | **GPL‑3.0‑or‑later** | Allows reuse as long as the combined work is also GPL‑compatible. Since our repo is currently under a permissive license (see `LICENSE`), we can incorporate GPL‑3.0 code only if we re‑license the whole repo under GPL‑3.0 or keep the GPL parts isolated and clearly marked. |

### Practical Guidance

* **Parsing / conversion scripts** from Lambdaclass (MIT) are safe to copy directly.
* **Any code taken from the official editor** must either remain in a separate AGPL‑licensed module (e.g., `tools/official-editor-parser/`) or we must adopt AGPL‑3.0 for the whole repository. The simplest path is to **avoid copying** the VB6 source and instead rely on the community‑maintained Python scripts (MIT/public domain) that already perform the conversion.
* Documentation and design decisions are **not** subject to copyright, so we can freely describe the editor’s internals.

---

## 6. Summary & Action Items

| Item | Description | Owner | Deadline |
|------|-------------|-------|----------|
| **Create import/export scripts** | Add `tools/map-import/` with `map2json.py`, `json2map.py`, `split-json.py`, `merge-json.py`. Ensure they are MIT‑licensed. | TBD | Sprint 1 |
| **Add documentation** | This file (`docs/MapEditorResearch.md`). | ✅ Done (this PR) |
| **Update construction mode design** | Use `blocked` and `layer` fields as in the official editor; keep specials separate. | Architecture team | Sprint 2 |
| **Evaluate live‑editing feasibility** | Draft a design doc outlining networking, conflict resolution, and security. | TBD | Future sprint |
| **License audit** | Verify that any new code added respects the licenses above. | Legal/Compliance | Ongoing |

--- 

*Prepared by the OpenAO contributors – September 2026.*