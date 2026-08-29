import { describe, it, expect } from "vitest";
import {
    AncientRunicRelicInfusionEngine,
    ImbuedRelicArtifact,
} from "../lib/ancientRunicRelicInfusion.js";

describe("AncientRunicRelicInfusionEngine Relics, Sockets & Harmonic Resonance", () => {
    it("creates Crown of the Sun King and sockets 3 Solar Amber Shards triggering Primal Harmonic Resonance (+40%)", () => {
        const relic = AncientRunicRelicInfusionEngine.createRelic("player_01", "CROWN_OF_THE_SUN_KING", 1, 100000);
        expect(relic.relicType).toBe("CROWN_OF_THE_SUN_KING");
        expect(relic.socketCapacity).toBe(3);
        expect(relic.totalEffectivePower).toBe(100);

        // Socket 1
        const s1 = AncientRunicRelicInfusionEngine.socketShard(relic, "SOLAR_AMBER_SHARD");
        expect(s1.success).toBe(true);
        expect(relic.totalEffectivePower).toBe(125); // 100 + 25
        expect(relic.isHarmonized).toBe(false);

        // Socket 2
        AncientRunicRelicInfusionEngine.socketShard(relic, "SOLAR_AMBER_SHARD");
        expect(relic.totalEffectivePower).toBe(150); // 100 + 50

        // Socket 3 (Full & all identical -> Harmonized +40%)
        const s3 = AncientRunicRelicInfusionEngine.socketShard(relic, "SOLAR_AMBER_SHARD");
        expect(s3.isHarmonized).toBe(true);
        // (100 base + 75 shards) * 1.4 = 245
        expect(relic.totalEffectivePower).toBe(245);
    });

    it("purges sockets and recovers shards restoring base power", () => {
        const relic = AncientRunicRelicInfusionEngine.createRelic("player_02", "ORB_OF_ETERNAL_TIDES", 5, 100000);
        // Level 5: 80 base + (4 * 15) = 140 power

        AncientRunicRelicInfusionEngine.socketShard(relic, "ABYSSAL_SAPPHIRE_SHARD");
        AncientRunicRelicInfusionEngine.socketShard(relic, "EARTH_EMERALD_SHARD");

        expect(relic.socketedShards.length).toBe(2);

        const purgeRes = AncientRunicRelicInfusionEngine.purgeSockets(relic);
        expect(purgeRes.success).toBe(true);
        expect(purgeRes.recoveredShards).toEqual(["ABYSSAL_SAPPHIRE_SHARD", "EARTH_EMERALD_SHARD"]);
        expect(purgeRes.newTotalPower).toBe(140);
        expect(relic.socketedShards.length).toBe(0);
    });

    it("rejects socketing beyond maximum socket capacity", () => {
        const smallRelic = AncientRunicRelicInfusionEngine.createRelic("p", "ORB_OF_ETERNAL_TIDES", 1, 100000); // 2 sockets

        AncientRunicRelicInfusionEngine.socketShard(smallRelic, "SOLAR_AMBER_SHARD");
        AncientRunicRelicInfusionEngine.socketShard(smallRelic, "SOLAR_AMBER_SHARD");

        const overflow = AncientRunicRelicInfusionEngine.socketShard(smallRelic, "SOLAR_AMBER_SHARD");
        expect(overflow.success).toBe(false);
        expect(overflow.reason).toContain("completely full");
    });

    it("guards against unsupported relic types and unknown shards", () => {
        expect(() => AncientRunicRelicInfusionEngine.createRelic("p", "STAFF_OF_CHAOS" as any)).toThrow(
            "Unsupported relic type"
        );

        const relic = AncientRunicRelicInfusionEngine.createRelic("p", "ORB_OF_ETERNAL_TIDES", 1);
        const badShard = AncientRunicRelicInfusionEngine.socketShard(relic, "DIRT_SHARD" as any);
        expect(badShard.success).toBe(false);
        expect(badShard.reason).toContain("Unsupported primal shard");
    });

    it("guards against null/undefined relics", () => {
        expect(AncientRunicRelicInfusionEngine.socketShard(null as any, "SOLAR_AMBER_SHARD").success).toBe(false);
        expect(AncientRunicRelicInfusionEngine.purgeSockets(null as any).success).toBe(false);
    });
});