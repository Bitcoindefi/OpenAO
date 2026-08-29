import { describe, it, expect } from "vitest";
import {
    BardMelodicPerformanceEngine,
    BardPlayer,
    PartyMember,
    EnemyTarget,
} from "../lib/bardMelodicPerformance.js";

describe("BardMelodicPerformanceEngine Songcraft, Auras & Crescendos", () => {
    it("starts performance with War Horn and propagates Hymn of Valor aura to nearby allies", () => {
        const bard: BardPlayer = {
            playerId: "bard_01",
            instrument: "WAR_HORN_OF_VALHALLA",
            performanceState: "RESTING",
            location: { x: 50, y: 50 },
            currentMana: 200,
            maxMana: 200,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        const warrior: PartyMember = {
            memberId: "warrior_01",
            location: { x: 55, y: 50 },
            currentHp: 1000,
            maxHp: 1000,
            isAlive: true,
        };

        const mageDistant: PartyMember = {
            memberId: "mage_02",
            location: { x: 100, y: 50 },
            currentHp: 600,
            maxHp: 600,
            isAlive: true,
        };

        const startRes = BardMelodicPerformanceEngine.startPerformance(bard, "HYMN_OF_VALOR", 100000);
        expect(startRes.success).toBe(true);
        expect(bard.performanceState).toBe("PERFORMING_SONG");
        expect(bard.currentMana).toBe(175);

        // Cannot restart while already performing
        const reStart = BardMelodicPerformanceEngine.startPerformance(bard, "BALLAD_OF_SWIFTNESS", 100000);
        expect(reStart.success).toBe(false);
        expect(reStart.reason).toContain("already actively performing");

        // Propagate aura: Base 40 * 1.6 War Horn = 64 potency
        const auraRes = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [warrior, mageDistant], 100000);
        expect(auraRes.affectedCount).toBe(1);
        expect(auraRes.potencyApplied).toBe(64);
        expect(warrior.activeAuraBuff?.potencyBonusValue).toBe(64);
        expect(mageDistant.activeAuraBuff).toBeUndefined();
    });

    it("advances chord combos to trigger Harmonic Crescendo and unleashes Discordant Screech on enemies", () => {
        const bard: BardPlayer = {
            playerId: "bard_02",
            instrument: "HARP_OF_THE_SERAPH", // 1.3x multiplier
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 200,
            maxMana: 200,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        BardMelodicPerformanceEngine.startPerformance(bard, "DISCORDANT_SCREECH", 100000); // combo = 1
        BardMelodicPerformanceEngine.playChordVerse(bard); // combo = 2
        const finalVerse = BardMelodicPerformanceEngine.playChordVerse(bard); // combo = 3 -> Crescendo

        expect(finalVerse.isCrescendoReady).toBe(true);
        expect(bard.performanceState).toBe("DISCORDANT_CRESCENDO");

        const enemy: EnemyTarget = {
            enemyId: "orc_01",
            location: { x: 5, y: 5 },
            currentHp: 500,
            maxHp: 500,
            isSilenced: false,
            isAlive: true,
        };

        // Offensive song rejects buffing friendly party
        const ally: PartyMember = { memberId: "a1", location: { x: 1, y: 1 }, currentHp: 100, maxHp: 100, isAlive: true };
        const buffRes = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [ally], 100000);
        expect(buffRes.affectedCount).toBe(0);
        expect(buffRes.reason).toContain("Offensive songs cannot be propagated");

        // Screech base 120 * 1.3 Harp * 2.0 Crescendo = 312 damage + silence
        const screechRes = BardMelodicPerformanceEngine.unleashDiscordantScreech(bard, [enemy]);
        expect(screechRes.success).toBe(true);
        expect(screechRes.damageDealt).toBe(312);
        expect(enemy.currentHp).toBe(188); // 500 - 312
        expect(enemy.isSilenced).toBe(true);
    });

    it("halts performance when mana depletes during chord progression", () => {
        const oomBard: BardPlayer = {
            playerId: "bard_oom",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 30,
            maxMana: 100,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        BardMelodicPerformanceEngine.startPerformance(oomBard, "HYMN_OF_VALOR", 100000);
        expect(oomBard.currentMana).toBe(5);

        const failChord = BardMelodicPerformanceEngine.playChordVerse(oomBard);
        expect(failChord.success).toBe(false);
        expect(failChord.reason).toContain("Mana depleted");
        expect(oomBard.performanceState).toBe("RESTING");
    });

    it("defensively ignores dead party members during aura propagation", () => {
        const bard: BardPlayer = {
            playerId: "b",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "PERFORMING_SONG",
            currentSong: "REQUIEM_OF_THE_FALLEN",
            location: { x: 0, y: 0 },
            currentMana: 100,
            maxMana: 100,
            chordComboCount: 1,
            performanceStartedEpochMs: 0,
        };

        const deadAlly: PartyMember = {
            memberId: "dead_1",
            location: { x: 1, y: 1 },
            currentHp: 0,
            maxHp: 100,
            isAlive: false,
        };

        const aura = BardMelodicPerformanceEngine.propagateMelodicAura(bard, [deadAlly], 100000);
        expect(aura.affectedCount).toBe(0);
        expect(deadAlly.activeAuraBuff).toBeUndefined();
    });

    it("guards against unknown songs and invalid inputs", () => {
        const bard: BardPlayer = {
            playerId: "b",
            instrument: "LUTE_OF_THE_MEADOWS",
            performanceState: "RESTING",
            location: { x: 0, y: 0 },
            currentMana: 100,
            maxMana: 100,
            chordComboCount: 0,
            performanceStartedEpochMs: 0,
        };

        const res = BardMelodicPerformanceEngine.startPerformance(bard, "HEAVY_METAL" as any);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("Unknown song");
    });
});