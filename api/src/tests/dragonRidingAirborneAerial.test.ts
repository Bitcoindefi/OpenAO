import { describe, it, expect } from "vitest";
import {
    DragonRidingAirborneAerialEngine,
    ActiveDragonMount,
} from "../lib/dragonRidingAirborneAerial.js";

describe("DragonRidingAirborneAerialEngine Flight, Stamina & Breath Weapons", () => {
    it("summons an Infernal Drake and ascends to HIGH_ALTITUDE_FLIGHT", () => {
        const drake = DragonRidingAirborneAerialEngine.summonDragon("rider_01", "INFERNAL_DRAKE", 100000);
        expect(drake.altitudeState).toBe("GROUNDED");
        expect(drake.currentStamina).toBe(100);

        const ascendRes = DragonRidingAirborneAerialEngine.changeAltitude(drake, "HIGH_ALTITUDE_FLIGHT", 250, 100000);
        expect(ascendRes.success).toBe(true);
        expect(drake.altitudeState).toBe("HIGH_ALTITUDE_FLIGHT");
        expect(drake.altitudeMeters).toBe(250);
    });

    it("settles accrued stamina drain upon altitude change preventing exploit", () => {
        const drake = DragonRidingAirborneAerialEngine.summonDragon("rider_01", "INFERNAL_DRAKE", 100000);
        DragonRidingAirborneAerialEngine.changeAltitude(drake, "HIGH_ALTITUDE_FLIGHT", 300, 100000);

        // Fly for 4 seconds (4s * 5 = 20 stamina drain) and transition to GLIDING
        const glideRes = DragonRidingAirborneAerialEngine.changeAltitude(drake, "GLIDING", 50, 104000);
        expect(glideRes.success).toBe(true);
        expect(drake.currentStamina).toBe(80); // Accrued drain settled correctly
    });

    it("drains stamina during high altitude flight and triggers EMERGENCY_GLIDE_LANDING at 0 stamina", () => {
        const drake = DragonRidingAirborneAerialEngine.summonDragon("rider_01", "INFERNAL_DRAKE", 100000);
        drake.currentStamina = 20;
        drake.altitudeState = "HIGH_ALTITUDE_FLIGHT";
        drake.altitudeMeters = 300;
        drake.lastStaminaDecayEpochMs = 100000;

        const updateRes = DragonRidingAirborneAerialEngine.updateFlightStamina(drake, 105000);
        expect(updateRes.isForcedLanding).toBe(true);
        expect(drake.altitudeState).toBe("EMERGENCY_GLIDE_LANDING");
        expect(drake.currentStamina).toBe(0);
    });

    it("channels breath weapon dealing mitigated damage and consuming stamina", () => {
        const wyvern = DragonRidingAirborneAerialEngine.summonDragon("rider_02", "STORM_WYVERN", 100000);
        const breathRes = DragonRidingAirborneAerialEngine.breathWeaponAttack(wyvern, 50);

        expect(breathRes.success).toBe(true);
        expect(breathRes.damageDealt).toBe(266);
        expect(breathRes.remainingStamina).toBe(70);
    });

    it("guards against unsupported dragon species and insufficient stamina", () => {
        expect(() => DragonRidingAirborneAerialEngine.summonDragon("r", "SPACE_DRAGON" as any)).toThrow(
            "Unsupported dragon species"
        );
    });
});