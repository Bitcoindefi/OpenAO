import { describe, it, expect } from "vitest";
import {
    AncientRunicLeatherworkingArmorCraftingEngine,
    ActiveTanningRack,
} from "../lib/ancientRunicLeatherworkingArmorCrafting.js";

describe("AncientRunicLeatherworkingArmorCraftingEngine Leatherworking & Reinforcement", () => {
    it("crafts Voidweave Cloak in Astral Ether Vat with masterwork quality (100%)", () => {
        const vat = AncientRunicLeatherworkingArmorCraftingEngine.constructRack("leatherworker_01", "ASTRAL_ETHER_VAT", 100000);
        expect(vat.rackType).toBe("ASTRAL_ETHER_VAT");
        expect(vat.currentDurability).toBe(260);

        const craftRes = AncientRunicLeatherworkingArmorCraftingEngine.craftArmor(
            vat,
            "VOIDWEAVE_CLOAK",
            ["VOID_DRAKE_CHITIN", "VOID_DRAKE_CHITIN"],
            0.5,
            100000
        );

        expect(craftRes.success).toBe(true);
        expect(craftRes.craftedArmor?.recipeType).toBe("VOIDWEAVE_CLOAK");
        expect(craftRes.craftedArmor?.stitchingQualityPercent).toBe(100); // 50 + 15 + 35 = 100
        expect(craftRes.craftedArmor?.finalArmorDefense).toBe(102); // 85 * 1.20 = 102
        expect(craftRes.craftedArmor?.secondaryStatValue).toBe(36); // 30 * 1.20 = 36
        expect(craftRes.remainingDurability).toBe(245); // 260 - 15
    });

    it("handles non-finite craftRoll defensively without producing NaN stats", () => {
        const vat = AncientRunicLeatherworkingArmorCraftingEngine.constructRack("lw_nan", "ASTRAL_ETHER_VAT", 100000);

        const craft = AncientRunicLeatherworkingArmorCraftingEngine.craftArmor(
            vat,
            "VOIDWEAVE_CLOAK",
            ["VOID_DRAKE_CHITIN", "VOID_DRAKE_CHITIN"],
            NaN
        );

        expect(craft.success).toBe(true);
        expect(Number.isFinite(craft.craftedArmor?.stitchingQualityPercent)).toBe(true);
        expect(Number.isFinite(craft.craftedArmor?.finalArmorDefense)).toBe(true);
    });

    it("rejects crafting when insufficient hides are provided", () => {
        const frame = AncientRunicLeatherworkingArmorCraftingEngine.constructRack("lw_02", "PINE_TANNING_FRAME", 100000);

        const failRes = AncientRunicLeatherworkingArmorCraftingEngine.craftArmor(
            frame,
            "DRAGONSCALE_GREAVES",
            ["DRAGON_SCALE_HIDE"]
        );

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient hides");
        expect(frame.currentDurability).toBe(100);
    });

    it("handles crafting failure roll consuming durability", () => {
        const frame = AncientRunicLeatherworkingArmorCraftingEngine.constructRack("lw_03", "PINE_TANNING_FRAME", 100000);

        const failRoll = AncientRunicLeatherworkingArmorCraftingEngine.craftArmor(
            frame,
            "BEASTSTALKER_TUNIC",
            ["WOLF_PELT", "WOLF_PELT"],
            0.95
        );

        expect(failRoll.success).toBe(false);
        expect(failRoll.reason).toContain("ruined");
        expect(frame.currentDurability).toBe(85);
    });

    it("repairs rack durability and restores functionality", () => {
        const rack = AncientRunicLeatherworkingArmorCraftingEngine.constructRack("lw_04", "PINE_TANNING_FRAME", 100000);
        rack.currentDurability = 0;
        rack.isFunctional = false;

        const rep = AncientRunicLeatherworkingArmorCraftingEngine.repairRack(rack, 50);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(50);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported rack models", () => {
        expect(() => AncientRunicLeatherworkingArmorCraftingEngine.constructRack("l", "WOODEN_BOX" as any)).toThrow(
            "Unsupported tanning rack type"
        );

        expect(AncientRunicLeatherworkingArmorCraftingEngine.craftArmor(null as any, "BEASTSTALKER_TUNIC", []).success).toBe(false);
        expect(AncientRunicLeatherworkingArmorCraftingEngine.repairRack(null as any).success).toBe(false);
    });
});