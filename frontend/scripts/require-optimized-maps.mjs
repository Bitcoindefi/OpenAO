import fs from "node:fs";
import path from "node:path";

const MAPS_DIR = path.resolve(process.cwd(), "public/maps_optimized");
const SAMPLE_NAME = "mapa_1.json";
const MAP_JSON_PATTERN = /^mapa_\d+\.json$/i;

function fail(message) {
    console.error(message);
    process.exit(1);
}

function isOptimizedMapShape(value) {
    return (
        Boolean(value) &&
        typeof value === "object" &&
        typeof value.id === "number" &&
        typeof value.w === "number" &&
        typeof value.h === "number" &&
        Array.isArray(value.d)
    );
}

if (!fs.existsSync(MAPS_DIR) || !fs.statSync(MAPS_DIR).isDirectory()) {
    fail(
        `No está ${MAPS_DIR}. Los mapas optimizados no van en git: generálos con \`cd server && pnpm export-frontend-maps\`. Docker los arma solo al construir la imagen.`,
    );
}

const mapFiles = fs.readdirSync(MAPS_DIR).filter((name) => MAP_JSON_PATTERN.test(name));

if (mapFiles.length === 0) {
    fail(
        `La carpeta ${MAPS_DIR} no tiene ningún mapa_*.json. Corré \`cd server && pnpm export-frontend-maps\` antes del build de producción.`,
    );
}

const samplePath = path.join(MAPS_DIR, SAMPLE_NAME);

if (!fs.existsSync(samplePath)) {
    fail(
        `Falta ${samplePath}. El export quedó incompleto: volvé a correr \`pnpm export-frontend-maps\` desde server/.`,
    );
}

let sample;

try {
    sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
} catch {
    fail(
        `${SAMPLE_NAME} no es JSON válido. El export salió mal; borralo y volvé a generar los mapas.`,
    );
}

if (!isOptimizedMapShape(sample)) {
    fail(
        `${SAMPLE_NAME} no tiene la forma esperada ({ id: number, w: number, h: number, d: array }). El archivo no es un mapa optimizado válido.`,
    );
}

console.log(`Mapas optimizados OK: ${mapFiles.length} archivos en ${MAPS_DIR}`);
