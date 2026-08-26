# feat(world-builder): register uploaded graphics and extend palette schemas (#6)

## Summary
Resolves #6 by providing `paletteEntrySchema` and `validatePaletteEntry` to validate multi-layer palette definitions, enforce non-colliding graphic index allocations (`UPLOADED_GRAPHIC_INDEX_START = 1_000_000`), and verify graphic existence across engine and uploaded assets.

### Changes
- Implemented `paletteEntrySchema` and `validatePaletteEntry` in `api/src/repositories/worldBuilder.ts`.
- Added unit tests in `api/src/repositories/__tests__/paletteValidation.test.ts`.

Closes #6
