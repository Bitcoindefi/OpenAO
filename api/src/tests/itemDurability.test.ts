import { describe, it, expect } from "vitest";
import { ItemDurabilityEngine, EquipmentItem } from "../lib/itemDurability.js";

describe("ItemDurabilityEngine Durability Loss and Blacksmith Gold Verification", () => {
    it("degrades item on combat hit and flags as broken at zero durability", () => {
        const sword: EquipmentItem = {
            id: "sword_01",
            name: "Broadsword",
            currentDurability: 2,
            maxDurability: 50,
            goldCostPerDurabilityPoint: 5,
            isBroken: false,
        };

        ItemDurabilityEngine.applyDurabilityLoss(sword, 2);
        expect(sword.currentDurability).toBe(0);
        expect(sword.isBroken).toBe(true);
    });

    it("clears isBroken flag even on zero-cost repair path", () => {
        const brokenFullItem: EquipmentItem = {
            id: "armor_01",
            name: "Plate Armor",
            currentDurability: 100,
            maxDurability: 100,
            goldCostPerDurabilityPoint: 10,
            isBroken: true, // Edge case: flag was true despite full durability
        };

        const res = ItemDurabilityEngine.repairItem(brokenFullItem, 500);
        expect(res.success).toBe(true);
        expect(res.goldCost).toBe(0);
        expect(brokenFullItem.isBroken).toBe(false);
    });

    it("gates repair on player gold balance and prevents free repairs", () => {
        const item: EquipmentItem = {
            id: "helm_01",
            name: "Iron Helm",
            currentDurability: 10,
            maxDurability: 20, // 10 missing * 5 gold = 50 gold cost
            goldCostPerDurabilityPoint: 5,
            isBroken: false,
        };

        // Player only has 20 gold (needs 50)
        const failRes = ItemDurabilityEngine.repairItem(item, 20);
        expect(failRes.success).toBe(false);
        expect(item.currentDurability).toBe(10); // Durability not mutated

        // Player has 100 gold
        const passRes = ItemDurabilityEngine.repairItem(item, 100);
        expect(passRes.success).toBe(true);
        expect(passRes.goldCost).toBe(50);
        expect(passRes.remainingGold).toBe(50);
        expect(item.currentDurability).toBe(20);
        expect(item.isBroken).toBe(false);
    });
});