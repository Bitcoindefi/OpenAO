import assert from "node:assert/strict";
import test from "node:test";
import {
    CLIENT_FPS_BATTERY_SAVER,
    CLIENT_FPS_CAP,
    MAX_NEARBY_MAP_PREFETCH_CONCURRENT,
    MAX_NEARBY_MAP_PREFETCH_TOTAL,
    estimateGpuFrameReductionPct,
    estimatePrefetchFootprintMb,
    expandBoundsByRadius,
    isLowEndClient,
    mapWithConcurrency,
    resolveClientMaxFps,
    selectPrefetchMapTargets,
    shouldSkipNearbyMapPrefetch,
    splitRowChunks,
    waitForIdle,
} from "./clientPerf";

test("shouldSkipNearbyMapPrefetch honors saveData and slow links", () => {
    assert.equal(shouldSkipNearbyMapPrefetch(null), false);
    assert.equal(shouldSkipNearbyMapPrefetch({ saveData: true }), true);
    assert.equal(
        shouldSkipNearbyMapPrefetch({ effectiveType: "2g" }),
        true,
    );
    assert.equal(
        shouldSkipNearbyMapPrefetch({ effectiveType: "slow-2g" }),
        true,
    );
    assert.equal(
        shouldSkipNearbyMapPrefetch({ effectiveType: "4g" }),
        false,
    );
});

test("selectPrefetchMapTargets caps and dedupes", () => {
    assert.deepEqual(
        selectPrefetchMapTargets([3, 3, 7, 9, 11], 2),
        [3, 7],
    );
    assert.equal(
        selectPrefetchMapTargets([1, 2, 3]).length,
        MAX_NEARBY_MAP_PREFETCH_TOTAL,
    );
});

test("mapWithConcurrency never exceeds the in-flight ceiling", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5, 6];
    const results = await mapWithConcurrency(
        items,
        MAX_NEARBY_MAP_PREFETCH_CONCURRENT,
        async (item) => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, 5));
            inFlight -= 1;
            return item * 10;
        },
    );
    assert.ok(peak <= MAX_NEARBY_MAP_PREFETCH_CONCURRENT);
    assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
});

test("resolveClientMaxFps uses 30 in battery/saveData mode else 60", () => {
    assert.equal(resolveClientMaxFps({}), CLIENT_FPS_CAP);
    assert.equal(
        resolveClientMaxFps({ batterySaver: true }),
        CLIENT_FPS_BATTERY_SAVER,
    );
    assert.equal(
        resolveClientMaxFps({ connection: { saveData: true } }),
        CLIENT_FPS_BATTERY_SAVER,
    );
});

test("isLowEndClient detects memory/CPU hints", () => {
    assert.equal(isLowEndClient({ deviceMemory: 2 }), true);
    assert.equal(isLowEndClient({ hardwareConcurrency: 2 }), true);
    assert.equal(
        isLowEndClient({ deviceMemory: 8, hardwareConcurrency: 8 }),
        false,
    );
});

test("splitRowChunks and expandBoundsByRadius support deferred/low-end paths", () => {
    assert.deepEqual(splitRowChunks(1, 25, 10), [
        { minY: 1, maxY: 10 },
        { minY: 11, maxY: 20 },
        { minY: 21, maxY: 25 },
    ]);
    assert.deepEqual(
        expandBoundsByRadius(
            { minX: 40, maxX: 60, minY: 40, maxY: 60 },
            12,
            100,
            100,
        ),
        { minX: 38, maxX: 62, minY: 38, maxY: 62 },
    );
});

test("waitForIdle falls back to setTimeout when idle callback missing", async () => {
    let usedTimeout = false;
    await waitForIdle(10, {
        setTimeout: (cb) => {
            usedTimeout = true;
            cb();
            return 1;
        },
    });
    assert.equal(usedTimeout, true);
});

test("measurement helpers show capped prefetch and 120→60 GPU savings", () => {
    const uncapped = estimatePrefetchFootprintMb(8);
    const capped = estimatePrefetchFootprintMb(2);
    assert.ok(capped < uncapped);
    assert.ok(estimateGpuFrameReductionPct(120, 60) >= 49);
});
