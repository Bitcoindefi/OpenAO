# WorldEditor map import / export (issue #23)

Clean-room converter between classic WorldEditor formats (.map / .inf / .dat) and OpenAO playable mapas_source (meta.json, terrain.json, specials.json, npcs.json).

## License / AGPL-3.0

Official editor: https://github.com/ao-org/argentum-online-worldeditor (AGPL-3.0).

- Reading/writing file formats for interoperability is allowed.
- This module does not copy VB6 WorldEditor source; it is original TypeScript from public binary/INI layouts and OpenAO schema.
- Do not vendor WorldEditor code or resources.

## Format summary (classic Int16 layout)

### .map
1. Int16LE version (typically 1)
2. For each tile y=1..100, x=1..100: Uint8 flags (0x01 blocked, 0x02/0x04/0x08 layers 2-4, 0x10 trigger), Int16LE layer1, optional Int16LE extras.

Extended nextgen headers (particles/lights) are reported as untranslated.

### .inf
- [X-Y] exits -> specials.exits
- [NPCn] -> specials.npcs + npcs.json
- [OBJn] -> specials.objects

### .dat
[MAPAn] metadata -> meta.json. Unknown keys are listed in the conversion report.


## CLI

From server/:

    tsx src/scripts/worldEditorMapImportExport.ts export --map-id=1 --source-dir=./mapas_source --classic-dir=/tmp/classic-out
    tsx src/scripts/worldEditorMapImportExport.ts import --map-id=1 --classic-dir=/tmp/classic-out --output-dir=/tmp/mapas_imported --pretty
    tsx src/scripts/worldEditorMapImportExport.ts validate --map-id=1 --source-dir=./mapas_source

## Tests

    node --experimental-strip-types --test src/tests/worldEditorMapConverter.test.ts
