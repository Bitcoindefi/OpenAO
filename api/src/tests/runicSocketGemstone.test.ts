import { describe, it, expect } from "vitest";
import {
    RunicSocketGemstoneEngine,
    SocketedGearItem,
} from "../lib/runicSocketGemstone.js";

describe("RunicSocketGemstoneEngine Chiseling, Socketing, Extraction & Stat Aggregation", () => {
    it("chisels a socket and inserts a PERFECT Ruby into a weapon", () => {
        const weapon: SocketedGearItem = {
            itemId: "sword_01",
            slot: "WEAPON",
            totalSockets: 0,
            socketedGems: [],
        };

        const chiselRes = RunicSocketGemstoneEngine.chiselSocket(weapon, false, () => 0.10);
        expect(chiselRes.success).toBe(true);
        expect(weapon.totalSockets).toBe(1);

        const ruby = RunicSocketGemstoneEngine.createGem("RUBY", "PERFECT");
        const insertRes = RunicSocketGemstoneEngine.insertGem(weapon, 0, ruby);
        expect(insertRes.success).toBe(true);

        const stats = RunicSocketGemstoneEngine.aggregateStats(weapon);
        expect(stats.fireDamage).toBe(60);
    });

    it("verifies all 5 elemental gem types and quality scalings on armor", () => {
        const armor: SocketedGearItem = {
            itemId: "robe_01",
            slot: "ARMOR",
            totalSockets: 3,
            socketedGems: [null, null, null],
        };

        const sapphire = RunicSocketGemstoneEngine.createGem("SAPPHIRE", "REGULAR"); // 15 * 4 = 60 maxMana
        const topaz = RunicSocketGemstoneEngine.createGem("TOPAZ", "FLAWLESS");       // 1 * 7 = 7 crit
        const emerald = RunicSocketGemstoneEngine.createGem("EMERALD", "CHIPPED");     // 20 * 1 = 20 stamina

        RunicSocketGemstoneEngine.insertGem(armor, 0, sapphire);
        RunicSocketGemstoneEngine.insertGem(armor, 1, topaz);
        RunicSocketGemstoneEngine.insertGem(armor, 2, emerald);

        const stats = RunicSocketGemstoneEngine.aggregateStats(armor);
        expect(stats.maxMana).toBe(60);
        expect(stats.criticalStrikeChance).toBe(7);
        expect(stats.maxStamina).toBe(20);
    });

    it("throws error for invalid runtime gemstone types", () => {
        expect(() => RunicSocketGemstoneEngine.createGem("INVALID_GEM" as any, "PERFECT")).toThrow(
            "Unsupported or invalid gemstone type"
        );
    });

    it("extracts gemstone safely and clears socket slot", () => {
        const weapon: SocketedGearItem = {
            itemId: "axe_01",
            slot: "WEAPON",
            totalSockets: 1,
            socketedGems: [RunicSocketGemstoneEngine.createGem("DIAMOND", "FLAWED")],
        };

        const removeRes = RunicSocketGemstoneEngine.removeGem(weapon, 0);
        expect(removeRes.success).toBe(true);
        expect(removeRes.extractedGem?.gemType).toBe("DIAMOND");
        expect(weapon.socketedGems[0]).toBeNull();

        const stats = RunicSocketGemstoneEngine.aggregateStats(weapon);
        expect(Object.keys(stats).length).toBe(0);
    });

    it("caps chiseling at MAX_SOCKETS limit of 3", () => {
        const item: SocketedGearItem = {
            itemId: "bow_01",
            slot: "WEAPON",
            totalSockets: 3,
            socketedGems: [null, null, null],
        };

        const res = RunicSocketGemstoneEngine.chiselSocket(item, true);
        expect(res.success).toBe(false);
        expect(res.reason).toContain("maximum of 3 sockets");
    });

    it("rejects insertion into occupied socket or out-of-bounds index", () => {
        const item: SocketedGearItem = {
            itemId: "helm_01",
            slot: "ARMOR",
            totalSockets: 1,
            socketedGems: [RunicSocketGemstoneEngine.createGem("RUBY", "CHIPPED")],
        };

        const dupInsert = RunicSocketGemstoneEngine.insertGem(item, 0, RunicSocketGemstoneEngine.createGem("TOPAZ", "CHIPPED"));
        expect(dupInsert.success).toBe(false);
        expect(dupInsert.reason).toContain("already occupied");

        const oobInsert = RunicSocketGemstoneEngine.insertGem(item, 5, RunicSocketGemstoneEngine.createGem("TOPAZ", "CHIPPED"));
        expect(oobInsert.success).toBe(false);
        expect(oobInsert.reason).toContain("Invalid socket index");
    });

    it("prevents destruction when protection scroll is used during failed chisel", () => {
        const armor: SocketedGearItem = {
            itemId: "chestplate_01",
            slot: "ARMOR",
            totalSockets: 1,
            socketedGems: [null],
        };

        const res = RunicSocketGemstoneEngine.chiselSocket(armor, true, () => 0.99);
        expect(res.success).toBe(false);
        expect(res.itemDestroyed).toBe(false);
        expect(armor.isDestroyed).toBeFalsy();
    });

    it("destroys unprotected item upon catastrophic chisel failure and clears sockets", () => {
        const item: SocketedGearItem = {
            itemId: "ring_01",
            slot: "ARMOR",
            totalSockets: 1,
            socketedGems: [null],
        };

        let rollCount = 0;
        const res = RunicSocketGemstoneEngine.chiselSocket(item, false, () => {
            rollCount++;
            return rollCount === 1 ? 0.99 : 0.10;
        });

        expect(res.success).toBe(false);
        expect(res.itemDestroyed).toBe(true);
        expect(item.isDestroyed).toBe(true);
        expect(item.totalSockets).toBe(0);

        const afterRes = RunicSocketGemstoneEngine.chiselSocket(item, false);
        expect(afterRes.success).toBe(false);
        expect(afterRes.totalSockets).toBe(0);
        expect(RunicSocketGemstoneEngine.aggregateStats(item)).toEqual({});
    });
});