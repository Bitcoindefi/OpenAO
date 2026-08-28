import { describe, it, expect } from "vitest";
import { DiminishingReturnsEngine } from "../lib/ccDiminishingReturns.js";

describe("DiminishingReturnsEngine Refined Stunlock Prevention", () => {
    it("progressively reduces CC duration from 100% to 50%, 25%, and Immunity", () => {
        const engine = new DiminishingReturnsEngine();
        let now = 100000;

        // 1st Stun (4000ms) -> 100% = 4000ms
        const r1 = engine.applyCC("player_1", "STUN", 4000, now);
        expect(r1.effectiveDurationMs).toBe(4000);
        expect(r1.drTier).toBe(0);

        now += 4000;
        // 2nd Stun (4000ms) -> 50% = 2000ms
        const r2 = engine.applyCC("player_1", "STUN", 4000, now);
        expect(r2.effectiveDurationMs).toBe(2000);
        expect(r2.drTier).toBe(1);

        now += 2000;
        // 3rd Stun (4000ms) -> 25% = 1000ms
        const r3 = engine.applyCC("player_1", "STUN", 4000, now);
        expect(r3.effectiveDurationMs).toBe(1000);
        expect(r3.drTier).toBe(2);

        now += 1000;
        // 4th Stun -> Immune (0ms)
        const r4 = engine.applyCC("player_1", "STUN", 4000, now);
        expect(r4.effectiveDurationMs).toBe(0);
        expect(r4.isImmune).toBe(true);
    });

    it("does NOT extend reset window when spamming CC against an immune target", () => {
        const engine = new DiminishingReturnsEngine();
        let now = 100000;

        // Apply 3 stuns to reach immunity
        engine.applyCC("player_1", "STUN", 4000, now);
        now += 4000;
        engine.applyCC("player_1", "STUN", 4000, now);
        now += 2000;
        engine.applyCC("player_1", "STUN", 4000, now); // Last stun ends at now + 1000 = 107000
        now += 1000; // now = 107000 (immunity starts)

        // Spam CC during immunity 10 seconds later (now = 117000)
        now += 10000;
        const immuneHit = engine.applyCC("player_1", "STUN", 4000, now);
        expect(immuneHit.isImmune).toBe(true);

        // Advance past original 15s reset window (107000 + 15000 = 122000) -> now = 123000
        now = 123000;
        const freshHit = engine.applyCC("player_1", "STUN", 4000, now);

        // Should reset back to full duration (100% = 4000ms)
        expect(freshHit.effectiveDurationMs).toBe(4000);
        expect(freshHit.drTier).toBe(0);
        expect(freshHit.isImmune).toBe(false);
    });
});