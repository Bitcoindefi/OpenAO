import { describe, it, expect } from "vitest";
import {
    AncientRunicPetCompanionBreedingEngine,
    PetCompanion,
    ActiveIncubationEgg,
} from "../lib/ancientRunicPetCompanionBreeding.js";

describe("AncientRunicPetCompanionBreedingEngine Genetics & Familiar Evolution", () => {
    it("breeds two Ember Phoenixes in Celestial Astral Cradle with speed boost and evolves offspring to Ancient Familiar", () => {
        const parent1: PetCompanion = {
            petId: "phoenix_01",
            ownerPlayerId: "trainer_01",
            speciesType: "EMBER_PHOENIX_HATCHLING",
            evolutionTier: "JUVENILE",
            attackPower: 50,
            movementSpeed: 40,
            armorDefense: 20,
            generation: 1,
        };

        const parent2: PetCompanion = {
            petId: "phoenix_02",
            ownerPlayerId: "trainer_01",
            speciesType: "EMBER_PHOENIX_HATCHLING",
            evolutionTier: "JUVENILE",
            attackPower: 60,
            movementSpeed: 40,
            armorDefense: 30,
            generation: 2,
        };

        // Celestial cradle: 2.5x speed (180s / 2.5 = 72s), +35% quality + 5% variance = 1.40x multiplier
        const egg = AncientRunicPetCompanionBreedingEngine.breedPets(
            "trainer_01",
            parent1,
            parent2,
            "CELESTIAL_ASTRAL_CRADLE",
            0.05,
            100000
        );

        expect(egg.generation).toBe(3);
        expect(egg.remainingDurationSeconds).toBe(72);
        // Avg ATK 55 * 1.40 = 77
        expect(egg.inheritedAttackPower).toBe(77);

        // Tick 72 seconds
        const tickRes = AncientRunicPetCompanionBreedingEngine.tickEggIncubation(egg, 72);
        expect(tickRes.remainingSeconds).toBe(0);
        expect(tickRes.isReadyToHatch).toBe(true);

        // Hatch egg
        const baby = AncientRunicPetCompanionBreedingEngine.hatchEgg(egg, 100000);
        expect(baby.evolutionTier).toBe("BABY");
        expect(baby.attackPower).toBe(77);

        // Evolve to Juvenile
        const evo1 = AncientRunicPetCompanionBreedingEngine.evolveCompanion(baby);
        expect(evo1.success).toBe(true);
        expect(evo1.newTier).toBe("JUVENILE");
        expect(baby.attackPower).toBe(104); // 77 * 1.35 = 103.95 -> 104

        // Evolve to Ancient Familiar
        const evo2 = AncientRunicPetCompanionBreedingEngine.evolveCompanion(baby);
        expect(evo2.success).toBe(true);
        expect(evo2.newTier).toBe("ANCIENT_FAMILIAR");
        expect(baby.attackPower).toBe(166); // 104 * 1.60 = 166.4 -> 166
    });

    it("enforces species stat cap preventing unbounded breeding inflation loop", () => {
        const superParent: PetCompanion = {
            petId: "super_wolf",
            ownerPlayerId: "p",
            speciesType: "DIRE_WOLF_PUP", // Base ATK 35 -> Cap is 35 * 3 = 105
            evolutionTier: "ANCIENT_FAMILIAR",
            attackPower: 200,
            movementSpeed: 100,
            armorDefense: 100,
            generation: 10,
        };

        const egg = AncientRunicPetCompanionBreedingEngine.breedPets("p", superParent, superParent, "CELESTIAL_ASTRAL_CRADLE", 0.25);
        expect(egg.inheritedAttackPower).toBe(105); // Clamped to 3.0x base stat ceiling
    });

    it("rejects breeding incompatible pet species", () => {
        const wolf: PetCompanion = {
            petId: "wolf_01",
            ownerPlayerId: "p1",
            speciesType: "DIRE_WOLF_PUP",
            evolutionTier: "BABY",
            attackPower: 35,
            movementSpeed: 25,
            armorDefense: 20,
            generation: 1,
        };

        const phoenix: PetCompanion = {
            petId: "phoenix_01",
            ownerPlayerId: "p1",
            speciesType: "EMBER_PHOENIX_HATCHLING",
            evolutionTier: "BABY",
            attackPower: 45,
            movementSpeed: 30,
            armorDefense: 15,
            generation: 1,
        };

        expect(() => AncientRunicPetCompanionBreedingEngine.breedPets("p1", wolf, phoenix, "EARTHEN_NEST")).toThrow(
            "Incompatible species"
        );
    });

    it("rejects hatching before incubation time completes", () => {
        const parent: PetCompanion = {
            petId: "w1",
            ownerPlayerId: "p",
            speciesType: "DIRE_WOLF_PUP",
            evolutionTier: "BABY",
            attackPower: 35,
            movementSpeed: 25,
            armorDefense: 20,
            generation: 1,
        };

        const egg = AncientRunicPetCompanionBreedingEngine.breedPets("p", parent, parent, "EARTHEN_NEST");
        expect(egg.remainingDurationSeconds).toBe(120);

        expect(() => AncientRunicPetCompanionBreedingEngine.hatchEgg(egg)).toThrow("still incubating");
    });

    it("guards against null inputs and unsupported nest types", () => {
        expect(() => AncientRunicPetCompanionBreedingEngine.breedPets("p", null as any, null as any, "EARTHEN_NEST")).toThrow(
            "Invalid parent pets"
        );

        expect(AncientRunicPetCompanionBreedingEngine.tickEggIncubation(null as any).isReadyToHatch).toBe(false);
        expect(AncientRunicPetCompanionBreedingEngine.evolveCompanion(null as any).success).toBe(false);
    });
});