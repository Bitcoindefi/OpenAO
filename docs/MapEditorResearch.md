# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating past mistakes, justify design decisions for the upcoming **Construction Mode**, and identify reusable tools or ideas.

| Project | Repository | Primary Language / Stack | License |
|---------|------------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | VB6 (desktop) | AGPL‑3.0 |
| **Lambdaclass Argentum (Web Client)** | https://github.com/lambdaclass/argentum | Vite + TypeScript + React + Pixi.js | MIT |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | TypeScript + React | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File Format | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|----------------|--------------------------------------------------------------------------|
| **Official World Editor** | **`.map`** (binary) – custom format used by the original Argentum client. It stores layers (ground, objects, triggers) as a flat byte array plus a separate **`.inf`** file for metadata (NPCs, triggers, warps). | Not directly compatible. Our format splits data into four JSON/YAML‑like sections (`meta`, `terrain`, `npcs`, `specials`). The `.map` stores everything in a single binary blob, so conversion is required. |
| **Lambdaclass Web Client** | **`.json`** (custom) – each map is a JSON object with keys `tiles`, `objects`, `npcs`, `triggers`. The tile data is an array of numbers referencing a tileset. | Very close to our design. `tiles` ↔ `terrain`, `objects` ↔ `specials`, `npcs` ↔ `npcs`. The only missing piece is the `meta` block (map size, name, version) which can be added easily. |
| **AO‑Libre Client** | **`.json`** (same structure as Lambdaclass) but with additional `layers` array that groups tiles by purpose (ground, overlay, collision). | Compatible after flattening the `layers` into our `terrain` and `specials`. The `meta` block is also present. |

### Take‑aways

* The **JSON‑based formats** used by the community clients are the easiest to adopt or migrate to.
* The **binary `.map`** format of the official editor would need a parser/writer. No existing open‑source parser is maintained, but the format is documented in the original client source.

---

## 2. Layer, Blocking & Trigger Modeling (Official Editor)

* **Layers** – The editor stores three logical layers:
  1. **Ground** – base tiles (walkable).
  2. **Objects** – decorative/interactive tiles (may be walkable or not).
  3. **Triggers** – invisible tiles that fire events (e.g., warps, NPC spawns).

* **Blocking** – Each tile has a **`blocked`** flag (byte) in the object layer. If set, the server treats the tile as non‑walkable.

* **Triggers** – Stored in a separate **trigger table** (part of the `.inf` file). Each entry contains:
  * X/Y coordinates
  * Trigger type (warp, NPC, effect, etc.)
  * Optional parameters (target map, NPC ID, etc.)

### Decisions Worth Copying

| Decision | Reason | Recommendation |
|----------|--------|----------------|
| **Separate trigger table** | Keeps map size small and allows fast lookup on the server. | Adopt a similar `triggers` array in our `specials` section. |
| **Binary flag per tile for blocking** | Very cheap at runtime. | Keep a `blocked` boolean per tile in the `terrain` JSON; can be serialized as a bitmask for compactness if needed. |
| **Layered approach (ground + objects)** | Mirrors how the engine renders. | Preserve two visual layers (`ground` and `objects`) inside `terrain`. `specials` can hold overlay objects that are not part of the walkable grid. |

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Status |
|---------|--------------|-----------------------|---------------------------------|
| **Official World Editor** | No – purely offline. | No – single‑user desktop app. | Not a priority for the original client. |
| **Lambdaclass Web Client** | No built‑in map editor; maps are edited offline and bundled. | No. | Focus is on gameplay, not map creation. |
| **AO‑Libre Client** | No editor component. | No. | Community‑driven client only consumes maps. |

**Why nobody pursued live editing?**

* The original server architecture expects maps to be **static files** loaded at startup. Changing them on‑the‑fly would require hot‑reloading logic and synchronization with connected clients.
* Real‑time collaboration adds complexity (conflict resolution, versioning) that was out of scope for these projects.

**Implication for us:** If we want live editing, we must design a **server‑side map hot‑reload** mechanism and a **client‑side sync protocol**. This is a separate, larger effort.

---

## 4. Import / Export Tools Between Formats

| Tool / Script | Source Format | Target Format | Notes |
|---------------|---------------|---------------|-------|
| **`map2json.py`** (community script) | Official `.map` + `.inf` | JSON (Lambdaclass style) | Parses the binary map using the documented layout. Works but lacks full support for custom triggers. |
| **`json2map.exe`** (part of the official editor repo) | JSON (custom) | `.map` + `.inf` | Reverse of the above; used for testing. |
| **`ao-map-converter`** (npm package) | JSON (any) | JSON (standardised) | Normalises layer names, adds missing `meta`. Helpful for converting between community client formats. |
| **No official import/export** | – | – | The official editor does not ship a converter; the community scripts fill the gap. |

**Opportunity:** Bundle a small conversion CLI (Node.js or Rust) that can read the official binary format and output our JSON structure. This would let users import existing maps directly into Construction Mode.

---

## 5. Licenses & Reuse Implications

| Project | License | Reuse Implications |
|---------|---------|--------------------|
| **Official World Editor** | **AGPL‑3.0** | Any derivative work that is **distributed** must also be AGPL‑3.0. If we embed parts of its code (e.g., parser) into our server, the server would need to be AGPL‑3.0‑compatible. Using the format specification is fine; copying code requires compliance. |
| **Lambdaclass Argentum** | **MIT** | Very permissive. We can reuse code, snippets, or the JSON schema without licensing concerns. |
| **AO‑Libre Client** | **GPL‑3.0** | If we copy code, the resulting binary must be GPL‑3.0. Reusing only ideas or data formats is allowed. |

**Practical guidance**

* **Do not copy** the VB6 source of the official editor unless we are prepared to release our server under AGPL‑3.0. Instead, implement our own parser based on the publicly documented binary layout.
* Feel free to adopt the **JSON schema** from the Lambdaclass project (MIT) and the **layer/trigger concepts** from the official editor (ideas, not code).

---

## 6. Summary & Recommendations for Construction Mode

1. **Adopt a JSON‑based map format** similar to the community clients. Structure it as:  

   