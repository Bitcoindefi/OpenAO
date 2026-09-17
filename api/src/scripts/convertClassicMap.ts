import fs from "fs";
import path from "path";
import {
    convertClassicToOpenAO,
    convertOpenAOToClassic,
    encodeClassicMapBuffer,
    parseClassicDatText,
    parseClassicInfText,
    parseClassicMapBuffer,
    validateRoundTrip,
} from "../lib/classicMapParser";

function getArg(name: string): string | null {
    const idx = process.argv.findIndex((arg) => arg === `--${name}`);
    if (idx < 0) return null;
    return process.argv[idx + 1] ?? null;
}

async function main(): Promise<void> {
    const mapPath = getArg("map");
    const infPath = getArg("inf");
    const datPath = getArg("dat");
    const outputDir = getArg("out");
    const validateOnly = process.argv.includes("--validate");

    if (!mapPath) {
        console.log("Usage: tsx src/scripts/convertClassicMap.ts --map <path.map> [--inf <path.inf>] [--dat <path.dat>] --out <dir>");
        return;
    }

    const mapBuffer = fs.readFileSync(path.resolve(mapPath));
    const parsedMap = parseClassicMapBuffer(mapBuffer);

    let exits = {};
    let objects = {};
    let npcs = {};
    if (infPath && fs.existsSync(infPath)) {
        const infContent = fs.readFileSync(path.resolve(infPath), "utf8");
        const parsedInf = parseClassicInfText(infContent);
        exits = parsedInf.exits;
        objects = parsedInf.objects;
        npcs = parsedInf.npcs;
    }

    let metadata = {};
    if (datPath && fs.existsSync(datPath)) {
        const datContent = fs.readFileSync(path.resolve(datPath), "utf8");
        metadata = parseClassicDatText(datContent);
    }

    const classicData = {
        header: parsedMap.header,
        tiles: parsedMap.tiles,
        exits,
        objects,
        npcs,
        metadata,
    };

    const { bundle, report } = convertClassicToOpenAO(classicData);

    console.log(`[Import Report] Map ${report.mapId}: Translated ${report.translatedTiles} tiles.`);
    if (report.skippedOrShiftedGraphics.length > 0) {
        console.log(`[Import Report] Shifted Graphics: ${report.skippedOrShiftedGraphics.length}`);
    }
    if (report.unmappedTriggers.length > 0) {
        console.log(`[Import Report] Unmapped Triggers: ${report.unmappedTriggers.length}`);
    }

    const roundTrip = validateRoundTrip(classicData);
    console.log(`[Round-Trip Validation]: ${roundTrip.valid ? "PASSED" : "FAILED"}`);

    if (validateOnly) {
        return;
    }

    if (outputDir) {
        const targetDir = path.resolve(outputDir);
        fs.mkdirSync(targetDir, { recursive: true });

        fs.writeFileSync(path.join(targetDir, "meta.json"), JSON.stringify(bundle.meta, null, 2));
        fs.writeFileSync(path.join(targetDir, "terrain.json"), JSON.stringify(bundle.terrain));
        fs.writeFileSync(path.join(targetDir, "npcs.json"), JSON.stringify(bundle.npcs, null, 2));
        fs.writeFileSync(path.join(targetDir, "specials.json"), JSON.stringify(bundle.specials, null, 2));

        console.log(`[Success] Saved OpenAO map bundle to ${targetDir}`);
    }
}

main().catch((err) => {
    console.error("Error converting map:", err);
    process.exit(1);
});
