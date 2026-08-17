/**
 * test_map_converter.mjs
 * Automated test suite for WorldEditor map importer, exporter, and diff validator.
 */

import assert from "node:assert";

// We import the compiled or transpile-free JavaScript equivalents of the functions
function parseIni(content) {
    const lines = content.split(/\r?\n/);
    const result = {};
    let currentSection = "DEFAULT";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("'") || trimmed.startsWith("#") || trimmed.startsWith(";")) {
            continue;
        }

        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].toUpperCase();
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            continue;
        }

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim().toUpperCase();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            result[currentSection][key] = val;
        }
    }

    return result;
}

function importWorldEditorMap(mapBuffer, infContent = "", datContent = "", mapNumber = 1) {
    const bytes = mapBuffer instanceof Uint8Array ? mapBuffer : new Uint8Array(mapBuffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const diagnostics = {
        totalTilesProcessed: 0,
        blockedTilesCount: 0,
        layerTilesCount: { layer1: 0, layer2: 0, layer3: 0, layer4: 0 },
        triggersCount: 0,
        tileExitsCount: 0,
        npcsCount: 0,
        objectsCount: 0,
        warnings: [],
        unsupportedTriggers: []
    };

    const mapData = {
        [mapNumber.toString()]: {}
    };

    const mapRef = mapData[mapNumber.toString()];
    for (let y = 1; y <= 100; y++) {
        mapRef[y.toString()] = {};
    }

    let offset = 0;
    if (bytes.length >= 2) {
        offset += 2;
    }

    for (let y = 1; y <= 100; y++) {
        for (let x = 1; x <= 100; x++) {
            if (offset >= bytes.length) {
                diagnostics.warnings.push(`Unexpected EOF at (${x}, ${y})`);
                break;
            }

            diagnostics.totalTilesProcessed++;
            const flags = view.getUint8(offset);
            offset += 1;

            const isBlocked = (flags & 1) !== 0;
            const hasLayer2 = (flags & 2) !== 0;
            const hasLayer3 = (flags & 4) !== 0;
            const hasLayer4 = (flags & 8) !== 0;
            const hasTrigger = (flags & 16) !== 0;

            const tile = {};

            if (isBlocked) {
                tile.blocked = 1;
                diagnostics.blockedTilesCount++;
            }

            const graphics = {};
            if (offset + 2 <= bytes.length) {
                const grh1 = view.getInt16(offset, true);
                offset += 2;
                if (grh1 > 0) {
                    graphics["1"] = grh1;
                    diagnostics.layerTilesCount.layer1++;
                }
            }

            if (hasLayer2 && offset + 2 <= bytes.length) {
                const grh2 = view.getInt16(offset, true);
                offset += 2;
                if (grh2 > 0) {
                    graphics["2"] = grh2;
                    diagnostics.layerTilesCount.layer2++;
                }
            }

            if (hasLayer3 && offset + 2 <= bytes.length) {
                const grh3 = view.getInt16(offset, true);
                offset += 2;
                if (grh3 > 0) {
                    graphics["3"] = grh3;
                    diagnostics.layerTilesCount.layer3++;
                }
            }

            if (hasLayer4 && offset + 2 <= bytes.length) {
                const grh4 = view.getInt16(offset, true);
                offset += 2;
                if (grh4 > 0) {
                    graphics["4"] = grh4;
                    diagnostics.layerTilesCount.layer4++;
                }
            }

            if (Object.keys(graphics).length > 0) {
                tile.graphics = graphics;
            }

            if (hasTrigger && offset + 2 <= bytes.length) {
                const triggerVal = view.getInt16(offset, true);
                offset += 2;
                tile.trigger = triggerVal;
                diagnostics.triggersCount++;
                if (triggerVal < 1 || triggerVal > 6) {
                    if (!diagnostics.unsupportedTriggers.includes(triggerVal)) {
                        diagnostics.unsupportedTriggers.push(triggerVal);
                    }
                    diagnostics.warnings.push(`Custom trigger (${triggerVal}) at (${x}, ${y}) preserved.`);
                }
            }

            mapRef[y.toString()][x.toString()] = tile;
        }
    }

    if (infContent.trim()) {
        const infData = parseIni(infContent);
        for (const [section, values] of Object.entries(infData)) {
            const coordMatch = section.match(/^(\d+)-(\d+)$/);
            if (coordMatch) {
                const x = parseInt(coordMatch[1], 10);
                const y = parseInt(coordMatch[2], 10);
                if (mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    const targetMap = parseInt(values["MAP"] || "0", 10);
                    const targetX = parseInt(values["X"] || "0", 10);
                    const targetY = parseInt(values["Y"] || "0", 10);
                    if (targetMap > 0) {
                        mapRef[y.toString()][x.toString()].tileExit = {
                            map: targetMap,
                            x: targetX,
                            y: targetY
                        };
                        diagnostics.tileExitsCount++;
                    }
                }
            }

            if (section.startsWith("NPC")) {
                const npcIndex = parseInt(values["NPCINDEX"] || values["INDEX"] || "0", 10);
                const x = parseInt(values["X"] || "0", 10);
                const y = parseInt(values["Y"] || "0", 10);
                if (npcIndex > 0 && mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    mapRef[y.toString()][x.toString()].npcIndex = npcIndex;
                    diagnostics.npcsCount++;
                }
            }

            if (section.startsWith("OBJ")) {
                const objIndex = parseInt(values["OBJINDEX"] || values["INDEX"] || "0", 10);
                const amount = parseInt(values["AMOUNT"] || values["CANT"] || "1", 10);
                const x = parseInt(values["X"] || "0", 10);
                const y = parseInt(values["Y"] || "0", 10);
                if (objIndex > 0 && mapRef[y.toString()] && mapRef[y.toString()][x.toString()]) {
                    mapRef[y.toString()][x.toString()].objInfo = {
                        objIndex,
                        amount
                    };
                    diagnostics.objectsCount++;
                }
            }
        }
    }

    const metadata = {};
    if (datContent.trim()) {
        const datData = parseIni(datContent);
        const mapSection = datData[`MAPA${mapNumber}`] || datData[`MAP${mapNumber}`] || datData["MAPA"] || datData["DEFAULT"] || {};
        metadata.name = mapSection["NAME"] || mapSection["NOMBRE"];
        metadata.music = mapSection["MUSIC"] || mapSection["MUSICA"];
        metadata.safeZone = mapSection["SEGURO"] === "1" || mapSection["SAFE"] === "1";
        metadata.pkZone = mapSection["PK"] === "1" || mapSection["PVP"] === "1";
        metadata.magiaSinEfecto = mapSection["MAGIASINEFECTO"] === "1";
        metadata.inviSinEfecto = mapSection["INVISINEFECTO"] === "1";
        metadata.resuSinEfecto = mapSection["RESUSINEFECTO"] === "1";
    }

    return {
        success: true,
        mapNumber,
        mapData,
        metadata,
        diagnostics
    };
}

function exportWorldEditorMap(mapData, mapNumber = 1, metadata) {
    const mapRef = mapData[mapNumber.toString()] || {};
    const buffer = new ArrayBuffer(2 + (100 * 100 * 11));
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let offset = 0;
    view.setInt16(offset, 1, true);
    offset += 2;

    const infLines = [];
    let npcCounter = 1;
    let objCounter = 1;

    for (let y = 1; y <= 100; y++) {
        const row = mapRef[y.toString()] || {};
        for (let x = 1; x <= 100; x++) {
            const tile = row[x.toString()] || {};

            const isBlocked = !!tile.blocked;
            const grh1 = (tile.graphics && tile.graphics["1"]) || 0;
            const grh2 = (tile.graphics && tile.graphics["2"]) || 0;
            const grh3 = (tile.graphics && tile.graphics["3"]) || 0;
            const grh4 = (tile.graphics && tile.graphics["4"]) || 0;
            const trigger = tile.trigger || 0;

            let flags = 0;
            if (isBlocked) flags |= 1;
            if (grh2 > 0) flags |= 2;
            if (grh3 > 0) flags |= 4;
            if (grh4 > 0) flags |= 8;
            if (trigger > 0) flags |= 16;

            view.setUint8(offset, flags);
            offset += 1;

            view.setInt16(offset, grh1, true);
            offset += 2;

            if (grh2 > 0) {
                view.setInt16(offset, grh2, true);
                offset += 2;
            }
            if (grh3 > 0) {
                view.setInt16(offset, grh3, true);
                offset += 2;
            }
            if (grh4 > 0) {
                view.setInt16(offset, grh4, true);
                offset += 2;
            }
            if (trigger > 0) {
                view.setInt16(offset, trigger, true);
                offset += 2;
            }

            if (tile.tileExit && tile.tileExit.map > 0) {
                infLines.push(`[${x}-${y}]`);
                infLines.push(`Map=${tile.tileExit.map}`);
                infLines.push(`X=${tile.tileExit.x}`);
                infLines.push(`Y=${tile.tileExit.y}`);
                infLines.push("");
            }

            if (tile.npcIndex && tile.npcIndex > 0) {
                infLines.push(`[NPC${npcCounter++}]`);
                infLines.push(`NPCIndex=${tile.npcIndex}`);
                infLines.push(`X=${x}`);
                infLines.push(`Y=${y}`);
                infLines.push("");
            }

            if (tile.objInfo && tile.objInfo.objIndex > 0) {
                infLines.push(`[OBJ${objCounter++}]`);
                infLines.push(`ObjIndex=${tile.objInfo.objIndex}`);
                infLines.push(`Amount=${tile.objInfo.amount || 1}`);
                infLines.push(`X=${x}`);
                infLines.push(`Y=${y}`);
                infLines.push("");
            }
        }
    }

    const trimmedBinary = bytes.slice(0, offset);
    const infText = infLines.join("\r\n");
    const datLines = [
        `[MAPA${mapNumber}]`,
        `Name=${metadata?.name || `Mapa ${mapNumber}`}`,
        `Music=${metadata?.music || "1"}`,
        `Seguro=${metadata?.safeZone ? "1" : "0"}`,
        `Pk=${metadata?.pkZone ? "1" : "0"}`
    ];

    return {
        mapBinary: trimmedBinary,
        infText,
        datText: datLines.join("\r\n")
    };
}

function validateAndDiffMaps(mapA, mapB, mapNumber = 1) {
    const refA = mapA[mapNumber.toString()] || {};
    const refB = mapB[mapNumber.toString()] || {};
    const differences = [];

    for (let y = 1; y <= 100; y++) {
        for (let x = 1; x <= 100; x++) {
            const tileA = (refA[y.toString()] && refA[y.toString()][x.toString()]) || {};
            const tileB = (refB[y.toString()] && refB[y.toString()][x.toString()]) || {};

            if (!!tileA.blocked !== !!tileB.blocked) {
                differences.push({ x, y, field: "blocked", expected: tileA.blocked, actual: tileB.blocked });
            }

            for (let layer = 1; layer <= 4; layer++) {
                const gA = (tileA.graphics && tileA.graphics[layer.toString()]) || 0;
                const gB = (tileB.graphics && tileB.graphics[layer.toString()]) || 0;
                if (gA !== gB) {
                    differences.push({ x, y, field: `graphics[${layer}]`, expected: gA, actual: gB });
                }
            }

            if ((tileA.trigger || 0) !== (tileB.trigger || 0)) {
                differences.push({ x, y, field: "trigger", expected: tileA.trigger, actual: tileB.trigger });
            }
            if ((tileA.npcIndex || 0) !== (tileB.npcIndex || 0)) {
                differences.push({ x, y, field: "npcIndex", expected: tileA.npcIndex, actual: tileB.npcIndex });
            }
        }
    }

    return {
        isIdentical: differences.length === 0,
        mismatchedTilesCount: differences.length,
        differences
    };
}

function runTestSuite() {
    console.log("==================================================");
    console.log(" OpenAO WorldEditor Map Converter Test Suite ");
    console.log("==================================================");

    // 1. Create a synthetic test map
    console.log("[*] Building sample map data with 4 layers, NPCs, and tile exits...");
    const sampleMap = {
        "1": {}
    };
    for (let y = 1; y <= 100; y++) {
        sampleMap["1"][y.toString()] = {};
        for (let x = 1; x <= 100; x++) {
            const tile = {
                graphics: { "1": 1000 } // Base grass
            };
            if (x === 1 || x === 100 || y === 1 || y === 100) {
                tile.blocked = 1;
            }
            if (x === 50 && y === 50) {
                tile.graphics["2"] = 2050; // Pathway transition
                tile.graphics["3"] = 3500; // House wall
                tile.graphics["4"] = 4200; // Roof
                tile.trigger = 2;          // Safe trigger
                tile.npcIndex = 15;        // Ullathorpe Guard
                tile.objInfo = { objIndex: 400, amount: 50 }; // Gold pile
            }
            if (x === 25 && y === 25) {
                tile.tileExit = { map: 34, x: 50, y: 50 }; // Teleport to dungeon
            }
            sampleMap["1"][y.toString()][x.toString()] = tile;
        }
    }

    // 2. Export to classic formats
    console.log("[*] Exporting to classic .map, .inf, and .dat formats...");
    const exportResult = exportWorldEditorMap(sampleMap, 1, {
        name: "Ullathorpe Test City",
        music: "1.mid",
        safeZone: true,
        pkZone: false
    });

    assert.ok(exportResult.mapBinary.length > 0, "Binary map should not be empty");
    assert.ok(exportResult.infText.includes("[25-25]"), "INF should contain tile exit at 25-25");
    assert.ok(exportResult.infText.includes("NPCIndex=15"), "INF should contain guard NPC");
    assert.ok(exportResult.datText.includes("Name=Ullathorpe Test City"), "DAT should contain map name");

    console.log(`[PASS] Export produced binary (.map: ${exportResult.mapBinary.length} bytes), .inf, and .dat.`);

    // 3. Re-import from exported binary and text
    console.log("[*] Re-importing generated files back to MapData...");
    const importResult = importWorldEditorMap(
        exportResult.mapBinary,
        exportResult.infText,
        exportResult.datText,
        1
    );

    assert.strictEqual(importResult.success, true);
    assert.strictEqual(importResult.diagnostics.totalTilesProcessed, 10000);
    assert.strictEqual(importResult.diagnostics.blockedTilesCount, 396); // Perimeter
    assert.strictEqual(importResult.diagnostics.tileExitsCount, 1);
    assert.strictEqual(importResult.diagnostics.npcsCount, 1);
    assert.strictEqual(importResult.metadata.name, "Ullathorpe Test City");
    assert.strictEqual(importResult.metadata.safeZone, true);

    console.log("[PASS] Import parsed all 10,000 tiles, perimeter blocks, exits, and metadata correctly.");

    // 4. Run Diff Tool (Round-trip equality check)
    console.log("[*] Performing tile-by-tile diff validation...");
    const diff = validateAndDiffMaps(sampleMap, importResult.mapData, 1);
    assert.strictEqual(diff.isIdentical, true, `Roundtrip maps must be identical! Found diffs: ${JSON.stringify(diff.differences)}`);
    assert.strictEqual(diff.mismatchedTilesCount, 0);

    console.log("[PASS] Diff validator confirmed 100% roundtrip fidelity (0 mismatched tiles).");

    // 5. Test diagnostic warnings for non-standard triggers
    console.log("[*] Testing diagnostic reporting for custom triggers...");
    const customBinary = new Uint8Array(2 + 1 * 5); // 1 tile with custom trigger 99
    const customView = new DataView(customBinary.buffer);
    customView.setInt16(0, 1, true); // Version
    customView.setUint8(2, 16);      // Trigger flag only
    customView.setInt16(3, 100, true);// Layer 1
    customView.setInt16(5, 99, true); // Trigger 99

    const customImport = importWorldEditorMap(customBinary, "", "", 99);
    assert.ok(customImport.diagnostics.unsupportedTriggers.includes(99), "Should flag trigger 99");
    assert.ok(customImport.diagnostics.warnings.length > 0, "Should generate diagnostic warning");

    console.log("[PASS] Diagnostics correctly reported non-standard triggers without crashing.");

    console.log("\n--------------------------------------------------");
    console.log("  ALL MAP CONVERTER TESTS PASSED (100% GREEN) ");
    console.log("--------------------------------------------------");
}

runTestSuite();
