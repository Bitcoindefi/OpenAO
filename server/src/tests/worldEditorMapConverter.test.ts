import assert from "node:assert/strict";
import test from "node:test";
import {
    CLASSIC_MAP_VERSION,
    diffOpenAoMaps,
    exportClassicWorldEditorMap,
    importClassicWorldEditorMap,
    openAoSourceFromMapasDir,
    validateRoundTrip,
    type OpenAoMapSource,
} from "../lib/worldEditorMapConverter";

function buildSampleSource(): OpenAoMapSource {
    const rows: number[][] = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => 0));
    for (let i = 0; i < 100; i++) {
        rows[0][i] = 1;
        rows[99][i] = 1;
        rows[i][0] = 1;
        rows[i][99] = 1;
    }
    rows[10][10] = 2;
    rows[11][12] = 3;
    rows[20][20] = 4;

    return openAoSourceFromMapasDir({
        meta: {
            id: 42,
            name: "Fixture Map",
            musicNum: 4,
            magiaSinEfecto: 0,
            noEncriptarMp: 0,
            terreno: "BOSQUE",
            zona: "CIUDAD",
            restringir: "No",
            minLevel: 0,
            maxLevel: 0,
            backup: 1,
            pk: 1,
        },
        terrain: {
            id: 42,
            width: 100,
            height: 100,
            palette: {
                "1": { graphics: 5500, blocked: true },
                "2": { graphics: [5500, 581], blocked: true },
                "3": { graphics: [5500, null, 4894] },
                "4": { graphics: [100, 200, 300, 400], blocked: true },
            },
            rows,
        },
        specials: {
            id: 42,
            exits: {
                "9,7": { map: 5, x: 9, y: 93 },
                "50,50": { map: 1, x: 10, y: 10 },
            },
            objects: {
                "15,12": { objIndex: 148, amount: 1 },
            },
            npcs: {
                "73,16": 536,
                "27,34": 8,
            },
            triggers: {
                "29,21": 5,
                "40,40": 99,
            },
        },
    });
}

test("export produces classic map/inf/dat and import restores playable mapas_source", () => {
    const original = buildSampleSource();
    const { files, report: exportReport } = exportClassicWorldEditorMap(original);

    assert.equal(files.map.byteLength > 2, true);
    assert.equal(new DataView(files.map.buffer, files.map.byteOffset, 2).getInt16(0, true), CLASSIC_MAP_VERSION);
    assert.match(files.inf, /\[9-7\]/);
    assert.match(files.inf, /NPCIndex=536/);
    assert.match(files.inf, /ObjIndex=148/);
    assert.match(files.dat, /\[MAPA42\]/);
    assert.match(files.dat, /Name=Fixture Map/);
    assert.equal(exportReport.exitsTranslated, 2);
    assert.equal(exportReport.npcsTranslated, 2);
    assert.equal(exportReport.objectsTranslated, 1);

    const { source, report } = importClassicWorldEditorMap(files, 42);
    assert.equal(source.meta.name, "Fixture Map");
    assert.equal(source.meta.musicNum, 4);
    assert.equal(source.meta.pk, 1);
    assert.equal(source.terrain.width, 100);
    assert.equal(source.terrain.height, 100);
    assert.equal(source.specials.exits["9,7"]?.map, 5);
    assert.equal(source.specials.npcs["73,16"], 536);
    assert.equal(source.specials.objects["15,12"]?.objIndex, 148);
    assert.equal(source.specials.triggers["40,40"], 99);
    assert.equal(source.npcs.some((npc) => npc.x === 73 && npc.y === 16 && npc.npcIndex === 536), true);
    assert.equal(report.totalTiles, 10000);
    assert.ok(report.untranslated.some((item) => item.includes("Trigger 99")));
    assert.ok(report.warnings.some((item) => item.includes("Graphic indices")));

    const diff = diffOpenAoMaps(original, source);
    assert.equal(diff.equivalent, true, JSON.stringify(diff.differences.slice(0, 5)));
});

test("validateRoundTrip reports equivalence for sample map", () => {
    const result = validateRoundTrip(buildSampleSource());
    assert.equal(result.equivalent, true, JSON.stringify(result.diff.differences.slice(0, 5)));
});

test("import reports diagnostics for unsupported dat keys without dropping map body", () => {
    const original = buildSampleSource();
    const { files } = exportClassicWorldEditorMap(original);
    files.dat += "InviSinEfecto=1\r\nResuSinEfecto=1\r\n";

    const { source, report } = importClassicWorldEditorMap(files, 42);
    assert.equal(source.terrain.rows.length, 100);
    assert.ok(report.untranslated.some((item) => item.includes("INVISINEFECTO")));
    assert.ok(report.untranslated.some((item) => item.includes("RESUSINEFECTO")));
});

test("round-trip preserves multi-layer graphics including null holes", () => {
    const original = buildSampleSource();
    const { files } = exportClassicWorldEditorMap(original);
    const { source } = importClassicWorldEditorMap(files, 42);

    const paletteId = source.terrain.rows[11][12];
    const tile = source.terrain.palette[String(paletteId)];
    assert.ok(tile);
    assert.deepEqual(tile.graphics, [5500, null, 4894]);
});
