import crypto from "node:crypto";

/**
 * Ancient Runic Pet Companion Breeding, Genetic Egg Incubation & Familiar Evolution Engine for OpenAO MMORPG.
 * Simulates companion species (Dire Wolf Pup, Ember Phoenix Hatchling, Void Stalker Whelp),
 * incubator nests (Earthen Nest, Magma Incubator, Celestial Astral Cradle),
 * genetic trait inheritance (Attack Power, Movement Speed, Armor Defense) with species stat caps preventing inflation,
 * incubation timers, and familiar evolution tiers (BABY -> JUVENILE -> ANCIENT_FAMILIAR).
 */

export type PetSpeciesType = "DIRE_WOLF_PUP" | "EMBER_PHOENIX_HATCHLING" | "VOID_STALKER_WHELP";
export type IncubatorNestType = "EARTHEN_NEST" | "MAGMA_INCUBATOR" | "CELESTIAL_ASTRAL_CRADLE";
export type FamiliarEvolutionTier = "BABY" | "JUVENILE" | "ANCIENT_FAMILIAR";

export interface PetSpeciesData {
    speciesType: PetSpeciesType;
    baseAttackPower: number;
    baseMovementSpeed: number;
    baseArmorDefense: number;
    baseIncubationDurationSeconds: number;
}

export interface IncubatorNestData {
    nestType: IncubatorNestType;
    incubationSpeedMultiplier: number;
    geneticQualityBonusPercent: number;
}

export interface PetCompanion {
    petId: string;
    ownerPlayerId: string;
    speciesType: PetSpeciesType;
    evolutionTier: FamiliarEvolutionTier;
    attackPower: number;
    movementSpeed: number;
    armorDefense: number;
    generation: number;
}

export interface ActiveIncubationEgg {
    eggId: string;
    ownerPlayerId: string;
    speciesType: PetSpeciesType;
    nestType: IncubatorNestType;
    inheritedAttackPower: number;
    inheritedMovementSpeed: number;
    inheritedArmorDefense: number;
    generation: number;
    remainingDurationSeconds: number;
    isHatched: boolean;
    createdEpochMs: number;
}

export const SPECIES_CATALOG: Record<PetSpeciesType, PetSpeciesData> = {
    DIRE_WOLF_PUP: { speciesType: "DIRE_WOLF_PUP", baseAttackPower: 35, baseMovementSpeed: 25, baseArmorDefense: 20, baseIncubationDurationSeconds: 120 },
    EMBER_PHOENIX_HATCHLING: { speciesType: "EMBER_PHOENIX_HATCHLING", baseAttackPower: 45, baseMovementSpeed: 30, baseArmorDefense: 15, baseIncubationDurationSeconds: 180 },
    VOID_STALKER_WHELP: { speciesType: "VOID_STALKER_WHELP", baseAttackPower: 50, baseMovementSpeed: 35, baseArmorDefense: 25, baseIncubationDurationSeconds: 240 },
};

export const NEST_CATALOG: Record<IncubatorNestType, IncubatorNestData> = {
    EARTHEN_NEST: { nestType: "EARTHEN_NEST", incubationSpeedMultiplier: 1.0, geneticQualityBonusPercent: 5 },
    MAGMA_INCUBATOR: { nestType: "MAGMA_INCUBATOR", incubationSpeedMultiplier: 1.5, geneticQualityBonusPercent: 15 },
    CELESTIAL_ASTRAL_CRADLE: { nestType: "CELESTIAL_ASTRAL_CRADLE", incubationSpeedMultiplier: 2.5, geneticQualityBonusPercent: 35 },
};

export class AncientRunicPetCompanionBreedingEngine {
    public static readonly SPECIES_STAT_CEILING_MULTIPLIER = 3.0;

    /**
     * Breeds two parent pets and places an egg into an incubator nest.
     */
    public static breedPets(
        ownerPlayerId: string,
        parent1: PetCompanion,
        parent2: PetCompanion,
        nestType: IncubatorNestType,
        mutationVariance = 0.05,
        currentEpochMs = Date.now()
    ): ActiveIncubationEgg {
        if (!parent1 || !parent2) {
            throw new Error("Invalid parent pets provided for breeding.");
        }

        if (parent1.speciesType !== parent2.speciesType) {
            throw new Error(`Incompatible species: ${parent1.speciesType} cannot breed with ${parent2.speciesType}`);
        }

        const nestData = NEST_CATALOG[nestType];
        if (!nestData) {
            throw new Error(`Unsupported incubator nest type: ${String(nestType)}`);
        }

        const speciesData = SPECIES_CATALOG[parent1.speciesType];
        const variance = Number.isFinite(mutationVariance) ? Math.max(-0.20, Math.min(0.25, mutationVariance)) : 0.05;
        const qualityMultiplier = Math.max(0.5, 1 + ((nestData.geneticQualityBonusPercent / 100) + variance));

        const avgAtk = (parent1.attackPower + parent2.attackPower) / 2;
        const avgSpd = (parent1.movementSpeed + parent2.movementSpeed) / 2;
        const avgDef = (parent1.armorDefense + parent2.armorDefense) / 2;

        const maxAtk = Math.round(speciesData.baseAttackPower * this.SPECIES_STAT_CEILING_MULTIPLIER);
        const maxSpd = Math.round(speciesData.baseMovementSpeed * this.SPECIES_STAT_CEILING_MULTIPLIER);
        const maxDef = Math.round(speciesData.baseArmorDefense * this.SPECIES_STAT_CEILING_MULTIPLIER);

        const inhAtk = Math.min(maxAtk, Math.max(5, Math.round(avgAtk * qualityMultiplier)));
        const inhSpd = Math.min(maxSpd, Math.max(5, Math.round(avgSpd * qualityMultiplier)));
        const inhDef = Math.min(maxDef, Math.max(5, Math.round(avgDef * qualityMultiplier)));

        const nextGen = Math.max(parent1.generation, parent2.generation) + 1;
        const durationSec = Math.max(10, Math.round(speciesData.baseIncubationDurationSeconds / nestData.incubationSpeedMultiplier));

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            eggId: `egg_${parent1.speciesType.toLowerCase()}_${uuid}`,
            ownerPlayerId,
            speciesType: parent1.speciesType,
            nestType,
            inheritedAttackPower: inhAtk,
            inheritedMovementSpeed: inhSpd,
            inheritedArmorDefense: inhDef,
            generation: nextGen,
            remainingDurationSeconds: durationSec,
            isHatched: false,
            createdEpochMs: currentEpochMs,
        };
    }

    /**
     * Ticks incubation timer on an egg.
     */
    public static tickEggIncubation(
        egg: ActiveIncubationEgg,
        elapsedSeconds = 1
    ): { remainingSeconds: number; isReadyToHatch: boolean } {
        if (!egg) return { remainingSeconds: 0, isReadyToHatch: false };

        const sec = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 1;
        egg.remainingDurationSeconds = Math.max(0, egg.remainingDurationSeconds - sec);

        return {
            remainingSeconds: egg.remainingDurationSeconds,
            isReadyToHatch: egg.remainingDurationSeconds === 0 && !egg.isHatched,
        };
    }

    /**
     * Hatches an incubated egg into a new companion familiar.
     */
    public static hatchEgg(
        egg: ActiveIncubationEgg,
        currentEpochMs = Date.now()
    ): PetCompanion {
        if (!egg || egg.isHatched) {
            throw new Error("Egg is already hatched or invalid.");
        }

        if (egg.remainingDurationSeconds > 0) {
            throw new Error(`Egg is still incubating (${egg.remainingDurationSeconds}s remaining).`);
        }

        egg.isHatched = true;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            petId: `pet_${egg.speciesType.toLowerCase()}_${uuid}`,
            ownerPlayerId: egg.ownerPlayerId,
            speciesType: egg.speciesType,
            evolutionTier: "BABY",
            attackPower: egg.inheritedAttackPower,
            movementSpeed: egg.inheritedMovementSpeed,
            armorDefense: egg.inheritedArmorDefense,
            generation: egg.generation,
        };
    }

    /**
     * Evolves a companion familiar to higher evolution tier.
     */
    public static evolveCompanion(
        pet: PetCompanion
    ): { success: boolean; newTier: FamiliarEvolutionTier; statBonusPercent: number } {
        if (!pet) return { success: false, newTier: "BABY", statBonusPercent: 0 };

        if (pet.evolutionTier === "BABY") {
            pet.evolutionTier = "JUVENILE";
            pet.attackPower = Math.round(pet.attackPower * 1.35);
            pet.movementSpeed = Math.round(pet.movementSpeed * 1.25);
            pet.armorDefense = Math.round(pet.armorDefense * 1.30);
            return { success: true, newTier: "JUVENILE", statBonusPercent: 35 };
        } else if (pet.evolutionTier === "JUVENILE") {
            pet.evolutionTier = "ANCIENT_FAMILIAR";
            pet.attackPower = Math.round(pet.attackPower * 1.60);
            pet.movementSpeed = Math.round(pet.movementSpeed * 1.40);
            pet.armorDefense = Math.round(pet.armorDefense * 1.50);
            return { success: true, newTier: "ANCIENT_FAMILIAR", statBonusPercent: 60 };
        }

        return { success: false, newTier: pet.evolutionTier, statBonusPercent: 0 };
    }
}