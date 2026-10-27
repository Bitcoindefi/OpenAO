import { describe, it, expect } from "vitest";
import { PlayerTitleSystemEngine, PlayerAchievementStats } from "../lib/playerTitleSystem.js";

describe("PlayerTitleSystemEngine Achievement Unlocks, Ownership Verification & Sanitization", () => {
    it("unlocks titles based on player achievement milestones", () => {
        const stats: PlayerAchievementStats = {
            dragonsSlain: 15,
            pvpRank: 10,
            fishingSkill: 50,
            dungeonsCompleted: 10,
            goldEarnedTotal: 50000,
        };

        const unlocked = PlayerTitleSystemEngine.resolveUnlockedTitles(stats);
        expect(unlocked).toContain("dragonbane");
        expect(unlocked).toContain("grand_inquisitor");
        expect(unlocked).not.toContain("master_angler");
    });

    it("verifies unlock ownership before applying titles and perks", () => {
        const unlockedTitles = ["dragonbane"]; // Player ONLY owns dragonbane

        // Equipping unlocked title succeeds
        const legitName = PlayerTitleSystemEngine.formatNameplate("Arthur", "dragonbane", unlockedTitles);
        expect(legitName).toBe("[Dragonbane] Arthur");

        const legitPerks = PlayerTitleSystemEngine.getActivePerks("dragonbane", unlockedTitles);
        expect(legitPerks.bonusMaxHp).toBe(50);

        // Attempting to equip unearned title 'undying_champion' fails and grants no perks
        const spoofedName = PlayerTitleSystemEngine.formatNameplate("Arthur", "undying_champion", unlockedTitles);
        expect(spoofedName).toBe("Arthur");

        const spoofedPerks = PlayerTitleSystemEngine.getActivePerks("undying_champion", unlockedTitles);
        expect(spoofedPerks).toEqual({});
    });

    it("sanitizes player names against title spoofing in nameplates", () => {
        // Player names with fake brackets or commas
        const sanitized = PlayerTitleSystemEngine.formatNameplate("[Dragonbane] Arthur", undefined);
        expect(sanitized).toBe("Dragonbane Arthur");
    });

    it("handles unknown or undefined title IDs gracefully", () => {
        expect(PlayerTitleSystemEngine.formatNameplate("Arthur", "unknown_title")).toBe("Arthur");
        expect(PlayerTitleSystemEngine.getActivePerks("unknown_title")).toEqual({});
        expect(PlayerTitleSystemEngine.getActivePerks(undefined)).toEqual({});
    });
});