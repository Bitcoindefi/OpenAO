import { describe, it, expect } from "vitest";
import { SiegeWarMachineEngine } from "../lib/siegeWarMachine.js";

describe("SiegeWarMachineEngine Fortification Assault & Reload Cooldowns", () => {
    it("deploys siege machine and fires with effective material multiplier", () => {
        const machine = SiegeWarMachineEngine.deployMachine("catapult_01", "CATAPULT", "guild_order");
        machine.loadedAmmo = "FIRE_POT";

        // Wooden gate with 0 armor and 2000 HP: base 800 * 2.0 = 1600 damage
        const result = SiegeWarMachineEngine.fireAtStructure(machine, 2000, 0, "WOODEN_GATE", 100000);
        expect(result.damageDealt).toBe(1600);
        expect(result.wasEffectiveMaterialBonus).toBe(true);
        expect(result.remainingStructureHp).toBe(400);
        expect(machine.lastFiredEpochMs).toBe(100000);
    });

    it("blocks firing while reload cooldown is active", () => {
        const machine = SiegeWarMachineEngine.deployMachine("catapult_01", "CATAPULT", "guild_order");

        // Fire 1 at 100000 (Catapult reload is 6 seconds = 6000ms)
        SiegeWarMachineEngine.fireAtStructure(machine, 2000, 0, "WOODEN_GATE", 100000);

        // Attempt fire at 103000 (only 3 seconds elapsed)
        const earlyResult = SiegeWarMachineEngine.fireAtStructure(machine, 2000, 0, "WOODEN_GATE", 103000);
        expect(earlyResult.isOnCooldown).toBe(true);
        expect(earlyResult.damageDealt).toBe(0);
        expect(earlyResult.reason).toContain("Machine is currently reloading");

        // Attempt fire after 6000ms at 106001 -> Success
        const validResult = SiegeWarMachineEngine.fireAtStructure(machine, 400, 0, "WOODEN_GATE", 106001);
        expect(validResult.isOnCooldown).toBe(false);
        expect(validResult.damageDealt).toBeGreaterThan(0);
    });
});