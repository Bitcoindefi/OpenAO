import { describe, it, expect } from "vitest";
import {
    RunicGolemCraftingEngine,
    ConstructedRunicGolem,
} from "../lib/runicGolemCrafting.js";

describe("RunicGolemCraftingEngine Construction, Patrol & Combat Mechanics", () => {
    it("constructs an Obsidian Behemoth with Earth Core bonus HP", () => {
        const golem = RunicGolemCraftingEngine.constructGolem(
            "wizard_01",
            "OBSIDIAN",
            "EARTH_CORE",
            50,
            50,
            40,
            100000
        );

        expect(golem.currentHp).toBe(3500); // 3000 base + 500 Earth Core
        expect(golem.maxHp).toBe(3500);
        expect(golem.armorRating).toBe(45);
        expect(golem.isDestroyed).toBe(false);
    });

    it("verifies patrol territory perimeter boundaries", () => {
        const golem = RunicGolemCraftingEngine.constructGolem("p", "GRANITE", "FIRE_CORE", 100, 100, 30, 100000);

        // Within 30 tiles
        expect(RunicGolemCraftingEngine.isTargetInPatrolZone(golem, 110, 100)).toBe(true);
        expect(RunicGolemCraftingEngine.isTargetInPatrolZone(golem, 125, 100)).toBe(true);

        // Outside 30 tiles (>130)
        expect(RunicGolemCraftingEngine.isTargetInPatrolZone(golem, 150, 100)).toBe(false);
    });

    it("executes slam attack on intruder inside zone and rejects targets outside", () => {
        const golem = RunicGolemCraftingEngine.constructGolem("p", "MITHRIL", "LIGHTNING_CORE", 0, 0, 50, 100000);

        // Target at (10, 10) inside zone -> 320 Mithril + 60 Lightning = 380 raw dmg
        const slamRes = RunicGolemCraftingEngine.guardianSlamAttack(golem, 10, 10, 20);
        expect(slamRes.success).toBe(true);
        expect(slamRes.damageDealt).toBe(316); // 380 * (100 / 120) = 316

        // Target at (100, 100) outside zone
        const outRes = RunicGolemCraftingEngine.guardianSlamAttack(golem, 100, 100, 0);
        expect(outRes.success).toBe(false);
        expect(outRes.reason).toContain("outside golem patrol perimeter");
    });

    it("performs self-repair over elapsed time and carries sub-second fractions across ticks", () => {
        const golem = RunicGolemCraftingEngine.constructGolem("p", "GRANITE", "EARTH_CORE", 0, 0, 30, 100000);
        golem.currentHp = 1000; // Damaged from 2000 (1500 + 500)
        golem.lastSelfRepairEpochMs = 100000;

        // Poll at 50ms intervals with 10 HP/s rate (0.5 HP per tick) -> After 2 ticks (100ms), heals 1 HP
        RunicGolemCraftingEngine.performSelfRepair(golem, 100050);
        expect(golem.currentHp).toBe(1000);

        const repairTick2 = RunicGolemCraftingEngine.performSelfRepair(golem, 100100);
        expect(repairTick2.repairedHp).toBe(1);
        expect(golem.currentHp).toBe(1001);
    });

    it("guards against invalid chassis and core enums", () => {
        expect(() => RunicGolemCraftingEngine.constructGolem("p", "WOOD" as any, "FIRE_CORE")).toThrow(
            "Unsupported chassis material"
        );
        expect(() => RunicGolemCraftingEngine.constructGolem("p", "GRANITE", "CHEESE_CORE" as any)).toThrow(
            "Unsupported elemental core"
        );
    });
});