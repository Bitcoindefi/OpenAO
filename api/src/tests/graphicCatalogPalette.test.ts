import assert from "node:assert/strict";
import test from "node:test";
import {
    UPLOADED_GRAPHIC_INDEX_START,
    checkGraphicExists,
    clearEngineGraphicIdCache,
    isReservedUploadedIndex,
    loadEngineGraphicIds,
    uploadedGraphicToEngineEntry,
    validatePaletteGraphics,
} from "../lib/graphicCatalog";

test("UPLOADED_GRAPHIC_INDEX_START is 1_000_000 and reserved helper matches", () => {
    assert.equal(UPLOADED_GRAPHIC_INDEX_START, 1_000_000);
    assert.equal(isReservedUploadedIndex(999_999), false);
    assert.equal(isReservedUploadedIndex(1_000_000), true);
});

test("uploadedGraphicToEngineEntry matches graficos.json static tile shape", () => {
    const entry = uploadedGraphicToEngineEntry({
        grhIndex: 1_000_042,
        width: 32,
        height: 64,
    });
    assert.equal(entry.numFrames, 1);
    assert.equal(entry.numFile, "1000042");
    assert.equal(entry.width, 32);
    assert.equal(entry.height, 64);
    assert.deepEqual(entry.frames, { "1": "1000042" });
    assert.deepEqual(entry.offset, { x: 0, y: 0 });
});

test("loadEngineGraphicIds reads real graficos catalog and stays below reserved range", async () => {
    clearEngineGraphicIdCache();
    const ids = await loadEngineGraphicIds(true);
    assert.ok(ids.size > 1000);
    assert.ok(ids.has(1));
    assert.ok(ids.has(5500));
    assert.equal(ids.has(UPLOADED_GRAPHIC_INDEX_START), false);
    for (const id of ids) {
        assert.ok(id < UPLOADED_GRAPHIC_INDEX_START);
    }
});

test("checkGraphicExists: engine hit, missing engine, uploaded probe", async () => {
    clearEngineGraphicIdCache();
    await loadEngineGraphicIds(true);

    const engine = await checkGraphicExists(5500, async () => false);
    assert.deepEqual(engine, { ok: true, source: "engine" });

    const missing = await checkGraphicExists(999_998, async () => false);
    assert.equal(missing.ok, false);
    if (!missing.ok) {
        assert.match(missing.reason, /catalogo del motor/);
    }

    const uploadedOk = await checkGraphicExists(
        UPLOADED_GRAPHIC_INDEX_START,
        async () => true,
    );
    assert.deepEqual(uploadedOk, { ok: true, source: "uploaded" });

    const uploadedMissing = await checkGraphicExists(
        UPLOADED_GRAPHIC_INDEX_START + 7,
        async () => false,
    );
    assert.equal(uploadedMissing.ok, false);
    if (!uploadedMissing.ok) {
        assert.match(uploadedMissing.reason, /no existe/);
    }
});

test("validatePaletteGraphics requires a non-null layer and rejects ghosts", async () => {
    clearEngineGraphicIdCache();
    await loadEngineGraphicIds(true);

    const empty = await validatePaletteGraphics([null, null], async () => false);
    assert.equal(empty.ok, false);

    const ok = await validatePaletteGraphics(
        [5500, null, 581],
        async () => false,
    );
    assert.equal(ok.ok, true);

    const ghost = await validatePaletteGraphics(
        [UPLOADED_GRAPHIC_INDEX_START + 99],
        async () => false,
    );
    assert.equal(ghost.ok, false);
});
