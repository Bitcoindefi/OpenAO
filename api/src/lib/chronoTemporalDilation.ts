/**
 * Chronomancy Temporal Dilation, Haste Stasis & Paradox Engine for OpenAO MMORPG.
 * Simulates temporal spellcraft (Time Warp, Chrono Stasis, Temporal Echo, Rewind Fate),
 * calculating haste tick multipliers, snapshotting health states, and triggering temporal paradox backlashes.
 */

export type ChronoSpellType = "TIME_WARP" | "CHRONO_STASIS" | "TEMPORAL_ECHO" | "REWIND_FATE";

export interface ActiveTemporalEffect {
    effectId: string;
    spellType: ChronoSpellType;
    targetPlayerId: string;
    casterPlayerId: string;
    hasteMultiplier: number; // e.g. 1.5x
    durationSeconds: number;
    startedAtEpochMs: number;
    expiresAtEpochMs: number;
}

export interface PlayerChronoState {
    playerId: string;
    currentHp: number;
    maxHp: number;
    healthSnapshots: Array<{ epochMs: number; hp: number }>;
    activeEffects: ActiveTemporalEffect[];
    isStasisLocked: boolean;
}

export class ChronoTemporalDilationEngine {
    public static readonly MAX_PARADOX_THRESHOLD = 3;

    /**
     * Casts a chronomancy spell on a target player.
     */
    public static castChronoSpell(
        caster: PlayerChronoState,
        target: PlayerChronoState,
        spellType: ChronoSpellType,
        durationSeconds = 10,
        currentEpochMs = Date.now()
    ): { success: boolean; effect?: ActiveTemporalEffect; isParadoxTriggered: boolean; paradoxDamageDealt: number; reason?: string } {
        if (!caster || !target) {
            return { success: false, isParadoxTriggered: false, paradoxDamageDealt: 0, reason: "Invalid caster or target." };
        }

        // Clean up expired effects first
        this.cleanseExpiredEffects(target, currentEpochMs);
        this.cleanseExpiredEffects(caster, currentEpochMs);

        // Record health snapshot for Rewind Fate
        this.recordHealthSnapshot(target, currentEpochMs);

        // Paradox check: Stacking > 3 active spells on caster causes temporal backlash
        if (caster.activeEffects.length >= this.MAX_PARADOX_THRESHOLD) {
            const backlashDamage = Math.floor(caster.maxHp * 0.35);
            caster.currentHp = Math.max(1, caster.currentHp - backlashDamage);
            caster.activeEffects = []; // Dispels all effects upon paradox

            return {
                success: false,
                isParadoxTriggered: true,
                paradoxDamageDealt: backlashDamage,
                reason: "Temporal Paradox Backlash! Too many overlapping time streams collapsed.",
            };
        }

        const dur = Number.isFinite(durationSeconds) ? Math.max(1, durationSeconds) : 10;
        const durMs = dur * 1000;

        let hasteMult = 1.0;
        if (spellType === "TIME_WARP") hasteMult = 1.50; // +50% haste

        const effect: ActiveTemporalEffect = {
            effectId: `chrono_${spellType.toLowerCase()}_${currentEpochMs}_${Math.random().toString(36).substring(2, 7)}`,
            spellType,
            targetPlayerId: target.playerId,
            casterPlayerId: caster.playerId,
            hasteMultiplier: hasteMult,
            durationSeconds: dur,
            startedAtEpochMs: currentEpochMs,
            expiresAtEpochMs: currentEpochMs + durMs,
        };

        target.activeEffects.push(effect);
        if (caster.playerId !== target.playerId) {
            caster.activeEffects.push(effect);
        }

        if (spellType === "CHRONO_STASIS") {
            target.isStasisLocked = true;
        }

        if (spellType === "REWIND_FATE") {
            // Restore health from snapshot 5 seconds ago
            const fiveSecAgo = currentEpochMs - 5000;
            const pastSnapshot = [...target.healthSnapshots]
                .reverse()
                .find((s) => s.epochMs <= fiveSecAgo) ?? target.healthSnapshots[0];

            if (pastSnapshot && pastSnapshot.hp > target.currentHp) {
                target.currentHp = Math.min(target.maxHp, pastSnapshot.hp);
            }
        }

        return {
            success: true,
            effect,
            isParadoxTriggered: false,
            paradoxDamageDealt: 0,
        };
    }

    /**
     * Records a time-stamped health snapshot, retaining snapshots up to 15 seconds.
     */
    public static recordHealthSnapshot(player: PlayerChronoState, currentEpochMs = Date.now()): void {
        if (!player) return;
        player.healthSnapshots = Array.isArray(player.healthSnapshots) ? player.healthSnapshots : [];
        player.healthSnapshots.push({ epochMs: currentEpochMs, hp: player.currentHp });

        // Keep all snapshots from the last 15 seconds to support high cast-rate fights
        player.healthSnapshots = player.healthSnapshots.filter((s) => currentEpochMs - s.epochMs <= 15000);
    }

    /**
     * Cleanses expired temporal effects from a player, only locking stasis if the player is the target.
     */
    public static cleanseExpiredEffects(player: PlayerChronoState, currentEpochMs = Date.now()): void {
        if (!player || !Array.isArray(player.activeEffects)) return;

        player.activeEffects = player.activeEffects.filter((e) => currentEpochMs < e.expiresAtEpochMs);
        const hasActiveStasis = player.activeEffects.some((e) => e.spellType === "CHRONO_STASIS" && e.targetPlayerId === player.playerId);
        player.isStasisLocked = hasActiveStasis;
    }

    /**
     * Calculates effective cooldown tick speed based on active Time Warps on this player.
     */
    public static calculateCooldownMultiplier(player: PlayerChronoState): number {
        if (!player || player.isStasisLocked) return 0;

        let mult = 1.0;
        for (const effect of player.activeEffects ?? []) {
            if (effect.spellType === "TIME_WARP" && effect.targetPlayerId === player.playerId) {
                mult *= effect.hasteMultiplier;
            }
        }

        return Math.min(2.5, Math.round(mult * 100) / 100);
    }
}