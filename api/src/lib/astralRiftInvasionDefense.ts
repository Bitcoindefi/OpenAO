/**
 * Astral Rift World Event, Dimensional Invasion Waves & Celestial Sealing Engine for OpenAO MMORPG.
 * Simulates opening dimensional rifts, spawning waves of void monstrosities,
 * managing rift stability degradation, channeling celestial sealing runes, and awarding contribution reward tiers.
 */

export type VoidInvaderType = "VOID_WALKER" | "NETHER_STALKER" | "CHAOS_BEHEMOTH" | "ASTRAL_RIFTLORD";
export type RiftEventPhase = "PREPARATION" | "INVASION_ACTIVE" | "BOSS_PHASE" | "SEALED_VICTORY" | "COLLAPSED_FAILURE";
export type DefenseRewardTier = "TIER_1_DEFENDER" | "TIER_2_GUARDIAN" | "TIER_3_REALM_SAVIOR";

export interface RiftInvasionEvent {
    eventId: string;
    zoneName: string;
    phase: RiftEventPhase;
    riftStabilityPercent: number; // 0 to 100
    currentWave: number;
    totalWaves: number;
    playerContributions: Map<string, number>;
    openedAtEpochMs: number;
    expiresAtEpochMs: number;
}

export const VOID_INVADER_DATA: Record<VoidInvaderType, { baseHp: number; stabilityDegradeOnSpawn: number; contributionValue: number }> = {
    VOID_WALKER: { baseHp: 800, stabilityDegradeOnSpawn: 5, contributionValue: 20 },
    NETHER_STALKER: { baseHp: 1500, stabilityDegradeOnSpawn: 10, contributionValue: 50 },
    CHAOS_BEHEMOTH: { baseHp: 3500, stabilityDegradeOnSpawn: 15, contributionValue: 120 },
    ASTRAL_RIFTLORD: { baseHp: 10000, stabilityDegradeOnSpawn: 25, contributionValue: 350 },
};

export class AstralRiftInvasionDefenseEngine {
    public static readonly MAX_STABILITY = 100;

    /**
     * Initializes a new Astral Rift event in the designated zone.
     */
    public static initializeRift(
        eventId: string,
        zoneName: string,
        durationMinutes = 20,
        totalWaves = 3,
        currentEpochMs = Date.now()
    ): RiftInvasionEvent {
        return {
            eventId,
            zoneName,
            phase: "PREPARATION",
            riftStabilityPercent: this.MAX_STABILITY,
            currentWave: 0,
            totalWaves: Math.max(1, totalWaves),
            playerContributions: new Map<string, number>(),
            openedAtEpochMs: currentEpochMs,
            expiresAtEpochMs: currentEpochMs + Math.max(5, durationMinutes) * 60 * 1000,
        };
    }

    /**
     * Advances the event to the next wave of invaders, degrading stability.
     */
    public static spawnWave(
        event: RiftInvasionEvent,
        invaderType: VoidInvaderType,
        invaderCount: number,
        currentEpochMs = Date.now()
    ): { success: boolean; waveNumber: number; stabilityRemaining: number; phase: RiftEventPhase; reason?: string } {
        if (!event || event.phase === "SEALED_VICTORY" || event.phase === "COLLAPSED_FAILURE") {
            return { success: false, waveNumber: event?.currentWave ?? 0, stabilityRemaining: event?.riftStabilityPercent ?? 0, phase: event?.phase ?? "COLLAPSED_FAILURE", reason: "Event has already concluded." };
        }

        if (currentEpochMs >= event.expiresAtEpochMs) {
            event.phase = "COLLAPSED_FAILURE";
            event.riftStabilityPercent = 0; // Mutate stored stability to match return value
            return { success: false, waveNumber: event.currentWave, stabilityRemaining: 0, phase: "COLLAPSED_FAILURE", reason: "Rift event duration expired." };
        }

        const invaderData = VOID_INVADER_DATA[invaderType];
        if (!invaderData) {
            return { success: false, waveNumber: event.currentWave, stabilityRemaining: event.riftStabilityPercent, phase: event.phase, reason: `Unknown invader type: ${String(invaderType)}` };
        }

        const count = Number.isFinite(invaderCount) ? Math.max(1, Math.floor(invaderCount)) : 1;
        const degradeAmount = invaderData.stabilityDegradeOnSpawn * count;

        event.riftStabilityPercent = Math.max(0, event.riftStabilityPercent - degradeAmount);
        event.currentWave += 1;

        if (event.riftStabilityPercent === 0) {
            event.phase = "COLLAPSED_FAILURE";
        } else if (event.currentWave >= event.totalWaves || invaderType === "ASTRAL_RIFTLORD") {
            event.phase = "BOSS_PHASE";
        } else {
            event.phase = "INVASION_ACTIVE";
        }

        return {
            success: true,
            waveNumber: event.currentWave,
            stabilityRemaining: event.riftStabilityPercent,
            phase: event.phase,
        };
    }

    /**
     * Channels celestial sealing runes to restore rift stability during active invasion phases.
     */
    public static channelSealingRune(
        event: RiftInvasionEvent,
        playerId: string,
        runePowerAmount: number
    ): { success: boolean; newStability: number; playerTotalContribution: number; eventSealed: boolean; reason?: string } {
        if (!event || event.phase === "COLLAPSED_FAILURE" || event.phase === "SEALED_VICTORY") {
            return { success: false, newStability: event?.riftStabilityPercent ?? 0, playerTotalContribution: 0, eventSealed: false, reason: "Event is inactive or already completed." };
        }

        if (event.phase === "PREPARATION") {
            return { success: false, newStability: event.riftStabilityPercent, playerTotalContribution: 0, eventSealed: false, reason: "Cannot channel sealing runes during the preparation phase." };
        }

        if (!playerId) {
            return { success: false, newStability: event.riftStabilityPercent, playerTotalContribution: 0, eventSealed: false, reason: "Invalid player ID." };
        }

        const power = Number.isFinite(runePowerAmount) ? Math.max(0, Math.floor(runePowerAmount)) : 0;
        event.riftStabilityPercent = Math.min(this.MAX_STABILITY, event.riftStabilityPercent + power);

        const currentPoints = event.playerContributions.get(playerId) ?? 0;
        const newPoints = currentPoints + power * 2;
        event.playerContributions.set(playerId, newPoints);

        if (event.phase === "BOSS_PHASE" && event.riftStabilityPercent >= 90) {
            event.phase = "SEALED_VICTORY";
        }

        return {
            success: true,
            newStability: event.riftStabilityPercent,
            playerTotalContribution: newPoints,
            eventSealed: event.phase === "SEALED_VICTORY",
        };
    }

    /**
     * Calculates the defense reward tier earned by a player based on contribution points.
     */
    public static evaluatePlayerRewardTier(
        event: RiftInvasionEvent,
        playerId: string
    ): { rewardTier?: DefenseRewardTier; contributionPoints: number; isEligible: boolean } {
        if (!event || !playerId) {
            return { contributionPoints: 0, isEligible: false };
        }

        const points = event.playerContributions.get(playerId) ?? 0;
        if (points < 50) {
            return { contributionPoints: points, isEligible: false };
        }

        let rewardTier: DefenseRewardTier = "TIER_1_DEFENDER";
        if (points >= 300) {
            rewardTier = "TIER_3_REALM_SAVIOR";
        } else if (points >= 150) {
            rewardTier = "TIER_2_GUARDIAN";
        }

        return {
            rewardTier,
            contributionPoints: points,
            isEligible: true,
        };
    }
}