import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
    default: { query: vi.fn(), connect: vi.fn() },
}));

import {
    checkQuotas,
    checkReachability,
    findForbiddenWords,
    runAutomaticChecks,
    MAX_MAP_ENTITIES,
} from "../repositories/mapModeration";

describe("findForbiddenWords", () => {
    it("finds forbidden words ignoring case and accents", () => {
        const issues = findForbiddenWords(["Ciudad Prohibida", "VIVA HITLER"]);

        expect(issues.map((issue) => issue.code)).toEqual(["forbidden_word"]);
        expect(issues[0]?.message).toContain("hitler");
    });

    it("reports each forbidden word once even if it repeats", () => {
        const issues = findForbiddenWords(["puta puta puta"], ["puta"]);

        expect(issues).toHaveLength(1);
    });

    it("does not flag substrings inside longer words", () => {
        // "hitleriano" no es la palabra prohibida "hitler": la comparacion es
        // por palabra completa, no por substring.
        const issues = findForbiddenWords(["hitleriano"], ["hitler"]);

        expect(issues).toHaveLength(0);
    });
});

describe("checkReachability", () => {
    function gridFrom(
        width: number,
        height: number,
        blocked: Array<[number, number]>,
    ) {
        const blockedSet = new Set(blocked.map(([x, y]) => `${x},${y}`));

        return {
            width,
            height,
            entry: { x: 1, y: 1 },
            isBlocked: (x: number, y: number) => blockedSet.has(`${x},${y}`),
        };
    }

    it("passes on an open map", () => {
        expect(checkReachability(gridFrom(5, 5, []))).toHaveLength(0);
    });

    it("flags a walkable tile walled off from the entry", () => {
        const issues = checkReachability(gridFrom(5, 5, [[4, 5], [5, 4]]));

        expect(issues.map((issue) => issue.code)).toEqual(["isolated_region"]);
    });

    it("flags a blocked entry point", () => {
        const issues = checkReachability(gridFrom(5, 5, [[1, 1]]));

        expect(issues.map((issue) => issue.code)).toEqual(["entry_blocked"]);
    });
});

describe("checkQuotas", () => {
    it("flags a map over the entity quota", () => {
        const issues = checkQuotas({
            overrideCount: 10,
            entityCount: MAX_MAP_ENTITIES + 1,
            uploadedGraphicCount: 0,
        });

        expect(issues.map((issue) => issue.code)).toEqual([
            "too_many_entities",
        ]);
    });
});

describe("runAutomaticChecks", () => {
    it("approves a clean map", () => {
        const report = runAutomaticChecks({
            name: "Ciudad de prueba",
            description: "Una ciudad tranquila",
            entry: { x: 1, y: 1 },
            blockedTiles: [],
            overrideCount: 10,
            entityCount: 5,
            uploadedGraphicCount: 0,
        });

        expect(report.ok).toBe(true);
        expect(report.issues).toHaveLength(0);
    });

    it("blocks a map with forbidden text before it reaches a human", () => {
        const report = runAutomaticChecks({
            name: "Mapa mierda",
            description: "",
            entry: { x: 1, y: 1 },
            blockedTiles: [],
            overrideCount: 0,
            entityCount: 0,
            uploadedGraphicCount: 0,
        });

        expect(report.ok).toBe(false);
        expect(report.issues.some((issue) => issue.code === "forbidden_word")).toBe(
            true,
        );
    });
});
