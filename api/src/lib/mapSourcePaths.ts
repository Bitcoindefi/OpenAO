import { existsSync } from "fs";
import path from "path";

/**
 * Resolves the on-disk mapas_source directory.
 * OPENAO_MAPS_SOURCE overrides for tests / alternate checkouts.
 */
export function resolveMapsSourceDir(): string {
    const override = process.env.OPENAO_MAPS_SOURCE?.trim();
    if (override) {
        return path.resolve(override);
    }

    const candidates = [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "..", "..", "src"),
    ];

    for (const candidate of candidates) {
        if (existsSync(path.join(candidate, "mapas_source"))) {
            return path.join(candidate, "mapas_source");
        }
    }

    return path.join(candidates[0], "mapas_source");
}

export function mapDir(mapNum: number, mapsSourceDir = resolveMapsSourceDir()): string {
    return path.join(mapsSourceDir, `mapa_${mapNum}`);
}
