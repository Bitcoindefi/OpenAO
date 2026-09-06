/**
 * CLI: import / export / validate classic WorldEditor maps against mapas_source.
 *
 * Usage:
 *   tsx src/scripts/worldEditorMapImportExport.ts import --map-id=1 --classic-dir=./classic --output-dir=./mapas_source
 *   tsx src/scripts/worldEditorMapImportExport.ts export --map-id=1 --source-dir=./mapas_source --classic-dir=./classic-out
 *   tsx src/scripts/worldEditorMapImportExport.ts validate --map-id=1 --source-dir=./mapas_source
 */

import fs from "node:fs";
import path from "node:path";
import {
    exportClassicWorldEditorMap,
    importClassicWorldEditorMap,
    openAoSourceFromMapasDir,
    validateRoundTrip,
    type EditableSpecials,
    type EditableTerrain,
    type MapMetadata,
    type NpcPlacement,
} from "../lib/worldEditorMapConverter";

type Command = "import" | "export" | "validate";

function parseArgs(argv: string[]) {
    const command = argv[0] as Command | undefined;
    let mapId = 0;
    let classicDir = "";
    let sourceDir = path.resolve(__dirname, "../../mapas_source");
    let outputDir = sourceDir;
    let pretty = false;

    for (const arg of argv.slice(1)) {
        if (arg.startsWith("--map-id=")) {
            mapId = Number.parseInt(arg.slice("--map-id=".length), 10);
            continue;
        }
        if (arg.startsWith("--classic-dir=")) {
            classicDir = path.resolve(process.cwd(), arg.slice("--classic-dir=".length));
            continue;
        }
        if (arg.startsWith("--source-dir=")) {
            sourceDir = path.resolve(process.cwd(), arg.slice("--source-dir=".length));
            continue;
        }
        if (arg.startsWith("--output-dir=")) {
            outputDir = path.resolve(process.cwd(), arg.slice("--output-dir=".length));
            continue;
        }
        if (arg === "--pretty") {
            pretty = true;
        }
    }

    return { command, mapId, classicDir, sourceDir, outputDir, pretty };
}

function readJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown, pretty: boolean): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, pretty ? `${JSON.stringify(value, null, 4)}\n` : `${JSON.stringify(value)}\n`, "utf8");
}

function classicPaths(classicDir: string, mapId: number) {
    return {
        map: path.join(classicDir, `mapa${mapId}.map`),
        inf: path.join(classicDir, `mapa${mapId}.inf`),
        dat: path.join(classicDir, `mapa${mapId}.dat`),
    };
}

function loadSource(sourceDir: string, mapId: number) {
    const mapDir = path.join(sourceDir, `mapa_${mapId}`);
    const meta = readJson<MapMetadata>(path.join(mapDir, "meta.json"));
    const terrain = readJson<EditableTerrain>(path.join(mapDir, "terrain.json"));
    const specials = readJson<EditableSpecials>(path.join(mapDir, "specials.json"));
    const npcsPath = path.join(mapDir, "npcs.json");
    const npcs = fs.existsSync(npcsPath) ? readJson<NpcPlacement[]>(npcsPath) : undefined;
    return openAoSourceFromMapasDir({ meta, terrain, specials, npcs });
}

function printReport(label: string, report: {
    totalTiles: number;
    blockedTiles: number;
    layerCounts: Record<string, number>;
    triggersTranslated: number;
    exitsTranslated: number;
    npcsTranslated: number;
    objectsTranslated: number;
    warnings: string[];
    untranslated: string[];
}): void {
    console.log(`\n[${label}] tiles=${report.totalTiles} blocked=${report.blockedTiles}`);
    console.log(
        `  layers L1=${report.layerCounts.layer1} L2=${report.layerCounts.layer2} L3=${report.layerCounts.layer3} L4=${report.layerCounts.layer4}`,
    );
    console.log(
        `  triggers=${report.triggersTranslated} exits=${report.exitsTranslated} npcs=${report.npcsTranslated} objects=${report.objectsTranslated}`,
    );
    if (report.untranslated.length) {
        console.log("  untranslated:");
        for (const item of report.untranslated) {
            console.log(`    - ${item}`);
        }
    }
    if (report.warnings.length) {
        console.log("  warnings:");
        for (const item of report.warnings) {
            console.log(`    - ${item}`);
        }
    }
}

function runImport(mapId: number, classicDir: string, outputDir: string, pretty: boolean): void {
    const paths = classicPaths(classicDir, mapId);
    if (!fs.existsSync(paths.map)) {
        throw new Error(`Missing classic file: ${paths.map}`);
    }

    const files = {
        map: new Uint8Array(fs.readFileSync(paths.map)),
        inf: fs.existsSync(paths.inf) ? fs.readFileSync(paths.inf, "utf8") : "",
        dat: fs.existsSync(paths.dat) ? fs.readFileSync(paths.dat, "utf8") : "",
    };

    const { source, report } = importClassicWorldEditorMap(files, mapId);
    const mapOut = path.join(outputDir, `mapa_${mapId}`);
    writeJson(path.join(mapOut, "meta.json"), source.meta, pretty);
    writeJson(path.join(mapOut, "terrain.json"), source.terrain, pretty);
    writeJson(path.join(mapOut, "specials.json"), source.specials, pretty);
    writeJson(path.join(mapOut, "npcs.json"), source.npcs, pretty);
    writeJson(path.join(mapOut, "import-report.json"), report, true);
    printReport("import", report);
    console.log(`Wrote playable mapas_source tree at ${mapOut}`);
}

function runExport(mapId: number, sourceDir: string, classicDir: string): void {
    const source = loadSource(sourceDir, mapId);
    const { files, report } = exportClassicWorldEditorMap(source);
    fs.mkdirSync(classicDir, { recursive: true });
    const paths = classicPaths(classicDir, mapId);
    fs.writeFileSync(paths.map, files.map);
    fs.writeFileSync(paths.inf, files.inf, "utf8");
    fs.writeFileSync(paths.dat, files.dat, "utf8");
    printReport("export", report);
    console.log(`Wrote classic files:\n  ${paths.map}\n  ${paths.inf}\n  ${paths.dat}`);
}

function runValidate(mapId: number, sourceDir: string): void {
    const source = loadSource(sourceDir, mapId);
    const result = validateRoundTrip(source);
    printReport("round-trip import", result.report);
    if (result.equivalent) {
        console.log(`\nVALIDATE OK: mapa_${mapId} export->import is equivalent`);
        return;
    }
    console.error(`\nVALIDATE FAIL: ${result.diff.differences.length} difference(s)`);
    for (const diff of result.diff.differences.slice(0, 30)) {
        console.error(`  [${diff.kind}] ${diff.key}: ${JSON.stringify(diff.left)} -> ${JSON.stringify(diff.right)}`);
    }
    process.exitCode = 1;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    if (!args.command || !["import", "export", "validate"].includes(args.command)) {
        throw new Error("Usage: worldEditorMapImportExport.ts <import|export|validate> --map-id=N ...");
    }
    if (!Number.isInteger(args.mapId) || args.mapId <= 0) {
        throw new Error("--map-id must be a positive integer");
    }

    if (args.command === "import") {
        if (!args.classicDir) {
            throw new Error("import requires --classic-dir=");
        }
        runImport(args.mapId, args.classicDir, args.outputDir, args.pretty);
        return;
    }

    if (args.command === "export") {
        if (!args.classicDir) {
            throw new Error("export requires --classic-dir=");
        }
        runExport(args.mapId, args.sourceDir, args.classicDir);
        return;
    }

    runValidate(args.mapId, args.sourceDir);
}

main();
