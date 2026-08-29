import crypto from "node:crypto";

/**
 * Beastmaster Creature Taming, Pet Loyalty Bond & Pack Synergy Engine for OpenAO MMORPG.
 * Simulates mythical beast taming (Direwolf, Shadow Panther, Celestial Gryphon), pheromone baits,
 * loyalty affinity points (0 to 100), pet starvation disobedience, and Alpha Pack battle synergies.
 */

export type BeastSpecies = "TUNDRA_DIREWOLF" | "SHADOW_STALKER_PANTHER" | "CELESTIAL_SKY_GRYPHON";
export type PheromoneBaitType = "WILD_MEAT_CHUNKS" | "PHEROMONE_SCENT_GLAND" | "AMBROSIA_TREAT";

export interface BeastSpeciesData {
    species: BeastSpecies;
    baseTameDifficultyPercent: number; // 0 to 100
    baseAttackDamage: number;
    maxHp: number;
}

export interface TamedBeastPet {
    petId: string;
    masterPlayerId: string;
    species: BeastSpecies;
    petName: string;
    currentHp: number;
    maxHp: number;
    loyaltyPoints: number; // 0 to 100
    isRebellious: boolean;
    isAlive: boolean;
    tamedEpochMs: number;
}

export const BEAST_SPECIES_CATALOG: Record<BeastSpecies, BeastSpeciesData> = {
    TUNDRA_DIREWOLF: { species: "TUNDRA_DIREWOLF", baseTameDifficultyPercent: 50, baseAttackDamage: 85, maxHp: 1200 },
    SHADOW_STALKER_PANTHER: { species: "SHADOW_STALKER_PANTHER", baseTameDifficultyPercent: 65, baseAttackDamage: 110, maxHp: 1500 },
    CELESTIAL_SKY_GRYPHON: { species: "CELESTIAL_SKY_GRYPHON", baseTameDifficultyPercent: 80, baseAttackDamage: 140, maxHp: 2200 },
};

export const BAIT_MODIFIERS: Record<PheromoneBaitType, { tameBonusPercent: number; loyaltyRestore: number }> = {
    WILD_MEAT_CHUNKS: { tameBonusPercent: 20, loyaltyRestore: 15 },
    PHEROMONE_SCENT_GLAND: { tameBonusPercent: 40, loyaltyRestore: 30 },
    AMBROSIA_TREAT: { tameBonusPercent: 80, loyaltyRestore: 60 },
};

export class BeastMasterTamingBondEngine {
    public static readonly ALPHA_LOYALTY_THRESHOLD = 80;
    public static readonly REBELLION_LOYALTY_THRESHOLD = 20;

    /**
     * Attempts to tame a wild mythical beast using pheromone bait.
     */
    public static attemptTameBeast(
        masterPlayerId: string,
        species: BeastSpecies,
        petName: string,
        bait?: PheromoneBaitType,
        rng: () => number = Math.random,
        currentEpochMs = Date.now()
    ): { success: boolean; tamedPet?: TamedBeastPet; reason?: string } {
        if (!masterPlayerId || typeof masterPlayerId !== "string") {
            return { success: false, reason: "Invalid master player." };
        }

        const speciesData = BEAST_SPECIES_CATALOG[species];
        if (!speciesData) {
            return { success: false, reason: `Unknown beast species: ${String(species)}` };
        }

        const baitBonus = bait && BAIT_MODIFIERS[bait] ? BAIT_MODIFIERS[bait].tameBonusPercent : 0;
        const successChance = Math.max(10, Math.min(95, 100 - speciesData.baseTameDifficultyPercent + baitBonus));

        if (rng() * 100 >= successChance) {
            return { success: false, reason: "The wild beast resisted taming and fled into the wilderness." };
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const pet: TamedBeastPet = {
            petId: `pet_${species.toLowerCase()}_${uuid}`,
            masterPlayerId,
            species,
            petName: petName?.trim() || speciesData.species,
            currentHp: speciesData.maxHp,
            maxHp: speciesData.maxHp,
            loyaltyPoints: 50, // Starts at neutral loyalty
            isRebellious: false,
            isAlive: true,
            tamedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            tamedPet: pet,
        };
    }

    /**
     * Feeds the tamed beast to restore loyalty points and health.
     */
    public static feedPet(
        pet: TamedBeastPet,
        bait: PheromoneBaitType
    ): { success: boolean; newLoyalty: number; isAlphaSynergyActive: boolean; reason?: string } {
        if (!pet || !pet.isAlive) {
            return { success: false, newLoyalty: 0, isAlphaSynergyActive: false, reason: "Pet is dead or invalid." };
        }

        const foodData = BAIT_MODIFIERS[bait];
        if (!foodData) {
            return { success: false, newLoyalty: pet.loyaltyPoints, isAlphaSynergyActive: false, reason: "Invalid bait food." };
        }

        pet.loyaltyPoints = Math.min(100, pet.loyaltyPoints + foodData.loyaltyRestore);
        pet.currentHp = Math.min(pet.maxHp, pet.currentHp + Math.round(pet.maxHp * 0.25));

        if (pet.loyaltyPoints >= this.REBELLION_LOYALTY_THRESHOLD) {
            pet.isRebellious = false;
        }

        return {
            success: true,
            newLoyalty: pet.loyaltyPoints,
            isAlphaSynergyActive: pet.loyaltyPoints >= this.ALPHA_LOYALTY_THRESHOLD,
        };
    }

    /**
     * Simulates hunger / neglect loyalty decay over time.
     */
    public static tickLoyaltyDecay(
        pet: TamedBeastPet,
        decayPoints = 10
    ): { success: boolean; newLoyalty: number; isRebellious: boolean } {
        if (!pet || !pet.isAlive) {
            return { success: false, newLoyalty: 0, isRebellious: false };
        }

        const decay = Number.isFinite(decayPoints) ? Math.max(1, decayPoints) : 10;
        pet.loyaltyPoints = Math.max(0, pet.loyaltyPoints - decay);

        if (pet.loyaltyPoints < this.REBELLION_LOYALTY_THRESHOLD) {
            pet.isRebellious = true;
        }

        return {
            success: true,
            newLoyalty: pet.loyaltyPoints,
            isRebellious: pet.isRebellious,
        };
    }

    /**
     * Issues an attack command to the tamed beast against a target enemy.
     */
    public static commandAttack(
        pet: TamedBeastPet,
        enemyDefenseRating = 0
    ): { success: boolean; damageDealt: number; isAlphaBonusApplied: boolean; reason?: string } {
        if (!pet || !pet.isAlive) {
            return { success: false, damageDealt: 0, isAlphaBonusApplied: false, reason: "Pet is dead or invalid." };
        }

        if (pet.loyaltyPoints < this.REBELLION_LOYALTY_THRESHOLD) {
            pet.isRebellious = true;
            return { success: false, damageDealt: 0, isAlphaBonusApplied: false, reason: "Pet is disobedient and refused the command due to low loyalty." };
        }

        const speciesData = BEAST_SPECIES_CATALOG[pet.species];
        const isAlpha = pet.loyaltyPoints >= this.ALPHA_LOYALTY_THRESHOLD;
        const alphaMultiplier = isAlpha ? 1.30 : 1.0;

        const defense = Number.isFinite(enemyDefenseRating) ? Math.max(0, enemyDefenseRating) : 0;
        const mitigation = 100 / (100 + defense);

        const damage = Math.max(10, Math.round(speciesData.baseAttackDamage * alphaMultiplier * mitigation));

        return {
            success: true,
            damageDealt: damage,
            isAlphaBonusApplied: isAlpha,
        };
    }
}