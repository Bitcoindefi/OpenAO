import { describe, it, expect } from "vitest";
import {
    AncientRunicFishingDeepAbyssHarvestingEngine,
    ActiveFishingGear,
} from "../lib/ancientRunicFishingDeepAbyssHarvesting.js";

describe("AncientRunicFishingDeepAbyssHarvestingEngine Harpoon & Leviathan Fishing", () => {
    it("harpoons Colossal Abyssal Kraken in Abyssal Trench with Abyssal Trident and Leviathan Chum lure", () => {
        const trident = AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("fisher_01", "ABYSSAL_KRAKEN_TRIDENT", 100000);
        expect(trident.gearType).toBe("ABYSSAL_KRAKEN_TRIDENT");
        expect(trident.lineStrengthKg).toBe(200);

        // Kraken is 150kg <= 200kg line strength
        const catchRes = AncientRunicFishingDeepAbyssHarvestingEngine.castAndReel(
            trident,
            "ABYSSAL_TRENCH",
            "LEVIATHAN_PHEROMONE_CHUM",
            0.5,
            0.1, // Catch roll
            100000
        );

        expect(catchRes.success).toBe(true);
        expect(catchRes.isLineSnapped).toBe(false);
        expect(catchRes.catchResult?.fishType).toBe("COLOSSAL_ABYSSAL_KRAKEN");
        expect(catchRes.catchResult?.weightKg).toBe(150);
        expect(catchRes.catchResult?.filletYield).toBe(45);
        expect(catchRes.catchResult?.goldValue).toBe(650);
        expect(catchRes.remainingDurability).toBe(240); // 250 - 10
    });

    it("snaps line without consuming durability when fish weight exceeds line strength", () => {
        const rod = AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("fisher_02", "BAMBOO_RIVER_ROD", 100000); // 30kg line strength

        // Sunken Glade yields Golden Astral Trout (40kg > 30kg) -> snaps line without eating durability
        const snapRes = AncientRunicFishingDeepAbyssHarvestingEngine.castAndReel(rod, "SUNKEN_GLADE");
        expect(snapRes.success).toBe(false);
        expect(snapRes.isLineSnapped).toBe(true);
        expect(snapRes.remainingDurability).toBe(60); // Not consumed
        expect(snapRes.reason).toContain("Line snapped");
    });

    it("returns fish got away when catch roll fails without snapping line", () => {
        const harpoon = AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("fisher_03", "MITHRIL_REINFORCED_HARPOON", 100000); // 88% catch rate

        // Catch roll 0.95 (95 > 88%)
        const missRes = AncientRunicFishingDeepAbyssHarvestingEngine.castAndReel(harpoon, "LAVA_SPRINGS", undefined, 0.5, 0.95);
        expect(missRes.success).toBe(false);
        expect(missRes.isLineSnapped).toBe(false);
        expect(missRes.reason).toContain("Fish got away");
        expect(missRes.remainingDurability).toBe(130); // 140 - 10 consumed for cast
    });

    it("snaps line when reel tension roll exceeds critical limit (tension > 95%)", () => {
        const harpoon = AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("fisher_04", "MITHRIL_REINFORCED_HARPOON", 100000);

        // Obsidian Salamander (15kg <= 80kg), tension roll 0.99 with no lure (99% tension > 95%)
        const tensionSnap = AncientRunicFishingDeepAbyssHarvestingEngine.castAndReel(harpoon, "LAVA_SPRINGS", undefined, 0.99, 0.1);
        expect(tensionSnap.success).toBe(false);
        expect(tensionSnap.isLineSnapped).toBe(true);
        expect(tensionSnap.reason).toContain("excessive reeling tension");
    });

    it("repairs gear durability and rejects repairing broken gear", () => {
        const rod = AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("fisher_05", "BAMBOO_RIVER_ROD", 100000);
        rod.currentDurability = 30;

        const rep = AncientRunicFishingDeepAbyssHarvestingEngine.repairGear(rod, 20);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(50);

        // Break gear
        rod.currentDurability = 0;
        rod.isBroken = true;

        const failRep = AncientRunicFishingDeepAbyssHarvestingEngine.repairGear(rod, 50);
        expect(failRep.success).toBe(false);
        expect(failRep.isBroken).toBe(true);
    });

    it("guards against null inputs and unsupported gear types", () => {
        expect(() => AncientRunicFishingDeepAbyssHarvestingEngine.forgeFishingGear("f", "STICK_AND_STRING" as any)).toThrow(
            "Unsupported fishing gear type"
        );

        expect(AncientRunicFishingDeepAbyssHarvestingEngine.castAndReel(null as any, "LAVA_SPRINGS").success).toBe(false);
        expect(AncientRunicFishingDeepAbyssHarvestingEngine.repairGear(null as any).success).toBe(false);
    });
});