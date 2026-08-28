import { describe, it, expect } from "vitest";
import { CraftingDisassemblerEngine, DisassembleItemParams } from "../lib/craftingDisassembler.js";

describe("CraftingDisassemblerEngine Salvage Recovery & Critical Yields", () => {
    it("salvages full durability item with high skill efficiency", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "iron_plate_armor",
            currentDurability: 100,
            maxDurability: 100,
            playerBlacksmithSkill: 80,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params, () => 0.99); // No critical
        expect(res.success).toBe(true);
        expect(res.salvageEfficiencyPercent).toBe(76);
        expect(res.wasCriticalSalvage).toBe(false);

        const iron = res.yields.find(y => y.material === "IRON_INGOT");
        expect(iron?.quantity).toBe(9);
    });

    it("awards rare bonus material on critical salvage roll", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "mithril_broadsword",
            currentDurability: 50,
            maxDurability: 50,
            playerBlacksmithSkill: 100,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params, () => 0.01); // Trigger critical
        expect(res.success).toBe(true);
        expect(res.wasCriticalSalvage).toBe(true);

        const dragonScale = res.yields.find(y => y.material === "DRAGON_SCALE");
        expect(dragonScale).toBeDefined();
        expect(dragonScale?.isCriticalBonus).toBe(true);
    });

    it("rejects salvage when player lacks required blacksmithing skill", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "mithril_broadsword", // Requires skill 45
            currentDurability: 50,
            maxDurability: 50,
            playerBlacksmithSkill: 20,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Insufficient skill level");
    });

    it("rejects salvage for unknown item templates without a recipe", () => {
        const params: DisassembleItemParams = {
            itemTemplateId: "non_existent_item",
            currentDurability: 10,
            maxDurability: 10,
            playerBlacksmithSkill: 100,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(params);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("has no salvage recipe");
    });

    it("applies broken item durability penalties and respects efficiency floor", () => {
        const brokenParams: DisassembleItemParams = {
            itemTemplateId: "iron_plate_armor",
            currentDurability: 0,
            maxDurability: 100,
            playerBlacksmithSkill: 10, // 0.40 * 0.25 = 0.10 floor
            isBroken: true,
        };

        const res = CraftingDisassemblerEngine.disassembleItem(brokenParams, () => 0.99);
        expect(res.success).toBe(true);
        expect(res.salvageEfficiencyPercent).toBe(11);
        expect(res.yields.length).toBeGreaterThan(0);
    });
});