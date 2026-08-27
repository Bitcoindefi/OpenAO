import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const mapsDir = resolve(process.cwd(), "public", "maps_optimized");
const requiredSample = join(mapsDir, "mapa_1.json");

if (!existsSync(requiredSample)) {
    console.error(
        [
            "Missing optimized frontend maps.",
            "",
            "Generate them before building the frontend:",
            "  cd ../server",
            "  pnpm install",
            "  pnpm export-frontend-maps",
            "",
            "Docker builds using frontend/docker-compose*.yml generate these maps automatically.",
        ].join("\n"),
    );
    process.exit(1);
}

const mapCount = readdirSync(mapsDir).filter((entry) => /^mapa_\d+\.json$/i.test(entry)).length;

if (mapCount === 0) {
    console.error(`No optimized map JSON files found in ${mapsDir}`);
    process.exit(1);
}

console.log(`Verified ${mapCount} optimized frontend maps.`);
