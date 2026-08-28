import { describe, it, expect } from "vitest";
import {
    UnderworldDungeonPortalEngine,
    KeystoneItem,
    DungeonPartyMember,
} from "../lib/underworldDungeonPortal.js";

describe("UnderworldDungeonPortalEngine Keystone Attunement, Deduplication & Scaling", () => {
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

    it("opens dungeon portal and deduplicates party members with level scaling", () => {
        const partyWithDup = [...party, { playerId: "member_2", level: 28, hasAttunementKey: true }];
        const portalRes = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, partyWithDup, 100000);

        expect(portalRes.success).toBe(true);
        expect(portalRes.instance?.partyMembers.length).toBe(3);
        expect(portalRes.instance?.difficulty).toBe("HEROIC");
    });

    it("scales Mythic Keystone duration based on levelModifier", () => {
        const mythicKey: KeystoneItem = {
            keystoneId: "key_abyss_10",
            dungeonId: "abyssal_citadel",
            difficulty: "MYTHIC_KEYSTONE",
            levelModifier: 10,
        };

        const res = UnderworldDungeonPortalEngine.openPortal(mythicKey, { playerId: "l", level: 50, hasAttunementKey: true }, [], 100000);
        expect(res.success).toBe(true);
        expect(res.instance?.expiresAtEpochMs).toBe(100000 + 2400000);
    });

    it("strictly blocks boss defeat while chamber is locked and allows defeat after unlocking", () => {
        const instance = UnderworldDungeonPortalEngine.openPortal(mockKeystone, leader, party, 100000).instance!;

        // Lock chamber
        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "LOCK_CHAMBER", 105000);
        expect(instance.isBossChamberLocked).toBe(true);

        // Attempt defeat while locked -> strictly blocked
        const blockedDefeat = UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 106000);
        expect(blockedDefeat.success).toBe(false);
        expect(blockedDefeat.reason).toContain("Boss chamber is locked");
        expect(instance.defeatedBosses).toBe(0);

        // Unlock and defeat
        UnderworldDungeonPortalEngine.recordBossEncounter(instance, "UNLOCK_CHAMBER", 107000);
        expect(instance.isBossChamberLocked).toBe(false);

        const defeatRes = UnderworldDungeonPortalEngine.recordBossEncounter(instance, "DEFEAT_BOSS", 110000);
        expect(defeatRes.success).toBe(true);
        expect(instance.defeatedBosses).toBe(1);
    });
});