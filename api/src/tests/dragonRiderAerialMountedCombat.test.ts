import { describe, it, expect } from "vitest";
import {
    DragonRiderAerialMountedCombatEngine,
    type AerialCombatTarget,
} from "../lib/dragonRiderAerialMountedCombat.js";

describe("DragonRiderAerialMountedCombatEngine Dragons & Aerial Combat", () => {
    it("summons Crimson Fire Drake, ascends to High Altitude Swoop including takeoff cost, and unleashes empowered dive bomb", () => {
        const drake = DragonRiderAerialMountedCombatEngine.summonDragonMount("rider_01", "CRIMSON_FIRE_DRAKE", 100000);
        expect(drake.breed).toBe("CRIMSON_FIRE_DRAKE");
        expect(drake.currentStamina).toBe(100);
        expect(drake.altitudeState).toBe("GROUNDED");

        // Ascend directly from Grounded to High Altitude Swoop (costs 25 swoop + 15 takeoff = 40 stamina)
        const ascendRes = DragonRiderAerialMountedCombatEngine.setAltitudeState(drake, "HIGH_ALTITUDE_SWOOP");
        expect(ascendRes.success).toBe(true);
        expect(drake.currentStamina).toBe(60);
        expect(drake.isSwoopEmpowered).toBe(true);

        const target: AerialCombatTarget = { targetId: "boss_wyvern", currentHp: 500, isAlive: true, statusEffects: [] };

        // Breath base 120 * 1.5 swoop bonus = 180 damage + IGNITE
        const breathRes = DragonRiderAerialMountedCombatEngine.unleashDragonBreath(drake, target);
        expect(breathRes.success).toBe(true);
        expect(breathRes.damageDealt).toBe(180);
        expect(breathRes.appliedEffect).toBe("IGNITE");
        expect(target.currentHp).toBe(320);
        expect(drake.isSwoopEmpowered).toBe(false);
        expect(drake.altitudeState).toBe("LOW_FLIGHT"); // Dived down
    });

    it("applies Frostbite slow effect with Azure Frost Wyrm breath", () => {
        const wyrm = DragonRiderAerialMountedCombatEngine.summonDragonMount("r", "AZURE_FROST_WYRM", 100000);
        const target: AerialCombatTarget = { targetId: "gryphon", currentHp: 200, isAlive: true, statusEffects: [] };

        const breath = DragonRiderAerialMountedCombatEngine.unleashDragonBreath(wyrm, target);
        expect(breath.success).toBe(true);
        expect(breath.damageDealt).toBe(90);
        expect(target.statusEffects).toContain("FROSTBITE_SLOW_40");
    });

    it("rejects takeoff when stamina is insufficient and recovers stamina only when grounded or in low flight", () => {
        const drake = DragonRiderAerialMountedCombatEngine.summonDragonMount("r", "CRIMSON_FIRE_DRAKE", 100000);
        drake.currentStamina = 5; // Insufficient for 15 takeoff cost

        const failTakeoff = DragonRiderAerialMountedCombatEngine.setAltitudeState(drake, "LOW_FLIGHT");
        expect(failTakeoff.success).toBe(false);
        expect(failTakeoff.reason).toContain("Insufficient stamina");

        // Rest stamina while grounded succeeds
        const rest = DragonRiderAerialMountedCombatEngine.restStamina(drake, 50);
        expect(rest.success).toBe(true);
        expect(drake.currentStamina).toBe(55);

        // Takeoff now succeeds
        const successTakeoff = DragonRiderAerialMountedCombatEngine.setAltitudeState(drake, "LOW_FLIGHT");
        expect(successTakeoff.success).toBe(true);
        expect(drake.altitudeState).toBe("LOW_FLIGHT");

        // Set to high altitude swoop and verify restStamina is rejected
        DragonRiderAerialMountedCombatEngine.setAltitudeState(drake, "HIGH_ALTITUDE_SWOOP");
        expect(DragonRiderAerialMountedCombatEngine.restStamina(drake, 20).success).toBe(false);
    });

    it("guards against dead targets and fatal damage tracking", () => {
        const voidDragon = DragonRiderAerialMountedCombatEngine.summonDragonMount("r", "OBSIDIAN_VOID_DRAGON", 100000);
        const target: AerialCombatTarget = { targetId: "scout", currentHp: 100, isAlive: true, statusEffects: [] };

        // 180 void damage kills 100 HP target
        const fatalBreath = DragonRiderAerialMountedCombatEngine.unleashDragonBreath(voidDragon, target);
        expect(fatalBreath.damageDealt).toBe(100);
        expect(target.currentHp).toBe(0);
        expect(target.isAlive).toBe(false);

        // Next breath rejected on dead target
        const deadRes = DragonRiderAerialMountedCombatEngine.unleashDragonBreath(voidDragon, target);
        expect(deadRes.success).toBe(false);
        expect(deadRes.reason).toContain("Target is already dead");
    });

    it("guards against unsupported dragon breeds", () => {
        expect(() => DragonRiderAerialMountedCombatEngine.summonDragonMount("r", "PUPPY_DRAKE" as any)).toThrow(
            "Unsupported dragon breed"
        );
    });
});