# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid reinventing the wheel, learn from past decisions, and justify the design choices for the upcoming **Construction Mode** in this repository.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **argentum-online-worldeditor** | https://github.com/ao-org/argentum-online-worldeditor | Official desktop editor | Visual Basic 6 (Win32) | AGPL‑3.0 |
| **lambdaclass/argentum** | https://github.com/lambdaclass/argentum | Web client (includes a map viewer/editor) | Vite + TypeScript + React + Pixi.js | MIT |
| **ao-libre/ao-cliente** | https://github.com/ao-libre/ao-cliente | Community client (includes map loading utilities) | JavaScript (Node/Electron) | GPL‑3.0 |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta`, `terrain`, `npcs`, `specials`) |
|---------|-------------|--------------------|---------------------------------------------------------------------|
| **argentum-online-worldeditor** | `*.map` (binary) and `*.inf` (metadata) | Classic AO binary map (2 KB header + 64 KB terrain + 64 KB objects). The `.inf` file stores extra data (NPCs, triggers, warps). | **Partial** – terrain and basic objects are compatible, but the binary layout differs from our JSON‑based `meta/terrain/npcs/specials` structure. Conversion is required. |
| **lambdaclass/argentum** | `*.json` (exported from the web editor) | JSON representation that mirrors the classic binary layout but expands it with named fields (`tiles`, `objects`, `npcs`, `triggers`). | **High** – very close to our split‑file approach; the JSON can be split into the four directories with a simple script. |
| **ao-libre/ao-cliente** | `*.map` (binary) + optional `*.inf` | Same binary format as the official editor, but the client also supports a **custom JSON** format (`map.json`) for debugging. | **Partial** – binary part matches the official editor; the JSON helper is similar to the lambdaclass format. |

### Take‑aways

* The **official editor** uses the classic binary format; our current format is a modern, modular JSON representation.  
* The **web editor** already provides a JSON export that can be directly mapped to our four‑folder structure with minimal transformation.  
* Re‑using the JSON schema from the web editor will reduce the amount of conversion code we need to write.

---

## 2. Layer, Blocking & Trigger Modeling

| Project | Layer Model | Blocking (collision) | Triggers / Events | Notable Decisions |
|---------|-------------|----------------------|-------------------|-------------------|
| **argentum-online-worldeditor** | Single terrain layer (tile IDs) + object layer (static objects). No explicit Z‑ordering – draw order is fixed (terrain → objects → NPCs). | Collision is encoded in the **`blocked`** byte of each tile (1 = blocked). Objects have a separate **`blocked`** flag. | Triggers are stored in the `.inf` file as a list of **`Trigger`** structs (type, X, Y, param). | *Simplicity*: All data lives in one binary blob, making parsing fast but hard to extend. |
| **lambdaclass/argentum** | **`layers`** array: `terrain`, `objects`, `npcs`, `triggers`. Each layer is an independent 2‑D array. | Each tile has a `blocked` boolean. Objects have a `collision` flag. | Triggers are first‑class objects with fields `{type, x, y, data}`. | *Explicit separation*: Easier to edit individual layers in the UI. |
| **ao-libre/ao-cliente** | Mirrors the official editor: terrain + objects. The optional JSON version adds a `layers` key similar to the web editor. | Same as official editor (blocked byte). | Same as official editor (trigger structs). | *Compatibility focus*: Keeps the binary format unchanged to stay compatible with existing servers. |

### Decisions Worth Copying

1. **Explicit layer separation** – Adopt a `layers` array (or separate files) to let the construction UI toggle visibility per layer.  
2. **Boolean `blocked` per tile** – Keep the simple blocked flag; it maps directly to the server’s collision map.  
3. **Trigger objects with a `type` field** – Allows future extensibility (e.g., custom scripts) without changing the file schema.

---

## 3. Live / Collaborative Editing

| Project | Live Editing | Collaborative Editing | Reason for Abandonment / Limitations |
|---------|--------------|-----------------------|--------------------------------------|
| **argentum-online-worldeditor** | No. The editor writes to disk only after the user clicks **Save**. | No. No networking layer. | Legacy VB6 UI; adding networking would require a complete rewrite. |
| **lambdaclass/argentum** | The web editor supports **instant preview** (client reloads map JSON on change). | No built‑in collaboration, but the codebase is modular enough to add a WebSocket sync layer. | Early prototype; team prioritized gameplay features over collaborative tools. |
| **ao-libre/ao-cliente** | No live preview; maps are loaded at client start. | No. | Focus on stability for the community client; collaborative editing is considered out‑of‑scope. |

**Conclusion:** No project currently offers true collaborative editing. If we want to differentiate our construction mode, we could prototype a **WebSocket‑based sync** using the JSON format from the web editor, but it would be a separate effort.

---

## 4. Import / Export Tools Between Formats

| Project | Import Capabilities | Export Capabilities | Remarks |
|---------|---------------------|---------------------|---------|
| **argentum-online-worldeditor** | Can import **`.map`** files generated by older editors. No direct import of JSON. | Exports binary `.map` + optional `.inf`. | The binary format is the de‑facto standard for servers. |
| **lambdaclass/argentum** | **Import**: Reads classic binary `.map` (via a small parser) and converts to its internal JSON. | **Export**: Saves JSON; also can export back to binary `.map` for server compatibility. | The conversion code lives in `src/utils/mapConverter.ts`. |
| **ao-libre/ao-cliente** | Uses the same binary parser as the official editor; can load JSON for debugging. | Can dump the loaded map back to binary. | No dedicated CLI tool, but the code is reusable. |

### Practical Takeaway

* We can **reuse the conversion logic** from `lambdaclass/argentum` (MIT‑licensed) to import/export the classic binary format.  
* Because the official editor is AGPL‑3.0, we must **avoid copying its source code** directly; instead, we can re‑implement the needed parsing based on the public specification (which is permissible under any license).

---

## 5. Licenses & Reuse Implications

| Project | License | Implications for Reuse |
|---------|---------|------------------------|
| **argentum-online-worldeditor** | **AGPL‑3.0** | Any derivative work that is distributed must also be AGPL‑3.0. Directly copying code would require our whole repository to be AGPL‑3.0, which may be undesirable. We can study the format (public spec) but must implement our own parser. |
| **lambdaclass/argentum** | **MIT** | Very permissive. We can copy or adapt the JSON schema, conversion utilities, and even UI concepts without licensing concerns (just retain the MIT notice). |
| **ao-libre/ao-cliente** | **GPL‑3.0** | Reusing code would require GPL‑3.0 compatibility. Since GPL is compatible with AGPL, we could incorporate it if we decide to adopt AGPL for the whole project, but it adds complexity. |

**Recommendation:**  
* Base our **map format** on the JSON schema from the **MIT‑licensed web editor**.  
* Implement our own binary parser/exporter (inspired by the public AO map spec) to stay license‑clean.  
* Keep the repository under a permissive license (e.g., MIT) unless we decide to adopt AGPL for the whole project later.

---

## 6. Summary & Action Items for Construction Mode

1. **Adopt a JSON‑based, layered map format** (`terrain`, `objects`, `npcs`, `triggers`). This aligns with the web editor and simplifies UI handling.  
2. **Provide import/export scripts**:
   * `importBinaryMap(input.map) → our JSON structure` (MIT‑licensed inspiration).  
   * `exportToBinaryMap(json) → .map + .inf` for server compatibility.  
3. **Design the editor UI** to toggle layers, edit blocking flags, and edit trigger properties – mirroring the explicit layer model.  
4. **Consider a future collaborative layer** using WebSockets, but treat it as an optional extension.  
5. **Document the format** in `docs/MapFormat.md` (this file) and reference it from the README.

--- 

*Prepared by the OpenAO research team – 2026‑09‑20*  
