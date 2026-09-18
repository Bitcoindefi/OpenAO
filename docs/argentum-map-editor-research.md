# Argentum Online Map Editor Landscape — Research Report

## Overview

This document surveys the existing Argentum Online (AO) ecosystem tools for map editing, formats, and their implications for OpenAO's construction mode.

## Projects Surveyed

| Project | Description | Language | License |
|---------|------------|----------|---------|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Official desktop editor | VB6 | AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Web client (Vite + React + Pixi.js) | TypeScript | MIT |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Community client | Pascal | GPL |
| OpenAO (this project) | Web client + server | TypeScript | MIT |

## Map Format Comparison

### OpenAO Format (meta / terrain / npcs / specials)

OpenAO uses a JSON-based format split across four files per map:

| File | Content |
|------|---------|
| `meta.json` | Map name, dimensions, lighting, gravity |
| `terrain.json` | Tile grid (2D array), tileset references |
| `npcs.json` | NPC placements, routes, dialogue |
| `specials.json` | Exits between maps, triggers, custom events |

**Compatibility**: No existing project uses this exact format. The closest analog is the official Worldeditor's internal serialization, which stores maps as binary resources.

### Official Worldeditor (VB6)

The official editor stores maps in a proprietary binary format tied to the original server's resource database. Key characteristics:

- **Layers**: Floors, walls, blocks, NPCs, exits, triggers — each stored as a separate array
- **Blocking**: A `block` array (1=blocked, 0=free) that mirrors the tile grid
- **Triggers**: Coordinate-to-callback mapping, similar to OpenAO's `specials.json`
- **No JSON export**: Maps are serialized to binary resource files; no text-based interchange

### lambdaclass/argentum

A modern web client using Pixi.js for rendering. It loads maps from the same binary format as the official client but does not provide editing capabilities.

### ao-libre/ao-cliente

Community client fork. Reads the same binary map format. No editor functionality.

## Key Findings

### 1. Format Compatibility

None of the surveyed projects use a JSON map format compatible with OpenAO's `meta`/`terrain`/`npcs`/`specials` split. The official Worldeditor uses a binary format, and the web clients are read-only.

### 2. Editing in Existing Tools

- **Official Worldeditor**: Full editing capability (desktop, VB6). Supports layers, blocking, triggers, NPC placement. No live/collaborative editing.
- **Web clients**: Read-only. No editing, no live changes.
- **No project has attempted collaborative or live in-browser editing** — confirming the hypothesis that this is unexplored territory.

### 3. Import/Export Tools

No existing tool provides import/export between formats. The official Worldeditor's binary format is undocumented, making reverse-engineering difficult.

### 4. License Implications

| Project | License | Reuse Impact |
|---------|---------|-------------|
| Official Worldeditor | AGPL-3.0 | If code is copied, the entire project must be released under AGPL-3.0. Ideas/concepts are safe. |
| lambdaclass/argentum | MIT | Free to reuse code with attribution. |
| ao-libre/ao-cliente | GPL | Same copyleft as AGPL. |
| OpenAO | MIT | Compatible with MIT, incompatible with AGPL/GPL if code is shared. |

### 5. Known Limitations from Other Projects

- **Worldeditor**: No version control integration, no collaboration, no undo history
- **Binary format**: No schema validation, hard to extend, no diff/merge support
- **No web-based editing**: No project has solved the problem of map editing in a browser
- **No live reloading**: All editors require server restart to apply changes

## Recommendations

1. **Import from official Worldeditor**: Not recommended in the short term. The binary format is undocumented and the AGPL-3.0 license creates compatibility risk. Consider if community demand is high enough to justify the effort.

2. **Do not copy code from AGPL-3.0 projects**: The official Worldeditor is AGPL-3.0. OpenAO is MIT. Mixing AGPL code into an MIT project forces the entire project to AGPL. Only copy ideas and concepts, not implementation.

3. **JSON format is the right choice**: OpenAO's JSON-based format is correct for web deployment. It enables diff/merge, validation, version control, and client-side editing — none of which the binary format supports.

4. **Live editing is genuinely novel**: No existing project has attempted collaborative or live in-browser map editing. This validates the core hypothesis of the construction mode.

5. **Consider a future import tool**: A one-time import tool from the Worldeditor's binary format would be valuable for community adoption. This should be a separate project due to the AGPL-3.0 implications.

## Deliverables Checklist

- [x] Comparison table of map formats
- [x] What can be reused and under what license
- [x] Explicit recommendation on import support
- [x] List of known limitations from other projects
