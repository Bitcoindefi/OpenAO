import { describe, it, expect } from "vitest";
import {
    AncientRunicShadowStealthInfiltrationEngine,
    InfiltrationRogue,
    DungeonPatrolGuard,
} from "../lib/ancientRunicShadowStealthInfiltration.js";

describe("AncientRunicShadowStealthInfiltrationEngine Stealth & Backstabs", () => {
    it("executes lethal 4.0x Backstab with Void Phantom Cowl from behind guard facing angle", () => {
        const guard: DungeonPatrolGuard = {
            guardId: "guard_01",
            location: { x: 10, y: 10 },
            facingAngleDegrees: 0,
            visionRangeTiles: 15,
            perceptionRating: 80,
            currentHp: 400,
            isAlerted: false,
            isAlive: true,
        };

        const rogue = AncientRunicShadowStealthInfiltrationEngine.createRogue("rogue_01", "VOID_PHANTOM_COWL", 8, 10);
        expect(rogue.isStealthed).toBe(true);

        const isDetected = AncientRunicShadowStealthInfiltrationEngine.isRogueDetectedByGuard(rogue, guard, 50);
        expect(isDetected).toBe(false);

        const ambush = AncientRunicShadowStealthInfiltrationEngine.executeAmbushAttack(rogue, guard, 100);
        expect(ambush.success).toBe(true);
        expect(ambush.isBackstab).toBe(true);
        expect(ambush.damageDealt).toBe(400);
        expect(guard.currentHp).toBe(0);
        expect(guard.isAlive).toBe(false);
        expect(rogue.isStealthed).toBe(false);
    });

    it("detects unstealthed rogue standing in front of guard vision cone", () => {
        const guard: DungeonPatrolGuard = {
            guardId: "guard_02",
            location: { x: 0, y: 0 },
            facingAngleDegrees: 0,
            visionRangeTiles: 15,
            perceptionRating: 50,
            currentHp: 200,
            isAlerted: false,
            isAlive: true,
        };

        const unstealthedRogue = AncientRunicShadowStealthInfiltrationEngine.createRogue("r", "SHADOWVEIL_SHROUD", 5, 0);
        unstealthedRogue.isStealthed = false;

        expect(AncientRunicShadowStealthInfiltrationEngine.isRogueDetectedByGuard(unstealthedRogue, guard)).toBe(true);
    });

    it("conceals rogue completely when inside smoke screen diversion", () => {
        const guard: DungeonPatrolGuard = {
            guardId: "g_smoke",
            location: { x: 0, y: 0 },
            facingAngleDegrees: 0,
            visionRangeTiles: 15,
            perceptionRating: 100,
            currentHp: 200,
            isAlerted: false,
            isAlive: true,
        };

        const rogue = AncientRunicShadowStealthInfiltrationEngine.createRogue("r", "SHADOWVEIL_SHROUD", 2, 0);
        const detected = AncientRunicShadowStealthInfiltrationEngine.isRogueDetectedByGuard(rogue, guard, 100, true);
        expect(detected).toBe(false);
    });

    it("rejects ambush attack when target is outside melee range (> 3 tiles)", () => {
        const guard: DungeonPatrolGuard = {
            guardId: "g",
            location: { x: 10, y: 10 },
            facingAngleDegrees: 0,
            visionRangeTiles: 15,
            perceptionRating: 50,
            currentHp: 100,
            isAlerted: false,
            isAlive: true,
        };

        const rogue = AncientRunicShadowStealthInfiltrationEngine.createRogue("r", "SHADOWVEIL_SHROUD", 0, 0);

        const failAmbush = AncientRunicShadowStealthInfiltrationEngine.executeAmbushAttack(rogue, guard, 100);
        expect(failAmbush.success).toBe(false);
        expect(failAmbush.reason).toContain("strike range");
    });

    it("guards against dead guards and unsupported cloak models", () => {
        expect(() => AncientRunicShadowStealthInfiltrationEngine.createRogue("r", "INVISIBILITY_HAT" as any)).toThrow(
            "Unsupported cloak type"
        );

        const rogue = AncientRunicShadowStealthInfiltrationEngine.createRogue("r", "SHADOWVEIL_SHROUD", 0, 0);
        const deadGuard: DungeonPatrolGuard = {
            guardId: "dead",
            location: { x: 1, y: 0 },
            facingAngleDegrees: 0,
            visionRangeTiles: 10,
            perceptionRating: 50,
            currentHp: 0,
            isAlerted: false,
            isAlive: false,
        };

        expect(AncientRunicShadowStealthInfiltrationEngine.executeAmbushAttack(rogue, deadGuard, 50).success).toBe(false);
        expect(AncientRunicShadowStealthInfiltrationEngine.isRogueDetectedByGuard(rogue, deadGuard)).toBe(false);
    });
});