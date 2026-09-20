FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, justify design decisions for the upcoming **construction mode**, and identify reusable tools or ideas.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0 (or AGPL‑3.0 depending on fork) |

---

## 1. Map Formats Used

| Project | Map file(s) | Format description | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-------------|--------------------|--------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | Proprietary binary format used by the original Argentum server. The binary stores layers (ground, objects, masks), block flags, triggers, and NPC data in a packed structure. | Not directly compatible. Our JSON‑based format (`meta`, `terrain`, `npcs`, `specials`) is a higher‑level representation. Conversion is required (see section 4). |
| **Lambdaclass Argentum** | `maps/*.json` (client‑side) | JSON files mirroring the server’s map structure: `tiles`, `blocks`, `trigger`, `npc`. The client loads them directly via HTTP. | Very close to our format. Their JSON contains `tiles` (terrain), `blocks` (collision), `npcs`, and `triggers`. Mapping to our `meta`/`terrain`/`npcs`/`specials` is straightforward (mostly renaming). |
| **AO‑Libre Client** | `assets/maps/*.json` (same as Lambdaclass) | Same JSON schema as Lambdaclass, with a few extra fields for custom client‑side effects (`effects`, `animations`). | Compatible with minor adjustments. The extra fields can be stored under `specials`. |

### Quick Compatibility Matrix

| Feature | Official Editor | Lambdaclass | AO‑Libre |
|---------|----------------|------------|----------|
| **Terrain tiles** | Binary tile IDs | `tiles` array (numeric IDs) | `tiles` array |
| **Collision / Block** | `blocked` flag per tile | `blocks` array (bool) | `blocks` array |
| **NPC placement** | Embedded in binary | `npcs` array (id, x, y, direction) | Same |
| **Triggers / Specials** | `trigger` structures (type, param) | `triggers` array (type, param) | `triggers` + extra `effects` |
| **Meta (map name, music, etc.)** | `.inf` file | `meta` object inside JSON | `meta` object |

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

The official VB6 editor models a map as **four logical layers**:

| Layer | Purpose | Storage in binary |
|-------|---------|-------------------|
| **Ground** | Base terrain (grass, water, etc.) | `groundTileId[width][height]` |
| **Objects** | Decorative objects, walls, doors | `objectTileId[width][height]` |
| **Mask** | Collision mask (blocked / walkable) | `blockedFlag[width][height]` (bitfield) |
| **Triggers** | Event triggers (e.g., warp, heal) | `triggerId[width][height]` + parameters |

### Decisions Worth Considering

| Decision | Why it matters | Recommendation |
|----------|----------------|----------------|
| **Separate collision mask** | Allows terrain tiles to be reused without affecting walkability. | Keep a dedicated `blocked` layer (`terrain.blocked` or `meta.collision`). |
| **Trigger IDs + parameters** | Compact representation, but hard to extend. | Use a JSON object per trigger (`type`, `params`) for extensibility. |
| **Layer ordering in UI** | The editor shows layers as tabs (Ground, Objects, Mask, Triggers). | Replicate this UI pattern in our construction mode for intuitive editing. |
| **Tile‑based locking** | The editor can lock a tile to prevent accidental changes. | Implement a per‑tile `locked` flag (stored in `meta.locks`) to support safe collaborative editing. |

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Status |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No (desktop, file‑based) | No | Designed for offline map creation; no networking code. |
| **Lambdaclass Argentum** | No built‑in live editing. The client only **loads** maps. | No | Focus is on gameplay, not map authoring. |
| **AO‑Libre Client** | No live editing. | No | Same as Lambdaclass; the repo is a client, not an editor. |

**Take‑away:** No existing project attempted live or collaborative map editing. This means we have a clean slate, but also that we must design concurrency handling ourselves (e.g., optimistic locking, versioning).

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source → Target | Description | License |
|---------------|----------------|-------------|---------|
| **`map-converter` (community script)** | Official `.map` → JSON | Small Python script that parses the binary format and outputs a JSON compatible with Lambdaclass. | MIT |
| **`ao-worldeditor-exporter` (VB6 add‑on)** | Binary → CSV | Exports each layer to CSV files; useful for manual inspection. | AGPL‑3.0 |
| **`json2map` (Lambdaclass repo)** | JSON → Binary (for legacy servers) | Packs JSON back into the original binary format. | MIT |
| **No official two‑way GUI** | — | There is no maintained GUI that imports the official editor’s files directly into a web‑based editor. | — |

### Recommendation for Our Project

1. **Include a small import script** (`scripts/import-official-map.py`) that uses the community `map-converter` logic to read `.map` + `.inf` and produce our JSON structure (`meta`, `terrain`, `npcs`, `specials`).  
2. **Export** can be the reverse: serialize our JSON back to the binary format using `json2map` (if needed for legacy server compatibility).  
3. Document the scripts in `README.md` under a new “Map conversion” section.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. If we copy code (e.g., the binary parser), we must open‑source the whole project under AGPL‑3.0. However, ideas, UI concepts, and data formats are *not* copyrighted, so we can adopt those without licensing issues. |
| **Lambdaclass Argentum** | MIT | Very permissive. We can copy code, scripts, or UI components directly, provided we keep the MIT notice. |
| **AO‑Libre Client** | GPL‑3.0 (or AGPL‑3.0) | Similar to AGPL: copying code would require us to license the whole repo under GPL/AGPL. Again, UI/UX ideas are free to reuse. |

**Practical outcome:**  
- Reuse **concepts** (layer model, trigger JSON) freely.  
- Reuse **code** only from the MIT‑licensed Lambdaclass repo (e.g., their map‑loading utilities).  
- For any AGPL‑licensed code we must either keep it separate (e.g., a CLI tool) or adopt AGPL for the whole repository.

---

## 6. Summary & Action Items

| Item | Description | Owner | Deadline |
|------|-------------|-------|----------|
| **Create import script** | `scripts/import-official-map.py` using community converter logic. | TBD | Next sprint |
| **Add export script** | Wrapper around `json2map` to produce `.map` files. | TBD | Next sprint |
| **Update docs** | Add this research file to `docs/` and reference it from the main README. | Documentation lead | Immediate |
| **Design UI** | Use the 4‑layer tab layout (Ground, Objects, Collision, Triggers) and include a per‑tile lock flag. | UI/UX designer | Next sprint |
| **License audit** | Ensure any copied code respects MIT/AGPL constraints. | Legal/maintainer | Ongoing |

--- 

*Prepared by the OpenAO contributors – September 2026*