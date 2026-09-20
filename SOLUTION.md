FILE: docs/map_editing_research.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview
This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid reinventing the wheel, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Visual Basic 6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React + Pixi.js | GPL‑3.0‑or‑later |

---

## 1. Map Formats Used

| Project | Map File Format | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|----------------|--------------------------------------------------------------------------|
| **Official World Editor** | **`.map`** (binary) – custom format defined by the original Argentum server. It stores layers (ground, objects, triggers), block flags, NPC spawn data, and special tiles in a single binary blob. | Not directly compatible. Our format splits data into four JSON/YAML‑like sections (`meta`, `terrain`, `npcs`, `specials`). Conversion requires parsing the binary layout and re‑exporting each section. |
| **Lambdaclass Argentum** | **`.json`** (exported from the editor) – a flat JSON object containing `tiles`, `blocked`, `npc`, `trigger` arrays. The structure mirrors the server’s binary layout but is already deserialized. | Very close. `tiles` → `terrain`, `blocked` → part of `meta` (`blocked` flag), `npc` → `npcs`, `trigger` → `specials`. Minor renaming and nesting are needed. |
| **AO‑Libre Client** | **`.json`** (same as Lambdaclass) – uses the same community‑maintained JSON schema. | Same compatibility notes as above. |

**Take‑away:**  
- The official editor’s binary format is the only outlier.  
- Both community projects already expose a JSON representation that can be mapped almost 1‑to‑1 to our split sections.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

The VB6 editor stores map data in three logical layers:

| Layer | Description | Storage in `.map` |
|-------|-------------|-------------------|
| **Ground** | Base terrain tiles (grass, water, etc.) | `TileData[0..Width*Height-1]` |
| **Objects** | Decorative / interactive objects (trees, doors, etc.) | `ObjectData[0..Width*Height-1]` |
| **Triggers** | Collision, walkable, NPC spawn, warp, etc. | `TriggerData[0..Width*Height-1]` (bit‑flags) |

**Blocking** is a per‑tile bit flag inside the *Triggers* layer (`BLOCKED = 0x01`).  
**Special tiles** (e.g., warp, NPC spawn) are encoded as additional bits (`WARP = 0x02`, `NPC = 0x04`, …) together with an auxiliary table that maps tile indices to parameters (target map, NPC ID, etc.).

### Decisions Worth Copying
1. **Single‑source truth per tile** – storing terrain, object, and trigger bits together simplifies server‑side loading and guarantees consistency.  
2. **Bit‑mask for triggers** – compact and fast to evaluate; we can adopt a similar enum in our `specials` section.  
3. **Auxiliary “trigger‑info” table** – keeps the per‑tile data small while still allowing rich parameters (e.g., warp destination). This pattern can be reused for our live‑construction mode to avoid bloating the map file.

---

## 3. Live / Collaborative Editing Attempts

| Project | Live Editing? | Outcome | Reason for Abandonment (if any) |
|---------|---------------|---------|---------------------------------|
| **Official World Editor** | No (desktop, file‑based) | N/A | N/A |
| **Lambdaclass Argentum** | **Yes** – experimental “Map Builder” UI that pushes changes via WebSocket to a dev server. | Prototype only; never merged into main. | Complexity of synchronising binary triggers, lack of server‑side support, and performance regressions on large maps. |
| **AO‑Libre Client** | No built‑in live editor. Some forks added a “preview‑only” mode that reloads the map after each save. | Works for solo editing but not collaborative. | No backend for conflict resolution; community decided to keep editing offline and import/export. |

**Key Insight:** Real‑time collaborative editing is non‑trivial because map data must stay consistent with the server’s binary expectations. A practical approach is to edit offline, then **import** the final JSON into the server (or convert to binary).

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source → Target | Description |
|---------------|----------------|-------------|
| **`worldeditor-converter`** (community fork) | Official `.map` → JSON (Lambdaclass schema) | Parses the binary layout, outputs a JSON file compatible with the web clients. License: MIT (original author rewrote the parser). |
| **`json-to-bin`** (included in `ao-libre/ao-cliente`) | JSON → Official `.map` | Takes the community JSON format and writes the binary map used by the original server. Used for testing custom maps. |
| **`map-exporter`** (Lambdaclass) | In‑editor → `.json` | Simple UI button that downloads the current map as JSON. |
| **No official tool** for **live sync** between the VB6 editor and a running server. |

**Opportunity:** By bundling `worldeditor-converter` (MIT) into our repo we can let users import maps created with the official editor directly into our construction mode, saving a conversion step.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. If we embed parts of its source (e.g., the binary parser) into our server, the whole server would need to be AGPL‑3.0‑compatible. However, using the *binary* format or writing our own parser from scratch is allowed. |
| **Lambdaclass Argentum** | **MIT** | Very permissive; we can copy code, adapt the JSON schema, or reuse their conversion scripts without affecting our license. |
| **AO‑Libre Client** | **GPL‑3.0‑or‑later** | Reusing code would require our project to be GPL‑compatible. Since the repo is currently under a permissive license (see `LICENSE`), we should avoid pulling GPL‑licensed source directly. Using their ideas (layer model, bit‑mask) is fine. |

**Conclusion:**  
- We can safely **reuse the JSON schema** and conversion utilities from the Lambdaclass project (MIT).  
- For the official binary format, we should **implement our own parser** (or adopt the MIT‑licensed community parser) to stay clear of AGPL obligations.  
- Design decisions (layered bit‑mask, auxiliary trigger tables) can be borrowed conceptually without code reuse.

---

## 6. Recommendations for Construction Mode

1. **Adopt the community JSON schema** as the canonical on‑disk format for our construction mode.  
   - Map sections: `meta`, `terrain`, `npcs`, `specials`.  
   - Keep a `triggerInfo` table for parameters (warp target, NPC ID, etc.) similar to the official editor.

2. **Provide import/export utilities**:  
   - `npm run import:worldeditor` → uses the MIT `worldeditor-converter` to turn `.map` → our JSON.  
   - `npm run export:worldeditor` → uses `json-to-bin` to generate a `.map` that the original server can load.

3. **Document the format** in `docs/map_format.md` (future work) and reference this research doc.

4. **Avoid live collaborative editing** for now; focus on a robust offline editor with fast import/export cycles.

--- 

*Document created for issue #14 – Research: como editan mapas los otros proyectos de Argentum Online.*