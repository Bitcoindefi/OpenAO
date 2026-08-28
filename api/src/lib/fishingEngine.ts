/**
 * Water Tile Fishing Simulation & Loot Catch Engine for OpenAO MMORPG.
 * Simulates water salinity/depth classifications, bait modifiers, nocturnal species,
 * and sunken treasure chest recovery with robust input validation.
 */

export type WaterTileType = "FRESHWATER_RIVER" | "COASTAL_OCEAN" | "DEEP_SEA" | "LAVA_LAKE";

export interface FishingRod {
    rodId: string;
    name: string;
    tier: number; // 1 to 4
    bonusCatchPercent: number; // e.g. 0.05 = +5%
}

export interface FishingBait {
    baitId: string;
    name: string;
    potency: number; // 1 to 3
    attractsRare: boolean;
}

export interface FishSpecies {
    speciesId: string;
    name: string;
    waterType: WaterTileType;
    minSkill: number;
    baseCatchWeight: number;
    goldValue: number;
    isNocturnalOnly?: boolean;
    isTreasureChest?: boolean;
}

export interface FishAttemptParams {
    fishingSkill: number; // 1 to 100
    rod: FishingRod;
    bait?: FishingBait;
    waterType: WaterTileType;
    isNightTime: boolean;
    rng?: () => number;
}

export interface FishCatchResult {
    success: boolean;
    caughtFish?: FishSpecies;
    skillExpGained: number;
    reason?: string;
}

export const FISH_SPECIES_CATALOG: FishSpecies[] = [
    { speciesId: "carp_river", name: "River Carp", waterType: "FRESHWATER_RIVER", minSkill: 1, baseCatchWeight: 60, goldValue: 5 },
    { speciesId: "trout_river", name: "Rainbow Trout", waterType: "FRESHWATER_RIVER", minSkill: 20, baseCatchWeight: 30, goldValue: 18 },
    { speciesId: "salmon_ocean", name: "Coastal Salmon", waterType: "COASTAL_OCEAN", minSkill: 35, baseCatchWeight: 45, goldValue: 35 },
    { speciesId: "shadow_eel", name: "Shadow Eel", waterType: "COASTAL_OCEAN", minSkill: 50, baseCatchWeight: 25, goldValue: 75, isNocturnalOnly: true },
    { speciesId: "kraken_tentacle", name: "Deep Kraken Tentacle", waterType: "DEEP_SEA", minSkill: 75, baseCatchWeight: 15, goldValue: 250 },
    { speciesId: "magma_swordfish", name: "Magma Swordfish", waterType: "LAVA_LAKE", minSkill: 90, baseCatchWeight: 10, goldValue: 500 },
    { speciesId: "sunken_treasure", name: "Sunken Treasure Chest", waterType: "DEEP_SEA", minSkill: 60, baseCatchWeight: 5, goldValue: 1000, isTreasureChest: true },
];

export class FishingEngine {
    public static calculateCatchChance(
        skill: number,
        rodTier: number,
        rodBonus: number,
        baitPotency = 0
    ): number {
        const clampedSkill = Math.min(100, Math.max(1, skill));
        const clampedRodTier = Math.min(4, Math.max(1, rodTier));
        const clampedBait = Math.min(3, Math.max(0, baitPotency));

        // Base formula: 30% + (skill / 100 * 45%) + (rodTier * 4%) + rodBonus + (bait * 5%)
        const chance = 0.30 + (clampedSkill / 100) * 0.45 + clampedRodTier * 0.04 + rodBonus + clampedBait * 0.05;
        return Math.min(0.95, Math.max(0.10, chance));
    }

    public static attemptFishing(params: FishAttemptParams): FishCatchResult {
        const rng = params.rng || Math.random;
        const catchChance = this.calculateCatchChance(
            params.fishingSkill,
            params.rod.tier,
            params.rod.bonusCatchPercent,
            params.bait?.potency ?? 0
        );

        if (rng() > catchChance) {
            return {
                success: false,
                skillExpGained: 2,
                reason: "The fish escaped the hook.",
            };
        }

        const eligible = FISH_SPECIES_CATALOG.filter((fish) => {
            if (fish.waterType !== params.waterType) return false;
            if (fish.minSkill > params.fishingSkill) return false;
            if (fish.isNocturnalOnly && !params.isNightTime) return false;
            return true;
        });

        if (eligible.length === 0) {
            return {
                success: false,
                skillExpGained: 1,
                reason: "No fish of suitable skill inhabit these waters.",
            };
        }

        let totalWeight = 0;
        const weightedPool = eligible.map((fish) => {
            let weight = fish.baseCatchWeight;
            if (fish.isTreasureChest && params.bait?.attractsRare) {
                weight *= 3.0;
            }
            totalWeight += weight;
            return { fish, weight };
        });

        let roll = rng() * totalWeight;
        let selectedFish: FishSpecies = eligible[0];

        for (const item of weightedPool) {
            if (roll < item.weight) {
                selectedFish = item.fish;
                break;
            }
            roll -= item.weight;
        }

        const exp = Math.max(5, Math.floor(selectedFish.minSkill * 1.5));

        return {
            success: true,
            caughtFish: selectedFish,
            skillExpGained: exp,
        };
    }
}