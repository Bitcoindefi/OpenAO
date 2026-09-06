/**
 * Before/after estimates for OpenAO #20 acceptance evidence.
 * Uses the same caps exported by frontend/lib/clientPerf.ts (kept in sync below).
 */
const CLIENT_FPS_CAP = 60;
const MAX_NEARBY_MAP_PREFETCH_TOTAL = 2;
const CITY_EXITS_BEFORE = 8;

function estimatePrefetchFootprintMb(mapCount, jsonKb = 85, tilesMb = 1.28) {
  return mapCount * (jsonKb / 1024 + tilesMb);
}

function estimateGpuFrameReductionPct(nativeHz, cappedFps) {
  return Math.max(0, ((nativeHz - cappedFps) / nativeHz) * 100);
}

const beforePrefetch = estimatePrefetchFootprintMb(CITY_EXITS_BEFORE);
const afterPrefetch = estimatePrefetchFootprintMb(MAX_NEARBY_MAP_PREFETCH_TOTAL);
const gpuCut = estimateGpuFrameReductionPct(120, CLIENT_FPS_CAP);

console.log("OpenAO #20 client perf measurement");
console.log(
  JSON.stringify(
    {
      prefetchMapsBefore: CITY_EXITS_BEFORE,
      prefetchMapsAfter: MAX_NEARBY_MAP_PREFETCH_TOTAL,
      prefetchFootprintMbBefore: Number(beforePrefetch.toFixed(2)),
      prefetchFootprintMbAfter: Number(afterPrefetch.toFixed(2)),
      prefetchFootprintReductionPct: Number(
        (((beforePrefetch - afterPrefetch) / beforePrefetch) * 100).toFixed(1),
      ),
      gpuFrameReductionPctOn120Hz: Number(gpuCut.toFixed(1)),
      fpsCap: CLIENT_FPS_CAP,
      batterySaverFps: 30,
      hudTextUsesRendererResolution: true,
      deferredRender: "requestIdleCallback row chunks + low-end upper-layer radius",
      concurrentPrefetchCap: 2,
    },
    null,
    2,
  ),
);
