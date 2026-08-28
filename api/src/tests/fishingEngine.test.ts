import { describe, it, expect } from "vitest";
import { FishingEngine, FishingRod, FishingBait } from "../lib/fishingEngine.js";

describe("FishingEngine Habitat Classification and Catch Calculations", () => {
    const basicRod: FishingRod = {
        rodId: "rod_cane_01",
        name: "Simple Wooden Rod",
        tier: 1,
        bonusCatchPercent: 0.0,
    };

    it("catches river fish with baseline skill and rod", () => {
        const res = FishingEngine.attemptFishing({
            fishingSkill: 15,
            rod: basicRod,
            waterType: "FRESHWATER_RIVER",
            isNightTime: false,
            rng: () => 0.05,
        });

        expect(res.success).toBe(true);
        expect(res.caughtFish?.speciesId).toBe("carp_river");
        expect(res.skillExpGained).toBeGreaterThan(0);
    });

    it("restricts nocturnal shadow eels to nighttime conditions", () => {
        const dayRes = FishingEngine.attemptFishing({
            fishingSkill: 60,
            rod: basicRod,
            waterType: "COASTAL_OCEAN",
            isNightTime: false,
            rng: () => 0.05,
        });
        expect(dayRes.caughtFish?.speciesId).toBe("salmon_ocean");

        let callCount = 0;
        const rolls = [0.05, 0.90];
        const nightRes = FishingEngine.attemptFishing({
            fishingSkill: 60,
            rod: basicRod,
            waterType: "COASTAL_OCEAN",
            isNightTime: true,
            rng: () => rolls[callCount++ % rolls.length],
        });
        expect(nightRes.success).toBe(true);
        expect(nightRes.caughtFish?.speciesId).toBe("shadow_eel");
    });

    it("boosts rare sunken treasure chest probability with glowing shrimp bait", () => {
        const rareBait: FishingBait = {
            baitId: "bait_glow_shrimp",
            name: "Luminescent Shrimp",
            potency: 3,
            attractsRare: true,
        };

        const res = FishingEngine.attemptFishing({
            fishingSkill: 80,
            rod: { ...basicRod, tier: 4, bonusCatchPercent: 0.15 },
            bait: rareBait,
            waterType: "DEEP_SEA",
            isNightTime: true,
            rng: () => 0.01,
        });

        expect(res.success).toBe(true);
    });
});