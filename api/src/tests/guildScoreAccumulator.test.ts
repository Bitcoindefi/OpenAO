import { describe, it, expect } from "vitest";
import { GuildScoreAccumulator } from "../lib/guildScoreAccumulator.js";

describe("GuildScoreAccumulator Refined Seasonal Scoring", () => {
    it("computes points for activities and safely rejects negative inputs", () => {
        expect(GuildScoreAccumulator.calculateEventPoints({ type: "PVP_ENEMY_GUILD_KILL" })).toBe(25);

        // Negative multiplier clamped to 0
        const negMult = GuildScoreAccumulator.calculateEventPoints({
            type: "DUNGEON_BOSS_CLEAR",
            pointsMultiplier: -2.0,
        });
        expect(negMult).toBe(0);

        // Negative gold amount clamped to 0
        const negGold = GuildScoreAccumulator.calculateEventPoints({
            type: "GOLD_VAULT_DONATION",
            goldAmount: -50000,
        });
        expect(negGold).toBe(0);
    });

    it("evaluates guild tier brackets and member limits", () => {
        expect(GuildScoreAccumulator.getTierForScore(500).tier).toBe("BRONZE");
        expect(GuildScoreAccumulator.getTierForScore(6500).tier).toBe("GOLD");
        expect(GuildScoreAccumulator.getTierForScore(40000).tier).toBe("GRANDMASTER");
        expect(GuildScoreAccumulator.getTierForScore(40000).hasExclusiveCastlePortal).toBe(true);
    });

    it("calculates flat seasonal rating decay", () => {
        const decayed = GuildScoreAccumulator.computeSeasonResetScore(10000, 0.50);
        expect(decayed).toBe(5000);
    });
});