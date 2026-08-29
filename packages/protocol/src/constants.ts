export const PROTOCOL_LIMITS = {
    mapMinCoordinate: 1,
    mapMaxCoordinate: 100,
    clientViewRangeX: 10,
    clientViewRangeY: 10,
    clientViewExtraBottomY: 1,
    maxSnapshotChunkCharacters: 60_000,
} as const;
