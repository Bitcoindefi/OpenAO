# Research: How Other Argentum Online Projects Edit Maps

## Overview

This document summarizes how the main Argentum Online ecosystem projects handle map editing.  
The goal is to avoid repeating mistakes, understand design decisions, and justify the implementation choices for the **construction mode** we are adding to this repository.

| Project | Repository | Type | Primary Language / Stack | License |
|---------|------------|------|--------------------------|---------|
| **Official World Editor** | https://github.com/ao-org/argentum-online-worldeditor | Desktop map editor (VB6) | Visual Basic 6 (Win32) | **AGPL‑3.0** |
| **Lambdaclass Argentum** | https://github.com/lambdaclass/argentum | Web client (viewer + limited editor) | Vite + TypeScript + React + Pixi.js | **MIT** |
| **AO‑Libre Client** | https://github.com/ao-libre/ao-cliente | Community client (includes map viewer) | JavaScript (Node/Electron) | **GPL‑3.0** |

---

## 1. Map Formats Used

| Project | Map File(s) | Format Description | Compatibility with our format (`meta` / `terrain` / `npcs` / `specials`) |
|---------|-------------|--------------------|--------------------------------------------------------------------------|
| **Official World Editor** | `*.map` (binary) and `*.inf` (metadata) | Proprietary binary format used by the original Argentum server. The binary stores a 2‑D grid of tiles, each tile containing: <br>• Terrain ID (0‑255) <br>• Block flag (walkable / blocked) <br>• Trigger ID (optional) <br>• Layer flags (ground, object, overlay) <br>Metadata (`*.inf`) holds NPC spawns, special objects, and map‑level properties (pvp, safe zone, etc.). | The binary can be mapped to our four logical layers: <br>• **meta** → map‑level properties from `.inf` <br>• **terrain** → ground tiles (layer 0) <br>• **npcs** → NPC entries in `.inf` <br>• **specials** → objects/triggers stored in higher layers. Conversion requires a custom parser, but the concepts line up. |
| **Lambdaclass Argentum** | `*.json` (exported from the web editor) | JSON representation mirroring the server’s binary format: <br>