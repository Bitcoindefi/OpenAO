import { describe, it, expect } from "vitest";
import {
    AncientRunicMiningExcavationEngine,
    ActiveMiningTool,
    ActiveSubterraneanVein,
} from "../lib/ancientRunicMiningExcavation.js";

describe("AncientRunicMiningExcavationEngine Subterranean Mining & Smelting", () => {
    it("mines Abyssal Darkstone Monolith with Celestial Void Drill scoring a Critical Strike and uncovering Void Diamond", () => {
        const drill = AncientRunicMiningExcavationEngine.forgeMiningTool("miner_01", "CELESTIAL_VOID_DRILL", 100000);
        expect(drill.toolType).toBe("CELESTIAL_VOID_DRILL");
        expect(drill.miningPower).toBe(120);

        const monolith = AncientRunicMiningExcavationEngine.discoverOreVein("ABYSSAL_DARKSTONE_MONOLITH", 50, 100000);
        expect(monolith.remainingOreCapacity).toBe(50);

        // Strike roll 0.1 (pass), Crit roll 0.1 (10% <= 30% crit chance) -> 2.0x yield = 24 Darkstone Ore + Void Diamond
        const mineRes = AncientRunicMiningExcavationEngine.mineVein(
            drill,
            monolith,
            0.1,
            0.1,
            100000
        );

        expect(mineRes.success).toBe(true);
        expect(mineRes.result?.oreMaterial).toBe("DARKSTONE_ORE");
        expect(mineRes.result?.extractedOreCount).toBe(24);
        expect(mineRes.result?.isCriticalStrike).toBe(true);
        expect(mineRes.result?.foundRareGem).toBe("VOID_DIAMOND");
        expect(mineRes.result?.remainingVeinCapacity).toBe(26);
        expect(drill.currentDurability).toBe(312); // 320 - 8

        // Smelt 24 Darkstone ores at 4:1 ratio -> 6 refined metal bars
        const smeltRes = AncientRunicMiningExcavationEngine.smeltOre(24, "ABYSSAL_DARKSTONE_MONOLITH");
        expect(smeltRes.success).toBe(true);
        expect(smeltRes.refinedBarsProduced).toBe(6);
        expect(smeltRes.requiredPerBar).toBe(4);
    });

    it("surfaces remainingDurability on glancing swing failure path", () => {
        const copperPick = AncientRunicMiningExcavationEngine.forgeMiningTool("miner_glance", "COPPER_PICKAXE", 100000); // 75% success
        const pyriteVein = AncientRunicMiningExcavationEngine.discoverOreVein("VEIN_OF_PYRITE", 15);

        // Strike roll 0.95 (95 > 75%) -> Glancing swing
        const glanceRes = AncientRunicMiningExcavationEngine.mineVein(copperPick, pyriteVein, 0.95);
        expect(glanceRes.success).toBe(false);
        expect(glanceRes.remainingDurability).toBe(72); // 80 - 8
        expect(glanceRes.reason).toContain("glanced off stone");
    });

    it("rejects mining when tool mining power is insufficient for vein hardness", () => {
        const copperPick = AncientRunicMiningExcavationEngine.forgeMiningTool("miner_02", "COPPER_PICKAXE", 100000); // 25 power
        const mithrilVein = AncientRunicMiningExcavationEngine.discoverOreVein("ASTRAL_MITHRIL_SEAM", 30); // 50 hardness

        const failRes = AncientRunicMiningExcavationEngine.mineVein(copperPick, mithrilVein);
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Pickaxe deflected");
        expect(copperPick.currentDurability).toBe(80);
    });

    it("rejects mining when vein is already depleted", () => {
        const drill = AncientRunicMiningExcavationEngine.forgeMiningTool("miner_03", "CELESTIAL_VOID_DRILL", 100000);
        const emptyVein: ActiveSubterraneanVein = {
            veinId: "v_empty",
            veinType: "VEIN_OF_PYRITE",
            remainingOreCapacity: 0,
            maxOreCapacity: 15,
            isDepleted: true,
        };

        const failDepleted = AncientRunicMiningExcavationEngine.mineVein(drill, emptyVein);
        expect(failDepleted.success).toBe(false);
        expect(failDepleted.reason).toContain("completely depleted");
    });

    it("sharpens tool and restores functionality", () => {
        const pick = AncientRunicMiningExcavationEngine.forgeMiningTool("miner_04", "COPPER_PICKAXE", 100000);
        pick.currentDurability = 0;
        pick.isFunctional = false;

        const rep = AncientRunicMiningExcavationEngine.sharpenTool(pick, 40);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(40);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported tool models", () => {
        expect(() => AncientRunicMiningExcavationEngine.forgeMiningTool("m", "WOODEN_SHOVEL" as any)).toThrow(
            "Unsupported mining tool type"
        );

        expect(AncientRunicMiningExcavationEngine.mineVein(null as any, null as any).success).toBe(false);
        expect(AncientRunicMiningExcavationEngine.sharpenTool(null as any).success).toBe(false);
    });
});