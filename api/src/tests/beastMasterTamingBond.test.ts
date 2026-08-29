import { describe, it, expect } from "vitest";
import {
    BeastMasterTamingBondEngine,
    TamedBeastPet,
} from "../lib/beastMasterTamingBond.js";

describe("BeastMasterTamingBondEngine Pet Taming & Loyalty", () => {
    it("tames Celestial Gryphon with Ambrosia Treat bait", () => {
        const result = BeastMasterTamingBondEngine.attemptTameBeast("hunter_01", "CELESTIAL_SKY_GRYPHON", "Skystrider", "AMBROSIA_TREAT", () => 0.05);
        expect(result.success).toBe(true);
        expect(result.tamedPet).toBeDefined();
        expect(result.tamedPet?.petName).toBe("Skystrider");
        expect(result.tamedPet?.species).toBe("CELESTIAL_SKY_GRYPHON");
        expect(result.tamedPet?.loyaltyPoints).toBe(50);
        expect(result.tamedPet?.currentHp).toBe(2200);
    });

    it("feeds pet to reach Alpha Pack threshold (>= 80) and applies +30% attack synergy", () => {
        const pet: TamedBeastPet = {
            petId: "pet_wolf_01",
            masterPlayerId: "hunter_02",
            species: "TUNDRA_DIREWOLF",
            petName: "Ghost",
            currentHp: 800,
            maxHp: 1200,
            loyaltyPoints: 60,
            isRebellious: false,
            isAlive: true,
            tamedEpochMs: 100000,
        };

        const feedRes = BeastMasterTamingBondEngine.feedPet(pet, "PHEROMONE_SCENT_GLAND");
        expect(feedRes.success).toBe(true);
        expect(feedRes.newLoyalty).toBe(90);
        expect(feedRes.isAlphaSynergyActive).toBe(true);
        expect(pet.currentHp).toBe(1100);

        const atk = BeastMasterTamingBondEngine.commandAttack(pet, 0);
        expect(atk.success).toBe(true);
        expect(atk.damageDealt).toBe(111);
        expect(atk.isAlphaBonusApplied).toBe(true);
    });

    it("triggers disobedience via tickLoyaltyDecay when loyalty drops below 20", () => {
        const pet: TamedBeastPet = {
            petId: "pet_panther",
            masterPlayerId: "h",
            species: "SHADOW_STALKER_PANTHER",
            petName: "Shadow",
            currentHp: 1500,
            maxHp: 1500,
            loyaltyPoints: 50,
            isRebellious: false,
            isAlive: true,
            tamedEpochMs: 100000,
        };

        // Decay loyalty from 50 -> 10 (< 20 threshold)
        const decayRes = BeastMasterTamingBondEngine.tickLoyaltyDecay(pet, 40);
        expect(decayRes.success).toBe(true);
        expect(decayRes.newLoyalty).toBe(10);
        expect(decayRes.isRebellious).toBe(true);

        const atk = BeastMasterTamingBondEngine.commandAttack(pet);
        expect(atk.success).toBe(false);
        expect(atk.reason).toContain("disobedient");
        expect(pet.isRebellious).toBe(true);

        // Feeding restores loyalty and clears rebellion
        const restore = BeastMasterTamingBondEngine.feedPet(pet, "AMBROSIA_TREAT");
        expect(restore.newLoyalty).toBe(70);
        expect(pet.isRebellious).toBe(false);
    });

    it("handles wild beast taming failure when roll exceeds threshold", () => {
        const failTame = BeastMasterTamingBondEngine.attemptTameBeast("h", "CELESTIAL_SKY_GRYPHON", "Wild", undefined, () => 0.99);
        expect(failTame.success).toBe(false);
        expect(failTame.reason).toContain("resisted taming");
    });

    it("guards against dead pets and invalid inputs", () => {
        const deadPet: TamedBeastPet = {
            petId: "dead_1",
            masterPlayerId: "h",
            species: "TUNDRA_DIREWOLF",
            petName: "RIP",
            currentHp: 0,
            maxHp: 1000,
            loyaltyPoints: 50,
            isRebellious: false,
            isAlive: false,
            tamedEpochMs: 100000,
        };

        expect(BeastMasterTamingBondEngine.feedPet(deadPet, "WILD_MEAT_CHUNKS").success).toBe(false);
        expect(BeastMasterTamingBondEngine.tickLoyaltyDecay(deadPet).success).toBe(false);
        expect(BeastMasterTamingBondEngine.commandAttack(deadPet).success).toBe(false);
    });
});