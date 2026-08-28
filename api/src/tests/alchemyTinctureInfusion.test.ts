import { describe, it, expect } from "vitest";
import {
    AlchemyTinctureInfusionEngine,
    InfusionFlaskSession,
    PlayerToxicityState,
} from "../lib/alchemyTinctureInfusion.js";

describe("AlchemyTinctureInfusionEngine Brewing, Potency & Toxicity Mechanics", () => {
    it("brews Tincture of Clarity in Moonwell Dew with unique ID and high skill bonus", () => {
        const session: InfusionFlaskSession = {
            sessionId: "sess_01",
            recipeId: "tincture_of_clarity",
            solvent: "MOONWELL_DEW",
            herb: "STARLIGHT_LOTUS",
            steepDurationSeconds: 15,
            alchemistSkill: 100,
            isBrewed: false,
        };

        const brewRes = AlchemyTinctureInfusionEngine.brewTincture(session);
        expect(brewRes.success).toBe(true);
        expect(brewRes.tincture?.isBurned).toBe(false);
        expect(brewRes.tincture?.potencyPercent).toBe(91);
        expect(brewRes.tincture?.toxicityPoints).toBe(15);
        expect(brewRes.tincture?.tinctureId).toContain("tincture_tincture_of_clarity_");
    });

    it("penalizes over-steeped burned tinctures", () => {
        const burnedSession: InfusionFlaskSession = {
            sessionId: "sess_02",
            recipeId: "tincture_of_clarity",
            solvent: "SPRING_WATER",
            herb: "STARLIGHT_LOTUS",
            steepDurationSeconds: 40,
            alchemistSkill: 20,
            isBrewed: false,
        };

        const res = AlchemyTinctureInfusionEngine.brewTincture(burnedSession);
        expect(res.success).toBe(true);
        expect(res.tincture?.isBurned).toBe(true);
        expect(res.tincture?.potencyPercent).toBeLessThan(15);
    });

    it("accumulates toxicity clamped to max 100 and triggers toxic shock", () => {
        const player: PlayerToxicityState = { playerId: "hero_1", currentToxicity: 85, isToxicShock: false };
        const toxicTincture = {
            tinctureId: "t_1",
            recipeId: "tincture_of_berserk",
            potencyPercent: 80,
            toxicityPoints: 25,
            isBurned: false,
        };

        const consumeRes = AlchemyTinctureInfusionEngine.consumeTincture(player, toxicTincture);
        expect(consumeRes.isToxicShock).toBe(true);
        expect(player.currentToxicity).toBe(100); // Clamped strictly to 100
    });

    it("purges toxicity and accurately tracks shockCleared state transition", () => {
        const playerInShock: PlayerToxicityState = { playerId: "hero_1", currentToxicity: 100, isToxicShock: true };

        const antidoteRes = AlchemyTinctureInfusionEngine.applyAntidote(playerInShock, 50);
        expect(antidoteRes.success).toBe(true);
        expect(antidoteRes.remainingToxicity).toBe(50);
        expect(antidoteRes.shockCleared).toBe(true); // Shock transitioned from true to false
        expect(playerInShock.isToxicShock).toBe(false);

        // Applying antidote when player has no shock returns shockCleared: false
        const playerNoShock: PlayerToxicityState = { playerId: "hero_2", currentToxicity: 30, isToxicShock: false };
        const res2 = AlchemyTinctureInfusionEngine.applyAntidote(playerNoShock, 20);
        expect(res2.shockCleared).toBe(false);
        expect(playerNoShock.currentToxicity).toBe(10);
    });

    it("guards defensively against herb mismatch and invalid sessions", () => {
        const mismatchSession: InfusionFlaskSession = {
            sessionId: "sess_03",
            recipeId: "tincture_of_clarity",
            solvent: "SPRING_WATER",
            herb: "NIGHTSHADE_PETAL",
            steepDurationSeconds: 15,
            alchemistSkill: 50,
            isBrewed: false,
        };

        const res = AlchemyTinctureInfusionEngine.brewTincture(mismatchSession);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Mismatch herb");
    });
});