import { describe, it, expect } from "vitest";
import {
    AncientRunicMiningExcavationEngine,
    ActiveMiningPickaxe,
    OreVeinDeposit,
} from "../lib/ancientRunicMiningExcavation.js";

describe("AncientRunicMiningExcavationEngine Mining & Geodes", () => {
    it("mines Void Obsidian with Void Sunderer Pick yielding 2.0x ore and discovering geodes", () => {
        const pickaxe = AncientRunicMiningExcavationEngine.forgePickaxe("miner_01", "VOID_SUNDERER_PICK", 100000);
        expect(pickaxe.pickaxeType).toBe("VOID_SUNDERER_PICK");
        expect(pickaxe.currentDurability).toBe(250);

        const vein: OreVeinDeposit = {
            veinId: "obsidian_vein_01",
            veinType: "VOID_OBSIDIAN_VEIN",
            location: { x: 100, y: 200 },
            remainingOreCapacity: 50,
            isDepleted: false,
        };

        // Base 15 * 2.0x yield multiplier = 30 ore
        const res = AncientRunicMiningExcavationEngine.excavateVein(pickaxe, vein, () => 0.10); // geode roll 10 < 60% -> discovers geode
        expect(res.success).toBe(true);
        expect(res.oreExtracted).toBe(30);
        expect(res.oreName).toBe("Void Obsidian Slab");
        expect(res.discoveredGeode).toBe(true);
        expect(res.remainingDurability).toBe(245); // 250 - 5
        expect(vein.remainingOreCapacity).toBe(20);
    });

    it("cracks geode to extract gemstones across loot table", () => {
        const voidAmethyst = AncientRunicMiningExcavationEngine.crackGeode(0.95);
        expect(voidAmethyst.gemstone).toBe("VOID_AMETHYST");
        expect(voidAmethyst.goldValue).toBe(300);

        const ruby = AncientRunicMiningExcavationEngine.crackGeode(0.10);
        expect(ruby.gemstone).toBe("RUNIC_RUBY");
        expect(ruby.goldValue).toBe(50);
    });

    it("rejects excavation when pickaxe hardness is lower than vein hardness level", () => {
        const pickaxe = AncientRunicMiningExcavationEngine.forgePickaxe("miner_02", "ADAMANTITE_MINING_PICK", 100000); // Hardness 40

        const hardVein: OreVeinDeposit = {
            veinId: "mithril_vein_01",
            veinType: "MITHRIL_CRYSTAL_VEIN", // Hardness 60 > 40
            location: { x: 50, y: 50 },
            remainingOreCapacity: 30,
            isDepleted: false,
        };

        const failRes = AncientRunicMiningExcavationEngine.excavateVein(pickaxe, hardVein);
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("hardness threshold");
        expect(pickaxe.currentDurability).toBe(120); // No durability consumed
    });

    it("sharpens pickaxe with whetstone and refuses to revive broken pickaxe", () => {
        const pick = AncientRunicMiningExcavationEngine.forgePickaxe("miner_03", "ADAMANTITE_MINING_PICK", 100000);
        pick.currentDurability = 50;

        const sharp = AncientRunicMiningExcavationEngine.sharpenPickaxe(pick, 50);
        expect(sharp.success).toBe(true);
        expect(sharp.newDurability).toBe(100);

        // Break pickaxe
        pick.currentDurability = 0;
        pick.isBroken = true;

        const brokenSharp = AncientRunicMiningExcavationEngine.sharpenPickaxe(pick, 50);
        expect(brokenSharp.success).toBe(false);
        expect(brokenSharp.isBroken).toBe(true);
    });

    it("guards against depleted veins and unsupported pickaxe models", () => {
        expect(() => AncientRunicMiningExcavationEngine.forgePickaxe("m", "PLASTIC_SPOON" as any)).toThrow(
            "Unsupported pickaxe type"
        );

        const pick = AncientRunicMiningExcavationEngine.forgePickaxe("m", "ADAMANTITE_MINING_PICK", 0);
        const depletedVein: OreVeinDeposit = {
            veinId: "empty",
            veinType: "ARCANE_SILVER_VEIN",
            location: { x: 0, y: 0 },
            remainingOreCapacity: 0,
            isDepleted: true,
        };

        const fail = AncientRunicMiningExcavationEngine.excavateVein(pick, depletedVein);
        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("depleted");
    });
});