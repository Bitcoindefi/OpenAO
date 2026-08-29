import { describe, it, expect } from "vitest";
import {
    RunicGemSocketingJewelcraftingEngine,
    SocketableEquipment,
} from "../lib/runicGemSocketingJewelcrafting.js";

describe("RunicGemSocketingJewelcraftingEngine Sockets, Gems & Prismatic Harmony", () => {
    it("drills sockets up to maximum capacity and inserts matching gems", () => {
        const cuirass: SocketableEquipment = {
            itemId: "chest_01",
            itemName: "Titanforged Chestplate",
            maxSocketCapacity: 2,
            sockets: [],
            isDestroyed: false,
        };

        const drill1 = RunicGemSocketingJewelcraftingEngine.drillSocket(cuirass, "GREEN");
        const drill2 = RunicGemSocketingJewelcraftingEngine.drillSocket(cuirass, "BLUE");
        expect(drill1.success).toBe(true);
        expect(drill2.success).toBe(true);
        expect(cuirass.sockets.length).toBe(2);

        // Third drill rejected (effective capacity 2)
        const drill3 = RunicGemSocketingJewelcraftingEngine.drillSocket(cuirass, "RED");
        expect(drill3.success).toBe(false);
        expect(drill3.reason).toContain("Maximum socket capacity (2) reached");

        // Insert Emerald and Sapphire
        const sock1 = RunicGemSocketingJewelcraftingEngine.socketGem(cuirass, 0, "EMERALD_OF_VITALITY");
        const sock2 = RunicGemSocketingJewelcraftingEngine.socketGem(cuirass, 1, "SAPPHIRE_OF_FROST");
        expect(sock1.success).toBe(true);
        expect(sock1.isMatchingSynergy).toBe(true);
        expect(sock2.success).toBe(true);
        expect(sock2.isMatchingSynergy).toBe(true);
    });

    it("activates Prismatic Harmony Resonance (+20% stat bonus) when all sockets match", () => {
        const blade: SocketableEquipment = {
            itemId: "blade_01",
            itemName: "Crimson Katana",
            maxSocketCapacity: 2,
            sockets: [
                { socketIndex: 0, colorAffinity: "RED", insertedGem: "RUBY_OF_FRENZY" },
                { socketIndex: 1, colorAffinity: "PRISMATIC", insertedGem: "RUBY_OF_FRENZY" },
            ],
            isDestroyed: false,
        };

        const result = RunicGemSocketingJewelcraftingEngine.calculateSocketedStats(blade);
        expect(result.isPrismaticHarmonyActive).toBe(true);
        expect(result.stats.ATTACK_POWER).toBe(84);
    });

    it("unsockets gems safely and recalculates stats without harmony", () => {
        const staff: SocketableEquipment = {
            itemId: "staff_01",
            itemName: "Archmage Scepter",
            maxSocketCapacity: 2,
            sockets: [
                { socketIndex: 0, colorAffinity: "BLUE", insertedGem: "SAPPHIRE_OF_FROST" },
                { socketIndex: 1, colorAffinity: "YELLOW" },
            ],
            isDestroyed: false,
        };

        const initialStats = RunicGemSocketingJewelcraftingEngine.calculateSocketedStats(staff);
        expect(initialStats.isPrismaticHarmonyActive).toBe(false);
        expect(initialStats.stats.MAX_MANA).toBe(300);

        const unsocketRes = RunicGemSocketingJewelcraftingEngine.unsocketGem(staff, 0);
        expect(unsocketRes.success).toBe(true);
        expect(unsocketRes.extractedGem).toBe("SAPPHIRE_OF_FROST");
        expect(staff.sockets[0].insertedGem).toBeUndefined();

        const emptyStats = RunicGemSocketingJewelcraftingEngine.calculateSocketedStats(staff);
        expect(emptyStats.stats.MAX_MANA).toBeUndefined();
    });

    it("rejects socketing into an already occupied socket", () => {
        const ring: SocketableEquipment = {
            itemId: "ring_01",
            itemName: "Ruby Ring",
            maxSocketCapacity: 1,
            sockets: [{ socketIndex: 0, colorAffinity: "RED", insertedGem: "RUBY_OF_FRENZY" }],
            isDestroyed: false,
        };

        const duplicateSock = RunicGemSocketingJewelcraftingEngine.socketGem(ring, 0, "EMERALD_OF_VITALITY");
        expect(duplicateSock.success).toBe(false);
        expect(duplicateSock.reason).toContain("already occupied");
    });

    it("guards against destroyed items and unknown gemstones", () => {
        const destroyed: SocketableEquipment = {
            itemId: "d",
            itemName: "Ash",
            maxSocketCapacity: 1,
            sockets: [],
            isDestroyed: true,
        };

        expect(RunicGemSocketingJewelcraftingEngine.drillSocket(destroyed, "RED").success).toBe(false);
        expect(RunicGemSocketingJewelcraftingEngine.socketGem(destroyed, 0, "RUBY_OF_FRENZY").success).toBe(false);
    });
});