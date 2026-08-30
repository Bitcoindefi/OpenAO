import { describe, it, expect } from "vitest";
import {
    AncientRunicRunesmithEnchantingTableEngine,
    ActiveEnchantingTable,
    EnchantableEquipment,
} from "../lib/ancientRunicRunesmithEnchantingTable.js";

describe("AncientRunicRunesmithEnchantingTableEngine Imbuing & Affixes", () => {
    it("imbues Legendary sword with Berserker's prefix (2.0x tier scaling) on Void Genesis Altar", () => {
        const altar = AncientRunicRunesmithEnchantingTableEngine.constructTable("smith_01", "VOID_GENESIS_ALTAR", 100000);
        expect(altar.tableType).toBe("VOID_GENESIS_ALTAR");
        expect(altar.currentCatalystDurability).toBe(250);

        const sword: EnchantableEquipment = {
            equipmentId: "legendary_blade_01",
            equipmentName: "Obsidian Greatsword",
            qualityTier: "LEGENDARY",
            bonusPhysicalDamage: 50,
            bonusMagicResistance: 0,
            bonusAttackSpeedPercent: 0,
        };

        // Rune of Berserking base 35 * 2.0 Legendary multiplier = +70 Physical Damage
        const result = AncientRunicRunesmithEnchantingTableEngine.imbueRune(altar, sword, "RUNE_OF_BERSERKING", () => 0.5);
        expect(result.success).toBe(true);
        expect(result.appliedAffix).toBe("Berserker's");
        expect(result.finalBonusValue).toBe(70);
        expect(sword.prefixAffix).toBe("Berserker's");
        expect(sword.bonusPhysicalDamage).toBe(120); // 50 + 70
        expect(altar.currentCatalystDurability).toBe(235); // 250 - 15
    });

    it("consumes catalyst and returns failure when imbuing roll exceeds success rate", () => {
        const anvil = AncientRunicRunesmithEnchantingTableEngine.constructTable("smith_fail", "OBSIDIAN_RUNESMITH_ANVIL", 100000);
        const sword: EnchantableEquipment = {
            equipmentId: "sword_fail",
            equipmentName: "Iron Sword",
            qualityTier: "COMMON",
            bonusPhysicalDamage: 10,
            bonusMagicResistance: 0,
            bonusAttackSpeedPercent: 0,
        };

        // Roll 90 > 85% success rate
        const failRoll = AncientRunicRunesmithEnchantingTableEngine.imbueRune(anvil, sword, "RUNE_OF_BERSERKING", () => 0.90);
        expect(failRoll.success).toBe(false);
        expect(failRoll.reason).toContain("Imbuing failed");
        expect(failRoll.remainingCatalyst).toBe(85);
        expect(sword.prefixAffix).toBeUndefined();
    });

    it("imbues suffix of the Aegis on armor item", () => {
        const table = AncientRunicRunesmithEnchantingTableEngine.constructTable("smith_02", "CELESTIAL_INSCRIPTION_TABLE", 100000);
        const shield: EnchantableEquipment = {
            equipmentId: "shield_01",
            equipmentName: "Runic Shield",
            qualityTier: "RARE",
            bonusPhysicalDamage: 0,
            bonusMagicResistance: 10,
            bonusAttackSpeedPercent: 0,
        };

        // Rune of Warding base 40 * 1.25 = +50 Magic Resistance
        const res = AncientRunicRunesmithEnchantingTableEngine.imbueRune(table, shield, "RUNE_OF_WARDING", () => 0.1);
        expect(res.success).toBe(true);
        expect(res.appliedAffix).toBe("of the Aegis");
        expect(res.finalBonusValue).toBe(50);
        expect(shield.suffixAffix).toBe("of the Aegis");
        expect(shield.bonusMagicResistance).toBe(60);
    });

    it("rejects imbuing when the affix slot is already occupied without consuming catalyst", () => {
        const anvil = AncientRunicRunesmithEnchantingTableEngine.constructTable("smith_03", "OBSIDIAN_RUNESMITH_ANVIL", 100000);
        const bow: EnchantableEquipment = {
            equipmentId: "bow_01",
            equipmentName: "Storm Bow",
            qualityTier: "COMMON",
            suffixAffix: "of the Wind",
            bonusPhysicalDamage: 20,
            bonusMagicResistance: 0,
            bonusAttackSpeedPercent: 10,
        };

        const failRes = AncientRunicRunesmithEnchantingTableEngine.imbueRune(anvil, bow, "RUNE_OF_HASTE");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already has suffix affix");
        expect(anvil.currentCatalystDurability).toBe(100);
    });

    it("rejects imbuing when catalyst is depleted and allows refueling", () => {
        const anvil = AncientRunicRunesmithEnchantingTableEngine.constructTable("smith_04", "OBSIDIAN_RUNESMITH_ANVIL", 100000);
        anvil.currentCatalystDurability = 10;

        const helm: EnchantableEquipment = {
            equipmentId: "helm_01",
            equipmentName: "Iron Helm",
            qualityTier: "COMMON",
            bonusPhysicalDamage: 0,
            bonusMagicResistance: 0,
            bonusAttackSpeedPercent: 0,
        };

        const fail = AncientRunicRunesmithEnchantingTableEngine.imbueRune(anvil, helm, "RUNE_OF_BERSERKING");
        expect(fail.success).toBe(false);
        expect(fail.reason).toContain("lacks catalyst");

        // Refuel
        const refuel = AncientRunicRunesmithEnchantingTableEngine.refuelCatalyst(anvil, 50);
        expect(refuel.success).toBe(true);
        expect(anvil.currentCatalystDurability).toBe(60);

        // Now imbuing succeeds
        const succ = AncientRunicRunesmithEnchantingTableEngine.imbueRune(anvil, helm, "RUNE_OF_BERSERKING", () => 0.1);
        expect(succ.success).toBe(true);
        expect(anvil.currentCatalystDurability).toBe(45);
    });

    it("guards against null inputs and unsupported table types", () => {
        expect(() => AncientRunicRunesmithEnchantingTableEngine.constructTable("s", "WOODEN_STOOL" as any)).toThrow(
            "Unsupported table type"
        );

        expect(AncientRunicRunesmithEnchantingTableEngine.imbueRune(null as any, null as any, "RUNE_OF_BERSERKING").success).toBe(false);
        expect(AncientRunicRunesmithEnchantingTableEngine.refuelCatalyst(null as any).success).toBe(false);
    });
});