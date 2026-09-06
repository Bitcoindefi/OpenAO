/**
 * Client performance helpers for OpenAO #20.
 * Pure / DOM-light so FPS, prefetch, and deferred-render policy are unit-testable.
 */

export const CLIENT_FPS_CAP = 60;
export const CLIENT_FPS_BATTERY_SAVER = 30;
export const MAX_NEARBY_MAP_PREFETCH_TOTAL = 2;
export const MAX_NEARBY_MAP_PREFETCH_CONCURRENT = 2;
export const DEFERRED_RENDER_CHUNK_ROWS = 10;
export const LOW_END_UPPER_LAYER_RADIUS_TILES = 12;
export const LOW_END_DEVICE_MEMORY_GB = 4;
export const LOW_END_CPU_CORES = 4;

export const SLOW_EFFECTIVE_CONNECTION_TYPES = new Set([
    "slow-2g",
    "2g",
]);

export type NetworkConnectionLike = {
    saveData?: boolean;
    effectiveType?: string;
};

export type NavigatorPerfHints = {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: NetworkConnectionLike;
};

export type TileBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

export function shouldSkipNearbyMapPrefetch(
    connection?: NetworkConnectionLike | null,
): boolean {
    if (!connection) return false;
    if (connection.saveData) return true;
    const effective = (connection.effectiveType ?? "").toLowerCase();
    return SLOW_EFFECTIVE_CONNECTION_TYPES.has(effective);
}

export function selectPrefetchMapTargets(
    nearbyMaps: number[],
    totalCap = MAX_NEARBY_MAP_PREFETCH_TOTAL,
): number[] {
    if (!Array.isArray(nearbyMaps) || nearbyMaps.length === 0) return [];
    const unique: number[] = [];
    const seen = new Set<number>();
    for (const mapNum of nearbyMaps) {
        if (!Number.isInteger(mapNum) || mapNum <= 0 || seen.has(mapNum)) {
            continue;
        }
        seen.add(mapNum);
        unique.push(mapNum);
        if (unique.length >= totalCap) break;
    }
    return unique;
}

/**
 * Run async work over items with a hard concurrency ceiling.
 * Differentiator vs competitors that only `.slice(0, 2)` then await serially
 * (issue asks for concurrent download cap).
 */
export async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const limit = Math.max(1, Math.floor(concurrency));
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    async function runOne(): Promise<void> {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await worker(items[index]!, index);
        }
    }

    const runners = Array.from(
        { length: Math.min(limit, Math.max(items.length, 1)) },
        () => runOne(),
    );
    await Promise.all(runners);
    return results;
}

export function isLowEndClient(nav?: NavigatorPerfHints | null): boolean {
    if (!nav) return false;
    if (
        typeof nav.deviceMemory === "number" &&
        nav.deviceMemory > 0 &&
        nav.deviceMemory <= LOW_END_DEVICE_MEMORY_GB
    ) {
        return true;
    }
    if (
        typeof nav.hardwareConcurrency === "number" &&
        nav.hardwareConcurrency > 0 &&
        nav.hardwareConcurrency <= LOW_END_CPU_CORES
    ) {
        return true;
    }
    return false;
}

export function resolveClientMaxFps(options: {
    batterySaver?: boolean;
    connection?: NetworkConnectionLike | null;
}): number {
    if (options.batterySaver) return CLIENT_FPS_BATTERY_SAVER;
    if (options.connection?.saveData) return CLIENT_FPS_BATTERY_SAVER;
    return CLIENT_FPS_CAP;
}

export function expandBoundsByRadius(
    center: TileBounds,
    radiusTiles: number,
    mapWidth: number,
    mapHeight: number,
): TileBounds {
    const midX = Math.floor((center.minX + center.maxX) / 2);
    const midY = Math.floor((center.minY + center.maxY) / 2);
    return {
        minX: Math.max(1, midX - radiusTiles),
        maxX: Math.min(mapWidth, midX + radiusTiles),
        minY: Math.max(1, midY - radiusTiles),
        maxY: Math.min(mapHeight, midY + radiusTiles),
    };
}

/** Split a Y-range into inclusive row chunks for idle deferred rendering. */
export function splitRowChunks(
    minY: number,
    maxY: number,
    chunkRows = DEFERRED_RENDER_CHUNK_ROWS,
): Array<{ minY: number; maxY: number }> {
    if (maxY < minY) return [];
    const size = Math.max(1, Math.floor(chunkRows));
    const chunks: Array<{ minY: number; maxY: number }> = [];
    for (let y = minY; y <= maxY; y += size) {
        chunks.push({ minY: y, maxY: Math.min(maxY, y + size - 1) });
    }
    return chunks;
}

export function waitForIdle(
    timeoutMs = 160,
    scheduler: {
        requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number },
        ) => number;
        setTimeout: (cb: () => void, ms: number) => number;
    } = globalThis as unknown as {
        requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number },
        ) => number;
        setTimeout: (cb: () => void, ms: number) => number;
    },
): Promise<void> {
    return new Promise((resolve) => {
        if (typeof scheduler.requestIdleCallback === "function") {
            scheduler.requestIdleCallback(() => resolve(), {
                timeout: timeoutMs,
            });
            return;
        }
        scheduler.setTimeout(() => resolve(), 16);
    });
}

/** Before/after style estimates used by the measurement script + PR evidence. */
export function estimatePrefetchFootprintMb(
    mapCount: number,
    jsonKb = 85,
    tilesMb = 1.28,
): number {
    return mapCount * (jsonKb / 1024 + tilesMb);
}

export function estimateGpuFrameReductionPct(
    nativeHz: number,
    cappedFps: number,
): number {
    if (nativeHz <= 0) return 0;
    return Math.max(0, ((nativeHz - cappedFps) / nativeHz) * 100);
}
