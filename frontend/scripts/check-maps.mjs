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
const MAP_FILE_PATTERN = /^mapa_\d+\.json$/i;

function fail() {
    console.error(
        [
            "",
            "✗ Faltan los mapas optimizados: public/maps_optimized/ no existe o está vacío.",
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
    fail();
}

const mapCount = readdirSync(MAPS_DIR).filter((entry) => MAP_FILE_PATTERN.test(entry)).length;

if (mapCount === 0) {
    fail();
}

console.log(`✓ Mapas optimizados presentes: ${mapCount} archivos en public/maps_optimized`);
