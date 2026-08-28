import { describe, it, expect } from "vitest";
import {
    UnderworldDungeonPortalEngine,
    KeystoneItem,
    DungeonPartyMember,
} from "../lib/underworldDungeonPortal.js";

describe("UnderworldDungeonPortalEngine Keystone Attunement & Instance Lifecycle", () => {
    const mockKeystone: KeystoneItem = {
        keystoneId: "key_crypt_01",
        dungeonId: "crypt_of_the_damned",
        difficulty: "HEROIC",
        levelModifier: 5,
    };

    const leader: DungeonPartyMember = { playerId: "leader_1", level: 30, hasAttunementKey: true };
    const party: DungeonPartyMember[] = [
        { playerId: "member_2", level: 28, hasAttunementKey: true },
        { playerId: "member_3", level: 32, hasAttunementKey: true },
    ];

    it("opens dungeon portal when all party members meet level and attunement requirements", () => {
        const portalRes = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000);
        expect(portalRes.success).toBe(true);
        expect(portalRes.instance?.partyMembers.length).toBe(3);
        expect(portalRes.instance?.difficulty).toBe("HEROIC");
        expect(portalRes.instance?.totalBosses).toBe(3);
    });

    it("rejects portal opening when a member lacks the required attunement key on Heroic", () => {
        const unAttunedParty: DungeonPartyMember[] = [
            { playerId: "member_unattuned", level: 30, hasAttunementKey: false },
        ];

        const res = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, unAttunedParty, 100000);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("lacks the required Attunement Key");
    });

    it("tracks boss chamber lockouts and completes dungeon upon defeating all bosses", () => {
        const instance = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000).instance!;

        // Boss 1 Lockout & Defeat
        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "LOCK_CHAMBER", 105000);
        expect(instance.isBossChamberLocked).toBe(true);

        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 110000);
        expect(instance.defeatedBosses).toBe(1);
        expect(instance.isBossChamberLocked).toBe(false);

        // Boss 2 & 3 Defeat
        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 120000);
        const finalBoss = UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 130000);
        expect(finalBoss.instanceCompleted).toBe(true);
        expect(instance.isCompleted).toBe(true);
    });

    it("awards GOLD_CHEST for fast dungeon clear within time limits", () => {
        const instance = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000).instance!;
        instance.isCompleted = true;

        // Clear at 200,000 (only 100,000 ms elapsed -> >60% time remaining)
        const chestRes = UnderworldDungeonPortalEngine.determineRewardChest(instance, 200000);
        expect(chestRes.success).toBe(true);
        expect(chestRes.chestTier).toBe("GOLD_CHEST");
    });

    it("guards against expired instances and uncompleted reward claims", () => {
        const instance = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000).instance!;

        // Premature reward claim
        const premature = UnderworldDungeonPortalEngine.determineRewardChest(instance, 150000);
        expect(premature.success).toBe(false);
        expect(premature.reason).toContain("not yet fully completed");

        // Action past expiration (expiresAt is 1,900,000)
        const expiredRes = UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 2000000);
        expect(expiredRes.success).toBe(false);
        expect(expiredRes.reason).toContain("expired");
    });
});