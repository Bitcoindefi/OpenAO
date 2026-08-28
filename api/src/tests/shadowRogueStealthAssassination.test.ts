import { describe, it, expect } from "vitest";
import {
    ShadowRogueStealthAssassinationEngine,
    RogueCombatant,
    SentryTarget,
} from "../lib/shadowRogueStealthAssassination.js";

describe("ShadowRogueStealthAssassinationEngine Stealth, Flanking & Smoke Bombs", () => {
    it("enters stealth and executes 2.5x critical backstab from behind target", () => {
        const rogue: RogueCombatant = {
            playerId: "shadow_blade_1",
            stealthState: "UNSTEALTHED",
            location: { x: 100, y: 110 },
            facingDegrees: 0,
            baseDaggerDamage: 200,
            stealthDurationSeconds: 0,
            stealthStartedEpochMs: 0,
        };

        const guard: SentryTarget = {
            targetId: "castle_guard_1",
            location: { x: 100, y: 100 },
            facingDegrees: 0,
            detectionRadiusTiles: 5,
            currentHp: 1000,
            maxHp: 1000,
            armorRating: 25,
        };

        ShadowRogueStealthAssassinationEngine.enterStealth(rogue, 30, 100000);
        expect(rogue.stealthState).toBe("IN_STEALTH");

        const backstab = ShadowRogueStealthAssassinationEngine.executeBackstab(rogue, guard);
        expect(backstab.success).toBe(true);
        expect(backstab.isBackstabCritical).toBe(true);
        expect(backstab.damageDealt).toBe(400);
        expect(guard.currentHp).toBe(600);
        expect(rogue.stealthState).toBe("UNSTEALTHED");
    });

    it("breaks stealth when entering sentry frontal vision cone and respects expiry", () => {
        const rogue: RogueCombatant = {
            playerId: "rogue_1",
            stealthState: "IN_STEALTH",
            location: { x: 103, y: 100 }, // East of sentry
            facingDegrees: 0,
            baseDaggerDamage: 150,
            stealthDurationSeconds: 30,
            stealthStartedEpochMs: 100000,
        };

        const sentry: SentryTarget = {
            targetId: "sentry_1",
            location: { x: 100, y: 100 },
            facingDegrees: 90, // Facing East towards rogue
            detectionRadiusTiles: 5,
            currentHp: 500,
            maxHp: 500,
            armorRating: 10,
        };

        const detection = ShadowRogueStealthAssassinationEngine.checkSentryDetection(rogue, sentry, 105000);
        expect(detection.isDetected).toBe(true);
        expect(rogue.stealthState).toBe("UNSTEALTHED");

        // Stealth duration expiry check
        ShadowRogueStealthAssassinationEngine.enterStealth(rogue, 10, 100000);
        const expiredCheck = ShadowRogueStealthAssassinationEngine.checkSentryDetection(rogue, sentry, 120000);
        expect(expiredCheck.isDetected).toBe(true);
        expect(expiredCheck.reason).toContain("expired");
    });

    it("deploys smoke bomb and expires concealment after duration", () => {
        const rogue: RogueCombatant = {
            playerId: "rogue_1",
            stealthState: "UNSTEALTHED",
            location: { x: 101, y: 100 },
            facingDegrees: 0,
            baseDaggerDamage: 150,
            stealthDurationSeconds: 0,
            stealthStartedEpochMs: 0,
        };

        const sentry: SentryTarget = {
            targetId: "sentry_1",
            location: { x: 100, y: 100 },
            facingDegrees: 90,
            detectionRadiusTiles: 10,
            currentHp: 500,
            maxHp: 500,
            armorRating: 10,
        };

        ShadowRogueStealthAssassinationEngine.deploySmokeBomb(rogue, 100000);
        expect(rogue.stealthState).toBe("SMOKE_CONCEALED");

        // Concealed at 2 seconds
        const detection = ShadowRogueStealthAssassinationEngine.checkSentryDetection(rogue, sentry, 102000);
        expect(detection.isDetected).toBe(false);

        // Expired after 8 seconds (109000ms)
        const expiredSmoke = ShadowRogueStealthAssassinationEngine.checkSentryDetection(rogue, sentry, 109000);
        expect(expiredSmoke.isDetected).toBe(true);
        expect(rogue.stealthState).toBe("UNSTEALTHED");
    });

    it("applies lower flank bonus when attacking from behind while unstealthed", () => {
        const rogue: RogueCombatant = {
            playerId: "rogue_1",
            stealthState: "UNSTEALTHED",
            location: { x: 100, y: 110 },
            facingDegrees: 0,
            baseDaggerDamage: 200,
            stealthDurationSeconds: 0,
            stealthStartedEpochMs: 0,
        };

        const guard: SentryTarget = {
            targetId: "guard_2",
            location: { x: 100, y: 100 },
            facingDegrees: 0,
            detectionRadiusTiles: 5,
            currentHp: 1000,
            maxHp: 1000,
            armorRating: 0,
        };

        const flank = ShadowRogueStealthAssassinationEngine.executeBackstab(rogue, guard);
        expect(flank.success).toBe(true);
        expect(flank.damageDealt).toBe(280);
        expect(flank.isBackstabCritical).toBe(false);
    });

    it("defensively guards against invalid targets and dead combatants", () => {
        const rogue: RogueCombatant = {
            playerId: "r",
            stealthState: "UNSTEALTHED",
            location: { x: 0, y: 0 },
            facingDegrees: 0,
            baseDaggerDamage: 100,
            stealthDurationSeconds: 0,
            stealthStartedEpochMs: 0,
        };

        const deadGuard: SentryTarget = {
            targetId: "dead_g",
            location: { x: 0, y: 0 },
            facingDegrees: 0,
            detectionRadiusTiles: 5,
            currentHp: 0,
            maxHp: 100,
            armorRating: 0,
        };

        const res = ShadowRogueStealthAssassinationEngine.executeBackstab(rogue, deadGuard);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Invalid rogue or target");
    });
});