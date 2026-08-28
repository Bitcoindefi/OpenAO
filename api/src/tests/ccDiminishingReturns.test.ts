import { describe, it, expect } from "vitest";
import { DiminishingReturnsEngine } from "../lib/ccDiminishingReturns.js";

describe("DiminishingReturnsEngine Category Isolation & Memory Eviction", () => {
    it("tracks CC categories (STUN vs ROOT) independently", () => {
        const engine = new DiminishingReturnsEngine();
        const now = 100000;

        // Apply STUN -> 1st hit 100%
        const stun1 = engine.applyCC("player_1", "STUN", 4000, now);
        expect(stun1.effectiveDurationMs).toBe(4000);
        expect(stun1.drTier).toBe(0);

        // Apply ROOT immediately -> 1st root hit is also 100% (isolated category)
        const root1 = engine.applyCC("player_1", "ROOT", 3000, now);
        expect(root1.effectiveDurationMs).toBe(3000);
        expect(root1.drTier).toBe(0);

        // 2nd STUN is 50%
        const stun2 = engine.applyCC("player_1", "STUN", 4000, now + 4000);
        expect(stun2.effectiveDurationMs).toBe(2000);
        expect(stun2.drTier).toBe(1);
    });

    it("purges stale records to maintain constant memory footprint", () => {
        const engine = new DiminishingReturnsEngine();
        let now = 100000;

        engine.applyCC("player_old", "STUN", 2000, now);
        now += 100000; // 100s later > 60s idle threshold

        const purged = engine.purgeStale(now, 60000);
        expect(purged).toBe(1);
    });
});