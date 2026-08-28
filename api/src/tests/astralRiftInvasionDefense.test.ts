import { describe, it, expect } from "vitest";
import {
    AstralRiftInvasionDefenseEngine,
    RiftInvasionEvent,
} from "../lib/astralRiftInvasionDefense.js";

describe("AstralRiftInvasionDefenseEngine World Event Lifecycle & Rune Sealing", () => {
    it("initializes an Astral Rift event in PREPARATION phase and blocks rune channeling", () => {
        const event = AstralRiftInvasionDefenseEngine.initializeRift("rift_01", "Whispering Glade", 20, 3, 100000);
        expect(event.phase).toBe("PREPARATION");
        expect(event.riftStabilityPercent).toBe(100);

        // Pre-invasion channeling is blocked
        const preRune = AstralRiftInvasionDefenseEngine.channelSealingRune(event, "p1", 20);
        expect(preRune.success).toBe(false);
        expect(preRune.reason).toContain("preparation phase");
    });

    it("spawns invasion waves, degrades stability, and progresses to BOSS_PHASE", () => {
        const event = AstralRiftInvasionDefenseEngine.initializeRift("rift_01", "Whispering Glade", 20, 2, 100000);

        const wave1 = AstralRiftInvasionDefenseEngine.spawnWave(event, "VOID_WALKER", 4, 105000);
        expect(wave1.success).toBe(true);
        expect(wave1.stabilityRemaining).toBe(80);
        expect(wave1.phase).toBe("INVASION_ACTIVE");

        const wave2 = AstralRiftInvasionDefenseEngine.spawnWave(event, "CHAOS_BEHEMOTH", 2, 110000);
        expect(wave2.success).toBe(true);
        expect(wave2.phase).toBe("BOSS_PHASE");
    });

    it("channels celestial runes, restores stability, and achieves SEALED_VICTORY in boss phase", () => {
        const event = AstralRiftInvasionDefenseEngine.initializeRift("rift_01", "Whispering Glade", 20, 1, 100000);
        AstralRiftInvasionDefenseEngine.spawnWave(event, "ASTRAL_RIFTLORD", 1, 105000);

        const runeRes = AstralRiftInvasionDefenseEngine.channelSealingRune(event, "paladin_arthur", 20);
        expect(runeRes.success).toBe(true);
        expect(runeRes.newStability).toBe(95);
        expect(runeRes.eventSealed).toBe(true);
        expect(event.phase).toBe("SEALED_VICTORY");
    });

    it("evaluates player contribution points and awards TIER_3_REALM_SAVIOR", () => {
        const event = AstralRiftInvasionDefenseEngine.initializeRift("rift_01", "Whispering Glade", 20, 2, 100000);
        AstralRiftInvasionDefenseEngine.spawnWave(event, "VOID_WALKER", 2, 105000);
        AstralRiftInvasionDefenseEngine.channelSealingRune(event, "hero_1", 160);

        const rewardRes = AstralRiftInvasionDefenseEngine.evaluatePlayerRewardTier(event, "hero_1");
        expect(rewardRes.isEligible).toBe(true);
        expect(rewardRes.contributionPoints).toBe(320);
        expect(rewardRes.rewardTier).toBe("TIER_3_REALM_SAVIOR");
    });

    it("triggers COLLAPSED_FAILURE when duration expires and zeroes out stored stability", () => {
        const event = AstralRiftInvasionDefenseEngine.initializeRift("rift_01", "Whispering Glade", 20, 3, 100000);

        // Advance beyond expiry (100000 + 20*60*1000 = 1,300,000)
        const expiredSpawn = AstralRiftInvasionDefenseEngine.spawnWave(event, "VOID_WALKER", 1, 1400000);
        expect(expiredSpawn.success).toBe(false);
        expect(expiredSpawn.phase).toBe("COLLAPSED_FAILURE");
        expect(event.riftStabilityPercent).toBe(0); // Mutated stored stability agrees with result
    });
});