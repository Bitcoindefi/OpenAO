/**
 * Monster Hunting & Elite Beast Bounty Board Engine for OpenAO MMORPG.
 * Simulates radiant monster hunt contracts, contract validation & deduplication,
 * party proximity credit verification (15 tiles), contract progression tracking,
 * and scaled gold/reputation reward distribution.
 */

export type BountyRank = "NORMAL" | "VETERAN" | "LEGENDARY_BEAST";

export interface BountyContract {
    contractId: string;
    targetMonsterId: string;
    targetMonsterName: string;
    requiredKillCount: number;
    rank: BountyRank;
    rewardGold: number;
    rewardReputationPoints: number;
    rewardExp: number;
}

export interface PlayerBountyProgress {
    contractId: string;
    playerId: string;
    currentKills: number;
    isCompleted: boolean;
    isClaimed: boolean;
}

export interface KillEventLocation {
    mapId: number;
    x: number;
    y: number;
}

export interface PartyMemberLocation {
    playerId: string;
    mapId: number;
    x: number;
    y: number;
}

export class HuntingBountyBoardEngine {
    public static readonly PARTY_PROXIMITY_TILES = 15.0;

    /**
     * Accepts a bounty contract for a player, validating contract integrity and deduplication.
     */
    public static acceptContract(
        playerId: string,
        contract: BountyContract,
        existingProgressList: PlayerBountyProgress[] = []
    ): { success: boolean; progress?: PlayerBountyProgress; reason?: string } {
        if (!contract || !contract.contractId) {
            return { success: false, reason: "Invalid contract provided." };
        }

        const requiredKills = Math.max(1, contract.requiredKillCount ?? 1);

        const alreadyAccepted = existingProgressList.some(
            (p) => p.playerId === playerId && p.contractId === contract.contractId && !p.isClaimed
        );

        if (alreadyAccepted) {
            return { success: false, reason: "Contract is already active for this player." };
        }

        const progress: PlayerBountyProgress = {
            contractId: contract.contractId,
            playerId,
            currentKills: 0,
            isCompleted: false,
            isClaimed: false,
        };

        return {
            success: true,
            progress,
        };
    }

    /**
     * Checks if a player is within eligible proximity to receive kill credit.
     */
    public static isPlayerInKillRange(
        killLoc: KillEventLocation,
        playerLoc: PartyMemberLocation
    ): boolean {
        if (killLoc.mapId !== playerLoc.mapId) return false;
        const dx = killLoc.x - playerLoc.x;
        const dy = killLoc.y - playerLoc.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.PARTY_PROXIMITY_TILES;
    }

    /**
     * Records a monster kill event for party members eligible for bounty progress.
     */
    public static recordMonsterKill(
        contract: BountyContract,
        progressList: PlayerBountyProgress[],
        killLoc: KillEventLocation,
        partyMembers: PartyMemberLocation[],
        killedMonsterId: string
    ): Array<{ playerId: string; updatedKills: number; isCompleted: boolean }> {
        if (killedMonsterId !== contract.targetMonsterId) return [];

        const results: Array<{ playerId: string; updatedKills: number; isCompleted: boolean }> = [];
        const requiredKills = Math.max(1, contract.requiredKillCount ?? 1);

        for (const progress of progressList) {
            if (progress.contractId !== contract.contractId || progress.isCompleted) continue;

            const memberLoc = partyMembers.find((m) => m.playerId === progress.playerId);
            if (!memberLoc || !this.isPlayerInKillRange(killLoc, memberLoc)) {
                continue; // Too far from kill site or on different map
            }

            progress.currentKills = Math.min(requiredKills, progress.currentKills + 1);
            if (progress.currentKills >= requiredKills) {
                progress.isCompleted = true;
            }

            results.push({
                playerId: progress.playerId,
                updatedKills: progress.currentKills,
                isCompleted: progress.isCompleted,
            });
        }

        return results;
    }

    /**
     * Claims rewards for a completed bounty contract.
     */
    public static claimReward(
        contract: BountyContract,
        progress: PlayerBountyProgress
    ): { success: boolean; goldAwarded: number; reputationAwarded: number; expAwarded: number; reason?: string } {
        if (progress.contractId !== contract.contractId) {
            return { success: false, goldAwarded: 0, reputationAwarded: 0, expAwarded: 0, reason: "Contract mismatch." };
        }

        if (!progress.isCompleted) {
            return { success: false, goldAwarded: 0, reputationAwarded: 0, expAwarded: 0, reason: "Bounty objectives not yet completed." };
        }

        if (progress.isClaimed) {
            return { success: false, goldAwarded: 0, reputationAwarded: 0, expAwarded: 0, reason: "Bounty reward has already been claimed." };
        }

        progress.isClaimed = true;

        return {
            success: true,
            goldAwarded: contract.rewardGold,
            reputationAwarded: contract.rewardReputationPoints,
            expAwarded: contract.rewardExp,
        };
    }
}