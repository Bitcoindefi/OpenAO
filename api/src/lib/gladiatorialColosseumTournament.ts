import crypto from "node:crypto";

/**
 * Gladiatorial Colosseum Tournament, Crowd Favor & Finishing Move Engine for OpenAO MMORPG.
 * Simulates deathmatches, hazard triggers, dynamic crowd applause favor meters (0 to 100),
 * brutal finishing moves executed under 20% health, and tournament championship rewards.
 */

export type MatchTier = "PRELIMINARY_DUEL" | "SEMIFINAL_CLASH" | "GRAND_CHAMPIONSHIP";
export type MatchStatus = "WARMING_UP" | "IN_COMBAT" | "DECIDED_VICTORY" | "FORFEITED";
export type ArenaHazardType = "SPIKE_TRAP" | "FIRE_JET" | "POISON_DART_WALL";

export interface GladiatorFighter {
    fighterId: string;
    name: string;
    currentHp: number;
    maxHp: number;
    attackPower: number;
    armorRating: number;
    crowdFavorScore: number; // 0 to 100
    isEliminated: boolean;
}

export interface ColosseumMatch {
    matchId: string;
    tier: MatchTier;
    status: MatchStatus;
    fighter1: GladiatorFighter;
    fighter2: GladiatorFighter;
    winnerId?: string;
    goldPrizePool: number;
    startedAtEpochMs: number;
}

export const HAZARD_DAMAGE_CATALOG: Record<ArenaHazardType, number> = {
    SPIKE_TRAP: 150,
    FIRE_JET: 200,
    POISON_DART_WALL: 100,
};

export const MATCH_PRIZE_CATALOG: Record<MatchTier, { prizeGold: number; baseFavorAward: number }> = {
    PRELIMINARY_DUEL: { prizeGold: 100, baseFavorAward: 20 },
    SEMIFINAL_CLASH: { prizeGold: 300, baseFavorAward: 50 },
    GRAND_CHAMPIONSHIP: { prizeGold: 1000, baseFavorAward: 100 },
};

export class GladiatorialColosseumTournamentEngine {
    /**
     * Initializes a new gladiatorial deathmatch.
     */
    public static createMatch(
        fighter1: GladiatorFighter,
        fighter2: GladiatorFighter,
        tier: MatchTier,
        currentEpochMs = Date.now()
    ): ColosseumMatch {
        const prizeData = MATCH_PRIZE_CATALOG[tier];
        if (!prizeData) {
            throw new Error(`Unsupported match tier: ${String(tier)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            matchId: `colosseum_${tier.toLowerCase()}_${uuid}`,
            tier,
            status: "IN_COMBAT",
            fighter1,
            fighter2,
            goldPrizePool: prizeData.prizeGold,
            startedAtEpochMs: currentEpochMs,
        };
    }

    /**
     * Executes standard combat strike between combatants.
     */
    public static executeAttack(
        attacker: GladiatorFighter,
        defender: GladiatorFighter
    ): { damageDealt: number; defenderRemainingHp: number; isFatal: boolean } {
        if (!attacker || !defender || defender.isEliminated) {
            return { damageDealt: 0, defenderRemainingHp: defender?.currentHp ?? 0, isFatal: defender?.isEliminated ?? true };
        }

        // Clamp crowd favor score strictly to [0, 100]
        const favorScore = Math.min(100, Math.max(0, Number.isFinite(attacker.crowdFavorScore) ? attacker.crowdFavorScore : 0));
        const favorMultiplier = 1 + (favorScore / 100) * 0.25;
        const armor = Number.isFinite(defender.armorRating) ? Math.max(0, defender.armorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damage = Math.max(10, Math.floor(attacker.attackPower * favorMultiplier * armorMitigation));
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        const isFatal = defender.currentHp === 0;
        if (isFatal) {
            defender.isEliminated = true;
            attacker.crowdFavorScore = Math.min(100, favorScore + 15);
        }

        return {
            damageDealt: damage,
            defenderRemainingHp: defender.currentHp,
            isFatal,
        };
    }

    /**
     * Executes a lethal finishing move when opponent health is below 20%, granting double crowd favor.
     */
    public static executeFinishingMove(
        attacker: GladiatorFighter,
        defender: GladiatorFighter
    ): { success: boolean; crowdFavorAwarded: number; reason?: string } {
        if (!attacker || !defender || defender.isEliminated) {
            return { success: false, crowdFavorAwarded: 0, reason: "Defender is already eliminated or invalid." };
        }

        if (!Number.isFinite(defender.maxHp) || defender.maxHp <= 0) {
            return { success: false, crowdFavorAwarded: 0, reason: "Invalid defender maximum health value." };
        }

        const hpRatio = defender.currentHp / defender.maxHp;
        if (hpRatio > 0.20) {
            return { success: false, crowdFavorAwarded: 0, reason: "Finishing moves require opponent health to be below 20%." };
        }

        defender.currentHp = 0;
        defender.isEliminated = true;

        const favorGain = 35; // Massive crowd roar bonus
        const currentFavor = Math.min(100, Math.max(0, Number.isFinite(attacker.crowdFavorScore) ? attacker.crowdFavorScore : 0));
        attacker.crowdFavorScore = Math.min(100, currentFavor + favorGain);

        return {
            success: true,
            crowdFavorAwarded: favorGain,
        };
    }

    /**
     * Triggers arena environmental hazard on a fighter.
     */
    public static triggerArenaHazard(
        fighter: GladiatorFighter,
        hazard: ArenaHazardType
    ): { damageTaken: number; remainingHp: number; isSunkenOrEliminated: boolean } {
        if (!fighter || fighter.isEliminated) {
            return { damageTaken: 0, remainingHp: fighter?.currentHp ?? 0, isSunkenOrEliminated: fighter?.isEliminated ?? true };
        }

        const rawDmg = HAZARD_DAMAGE_CATALOG[hazard] ?? 100;
        fighter.currentHp = Math.max(0, fighter.currentHp - rawDmg);

        if (fighter.currentHp === 0) {
            fighter.isEliminated = true;
        }

        return {
            damageTaken: rawDmg,
            remainingHp: fighter.currentHp,
            isSunkenOrEliminated: fighter.isEliminated,
        };
    }

    /**
     * Concludes the match and awards championship gold payout.
     */
    public static concludeMatch(
        match: ColosseumMatch
    ): { success: boolean; winnerId?: string; goldAwarded: number; reason?: string } {
        if (!match || match.status === "DECIDED_VICTORY") {
            return { success: false, goldAwarded: 0, reason: "Match is already completed or invalid." };
        }

        if (match.fighter1.isEliminated && !match.fighter2.isEliminated) {
            match.winnerId = match.fighter2.fighterId;
            match.status = "DECIDED_VICTORY";
            return { success: true, winnerId: match.winnerId, goldAwarded: match.goldPrizePool };
        }

        if (match.fighter2.isEliminated && !match.fighter1.isEliminated) {
            match.winnerId = match.fighter1.fighterId;
            match.status = "DECIDED_VICTORY";
            return { success: true, winnerId: match.winnerId, goldAwarded: match.goldPrizePool };
        }

        return { success: false, goldAwarded: 0, reason: "Neither or both fighters are eliminated; match is undecided." };
    }
}