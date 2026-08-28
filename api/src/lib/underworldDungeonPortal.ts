/**
 * Instanced Underworld Dungeon Portal & Keystone Attunement Engine for OpenAO MMORPG.
 * Simulates opening instanced portals, party deduplication, keystone level difficulty scaling,
 * verifying party attunement keys, tracking instance expiration, boss chamber lockouts,
 * and awarding time-scaled reward chests.
 */

export type DungeonDifficulty = "NORMAL" | "HEROIC" | "MYTHIC_KEYSTONE";
export type RewardChestTier = "BRONZE_CHEST" | "SILVER_CHEST" | "GOLD_CHEST" | "MYTHIC_CACHE";

export interface DungeonDefinition {
    dungeonId: string;
    dungeonName: string;
    requiredLevel: number;
    baseDurationMinutes: number;
    maxPartySize: number;
    bossCount: number;
}

export interface KeystoneItem {
    keystoneId: string;
    dungeonId: string;
    difficulty: DungeonDifficulty;
    levelModifier?: number; // e.g. +2 to +15 for Mythic Keystone timers
}

export interface DungeonPartyMember {
    playerId: string;
    level: number;
    hasAttunementKey: boolean;
}

export interface ActiveDungeonInstance {
    instanceId: string;
    dungeonId: string;
    difficulty: DungeonDifficulty;
    levelModifier: number;
    leaderPlayerId: string;
    partyMembers: string[];
    openedAtEpochMs: number;
    expiresAtEpochMs: number;
    defeatedBosses: number;
    totalBosses: number;
    isBossChamberLocked: boolean;
    isCompleted: boolean;
    isExpired: boolean;
}

export const DUNGEON_CATALOG: Record<string, DungeonDefinition> = {
    crypt_of_the_damned: {
        dungeonId: "crypt_of_the_damned",
        dungeonName: "Crypt of the Damned",
        requiredLevel: 25,
        baseDurationMinutes: 30,
        maxPartySize: 5,
        bossCount: 3,
    },
    abyssal_citadel: {
        dungeonId: "abyssal_citadel",
        dungeonName: "Abyssal Citadel",
        requiredLevel: 45,
        baseDurationMinutes: 45,
        maxPartySize: 5,
        bossCount: 4,
    },
};

export class UnderworldDungeonPortalEngine {
    /**
     * Opens an instanced dungeon portal using a keystone and party attunement verification.
     */
    public static openPortal(
        keystone: KeystoneItem,
        leader: DungeonPartyMember,
        party: DungeonPartyMember[] = [],
        currentEpochMs = Date.now()
    ): { success: boolean; instance?: ActiveDungeonInstance; reason?: string } {
        if (!keystone || !keystone.dungeonId) {
            return { success: false, reason: "Invalid keystone provided." };
        }

        const dungeon = DUNGEON_CATALOG[keystone.dungeonId];
        if (!dungeon) {
            return { success: false, reason: `Unknown dungeon: ${keystone.dungeonId}` };
        }

        // Deduplicate party members by playerId
        const memberMap = new Map<string, DungeonPartyMember>();
        if (leader && leader.playerId) memberMap.set(leader.playerId, leader);
        for (const p of party) {
            if (p && p.playerId) memberMap.set(p.playerId, p);
        }

        const allMembers = Array.from(memberMap.values());
        if (allMembers.length > dungeon.maxPartySize) {
            return { success: false, reason: `Party exceeds maximum capacity of ${dungeon.maxPartySize} players.` };
        }

        for (const member of allMembers) {
            if (member.level < dungeon.requiredLevel) {
                return { success: false, reason: `Player ${member.playerId} does not meet required level ${dungeon.requiredLevel}.` };
            }
            if (keystone.difficulty !== "NORMAL" && !member.hasAttunementKey) {
                return { success: false, reason: `Player ${member.playerId} lacks the required Attunement Key for ${keystone.difficulty} difficulty.` };
            }
        }

        // Factor levelModifier into instance duration: tightens timer by 1 min per +2 key levels
        const levelMod = Math.max(0, keystone.levelModifier ?? 0);
        const timeReductionMin = keystone.difficulty === "MYTHIC_KEYSTONE" ? Math.floor(levelMod / 2) : 0;
        const finalDurationMinutes = Math.max(10, dungeon.baseDurationMinutes - timeReductionMin);
        const durationMs = finalDurationMinutes * 60 * 1000;

        const instance: ActiveDungeonInstance = {
            instanceId: `inst_${keystone.dungeonId}_${currentEpochMs}`,
            dungeonId: dungeon.dungeonId,
            difficulty: keystone.difficulty,
            levelModifier: levelMod,
            leaderPlayerId: leader.playerId,
            partyMembers: allMembers.map((m) => m.playerId),
            openedAtEpochMs: currentEpochMs,
            expiresAtEpochMs: currentEpochMs + durationMs,
            defeatedBosses: 0,
            totalBosses: dungeon.bossCount,
            isBossChamberLocked: false,
            isCompleted: false,
            isExpired: false,
        };

        return {
            success: true,
            instance,
        };
    }

    /**
     * Engages or defeats a boss within the instance, strictly enforcing lockouts.
     */
    public static recordBossEncounter(
        instance: ActiveDungeonInstance,
        action: "LOCK_CHAMBER" | "DEFEAT_BOSS" | "UNLOCK_CHAMBER",
        currentEpochMs = Date.now()
    ): { success: boolean; instanceCompleted: boolean; reason?: string } {
        if (!instance || instance.isExpired || instance.isCompleted) {
            return { success: false, instanceCompleted: false, reason: "Instance is already concluded or expired." };
        }

        if (currentEpochMs >= instance.expiresAtEpochMs) {
            instance.isExpired = true;
            return { success: false, instanceCompleted: false, reason: "Dungeon instance timer has expired." };
        }

        if (action === "LOCK_CHAMBER") {
            instance.isBossChamberLocked = true;
            return { success: true, instanceCompleted: false };
        }

        if (action === "UNLOCK_CHAMBER") {
            instance.isBossChamberLocked = false;
            return { success: true, instanceCompleted: false };
        }

        if (action === "DEFEAT_BOSS") {
            if (instance.isBossChamberLocked) {
                return { success: false, instanceCompleted: false, reason: "Boss chamber is locked; unlock chamber before recording defeat." };
            }

            instance.defeatedBosses = Math.min(instance.totalBosses, instance.defeatedBosses + 1);

            if (instance.defeatedBosses >= instance.totalBosses) {
                instance.isCompleted = true;
                return { success: true, instanceCompleted: true };
            }
            return { success: true, instanceCompleted: false };
        }

        return { success: false, instanceCompleted: false, reason: "Invalid boss encounter action." };
    }

    /**
     * Concludes a completed dungeon run and determines the reward chest tier based on clear time.
     */
    public static determineRewardChest(
        instance: ActiveDungeonInstance,
        completionEpochMs = Date.now()
    ): { success: boolean; chestTier?: RewardChestTier; timeRemainingSeconds: number; reason?: string } {
        if (!instance || !instance.isCompleted) {
            return { success: false, timeRemainingSeconds: 0, reason: "Dungeon instance is not yet fully completed." };
        }

        const remainingMs = instance.expiresAtEpochMs - completionEpochMs;
        const totalDurationMs = instance.expiresAtEpochMs - instance.openedAtEpochMs;
        const timeRemainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

        const timeRatio = remainingMs / Math.max(1, totalDurationMs);

        let chestTier: RewardChestTier = "BRONZE_CHEST";
        if (timeRatio >= 0.60) {
            chestTier = instance.difficulty === "MYTHIC_KEYSTONE" ? "MYTHIC_CACHE" : "GOLD_CHEST";
        } else if (timeRatio >= 0.30) {
            chestTier = "SILVER_CHEST";
        }

        return {
            success: true,
            chestTier,
            timeRemainingSeconds,
        };
    }
}