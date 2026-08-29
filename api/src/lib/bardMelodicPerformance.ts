/**
 * Bard Melodic Songcraft, Area Aura Buffs & Discordant Screech Engine for OpenAO MMORPG.
 * Simulates bard performance repertoire (Hymn of Valor, Ballad of Swiftness, Requiem, Discordant Screech),
 * instrument quality tiers, party aura propagation radii (15 tiles), and harmonic crescendo cascades.
 */

export type BardSongType = "HYMN_OF_VALOR" | "BALLAD_OF_SWIFTNESS" | "REQUIEM_OF_THE_FALLEN" | "DISCORDANT_SCREECH";
export type InstrumentTier = "LUTE_OF_THE_MEADOWS" | "HARP_OF_THE_SERAPH" | "WAR_HORN_OF_VALHALLA";
export type BardPerformanceState = "RESTING" | "PERFORMING_SONG" | "DISCORDANT_CRESCENDO";

export interface BardPlayer {
    playerId: string;
    instrument: InstrumentTier;
    performanceState: BardPerformanceState;
    currentSong?: BardSongType;
    location: { x: number; y: number };
    currentMana: number;
    maxMana: number;
    chordComboCount: number; // 0 to 3 (3 unlocks Crescendo)
    performanceStartedEpochMs: number;
}

export interface PartyMember {
    memberId: string;
    location: { x: number; y: number };
    currentHp: number;
    maxHp: number;
    activeAuraBuff?: {
        song: BardSongType;
        potencyBonusValue: number;
        expiresAtEpochMs: number;
    };
    isAlive: boolean;
}

export interface EnemyTarget {
    enemyId: string;
    location: { x: number; y: number };
    currentHp: number;
    maxHp: number;
    isSilenced: boolean;
    isAlive: boolean;
}

export interface SongDefinition {
    songType: BardSongType;
    manaCostPerVerse: number;
    baseBuffValue: number;
    isOffensive: boolean;
}

export const INSTRUMENT_MULTIPLIERS: Record<InstrumentTier, number> = {
    LUTE_OF_THE_MEADOWS: 1.0,
    HARP_OF_THE_SERAPH: 1.30,
    WAR_HORN_OF_VALHALLA: 1.60,
};

export const SONG_CATALOG: Record<BardSongType, SongDefinition> = {
    HYMN_OF_VALOR: { songType: "HYMN_OF_VALOR", manaCostPerVerse: 25, baseBuffValue: 40, isOffensive: false },
    BALLAD_OF_SWIFTNESS: { songType: "BALLAD_OF_SWIFTNESS", manaCostPerVerse: 20, baseBuffValue: 25, isOffensive: false },
    REQUIEM_OF_THE_FALLEN: { songType: "REQUIEM_OF_THE_FALLEN", manaCostPerVerse: 35, baseBuffValue: 60, isOffensive: false },
    DISCORDANT_SCREECH: { songType: "DISCORDANT_SCREECH", manaCostPerVerse: 45, baseBuffValue: 120, isOffensive: true },
};

export class BardMelodicPerformanceEngine {
    public static readonly AURA_RADIUS_TILES = 15;

    /**
     * Begins performing a melodic bard song.
     */
    public static startPerformance(
        bard: BardPlayer,
        song: BardSongType,
        currentEpochMs = Date.now()
    ): { success: boolean; performanceState: BardPerformanceState; reason?: string } {
        if (!bard) return { success: false, performanceState: "RESTING", reason: "Invalid bard." };

        if (bard.performanceState !== "RESTING") {
            return { success: false, performanceState: bard.performanceState, reason: "Bard is already actively performing a song." };
        }

        const songData = SONG_CATALOG[song];
        if (!songData) return { success: false, performanceState: bard.performanceState, reason: `Unknown song: ${String(song)}` };

        if (bard.currentMana < songData.manaCostPerVerse) {
            return { success: false, performanceState: bard.performanceState, reason: "Insufficient mana to play song." };
        }

        bard.currentMana -= songData.manaCostPerVerse;
        bard.currentSong = song;
        bard.performanceState = "PERFORMING_SONG";
        bard.chordComboCount = 1;
        bard.performanceStartedEpochMs = currentEpochMs;

        return {
            success: true,
            performanceState: "PERFORMING_SONG",
        };
    }

    /**
     * Chains musical chord progressions, advancing toward a Harmonic Crescendo.
     */
    public static playChordVerse(
        bard: BardPlayer
    ): { success: boolean; comboCount: number; isCrescendoReady: boolean; reason?: string } {
        if (!bard || bard.performanceState === "RESTING" || !bard.currentSong) {
            return { success: false, comboCount: 0, isCrescendoReady: false, reason: "Bard is not actively performing." };
        }

        const songData = SONG_CATALOG[bard.currentSong];
        if (bard.currentMana < songData.manaCostPerVerse) {
            bard.performanceState = "RESTING";
            bard.currentSong = undefined;
            bard.chordComboCount = 0;
            return { success: false, comboCount: 0, isCrescendoReady: false, reason: "Mana depleted; song ended." };
        }

        bard.currentMana -= songData.manaCostPerVerse;
        bard.chordComboCount = Math.min(3, bard.chordComboCount + 1);

        if (bard.chordComboCount >= 3) {
            bard.performanceState = "DISCORDANT_CRESCENDO";
        }

        return {
            success: true,
            comboCount: bard.chordComboCount,
            isCrescendoReady: bard.performanceState === "DISCORDANT_CRESCENDO",
        };
    }

    /**
     * Broadcasts melodic aura buff to friendly party members within the 15-tile resonance radius.
     */
    public static propagateMelodicAura(
        bard: BardPlayer,
        partyMembers: PartyMember[],
        currentEpochMs = Date.now()
    ): { affectedCount: number; potencyApplied: number; reason?: string } {
        if (!bard || bard.performanceState === "RESTING" || !bard.currentSong || !Array.isArray(partyMembers)) {
            return { affectedCount: 0, potencyApplied: 0, reason: "Bard is resting or inputs are invalid." };
        }

        const songData = SONG_CATALOG[bard.currentSong];
        if (songData.isOffensive) {
            return { affectedCount: 0, potencyApplied: 0, reason: "Offensive songs cannot be propagated as friendly party buffs." };
        }

        const instMult = INSTRUMENT_MULTIPLIERS[bard.instrument] ?? 1.0;
        const crescendoMult = bard.performanceState === "DISCORDANT_CRESCENDO" ? 2.0 : 1.0;
        const totalPotency = Math.round(songData.baseBuffValue * instMult * crescendoMult);

        let affected = 0;
        for (const member of partyMembers) {
            if (!member || !member.isAlive) continue;

            const dx = bard.location.x - member.location.x;
            const dy = bard.location.y - member.location.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= this.AURA_RADIUS_TILES) {
                member.activeAuraBuff = {
                    song: bard.currentSong,
                    potencyBonusValue: totalPotency,
                    expiresAtEpochMs: currentEpochMs + 10000,
                };
                affected++;
            }
        }

        return {
            affectedCount: affected,
            potencyApplied: totalPotency,
        };
    }

    /**
     * Unleashes offensive Discordant Screech on enemy targets within sonic radius.
     */
    public static unleashDiscordantScreech(
        bard: BardPlayer,
        enemies: EnemyTarget[]
    ): { success: boolean; enemiesHitCount: number; damageDealt: number; reason?: string } {
        if (!bard || bard.performanceState === "RESTING" || bard.currentSong !== "DISCORDANT_SCREECH" || !Array.isArray(enemies)) {
            return { success: false, enemiesHitCount: 0, damageDealt: 0, reason: "Bard is not actively performing Discordant Screech." };
        }

        const songData = SONG_CATALOG.DISCORDANT_SCREECH;
        const instMult = INSTRUMENT_MULTIPLIERS[bard.instrument] ?? 1.0;
        const crescendoMult = bard.performanceState === "DISCORDANT_CRESCENDO" ? 2.0 : 1.0;
        const totalDamage = Math.round(songData.baseBuffValue * instMult * crescendoMult);

        let hitCount = 0;
        for (const enemy of enemies) {
            if (!enemy || !enemy.isAlive) continue;

            const dx = bard.location.x - enemy.location.x;
            const dy = bard.location.y - enemy.location.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= this.AURA_RADIUS_TILES) {
                enemy.currentHp = Math.max(0, enemy.currentHp - totalDamage);
                enemy.isSilenced = true;
                if (enemy.currentHp === 0) {
                    enemy.isAlive = false;
                }
                hitCount++;
            }
        }

        return {
            success: true,
            enemiesHitCount: hitCount,
            damageDealt: totalDamage,
        };
    }
}