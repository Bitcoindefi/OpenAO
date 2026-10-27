import crypto from "node:crypto";

/**
 * Ancient Runic Fishing Deep Abyss Harvesting, Harpoon Mastery & Leviathan Lure Engine for OpenAO MMORPG.
 * Simulates fishing rods & harpoons (Bamboo Rod, Mithril Harpoon, Abyssal Trident),
 * fishing biomes (Lava Springs, Sunken Glade, Abyssal Trench), bait lures (Glowing Grubs, Chrono Minnow, Leviathan Chum),
 * probabilistic bite/catch rate rolls, line tension mechanics (0% to 100%), snap risk, fillet yields, and tool wear.
 */

export type FishingGearType = "BAMBOO_RIVER_ROD" | "MITHRIL_REINFORCED_HARPOON" | "ABYSSAL_KRAKEN_TRIDENT";
export type FishingBiomeType = "LAVA_SPRINGS" | "SUNKEN_GLADE" | "ABYSSAL_TRENCH";
export type BaitLureType = "GLOWING_GRUBS" | "CHRONO_MINNOW" | "LEVIATHAN_PHEROMONE_CHUM";
export type AbyssalFishType = "OBSIDIAN_SALAMANDER" | "GOLDEN_ASTRAL_TROUT" | "COLOSSAL_ABYSSAL_KRAKEN";

export interface FishingGearData {
    gearType: FishingGearType;
    maxDurability: number;
    lineStrengthKg: number;
    baseCatchRatePercent: number; // 0 to 100
}

export interface BaitLureData {
    lureType: BaitLureType;
    biteChanceBonusPercent: number;
    tensionReductionPercent: number;
}

export interface FishSpeciesData {
    fishType: AbyssalFishType;
    biome: FishingBiomeType;
    baseWeightKg: number;
    baseFilletYield: number;
    baseGoldValue: number;
}

export interface ActiveFishingGear {
    gearId: string;
    fisherPlayerId: string;
    gearType: FishingGearType;
    currentDurability: number;
    maxDurability: number;
    lineStrengthKg: number;
    isBroken: boolean;
}

export interface HarvestedFishCatch {
    catchId: string;
    fishType: AbyssalFishType;
    weightKg: number;
    filletYield: number;
    goldValue: number;
    caughtEpochMs: number;
}

export const GEAR_CATALOG: Record<FishingGearType, FishingGearData> = {
    BAMBOO_RIVER_ROD: { gearType: "BAMBOO_RIVER_ROD", maxDurability: 60, lineStrengthKg: 30, baseCatchRatePercent: 75 },
    MITHRIL_REINFORCED_HARPOON: { gearType: "MITHRIL_REINFORCED_HARPOON", maxDurability: 140, lineStrengthKg: 80, baseCatchRatePercent: 88 },
    ABYSSAL_KRAKEN_TRIDENT: { gearType: "ABYSSAL_KRAKEN_TRIDENT", maxDurability: 250, lineStrengthKg: 200, baseCatchRatePercent: 98 },
};

export const LURE_CATALOG: Record<BaitLureType, BaitLureData> = {
    GLOWING_GRUBS: { lureType: "GLOWING_GRUBS", biteChanceBonusPercent: 15, tensionReductionPercent: 5 },
    CHRONO_MINNOW: { lureType: "CHRONO_MINNOW", biteChanceBonusPercent: 30, tensionReductionPercent: 20 },
    LEVIATHAN_PHEROMONE_CHUM: { lureType: "LEVIATHAN_PHEROMONE_CHUM", biteChanceBonusPercent: 60, tensionReductionPercent: 10 },
};

export const FISH_CATALOG: Record<AbyssalFishType, FishSpeciesData> = {
    OBSIDIAN_SALAMANDER: { fishType: "OBSIDIAN_SALAMANDER", biome: "LAVA_SPRINGS", baseWeightKg: 15, baseFilletYield: 4, baseGoldValue: 50 },
    GOLDEN_ASTRAL_TROUT: { fishType: "GOLDEN_ASTRAL_TROUT", biome: "SUNKEN_GLADE", baseWeightKg: 40, baseFilletYield: 10, baseGoldValue: 180 },
    COLOSSAL_ABYSSAL_KRAKEN: { fishType: "COLOSSAL_ABYSSAL_KRAKEN", biome: "ABYSSAL_TRENCH", baseWeightKg: 150, baseFilletYield: 45, baseGoldValue: 650 },
};

export class AncientRunicFishingDeepAbyssHarvestingEngine {
    public static readonly DURABILITY_COST_PER_CAST = 10;

    /**
     * Equips and initializes fishing gear.
     */
    public static forgeFishingGear(
        fisherPlayerId: string,
        gearType: FishingGearType,
        currentEpochMs = Date.now()
    ): ActiveFishingGear {
        const data = GEAR_CATALOG[gearType];
        if (!data) {
            throw new Error(`Unsupported fishing gear type: ${String(gearType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            gearId: `gear_${gearType.toLowerCase()}_${uuid}`,
            fisherPlayerId,
            gearType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            lineStrengthKg: data.lineStrengthKg,
            isBroken: false,
        };
    }

    /**
     * Casts line and reels in an abyssal catch.
     */
    public static castAndReel(
        gear: ActiveFishingGear,
        targetBiome: FishingBiomeType,
        lureType?: BaitLureType,
        reelTensionRoll = Math.random(),
        catchChanceRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; catchResult?: HarvestedFishCatch; isLineSnapped: boolean; remainingDurability: number; reason?: string } {
        if (!gear || gear.isBroken || gear.currentDurability < this.DURABILITY_COST_PER_CAST) {
            return { success: false, isLineSnapped: false, remainingDurability: gear?.currentDurability ?? 0, reason: "Fishing gear is broken or lacks durability." };
        }

        // Identify fish species for biome
        let targetFish: FishSpeciesData = FISH_CATALOG.GOLDEN_ASTRAL_TROUT;
        if (targetBiome === "LAVA_SPRINGS") targetFish = FISH_CATALOG.OBSIDIAN_SALAMANDER;
        else if (targetBiome === "ABYSSAL_TRENCH") targetFish = FISH_CATALOG.COLOSSAL_ABYSSAL_KRAKEN;

        const gearData = GEAR_CATALOG[gear.gearType];
        const lureData = lureType ? LURE_CATALOG[lureType] : undefined;

        // Calculate variance-adjusted weight first
        const weightMultiplier = 0.8 + (Math.max(0, Math.min(1, reelTensionRoll)) * 0.4);
        const actualWeight = Math.round(targetFish.baseWeightKg * weightMultiplier);

        // Evaluate line strength vs actual fish weight before consuming durability
        if (actualWeight > gearData.lineStrengthKg) {
            return {
                success: false,
                isLineSnapped: true,
                remainingDurability: gear.currentDurability,
                reason: `Line snapped! Actual fish weight (${actualWeight}kg) exceeds line test strength (${gearData.lineStrengthKg}kg).`,
            };
        }

        // Deduct durability for active cast
        gear.currentDurability -= this.DURABILITY_COST_PER_CAST;
        if (gear.currentDurability <= 0) {
            gear.currentDurability = Math.max(0, gear.currentDurability);
            gear.isBroken = true;
        }

        // Evaluate tension mechanics
        const tensionReduction = lureData ? lureData.tensionReductionPercent : 0;
        const tension = Math.max(0, (reelTensionRoll * 100) - tensionReduction);

        if (tension > 95) {
            return {
                success: false,
                isLineSnapped: true,
                remainingDurability: gear.currentDurability,
                reason: `Line snapped from excessive reeling tension (${tension.toFixed(1)}%).`,
            };
        }

        // Evaluate catch rate and bite chance bonus
        const totalCatchRatePercent = Math.min(100, gearData.baseCatchRatePercent + (lureData?.biteChanceBonusPercent ?? 0));
        const rollPercent = catchChanceRoll * 100;
        if (rollPercent > totalCatchRatePercent) {
            return {
                success: false,
                isLineSnapped: false,
                remainingDurability: gear.currentDurability,
                reason: `Fish got away: rolled ${rollPercent.toFixed(1)}, needed <= ${totalCatchRatePercent}%.`,
            };
        }

        const filletYield = Math.max(1, Math.round(targetFish.baseFilletYield * weightMultiplier));
        const goldVal = Math.round(targetFish.baseGoldValue * weightMultiplier);

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const fishCatch: HarvestedFishCatch = {
            catchId: `catch_${targetFish.fishType.toLowerCase()}_${uuid}`,
            fishType: targetFish.fishType,
            weightKg: actualWeight,
            filletYield,
            goldValue: goldVal,
            caughtEpochMs: currentEpochMs,
        };

        return {
            success: true,
            catchResult: fishCatch,
            isLineSnapped: false,
            remainingDurability: gear.currentDurability,
        };
    }

    /**
     * Repairs and maintains fishing gear.
     */
    public static repairGear(
        gear: ActiveFishingGear,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isBroken: boolean } {
        if (!gear || gear.isBroken) return { success: false, newDurability: gear?.currentDurability ?? 0, isBroken: true };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        gear.currentDurability = Math.min(gear.maxDurability, gear.currentDurability + amt);

        return {
            success: true,
            newDurability: gear.currentDurability,
            isBroken: false,
        };
    }
}