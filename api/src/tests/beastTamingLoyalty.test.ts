import { describe, it, expect } from "vitest";
import {
    BeastTamingLoyaltyEngine,
    WildCreatureTarget,
    TamedPetCompanion,
} from "../lib/beastTamingLoyalty.js";

describe("BeastTamingLoyaltyEngine Full Lifecycle & Combat Mechanics", () => {
    it("tames a weakened Dire Wolf and starts with CONTENT mood", () => {
        const wolf: WildCreatureTarget = {
            creatureId: "wolf_101",
            species: "DIRE_WOLF",
            currentHp: 300,
            maxHp: 1500,
        };

        const tameRes = BeastTamingLoyaltyEngine.attemptTame(wolf, 80, "hunter_1", "Ghost", () => 0.10);
        expect(tameRes.success).toBe(true);
        expect(tameRes.pet?.species).toBe("DIRE_WOLF");
        expect(tameRes.pet?.loyaltyPoints).toBe(50);
        expect(tameRes.pet?.mood).toBe("CONTENT");
    });

    it("feeds pet with preferred diet and upgrades mood to DEVOTED", () => {
        const pet: TamedPetCompanion = {
            petId: "pet_griffon_1",
            ownerPlayerId: "hunter_1",
            species: "GRIFFON",
            petName: "Skyclaw",
            currentHp: 2200,
            maxHp: 2200,
            loyaltyPoints: 70,
            mood: "CONTENT",
            lastFedEpochMs: 1000,
            isAlive: true,
        };

        const feedRes = BeastTamingLoyaltyEngine.feedPet(pet, "FISH", 0, 5000);
        expect(feedRes.success).toBe(true);
        expect(feedRes.newLoyalty).toBe(85);
        expect(feedRes.newMood).toBe("DEVOTED");
        expect(pet.mood).toBe("DEVOTED");
    });

    it("rejects incompatible food diets and guards unknown species", () => {
        const bear: TamedPetCompanion = {
            petId: "pet_bear_1",
            ownerPlayerId: "hunter_1",
            species: "FOREST_BEAR",
            petName: "Ursus",
            currentHp: 3000,
            maxHp: 3000,
            loyaltyPoints: 50,
            mood: "CONTENT",
            lastFedEpochMs: 1000,
            isAlive: true,
        };

        const res = BeastTamingLoyaltyEngine.feedPet(bear, "MEAT");
        expect(res.success).toBe(false);
        expect(res.reason).toContain("will not eat MEAT");

        // Unknown species runtime guard
        const alienPet: TamedPetCompanion = { ...bear, species: "ALIEN_DRAGON" as any };
        const alienFeed = BeastTamingLoyaltyEngine.feedPet(alienPet, "BERRIES");
        expect(alienFeed.success).toBe(false);
        expect(alienFeed.reason).toContain("Unsupported beast species");
    });

    it("applies DEVOTED bonus and REBELLIOUS penalty on attack commands", () => {
        const shadowPanther: TamedPetCompanion = {
            petId: "panther_01",
            ownerPlayerId: "hunter_1",
            species: "SHADOW_PANTHER",
            petName: "Midnight",
            currentHp: 1200,
            maxHp: 1200,
            loyaltyPoints: 90,
            mood: "DEVOTED",
            lastFedEpochMs: 1000,
            isAlive: true,
        };

        const devotedAtk = BeastTamingLoyaltyEngine.commandAttack(shadowPanther, 0);
        expect(devotedAtk.damageDealt).toBe(216);

        shadowPanther.mood = "REBELLIOUS";
        const rebelAtk = BeastTamingLoyaltyEngine.commandAttack(shadowPanther, 0);
        expect(rebelAtk.damageDealt).toBe(90);
    });

    it("guards defensively against deceased targets and invalid inputs", () => {
        const deadCreature: WildCreatureTarget = {
            creatureId: "dead_1",
            species: "DIRE_WOLF",
            currentHp: 0,
            maxHp: 1500,
        };

        const res = BeastTamingLoyaltyEngine.attemptTame(deadCreature, 50, "p", "name");
        expect(res.success).toBe(false);
        expect(res.reason).toContain("dead or invalid");
    });
});