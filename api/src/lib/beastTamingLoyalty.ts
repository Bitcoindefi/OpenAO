/**
 * Wild Beast Taming, Pet Loyalty & Combat Command Engine for OpenAO MMORPG.
 * Simulates baiting wild creatures, taming probability rolls based on beastmaster skill,
 * pet loyalty mood tiers (Rebellious, Content, Devoted), feeding diets, and combat attack commands.
 */

export type BeastSpecies = "DIRE_WOLF" | "SHADOW_PANTHER" | "GRIFFON" | "FOREST_BEAR";
export type PetMoodTier = "REBELLIOUS" | "CONTENT" | "DEVOTED";
export type PetFoodDiet = "MEAT" | "FISH" | "BERRIES";

export interface BeastDefinition {
    species: BeastSpecies;
    baseTameChance: number; // 0 to 1 base probability modifier
    baseAttackDamage: number;
    preferredDiet: PetFoodDiet;
    maxHealth: number;
}

export interface WildCreatureTarget {
    creatureId: string;
    species: BeastSpecies;
    currentHp: number;
    maxHp: number;
}

export interface TamedPetCompanion {
    petId: string;
    ownerPlayerId: string;
    species: BeastSpecies;
    petName: string;
    currentHp: number;
    maxHp: number;
    loyaltyPoints: number; // 0 to 100
    mood: PetMoodTier;
    lastFedEpochMs: number;
    isAlive: boolean;
}

export const BEAST_SPECIES_DATA: Record<BeastSpecies, BeastDefinition> = {
    DIRE_WOLF: {
        species: "DIRE_WOLF",
        baseTameChance: 0.40,
        baseAttackDamage: 120,
        preferredDiet: "MEAT",
        maxHealth: 1500,
    },
    SHADOW_PANTHER: {
        species: "SHADOW_PANTHER",
        baseTameChance: 0.30,
        baseAttackDamage: 180,
        preferredDiet: "MEAT",
        maxHealth: 1200,
    },
    GRIFFON: {
        species: "GRIFFON",
        baseTameChance: 0.20,
        baseAttackDamage: 240,
        preferredDiet: "FISH",
        maxHealth: 2200,
    },
    FOREST_BEAR: {
        species: "FOREST_BEAR",
        baseTameChance: 0.35,
        baseAttackDamage: 150,
        preferredDiet: "BERRIES",
        maxHealth: 3000,
    },
};

export class BeastTamingLoyaltyEngine {
    public static readonly MAX_LOYALTY = 100;

    /**
     * Determines the pet mood tier based on loyalty points.
     */
    public static calculateMood(loyaltyPoints: number): PetMoodTier {
        if (loyaltyPoints >= 80) return "DEVOTED";
        if (loyaltyPoints >= 30) return "CONTENT";
        return "REBELLIOUS";
    }

    /**
     * Attempts to tame a wild creature.
     */
    public static attemptTame(
        target: WildCreatureTarget,
        hunterSkillLevel: number,
        ownerPlayerId: string,
        petName: string,
        rng: () => number = Math.random
    ): { success: boolean; pet?: TamedPetCompanion; reason?: string } {
        if (!target || target.currentHp <= 0) {
            return { success: false, reason: "Target creature is dead or invalid." };
        }

        const data = BEAST_SPECIES_DATA[target.species];
        if (!data) {
            return { success: false, reason: `Unsupported beast species: ${String(target.species)}` };
        }

        const skill = Math.max(1, Math.min(100, Number.isFinite(hunterSkillLevel) ? hunterSkillLevel : 1));
        const hpRatio = Math.max(0.01, Math.min(1.0, target.currentHp / Math.max(1, target.maxHp)));

        // Taming formula: Base * (1 + skill/100) * (1 - hpRatio * 0.50)
        const successRate = Math.min(0.95, data.baseTameChance * (1 + skill / 100) * (1 - hpRatio * 0.50));

        if (rng() < successRate) {
            const pet: TamedPetCompanion = {
                petId: `pet_${target.species.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ownerPlayerId,
                species: target.species,
                petName: petName || `${target.species} Companion`,
                currentHp: data.maxHealth,
                maxHp: data.maxHealth,
                loyaltyPoints: 50, // Starts Content
                mood: "CONTENT",
                lastFedEpochMs: Date.now(),
                isAlive: true,
            };

            return { success: true, pet };
        }

        return { success: false, reason: "The wild beast resisted your taming attempt!" };
    }

    /**
     * Feeds a pet to increase loyalty and maintain mood, safely guarding against invalid species.
     */
    public static feedPet(
        pet: TamedPetCompanion,
        foodDiet: PetFoodDiet,
        foodQualityBonus = 0,
        currentEpochMs = Date.now()
    ): { success: boolean; newLoyalty: number; newMood: PetMoodTier; reason?: string } {
        if (!pet || !pet.isAlive) {
            return { success: false, newLoyalty: 0, newMood: "REBELLIOUS", reason: "Cannot feed a deceased or invalid pet." };
        }

        const data = BEAST_SPECIES_DATA[pet.species];
        if (!data) {
            return { success: false, newLoyalty: pet.loyaltyPoints, newMood: pet.mood, reason: `Unsupported beast species: ${String(pet.species)}` };
        }

        const isDietMatch = data.preferredDiet === foodDiet;

        if (!isDietMatch) {
            return { success: false, newLoyalty: pet.loyaltyPoints, newMood: pet.mood, reason: `${pet.species} will not eat ${foodDiet}. Preferred: ${data.preferredDiet}.` };
        }

        const bonus = Number.isFinite(foodQualityBonus) ? Math.max(0, Math.floor(foodQualityBonus)) : 0;
        const loyaltyGain = 15 + bonus;

        pet.loyaltyPoints = Math.min(this.MAX_LOYALTY, pet.loyaltyPoints + loyaltyGain);
        pet.mood = this.calculateMood(pet.loyaltyPoints);
        pet.lastFedEpochMs = currentEpochMs;

        return {
            success: true,
            newLoyalty: pet.loyaltyPoints,
            newMood: pet.mood,
        };
    }

    /**
     * Commands pet to attack a target, safely guarding against invalid species.
     */
    public static commandAttack(
        pet: TamedPetCompanion,
        targetArmorRating = 0
    ): { success: boolean; damageDealt: number; mood: PetMoodTier; reason?: string } {
        if (!pet || !pet.isAlive) {
            return { success: false, damageDealt: 0, mood: "REBELLIOUS", reason: "Pet is not available or deceased." };
        }

        const data = BEAST_SPECIES_DATA[pet.species];
        if (!data) {
            return { success: false, damageDealt: 0, mood: pet.mood, reason: `Unsupported beast species: ${String(pet.species)}` };
        }

        let moodMultiplier = 1.0;
        if (pet.mood === "DEVOTED") moodMultiplier = 1.20; // +20% bonus
        else if (pet.mood === "REBELLIOUS") moodMultiplier = 0.50; // -50% penalty

        const armor = Number.isFinite(targetArmorRating) ? Math.max(0, targetArmorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(10, Math.floor(data.baseAttackDamage * moodMultiplier * armorMitigation));

        return {
            success: true,
            damageDealt,
            mood: pet.mood,
        };
    }
}