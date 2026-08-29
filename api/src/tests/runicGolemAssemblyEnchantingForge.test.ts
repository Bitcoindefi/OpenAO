import { describe, it, expect } from "vitest";
import {
    RunicGolemAssemblyEnchantingForgeEngine,
    AssembledCombatGolem,
} from "../lib/runicGolemAssemblyEnchantingForge.js";

describe("RunicGolemAssemblyEnchantingForgeEngine Golem Forging & Overdrive", () => {
    it("assembles Flame Soul Golem with complete chassis frame parts", () => {
        const result = RunicGolemAssemblyEnchantingForgeEngine.assembleGolem(
            "engineer_01",
            ["TITANIUM_EXOSKELETON", "HYDRAULIC_ARTICULATION_SERVO", "ARCANE_POWER_CONDUIT"],
            "FLAME_SOUL_CORE",
            100000
        );

        expect(result.success).toBe(true);
        expect(result.golem).toBeDefined();
        expect(result.golem?.installedCore).toBe("FLAME_SOUL_CORE");
        expect(result.golem?.attackPower).toBe(140);
        expect(result.golem?.currentHp).toBe(1200);
        expect(result.golem?.coreTemperatureCelsius).toBe(20);
    });

    it("activates overdrive turbine and prevents infinite compounding across heat/cool cycles", () => {
        const golem: AssembledCombatGolem = {
            golemId: "golem_02",
            engineerPlayerId: "eng_02",
            installedCore: "CHRONO_SOUL_CORE",
            currentHp: 1300,
            maxHp: 1300,
            baseAttackPower: 100,
            attackPower: 100,
            armorRating: 45,
            baseMoveSpeed: 150,
            moveSpeed: 150,
            coreTemperatureCelsius: 70,
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: false,
        };

        // Overdrive adds +45C -> 70 + 45 = 115 clamped to 100 -> Thermal stasis & stats reset to base
        const odRes = RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(golem);
        expect(odRes.success).toBe(true);
        expect(odRes.newTemperature).toBe(100);
        expect(odRes.isOverheated).toBe(true);
        expect(golem.isOverheatedInStasis).toBe(true);
        expect(golem.attackPower).toBe(100); // Reverted to base

        // Flush coolant clears stasis
        const flushRes = RunicGolemAssemblyEnchantingForgeEngine.flushCoolant(golem, 60);
        expect(flushRes.success).toBe(true);
        expect(flushRes.newTemperature).toBe(40);
        expect(flushRes.isStasisCleared).toBe(true);
        expect(golem.isOverheatedInStasis).toBe(false);

        // Re-activating overdrive applies clean +50% from base without compounding
        const secondOd = RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(golem);
        expect(secondOd.success).toBe(true);
        expect(golem.attackPower).toBe(150); // 100 * 1.5 = 150 (not 225)
    });

    it("rejects assembly with duplicate/missing chassis components", () => {
        const resDuplicate = RunicGolemAssemblyEnchantingForgeEngine.assembleGolem(
            "eng",
            ["TITANIUM_EXOSKELETON", "TITANIUM_EXOSKELETON", "TITANIUM_EXOSKELETON"], // 3 of same part
            "EARTH_SOUL_CORE"
        );

        expect(resDuplicate.success).toBe(false);
        expect(resDuplicate.reason).toContain("Incomplete chassis parts");
    });

    it("returns isStasisCleared: false when flushing coolant on normal non-overheated golem", () => {
        const normalGolem: AssembledCombatGolem = {
            golemId: "g",
            engineerPlayerId: "e",
            installedCore: "EARTH_SOUL_CORE",
            currentHp: 1500,
            maxHp: 1500,
            baseAttackPower: 90,
            attackPower: 90,
            armorRating: 65,
            baseMoveSpeed: 100,
            moveSpeed: 100,
            coreTemperatureCelsius: 50,
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: false,
        };

        const flush = RunicGolemAssemblyEnchantingForgeEngine.flushCoolant(normalGolem, 20);
        expect(flush.success).toBe(true);
        expect(flush.isStasisCleared).toBe(false); // Was never in stasis
    });

    it("guards against destroyed golems and invalid inputs", () => {
        const destroyed: AssembledCombatGolem = {
            golemId: "d",
            engineerPlayerId: "e",
            installedCore: "EARTH_SOUL_CORE",
            currentHp: 0,
            maxHp: 1500,
            baseAttackPower: 0,
            attackPower: 0,
            armorRating: 0,
            baseMoveSpeed: 0,
            moveSpeed: 0,
            coreTemperatureCelsius: 20,
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: true,
        };

        expect(RunicGolemAssemblyEnchantingForgeEngine.activateOverdriveTurbine(destroyed).success).toBe(false);
        expect(RunicGolemAssemblyEnchantingForgeEngine.flushCoolant(destroyed).success).toBe(false);
    });
});