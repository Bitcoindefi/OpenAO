import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GuildWarScheduler, TerritoryState } from "../lib/guildWarScheduler.js";

describe("GuildWarScheduler Refined Territory Siege", () => {
    const createMockTerritory = (): TerritoryState => ({
        territoryId: "castle_blackrock",
        controllingGuildId: "guild_defenders",
        siegeWindow: { dayOfWeek: 6, startHour: 20, endHour: 22 },
        isSiegeActive: false,
        currentWarScores: new Map(),
        capturePointHolderGuildId: null,
    });

    it("retains defender control when scores are tied", () => {
        const territory = createMockTerritory();
        territory.isSiegeActive = true;
        territory.currentWarScores.set("guild_attackers", 500);
        territory.currentWarScores.set("guild_defenders", 500);

        GuildWarScheduler.resolveSiege(territory);

        // Defender retains territory on tie
        assert.equal(territory.controllingGuildId, "guild_defenders");
        assert.equal(territory.isSiegeActive, false);
    });

    it("transfers control to attacker when strictly out-scoring defender", () => {
        const territory = createMockTerritory();
        territory.isSiegeActive = true;
        territory.currentWarScores.set("guild_attackers", 510);
        territory.currentWarScores.set("guild_defenders", 500);

        GuildWarScheduler.resolveSiege(territory);

        assert.equal(territory.controllingGuildId, "guild_attackers");
    });

    it("supports midnight-spanning siege windows", () => {
        const window = { dayOfWeek: 6, startHour: 22, endHour: 2 }; // Sat 22:00 to Sun 02:00

        const satNight = new Date(Date.UTC(2026, 7, 29, 23, 0, 0)); // Sat 23:00
        const sunMorning = new Date(Date.UTC(2026, 7, 30, 1, 30, 0)); // Sun 01:30
        const sunAfternoon = new Date(Date.UTC(2026, 7, 30, 14, 0, 0)); // Sun 14:00

        assert.equal(GuildWarScheduler.isTimeInSiegeWindow(satNight, window), true);
        assert.equal(GuildWarScheduler.isTimeInSiegeWindow(sunMorning, window), true);
        assert.equal(GuildWarScheduler.isTimeInSiegeWindow(sunAfternoon, window), false);
    });
});