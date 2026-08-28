import { describe, it, expect } from "vitest";
import {
    EnchantmentDisenchantingForgeEngine,
    MagicEquipmentItem,
    ArcaneEssenceType,
} from "../lib/enchantmentDisenchantingForge.js";

describe("EnchantmentDisenchantingForgeEngine Disenchanting & Reforging", () => {
    it("disenchants an Epic Sword into VOID_CRYSTAL essences and destroys item", () => {
        const epicSword: MagicEquipmentItem = {
            itemId: "sword_01",
            itemName: "Shadowfang Longsword",
            rarity: "EPIC",
            basePowerRating: 400,
            isDestroyed: false,
        };

        const disenchantRes = EnchantmentDisenchantingForgeEngine.disenchantItem(epicSword);
        expect(disenchantRes.success).toBe(true);
        expect(disenchantRes.extractedEssence).toBe("VOID_CRYSTAL");
        expect(disenchantRes.yieldCount).toBe(2);
        expect(epicSword.isDestroyed).toBe(true);
    });

    it("reforges item with FLAMING prefix when essences are sufficient", () => {
        const axe: MagicEquipmentItem = {
            itemId: "axe_01",
            itemName: "Dwarven Battleaxe",
            rarity: "RARE",
            basePowerRating: 250,
            isDestroyed: false,
        };

        const essenceInventory = new Map<ArcaneEssenceType, number>([["ARCANE_DUST", 20]]);

        const reforgeRes = EnchantmentDisenchantingForgeEngine.reforgeEquipment(
            axe,
            "FLAMING",
            essenceInventory,
            80,
            () => 0.90
        );

        expect(reforgeRes.success).toBe(true);
        expect(reforgeRes.prefixApplied).toBe("FLAMING");
        expect(reforgeRes.newPowerRating).toBe(285);
        expect(axe.activePrefix).toBe("FLAMING");
        expect(essenceInventory.get("ARCANE_DUST")).toBe(10);
    });

    it("fractures item when forge instability roll fails without consuming essences", () => {
        const staff: MagicEquipmentItem = {
            itemId: "staff_01",
            itemName: "Archmage Staff",
            rarity: "LEGENDARY",
            basePowerRating: 800,
            isDestroyed: false,
        };

        const essenceInventory = new Map<ArcaneEssenceType, number>([["ETERNAL_PRISMATIC_CORE", 5]]);

        const failRes = EnchantmentDisenchantingForgeEngine.reforgeEquipment(
            staff,
            "TITAN_SLAYER",
            essenceInventory,
            20,
            () => 0.01
        );

        expect(failRes.success).toBe(false);
        expect(failRes.isFractured).toBe(true);
        expect(staff.isDestroyed).toBe(true);
        expect(failRes.reason).toContain("Forge Instability Overload");
        // Essences preserved on fracture
        expect(essenceInventory.get("ETERNAL_PRISMATIC_CORE")).toBe(5);
    });

    it("rejects reforging with insufficient essence materials", () => {
        const helm: MagicEquipmentItem = {
            itemId: "helm_01",
            itemName: "Iron Helm",
            rarity: "COMMON",
            basePowerRating: 100,
            isDestroyed: false,
        };

        const emptyInventory = new Map<ArcaneEssenceType, number>();
        const res = EnchantmentDisenchantingForgeEngine.reforgeEquipment(helm, "VAMPIRIC", emptyInventory);

        expect(res.success).toBe(false);
        expect(res.reason).toContain("Insufficient ASTRAL_SHARD");
    });

    it("defensively guards against already destroyed items and invalid rarities", () => {
        const brokenItem: MagicEquipmentItem = {
            itemId: "b1",
            itemName: "Dust",
            rarity: "COMMON",
            basePowerRating: 0,
            isDestroyed: true,
        };

        const res = EnchantmentDisenchantingForgeEngine.disenchantItem(brokenItem);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("already destroyed");
    });
});