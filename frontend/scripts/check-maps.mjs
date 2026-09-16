import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontendDir = fileURLToPath(new URL("../", import.meta.url));
const recovery = "Run `pnpm --dir server install --frozen-lockfile` and " +
    "`pnpm --dir server export-frontend-maps` from the repository root.";

export function checkMaps(sourceDir, outputDir) {
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Map sources are missing: ${sourceDir}. Use a complete repository checkout. ${recovery}`);
    }

    const mapNames = fs.readdirSync(sourceDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^mapa_\d+$/.test(entry.name))
        .map((entry) => `${entry.name}.json`);
    if (mapNames.length === 0) {
        throw new Error(`No map sources found in ${sourceDir}. ${recovery}`);
    }

    const missing = mapNames.filter((name) => {
        const stat = fs.statSync(path.join(outputDir, name), { throwIfNoEntry: false });
        return !stat?.isFile() || stat.size === 0;
    });
    if (missing.length > 0) {
        throw new Error(`Missing or empty optimized maps (${missing.length}): ${missing.slice(0, 5).join(", ")}. ${recovery}`);
    }
    return mapNames.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        const count = checkMaps(
            path.resolve(frontendDir, "../server/mapas_source"),
            path.join(frontendDir, "public/maps_optimized"),
        );
        console.log(`Verified ${count} optimized maps.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
