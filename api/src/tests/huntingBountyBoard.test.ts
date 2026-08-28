import { describe, it, expect } from "vitest";
import {
    HuntingBountyBoardEngine,
    BountyContract,
    KillEventLocation,
    PartyMemberLocation,
} from "../lib/huntingBountyBoard.js";

describe("HuntingBountyBoardEngine Kill Tracking, Validation & Proximity", () => {
    const mockContract: BountyContract = {
        contractId: "bounty_forest_trolls",
        targetMonsterId: "forest_troll_01",
        targetMonsterName: "Forest Troll",
        requiredKillCount: 3,
        rank: "NORMAL",
        rewardGold: 1500,
        rewardReputationPoints: 100,
        rewardExp: 5000,
    };

    it("accepts contract with validation and prevents duplicate active acceptance", () => {
        const accept1 = HuntingBountyBoardEngine.acceptContract("player_1", mockContract, []);
        expect(accept1.success).toBe(true);
        expect(accept1.progress?.contractId).toBe("bounty_forest_trolls");

        // Attempt duplicate acceptance
        const acceptDup = HuntingBountyBoardEngine.acceptContract("player_1", mockContract, [accept1.progress!]);
        expect(acceptDup.success).toBe(false);
        expect(acceptDup.reason).toContain("already active");
    });

    it("records kills for nearby party members and marks complete on target quota", () => {
        const p1 = HuntingBountyBoardEngine.acceptContract("player_1", mockContract).progress!;
        const p2 = HuntingBountyBoardEngine.acceptContract("player_2", mockContract).progress!;

        const killLoc: KillEventLocation = { mapId: 1, x: 50, y: 50 };
        const party: PartyMemberLocation[] = [
            { playerId: "player_1", mapId: 1, x: 52, y: 50 }, // In range (2 tiles away)
            { playerId: "player_2", mapId: 1, x: 90, y: 90 }, // Out of range (> 15 tiles away)
        ];

        HuntingBountyBoardEngine.recordMonsterKill(mockContract, [p1, p2], killLoc, party, "forest_troll_01");

        expect(p1.currentKills).toBe(1);
        expect(p2.currentKills).toBe(0);
    });

    it("completes contract upon reaching required kills and claims reward", () => {
        const p1 = HuntingBountyBoardEngine.acceptContract("player_1", mockContract).progress!;
        p1.currentKills = 2;

        const killLoc: KillEventLocation = { mapId: 1, x: 50, y: 50 };
        const party: PartyMemberLocation[] = [{ playerId: "player_1", mapId: 1, x: 50, y: 50 }];

        HuntingBountyBoardEngine.recordMonsterKill(mockContract, [p1], killLoc, party, "forest_troll_01");

        expect(p1.isCompleted).toBe(true);
        expect(p1.currentKills).toBe(3);

        const claim = HuntingBountyBoardEngine.claimReward(mockContract, p1);
        expect(claim.success).toBe(true);
        expect(claim.goldAwarded).toBe(1500);
        expect(claim.reputationAwarded).toBe(100);
        expect(p1.isClaimed).toBe(true);
    });
});