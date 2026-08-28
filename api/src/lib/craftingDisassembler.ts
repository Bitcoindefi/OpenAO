/**
 * Crafting Item Disassembly & Salvage Recovery Engine for OpenAO MMORPG.
 * Simulates item salvage/breakdown into raw materials, scaling recovery yield
 * with crafting skill level, critical salvage bonus rolls, and durability condition penalties.
 */

export type CraftingMaterialType = 
    | "IRON_INGOT" 
    | "SILVER_INGOT" 
    | "GOLD_INGOT" 
    | "MITHRIL_ORE" 
    | "DRAGON_SCALE" 
    | "ENCHANTED_LEATHER" 
    | "WOOD_TIMBER";

export interface SalvageMaterialYield {
    material: CraftingMaterialType;
    quantity: number;
    isCriticalBonus?: boolean;
}

export interface SalvageRecipe {
    itemTemplateId: string;
    requiredSkillLevel: number;
    baseYields: Array<{ material: CraftingMaterialType; baseQuantity: number }>;
    criticalBonusMaterial?: CraftingMaterialType;
}

export interface DisassembleItemParams {
    itemTemplateId: string;
    currentDurability: number;
    maxDurability: number;
    playerBlacksmithSkill: number; // 1 to 100
    isBroken?: boolean;
}

export interface DisassembleResult {
    success: boolean;
    yields: SalvageMaterialYield[];
    salvageEfficiencyPercent: number;
    wasCriticalSalvage: boolean;
    reason?: string;
}

export const SALVAGE_RECIPES: Record<string, SalvageRecipe> = {
    iron_plate_armor: {
        itemTemplateId: "iron_plate_armor",
        requiredSkillLevel: 10,
        baseYields: [
            { material: "IRON_INGOT", baseQuantity: 12 },
            { material: "ENCHANTED_LEATHER", baseQuantity: 4 },
        ],
        criticalBonusMaterial: "MITHRIL_ORE",
    },
    mithril_broadsword: {
        itemTemplateId: "mithril_broadsword",
        requiredSkillLevel: 45,
        baseYields: [
            { material: "MITHRIL_ORE", baseQuantity: 8 },
            { material: "WOOD_TIMBER", baseQuantity: 2 },
        ],
        criticalBonusMaterial: "DRAGON_SCALE",
    },
    golden_scepter: {
        itemTemplateId: "golden_scepter",
        requiredSkillLevel: 25,
        baseYields: [
            { material: "GOLD_INGOT", baseQuantity: 6 },
            { material: "SILVER_INGOT", baseQuantity: 4 },
        ],
    },
};

export class CraftingDisassemblerEngine {
    /**
     * Disassembles an item into recovered raw materials with condition and skill modifiers.
     */
    public static disassembleItem(
        params: DisassembleItemParams,
        rng: () => number = Math.random
    ): DisassembleResult {
        const recipe = SALVAGE_RECIPES[params.itemTemplateId];
        if (!recipe) {
            return {
                success: false,
                yields: [],
                salvageEfficiencyPercent: 0,
                wasCriticalSalvage: false,
                reason: "Item cannot be disassembled or has no salvage recipe.",
            };
        }

        const skill = Math.min(100, Math.max(1, params.playerBlacksmithSkill));
        if (skill < recipe.requiredSkillLevel) {
            return {
                success: false,
                yields: [],
                salvageEfficiencyPercent: 0,
                wasCriticalSalvage: false,
                reason: `Insufficient skill level. Requires Blacksmithing ${recipe.requiredSkillLevel}.`,
            };
        }

        // Durability integrity ratio
        const maxDur = Math.max(1, params.maxDurability);
        const curDur = Math.min(maxDur, Math.max(0, params.currentDurability));
        const durabilityRatio = params.isBroken ? 0.25 : curDur / maxDur;

        // Skill efficiency: 40% at skill 1 up to 85% at skill 100
        const skillEfficiency = 0.40 + (skill / 100) * 0.45; // 0.40 to 0.85
        const totalEfficiency = Math.max(0.10, skillEfficiency * durabilityRatio);

        // Critical Salvage Chance: 5% base + 1% per 10 skill levels (max 15%)
        const criticalChance = 0.05 + (skill / 1000);
        const wasCriticalSalvage = rng() < criticalChance;

        const yields: SalvageMaterialYield[] = [];

        for (const base of recipe.baseYields) {
            const recoveredQty = Math.max(1, Math.floor(base.baseQuantity * totalEfficiency));
            yields.push({
                material: base.material,
                quantity: recoveredQty,
                isCriticalBonus: false,
            });
        }

        // Add bonus material on critical salvage roll, merging if material already present
        if (wasCriticalSalvage && recipe.criticalBonusMaterial) {
            const existing = yields.find(y => y.material === recipe.criticalBonusMaterial);
            if (existing) {
                existing.quantity += 1;
                existing.isCriticalBonus = true;
            } else {
                yields.push({
                    material: recipe.criticalBonusMaterial,
                    quantity: 1,
                    isCriticalBonus: true,
                });
            }
        }

        return {
            success: true,
            yields,
            salvageEfficiencyPercent: Math.round(totalEfficiency * 100),
            wasCriticalSalvage,
        };
    }
}