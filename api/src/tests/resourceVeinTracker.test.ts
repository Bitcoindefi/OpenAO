import { describe, it, expect } from "vitest";
import { ResourceVeinTracker, MineralVein } from "../lib/resourceVeinTracker.js";

describe("ResourceVeinTracker Refined Lock Enforcement & Respawns", () => {
    const mockVein: MineralVein = {
        veinId: "vein_copper_01",
        veinType: "COPPER",
        mapId: 1,
        x: 45,
        y: 60,
        state: "PRISTINE",
        totalOreUnits: 2,
        remainingOreUnits: 2,
        activeMinerPlayerId: null,
        respawnTicksRemaining: 0,
        baseRespawnTicks: 10,
    };

    it("enforces node lock and rejects un-locked mining attempts", () => {
        const tracker = new ResourceVeinTracker();
        tracker.registerVein({ ...mockVein });

        // Player 1 acquires lock
        const locked = tracker.acquireVeinLock("vein_copper_01", "player_1");
        expect(locked).toBe(true);

        // Player 2 attempts to mine without lock -> Rejected
        const unauthorizedRes = tracker.mineVein("vein_copper_01", {
            playerId: "player_2",
            miningSkill: 50,
            pickaxeTier: 2,
            rng: () => 0.1,
        });
        expect(unauthorizedRes.success).toBe(false);
        expect(unauthorizedRes.reason).toBe("Player does not hold the lock for this vein");

        // Player 1 mines successfully
        const authorizedRes = tracker.mineVein("vein_copper_01", {
            playerId: "player_1",
            miningSkill: 50,
            pickaxeTier: 2,
            rng: () => 0.1,
        });
        expect(authorizedRes.success).toBe(true);
        expect(authorizedRes.oreExtracted).toBe(1);
    });

    it("transitions to RESPAWNING on depletion and resets to totalOreUnits", () => {
        const tracker = new ResourceVeinTracker();
        tracker.registerVein({ ...mockVein, remainingOreUnits: 1 });
        tracker.acquireVeinLock("vein_copper_01", "player_1");

        const mineRes = tracker.mineVein("vein_copper_01", {
            playerId: "player_1",
            miningSkill: 50,
            pickaxeTier: 2,
            rng: () => 0.1,
        });

        expect(mineRes.veinDepleted).toBe(true);
        const vein = tracker.getVein("vein_copper_01")!;
        expect(vein.state).toBe("RESPAWNING");

        // Progress ticks
        vein.respawnTicksRemaining = 1;
        const respawned = tracker.tickRespawns();
        expect(respawned).toBe(1);
        expect(vein.state).toBe("PRISTINE");
        expect(vein.remainingOreUnits).toBe(vein.totalOreUnits); // 2
    });
});