import { describe, expect, it } from "vitest";
import {
    applyDeltaForward,
    diffMapStates,
    invertDelta,
    normalizeMapState,
    type MapTileState,
} from "../repositories/gameMapRevisions";

describe("OpenAO #12 map revision deltas", () => {
    const base: MapTileState[] = [
        { x: 1, y: 1, layer: 1, grhIndex: 10, blocked: false, status: "draft" },
    ];

    it("diffs paint changes into compact deltas", () => {
        const after: MapTileState[] = [
            { x: 1, y: 1, layer: 1, grhIndex: 99, blocked: true, status: "draft" },
            { x: 2, y: 2, layer: 1, grhIndex: 5, blocked: null, status: "draft" },
        ];
        const delta = diffMapStates(base, after);
        expect(delta.length).toBeGreaterThanOrEqual(2);
        const roundTrip = applyDeltaForward(base, delta);
        expect(normalizeMapState(roundTrip)).toEqual(normalizeMapState(after));
    });

    it("undo via inverted delta restores prior state", () => {
        const after: MapTileState[] = [
            { x: 1, y: 1, layer: 1, grhIndex: 99, blocked: true, status: "draft" },
        ];
        const delta = diffMapStates(base, after);
        const undone = applyDeltaForward(after, invertDelta(delta));
        expect(normalizeMapState(undone)).toEqual(normalizeMapState(base));
    });

    it("publish draft->published is visible in the delta", () => {
        const before: MapTileState[] = [
            { x: 3, y: 3, layer: 1, grhIndex: 7, blocked: false, status: "draft" },
        ];
        const after: MapTileState[] = [
            { x: 3, y: 3, layer: 1, grhIndex: 7, blocked: false, status: "published" },
        ];
        const delta = diffMapStates(before, after);
        expect(delta).toHaveLength(2); // delete draft key + add published key
        expect(delta.some((d) => d.before?.status === "draft")).toBe(true);
        expect(delta.some((d) => d.after?.status === "published")).toBe(true);
    });
});
