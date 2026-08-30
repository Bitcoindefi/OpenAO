import crypto from "node:crypto";

/**
 * Ancient Runic Enchanting, Arcane Disenchantment & Imbuing Engine for OpenAO MMORPG.
 * Simulates enchanting altars (Novice Arcane Table, Astral Crystal Altar, Void Nexus Conduit),
 * arcane dusts & reagents (Mystic Dust, Astral Shard, Void Core Fragment),
 * enchantment formulas (Fiery Blade Strike, Prismatic Aegis Ward, Celestial Surge Imbuing),
 * independent imbuing quality ratings scaling with altar enchanting power (0% to 100%),
 * item disenchanting salvage, reagent consumption, and altar attunement.
 */

export type EnchantingAltarType = "NOVICE_ARCANE_TABLE" | "ASTRAL_CRYSTAL_ALTAR" | "VOID_NEXUS_CONDUIT";
export type ArcaneReagentType = "MYSTIC_DUST" | "ASTRAL_SHARD" | "VOID_CORE_FRAGMENT";
export type EnchantmentFormulaType = "FIERY_BLADE_STRIKE" | "PRISMATIC_AEGIS_WARD" | "CELESTIAL_SURGE_IMBUING";

export interface EnchantingAltarData {
    altarType: EnchantingAltarType;
    maxDurability: number;
    enchantingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    potencyBonusPercent: number;
}

export interface EnchantmentFormulaData {
    formulaType: EnchantmentFormulaType;
    requiredReagentType: ArcaneReagentType;
    requiredReagentCount: number;
    statType: "FIRE_DAMAGE" | "ALL_RESISTANCES" | "ALL_ATTRIBUTES";
    baseStatValue: number;
}

export interface ActiveEnchantingAltar {
    altarId: string;
    enchanterPlayerId: string;
    altarType: EnchantingAltarType;
    currentDurability: number;
    maxDurability: number;
    enchantingPower: number;
    isAttuned: boolean;
}

export interface AppliedEnchantmentResult {
    enchantmentId: string;
    formulaType: EnchantmentFormulaType;
    statType: string;
    finalStatValue: number;
    imbuingQualityPercent: number; // 0 to 100
    consumedReagentCount: number;
    consumedReagentType: ArcaneReagentType;
    remainingReagents: ArcaneReagentType[];
    enchantedEpochMs: number;
}

export interface DisenchantResult {
    disenchantId: string;
    salvagedReagent: ArcaneReagentType;
    salvagedReagentCount: number;
    purityQualityPercent: number;
    disenchantedEpochMs: number;
}

export const ALTAR_CATALOG: Record<EnchantingAltarType, EnchantingAltarData> = {
    NOVICE_ARCANE_TABLE: { altarType: "NOVICE_ARCANE_TABLE", maxDurability: 80, enchantingPower: 25, baseSuccessRatePercent: 85, potencyBonusPercent: 10 },
    ASTRAL_CRYSTAL_ALTAR: { altarType: "ASTRAL_CRYSTAL_ALTAR", maxDurability: 180, enchantingPower: 65, baseSuccessRatePercent: 92, potencyBonusPercent: 20 },
    VOID_NEXUS_CONDUIT: { altarType: "VOID_NEXUS_CONDUIT", maxDurability: 320, enchantingPower: 120, baseSuccessRatePercent: 99, potencyBonusPercent: 35 },
};

export const FORMULA_CATALOG: Record<EnchantmentFormulaType, EnchantmentFormulaData> = {
    FIERY_BLADE_STRIKE: { formulaType: "FIERY_BLADE_STRIKE", requiredReagentType: "MYSTIC_DUST", requiredReagentCount: 2, statType: "FIRE_DAMAGE", baseStatValue: 35 },
    PRISMATIC_AEGIS_WARD: { formulaType: "PRISMATIC_AEGIS_WARD", requiredReagentType: "ASTRAL_SHARD", requiredReagentCount: 2, statType: "ALL_RESISTANCES", baseStatValue: 45 },
    CELESTIAL_SURGE_IMBUING: { formulaType: "CELESTIAL_SURGE_IMBUING", requiredReagentType: "VOID_CORE_FRAGMENT", requiredReagentCount: 2, statType: "ALL_ATTRIBUTES", baseStatValue: 80 },
};

export class AncientRunicEnchantingDisenchantingEngine {
    public static readonly DURABILITY_COST_PER_ENCHANT = 12;

    /**
     * Constructs and attunes an enchanting altar.
     */
    public static attuneAltar(
        enchanterPlayerId: string,
        altarType: EnchantingAltarType,
        currentEpochMs = Date.now()
    ): ActiveEnchantingAltar {
        const data = ALTAR_CATALOG[altarType];
        if (!data) {
            throw new Error(`Unsupported altar type: ${String(altarType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            altarId: `altar_${altarType.toLowerCase()}_${uuid}`,
            enchanterPlayerId,
            altarType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            enchantingPower: data.enchantingPower,
            isAttuned: true,
        };
    }

    /**
     * Enchants equipment with arcane formula, consuming reagents and scaling potency with altar power.
     */
    public static enchantItem(
        altar: ActiveEnchantingAltar,
        formulaType: EnchantmentFormulaType,
        providedReagents: ArcaneReagentType[],
        enchantRoll = Math.random(),
        qualityRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: AppliedEnchantmentResult; remainingDurability: number; reason?: string } {
        if (!altar || !altar.isAttuned || altar.currentDurability < this.DURABILITY_COST_PER_ENCHANT) {
            return {
                success: false,
                remainingDurability: altar?.currentDurability ?? 0,
                reason: `Altar is un-attuned or lacks durability (requires ${this.DURABILITY_COST_PER_ENCHANT}).`,
            };
        }

        const formula = FORMULA_CATALOG[formulaType];
        if (!formula) {
            return { success: false, remainingDurability: altar.currentDurability, reason: `Unknown formula: ${String(formulaType)}` };
        }

        if (!Array.isArray(providedReagents)) {
            return { success: false, remainingDurability: altar.currentDurability, reason: "Invalid reagents array." };
        }

        const matchingCount = providedReagents.filter(r => r === formula.requiredReagentType).length;
        if (matchingCount < formula.requiredReagentCount) {
            return {
                success: false,
                remainingDurability: altar.currentDurability,
                reason: `Insufficient reagents: requires ${formula.requiredReagentCount}x ${formula.requiredReagentType}, provided ${matchingCount}.`,
            };
        }

        altar.currentDurability -= this.DURABILITY_COST_PER_ENCHANT;
        if (altar.currentDurability <= 0) {
            altar.currentDurability = Math.max(0, altar.currentDurability);
            altar.isAttuned = false;
        }

        const altarData = ALTAR_CATALOG[altar.altarType];
        const safeRoll = Number.isFinite(enchantRoll) ? Math.max(0, Math.min(1, enchantRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > altarData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: altar.currentDurability,
                reason: `Enchantment fizzled: arcane energy dissipated, rolled ${rollPercent.toFixed(1)}, needed <= ${altarData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent imbuing quality score factoring enchantingPower (0% to 100%)
        const safeQualityRoll = Number.isFinite(qualityRoll) ? Math.max(0, Math.min(1, qualityRoll)) : Math.random();
        const powerRatio = Math.min(1.0, altar.enchantingPower / 120); // 0.208 (novice) to 1.0 (void)
        const qualityScore = Math.max(0, Math.min(100, Math.round(
            (safeQualityRoll * 40) + (powerRatio * 40) + (altarData.potencyBonusPercent * 0.57)
        )));
        const qualityMultiplier = 0.8 + ((qualityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalValue = Math.round(formula.baseStatValue * qualityMultiplier);

        // Splice consumed reagents out of cloned array
        const remaining = [...providedReagents];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < formula.requiredReagentCount; i--) {
            if (remaining[i] === formula.requiredReagentType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const res: AppliedEnchantmentResult = {
            enchantmentId: `ench_${recipeSafe(formulaType)}_${uuid}`,
            formulaType,
            statType: formula.statType,
            finalStatValue: finalValue,
            imbuingQualityPercent: qualityScore,
            consumedReagentCount: formula.requiredReagentCount,
            consumedReagentType: formula.requiredReagentType,
            remainingReagents: remaining,
            enchantedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            result: res,
            remainingDurability: altar.currentDurability,
        };
    }

    /**
     * Disenchants magical gear into salvaged arcane reagents.
     */
    public static disenchantItem(
        altar: ActiveEnchantingAltar,
        itemTier: "RARE" | "EPIC" | "LEGENDARY",
        salvageRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; result?: DisenchantResult; remainingDurability: number; reason?: string } {
        if (!altar || !altar.isAttuned || altar.currentDurability < this.DURABILITY_COST_PER_ENCHANT) {
            return {
                success: false,
                remainingDurability: altar?.currentDurability ?? 0,
                reason: "Altar lacks durability for disenchanting.",
            };
        }

        altar.currentDurability -= this.DURABILITY_COST_PER_ENCHANT;
        if (altar.currentDurability <= 0) {
            altar.currentDurability = 0;
            altar.isAttuned = false;
        }

        let reagent: ArcaneReagentType = "MYSTIC_DUST";
        let baseCount = 2;
        if (itemTier === "EPIC") {
            reagent = "ASTRAL_SHARD";
            baseCount = 3;
        } else if (itemTier === "LEGENDARY") {
            reagent = "VOID_CORE_FRAGMENT";
            baseCount = 4;
        }

        const safeRoll = Number.isFinite(salvageRoll) ? Math.max(0, Math.min(1, salvageRoll)) : Math.random();
        const purityScore = Math.max(0, Math.min(100, Math.round(50 + safeRoll * 50)));

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const disResult: DisenchantResult = {
            disenchantId: `disench_${uuid}`,
            salvagedReagent: reagent,
            salvagedReagentCount: baseCount,
            purityQualityPercent: purityScore,
            disenchantedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            result: disResult,
            remainingDurability: altar.currentDurability,
        };
    }

    /**
     * Recharges altar attunement and durability.
     */
    public static rechargeAltar(
        altar: ActiveEnchantingAltar,
        rechargeAmount = 60
    ): { success: boolean; newDurability: number; isAttuned: boolean } {
        if (!altar) return { success: false, newDurability: 0, isAttuned: false };

        const amt = Number.isFinite(rechargeAmount) ? Math.max(0, repairOrRecharge(rechargeAmount)) : 60;
        altar.currentDurability = Math.min(altar.maxDurability, altar.currentDurability + amt);
        altar.isAttuned = altar.currentDurability > 0;

        return {
            success: true,
            newDurability: altar.currentDurability,
            isAttuned: altar.isAttuned,
        };
    }
}

function recipeSafe(formula: string): string {
    return formula.toLowerCase();
}

function repairOrRecharge(val: number): number {
    return Math.max(0, val);
}