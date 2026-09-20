FILE: docs/MapEditorResearch.md
```
# Research: How Other Argentum Online Projects Edit Maps

## Overview
This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating past mistakes, justify design decisions for the upcoming **construction mode**, and identify reusable tools or ideas.

| Project | Repository | Language / Stack | License |
|---------|------------|------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | JavaScript (Node/Electron) | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|--------------------|---------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | Proprietary binary layout used by the original Argentum server. The binary stores tiles, layers, triggers, and NPC data in a packed structure. | Not directly compatible. Our JSON‑based format (`meta`, `terrain`, `npcs`, `specials`) must be converted to/from this binary. |
| **Lambdaclass Argentum** | `*.json` (client‑side) | The web client loads maps from the server as JSON objects that mirror the server’s binary layout but are already deserialized. Keys: `tiles`, `layers`, `objects`, `triggers`. | Very close. `tiles` → `terrain`, `objects` → `npcs`, `triggers` → `specials`. Minor renaming and flattening needed. |
| **AO‑Libre Client** | `*.map` (binary) + optional `*.json` for debugging | Re‑uses the original binary format, with a small helper library to read/write it in JavaScript. | Same compatibility concerns as the official editor. |

**Takeaway:**  
- The **binary `.map` format** is the de‑facto standard for the server, but our project stores maps in a more developer‑friendly JSON structure.  
- The **Lambdaclass JSON representation** is the closest match and can serve as a reference implementation for import/export.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

### Layers
- The editor defines **three visual layers**: `Ground`, `Objects`, `Top`.  
- Each layer is a 2‑D array of tile IDs (0‑based). Tiles are stored sequentially per layer.

### Blocking
- Blocking information is stored in a **separate byte array** (`blocked`) parallel to the terrain grid.  
- A value of `1` means the tile blocks movement; `0` means walkable.  
- Some tiles have built‑in block flags (e.g., walls) that the editor automatically sets.

### Triggers
- Triggers are stored in a **list of records** (`Trigger`) with fields: `X`, `Y`, `TriggerType`, `Param1`, `Param2`, `Param3`.  
- Types include `Walk`, `Use`, `Attack`, `Chat`, etc.  
- The editor groups triggers by map coordinates but does not enforce any hierarchy.

### Decisions Worth Copying
| Decision | Reason | How to Apply |
|----------|--------|--------------|
| **Separate blocking array** | Allows independent visual tiles and collision data, simplifying path‑finding. | Keep a `blocked` boolean matrix in our JSON (`meta.blocked`). |
| **Explicit trigger records** | Makes it easy to serialize/deserialize and to add new trigger types without UI changes. | Model `specials` as an array of objects with `type` and `params`. |
| **Layer ordering (Ground → Objects → Top)** | Mirrors the rendering pipeline used by the original client, avoiding Z‑ordering bugs. | Preserve the same three‑layer order in our `terrain` definition. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment (if any) |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No. It is a standalone desktop app that writes files to disk. | No. | N/A |
| **Lambdaclass Argentum** | No built‑in live editing; maps are edited offline and uploaded. | No. | N/A |
| **AO‑Libre Client** | No. The client only reads maps. | No. | N/A |

**Observations:**  
- No project attempted real‑time map editing. The main obstacle is **synchronizing binary map files** across multiple users and ensuring server consistency.  
- Implementing live editing would require a **centralised map service** with versioning, conflict resolution, and authentication – beyond the scope of the current construction mode.

---

## 4. Import / Export Tools

| Project | Import Capability | Export Capability | Notes |
|---------|-------------------|-------------------|-------|
| **Official World Editor** | Can import **`.map`** files (binary) and **`.inf`** metadata. | Exports the same binary format. | No direct JSON support. |
| **Lambdaclass Argentum** | Reads JSON maps from the server; provides a small Node script (`scripts/convertMap.js`) to convert binary → JSON. | Uses the same script for JSON → binary (via the server’s map writer). | The script is MIT‑licensed and can be reused. |
| **AO‑Libre Client** | Includes a JavaScript library (`map-loader.js`) that parses binary maps into JS objects. | Can serialize the in‑memory representation back to binary. | GPL‑3.0; reuse must respect GPL compatibility. |

**Potential Tool for Our Repo**  
- Fork the **Lambdaclass conversion script** (MIT) and adapt it to our JSON schema.  
- Provide two CLI commands: `npm run map:import <binary.map>` and `npm run map:export <json>`.

---

## 5. Licenses & Reuse Implications

| Project | License | Implications |
|---------|---------|--------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. Using code directly (e.g., VB6 UI) is not feasible for our TypeScript/Node stack. However, the **file format specification** is not protected; we can implement our own parser. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can copy the conversion script, adapt it, and even re‑license the derived code under our project’s license. |
| **AO‑Libre Client** | **GPL‑3.0** | GPL is compatible with AGPL, but we would need to release the derived code under GPL/AGPL. Since we already have AGPL‑compatible code (the world editor), reusing the JS map loader is possible but adds licensing overhead. Prefer the MIT script from Lambdaclass. |

**Conclusion:**  
- We can safely **re‑implement** the binary format parser based on the public specification (no license issue).  
- For quick import/export, **reuse the MIT‑licensed conversion script** from Lambdaclass.  
- Any UI or editor code from the official VB6 editor cannot be reused due to AGPL‑3.0 and language mismatch.

---

## Recommendations for Construction Mode

1. **Adopt the three‑layer model** (`ground`, `objects`, `top`) and store a separate `blocked` matrix in `meta`.  
2. **Model triggers** as an array of objects (`specials`) with a `type` field and a generic `params` object – this mirrors the official editor’s trigger records and keeps the format extensible.  
3. **Provide import/export CLI** based on the MIT script from Lambdaclass, converting between our JSON format and the original binary `.map`.  
4. **Document the binary format** in `docs/MapFormat.md` for future reference and to aid contributors who may need to write parsers in other languages.  
5. **Avoid live collaborative editing** for now; focus on a robust offline editor that can later be extended with a server‑side map service if needed.

--- 

*Prepared for issue #14 – “Research: como editan mapas los otros proyectos de Argentum Online”.*