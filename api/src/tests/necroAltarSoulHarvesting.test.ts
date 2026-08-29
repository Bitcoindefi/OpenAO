import { describe, it, expect } from "vitest";
import {
    NecroAltarSoulHarvestingEngine,
    PhylacteryVessel,
} from "../lib/necroAltarSoulHarvesting.js";

describe("NecroAltarSoulHarvestingEngine Spirits, Phylacteries & Altars", () => {
    it("crafts Ebon Phylactery and harvests Dread Lich Remnants", () => {
        const urn = NecroAltarSoulHarvestingEngine.craftPhylactery("necromancer_01", "EBON_PHYLACTERY", 100000);
        expect(urn.tier).toBe("EBON_PHYLACTERY");
        expect(urn.maxEssenceCapacity).toBe(300);
        expect(urn.currentEssence).toBe(0);

        // Harvest Dread Lich Remnant (+40 essence)
        const harvestRes = NecroAltarSoulHarvestingEngine.harvestSpirit(urn, "DREAD_LICH_REMNANT", 10, () => 0.05);
        expect(harvestRes.success).toBe(true);
        expect(harvestRes.essenceHarvested).toBe(40);
        expect(urn.currentEssence).toBe(40);
        expect(harvestRes.isCapacityFull).toBe(false);
    });

    it("channels Unholy Empowerment ritual at Necro-Altar consuming essence", () => {
        const urn: PhylacteryVessel = {
            phylacteryId: "urn_02",
            ownerPlayerId: "necro_02",
            tier: "ASTRAL_VOID_CHALICE",
            maxEssenceCapacity: 600,
            currentEssence: 100,
            isCracked: false,
        };

        // Unholy Empowerment costs 60 essence (+45 Spell Power)
        const ritualRes = NecroAltarSoulHarvestingEngine.channelAltarRitual(urn, "UNHOLY_EMPOWERMENT");
        expect(ritualRes.success).toBe(true);
        expect(ritualRes.ritualApplied?.bonusValue).toBe(45);
        expect(ritualRes.remainingEssence).toBe(40);
        expect(urn.currentEssence).toBe(40);

        // Next ritual (costs 60) fails due to insufficient essence (40 left)
        const failRitual = NecroAltarSoulHarvestingEngine.channelAltarRitual(urn, "UNHOLY_EMPOWERMENT");
        expect(failRitual.success).toBe(false);
        expect(failRitual.reason).toContain("Insufficient soul essence");
    });

    it("respects maximum phylactery capacity and clamps excess harvest", () => {
        const smallUrn: PhylacteryVessel = {
            phylacteryId: "u_small",
            ownerPlayerId: "n",
            tier: "CRUDE_BONE_URN",
            maxEssenceCapacity: 100,
            currentEssence: 90,
            isCracked: false,
        };

        // Tormented Banshee yields 15, but only 10 space left
        const harvest = NecroAltarSoulHarvestingEngine.harvestSpirit(smallUrn, "TORMENTED_BANSHEE", 5, () => 0.01);
        expect(harvest.success).toBe(true);
        expect(harvest.essenceHarvested).toBe(10);
        expect(smallUrn.currentEssence).toBe(100);
        expect(harvest.isCapacityFull).toBe(true);

        // Subsequent harvest rejected
        const fullRes = NecroAltarSoulHarvestingEngine.harvestSpirit(smallUrn, "LOST_WANDERING_SOUL", 5);
        expect(fullRes.success).toBe(false);
        expect(fullRes.reason).toContain("completely full");
    });

    it("handles spirit dispersal when capture roll fails", () => {
        const urn: PhylacteryVessel = {
            phylacteryId: "u",
            ownerPlayerId: "n",
            tier: "CRUDE_BONE_URN",
            maxEssenceCapacity: 100,
            currentEssence: 0,
            isCracked: false,
        };

        const failRes = NecroAltarSoulHarvestingEngine.harvestSpirit(urn, "DREAD_LICH_REMNANT", 1, () => 0.99);
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("dispersed into the ether");
    });

    it("guards against cracked phylacteries and unsupported tiers", () => {
        expect(() => NecroAltarSoulHarvestingEngine.craftPhylactery("n", "DRAGON_SKULL" as any)).toThrow(
            "Unsupported phylactery tier"
        );

        const cracked: PhylacteryVessel = {
            phylacteryId: "c",
            ownerPlayerId: "n",
            tier: "CRUDE_BONE_URN",
            maxEssenceCapacity: 100,
            currentEssence: 50,
            isCracked: true,
        };

        expect(NecroAltarSoulHarvestingEngine.harvestSpirit(cracked, "LOST_WANDERING_SOUL").success).toBe(false);
        expect(NecroAltarSoulHarvestingEngine.channelAltarRitual(cracked, "SPECTRAL_SHROUD_WARD").success).toBe(false);
    });
});