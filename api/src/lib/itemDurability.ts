/**
 * Weapon and Armor Durability Degradation & Repair Engine for OpenAO MMORPG.
 * Simulates item wear on combat hits, breakage thresholds, and blacksmith gold repair costs
 * with strict gold balance gating and broken flag clearance.
 */

export interface EquipmentItem {
    id: string;
    name: string;
    currentDurability: number;
    maxDurability: number;
    goldCostPerDurabilityPoint: number;
    isBroken: boolean;
}

export interface RepairResult {
    success: boolean;
    goldCost: number;
    remainingGold: number;
    reason?: string;
}

export class ItemDurabilityEngine {
    /**
     * Applies durability loss to an equipped item following a combat hit.
     */
    public static applyDurabilityLoss(item: EquipmentItem, lossPoints = 1): boolean {
        if (item.isBroken) {
            return true;
        }

        const safeLoss = Math.max(1, lossPoints);
        item.currentDurability = Math.max(0, item.currentDurability - safeLoss);

        if (item.currentDurability === 0) {
            item.isBroken = true;
        }

        return item.isBroken;
    }

    /**
     * Calculates the gold required to restore an item to maximum durability.
     */
    public static calculateRepairCost(item: EquipmentItem): number {
        const missingDurability = Math.max(0, item.maxDurability - item.currentDurability);
        return missingDurability * item.goldCostPerDurabilityPoint;
    }

    /**
     * Repairs an item if the player has sufficient gold.
     * Clears the isBroken flag and deducts the appropriate gold cost.
     */
    public static repairItem(item: EquipmentItem, availableGold: number): RepairResult {
        const cost = this.calculateRepairCost(item);

        if (cost === 0) {
            item.currentDurability = item.maxDurability;
            item.isBroken = false;
            return {
                success: true,
                goldCost: 0,
                remainingGold: availableGold,
            };
        }

        if (availableGold < cost) {
            return {
                success: false,
                goldCost: cost,
                remainingGold: availableGold,
                reason: "Insufficient gold to cover repair costs.",
            };
        }

        item.currentDurability = item.maxDurability;
        item.isBroken = false;

        return {
            success: true,
            goldCost: cost,
            remainingGold: availableGold - cost,
        };
    }
}