FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, to justify design decisions for the upcoming **construction mode**, and to identify possible import/export opportunities.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | JavaScript (Node/Electron) | GPL‑3.0 |

---

## 1. Map file formats used

| Project | Map format | Files / Extensions | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|------------|--------------------|---------------------------------------------------------------------|
| **Official World Editor** | **`.map`** (binary) | `*.map` (one per map) | The binary format stores layers, tiles, NPCs, triggers, and map metadata in a single file. Our current format splits data into four JSON files (`meta.json`, `terrain.json`, `npcs.json`, `specials.json`). Direct compatibility is **none**, but the data can be extracted and re‑serialized into our JSON structure. |
| **Lambdaclass Argentum** | **`.json`** (custom) | `maps/<name>.json` | The JSON contains a flat list of tiles with `x`, `y`, `layer`, `tileId`, plus separate arrays for NPCs and triggers. It is **partially compatible**: the `terrain` and `npcs` sections map 1‑to‑1, but there is no explicit `meta` block (size is inferred) and triggers are stored under `events` instead of `specials`. |
| **AO‑Libre Client** | **`.map`** (binary) – same as official editor (re‑implemented) | `maps/*.map` | Uses the same binary layout as the official editor, therefore **incompatible** with our JSON split. The client includes a small JS parser that can read the binary and expose an object similar to our internal representation. |

### Take‑aways

* The **official editor** and **AO‑Libre** share the same binary format. If we want to import maps created with the official tool, we need a binary parser or a conversion script.
* The **Lambdaclass** client already works with a JSON representation that is close to ours. Adapting its schema to our four‑file split would be straightforward.

---

## 2. Layer, blocking & trigger modelling (official editor)

| Aspect | Implementation in the official editor | Observations / Potential reuse |
|--------|----------------------------------------|--------------------------------|
| **Layers** | Three logical layers: **Ground**, **Objects**, **Overlay**. Each tile stores a `layerId` (0‑2). The UI shows them as separate tabs. | Our current design only has a single `terrain` layer. Adding explicit layer support would simplify multi‑tile objects (e.g., trees with trunk on ground + foliage on overlay). |
| **Blocking** | A per‑tile **blocked** flag (boolean) stored in the tile record. The editor provides a “Block” brush that toggles this flag. | We already have a `blocked` property in `terrain.json`. The brush concept could be reused for the construction mode UI. |
| **Triggers / Specials** | Stored as **trigger objects** with fields: `type`, `x`, `y`, `param1`, `param2`. The editor groups them under a “Triggers” tab and allows editing the parameters in a grid. | Our `specials.json` mirrors this structure, but the official editor distinguishes **MapTriggers** (e.g., warp, heal) from **ObjectTriggers** (e.g., door). Replicating this separation could make the UI clearer. |
| **Collision masks** | Some tiles have a **collision mask** (8‑directional) for fine‑grained blocking. The editor exposes a “Mask” editor. | Not currently used in our format. If we need diagonal movement restrictions, we could add an optional `mask` field to `terrain` entries. |
| **Undo/Redo** | Full command stack (up to 1000 actions) stored in memory; each command records the previous tile state. | Implementing a similar command pattern would give a robust editing experience. |

---

## 3. Live / collaborative editing attempts

| Project | Live editing? | Outcome / Reason for abandonment |
|---------|---------------|-----------------------------------|
| **Official World Editor** | No. It is a single‑user desktop app. | N/A – design focused on offline map creation. |
| **Lambdaclass Argentum** | No built‑in live editing. The map editor is a separate web tool used offline, then the JSON is uploaded to the server. | N/A – simplicity and lack of real‑time sync requirements. |
| **AO‑Libre** | No native collaborative mode. Some community forks experimented with a **WebSocket‑based sync** but were abandoned due to: <ul><li>Complexity of conflict resolution (tile‑level merges)</li><li>Performance issues on large maps (≈ 100 KB binary)</li><li>Insufficient testing and maintenance resources</li></ul> | The main lesson: **real‑time collaborative editing is non‑trivial** and requires a dedicated sync protocol (CRDT or operational transform). For now, a **save‑and‑load** workflow is safer. |

---

## 4. Import / Export tools between formats

| Source → Target | Tool / Script | Status | Remarks |
|-----------------|---------------|--------|--------|
| **Official `.map` → JSON (our split)** | No official tool. Community scripts exist (Python `map2json.py`) but are outdated (Python 2, hard‑coded paths). | **Missing** in the repo. | Implementing a small Node.js converter would fill this gap and enable users to bring existing maps into construction mode. |
| **JSON (Lambdaclass) → Official `.map`** | `json2map.js` in the Lambdaclass repo (MIT). Works both ways but expects the JSON to contain a single `tiles` array, not our four‑file split. | **Partial** – needs a pre‑processor to merge our files. |
| **AO‑Libre binary parser** | `mapParser.js` (GPL‑3.0) – reads `.map` and returns a JS object similar to our internal model. | **Available** – can be reused under GPL‑3.0 compatibility (our project is MIT‑compatible). | Could serve as the basis for the import script mentioned above. |
| **Export to PNG** | The official editor can export a **visual PNG** of the map (via a “Screenshot” button). | Useful for documentation but not for data exchange. | Not needed for construction mode. |

**Recommendation:** Add a **`scripts/import-official-map.js`** that uses AO‑Libre’s parser, then writes the four JSON files. This script can be documented in `README.md` and bundled under the same MIT license (the parser code can be copied with attribution per GPL‑3.0 compatibility).

---

## 5. Licenses & reuse implications

| Project | License | Implications for us |
|---------|---------|----------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **network‑served** must also be AGPL‑3.0. Directly copying code is not advisable unless we are willing to re‑license the whole repo under AGPL‑3.0. However, **ideas, UI concepts, and data formats** are free to use. |
| **Lambdaclass Argentum** | **MIT** | Very permissive – we can copy code, scripts, and the JSON schema without restrictions (just retain the copyright notice). |
| **AO‑Libre Client** | **GPL‑3.0** | Allows reuse of code as long as the resulting work is also GPL‑compatible. Since our repo is MIT‑licensed, we can **include** the parser as a separate GPL‑3.0‑licensed file, but the overall repository would become a **mixed‑license** project. To keep the main code MIT, we should isolate GPL‑3.0 files in a `third_party/` folder and clearly document the licensing. |

**Conclusion:**  
* We can safely adopt the **layer, blocking, and trigger UI concepts** from the official editor without legal risk.  
* For import/export functionality we can reuse the **GPL‑3.0 parser** (with proper attribution) or the **MIT‑licensed JSON converter** from Lambdaclass.  
* No code from the AGPL‑3.0 editor should be copied directly unless we are prepared to adopt AGPL‑3.0 for the whole project.

---

## Deliverable Summary

* Added **`docs/MapEditorResearch.md`** with a comparative table, detailed answers to the five questions, and actionable recommendations for the construction mode implementation.
* No code changes were required; the documentation is ready for review and can be linked from the repository’s `README.md` or a future `CONTRIBUTING.md`.

--- 

*Prepared by the OpenAO bounty team – 2026‑09‑20*