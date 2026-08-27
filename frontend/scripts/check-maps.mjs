// Fail the build loudly when the optimized world maps are missing.
//
// The maps in public/maps_optimized/ are NOT in git (see frontend/.gitignore):
// they are generated from server/mapas_source/ with the server's
// `export-frontend-maps` script. Without them the client gets 404s on
// /maps_optimized/mapa_*.json and the world does not render.
//
// The Docker build generates them automatically (see frontend/Dockerfile).
// For local builds this check explains what to run instead of shipping a
// broken bundle.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const MAPS_DIR = path.resolve(process.cwd(), "public/maps_optimized");
const SOURCE_DIR = path.resolve(process.cwd(), "../server/mapas_source");
const MAP_FILE_PATTERN = /^mapa_(\d+)\.json$/i;
const MAP_DIR_PATTERN = /^mapa_(\d+)$/i;

function fail(message) {
    console.error(
        [
            "",
            `✗ ${message}`,
            "",
            "  Sin ellos el mundo no se dibuja (404 en /maps_optimized/mapa_*.json).",
            "  No están en git: se generan desde server/mapas_source/. Corré:",
            "",
            "      cd server",
            "      pnpm install",
            "      pnpm export-frontend-maps",
            "",
            "  y después volvés a correr el build.",
            "  (El build de Docker hace este paso solo; ver frontend/Dockerfile.)",
            "",
        ].join("\n"),
    );
    process.exit(1);
}

if (!existsSync(MAPS_DIR)) {
    fail("Faltan los mapas optimizados: public/maps_optimized/ no existe.");
}

const mapFiles = readdirSync(MAPS_DIR).filter((entry) => MAP_FILE_PATTERN.test(entry));

if (mapFiles.length === 0) {
    fail("Faltan los mapas optimizados: public/maps_optimized/ está vacío.");
}

// If the map sources are available (normal repo checkout), also verify the
// export is COMPLETE: an interrupted export that produced only a few maps
// would still 404 for most of the world.
if (existsSync(SOURCE_DIR)) {
    const expectedIds = readdirSync(SOURCE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && MAP_DIR_PATTERN.test(entry.name))
        .map((entry) => entry.name.match(MAP_DIR_PATTERN)[1]);

    const presentIds = new Set(
        mapFiles.map((file) => file.match(MAP_FILE_PATTERN)[1]),
    );

    const missingIds = expectedIds.filter((id) => !presentIds.has(id));

    if (missingIds.length > 0) {
        fail(
            `Mapas incompletos: faltan ${missingIds.length} de ${expectedIds.length} ` +
                `(ej: mapa_${missingIds[0]}.json).`,
        );
    }

    console.log(
        `✓ Mapas optimizados completos: ${mapFiles.length}/${expectedIds.length} archivos en public/maps_optimized`,
    );
} else {
    console.log(
        `✓ Mapas optimizados presentes: ${mapFiles.length} archivos en public/maps_optimized ` +
            "(no se pudo verificar completitud: server/mapas_source no está disponible)",
    );
}
