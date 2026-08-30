import { describe, it, expect } from "vitest";
import {
    AncientRunicWoodcuttingTimberLumberEngine,
    ActiveWoodcuttingAxe,
    ActiveAncientTree,
} from "../lib/ancientRunicWoodcuttingTimberLumber.js";

describe("AncientRunicWoodcuttingTimberLumberEngine Timber Harvesting & Sawmill", () => {
    it("chops Celestial Starwood Elder with Celestial Void Cleaver scoring Critical Chop and uncovering Astral Ether Sap", () => {
        const cleaver = AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("lumberjack_01", "CELESTIAL_VOID_CLEAVER", 100000);
        expect(cleaver.axeType).toBe("CELESTIAL_VOID_CLEAVER");
        expect(cleaver.choppingPower).toBe(120);

        const starwood = AncientRunicWoodcuttingTimberLumberEngine.discoverTree("CELESTIAL_STARWOOD_ELDER", 60, 100000);
        expect(starwood.remainingLogCapacity).toBe(60);

        // Chop roll 0.1 (pass), Crit roll 0.1 (10% <= 30% crit chance) -> 2.0x yield = 30 logs + Astral Ether Sap
        const chopRes = AncientRunicWoodcuttingTimberLumberEngine.chopTree(
            cleaver,
            starwood,
            0.1,
            0.1,
            100000
        );

        expect(chopRes.success).toBe(true);
        expect(chopRes.result?.timberMaterial).toBe("STARWOOD_LOG");
        expect(chopRes.result?.extractedLogCount).toBe(30);
        expect(chopRes.result?.isCriticalChop).toBe(true);
        expect(chopRes.result?.foundRareResin).toBe("ASTRAL_ETHER_SAP");
        expect(chopRes.result?.remainingTreeCapacity).toBe(30);
        expect(cleaver.currentDurability).toBe(312); // 320 - 8

        // Mill 30 starwood logs at 4:1 ratio -> 7 planks
        const millRes = AncientRunicWoodcuttingTimberLumberEngine.millLumber(30, "CELESTIAL_STARWOOD_ELDER");
        expect(millRes.success).toBe(true);
        expect(millRes.lumberPlanksProduced).toBe(7);
        expect(millRes.requiredLogsPerPlank).toBe(4);
    });

    it("rejects fractional log counts in sawmill milling", () => {
        const failFraction = AncientRunicWoodcuttingTimberLumberEngine.millLumber(3.5, "ANCIENT_PINE_TREE");
        expect(failFraction.success).toBe(false);
        expect(failFraction.reason).toContain("Invalid integer log quantity");
    });

    it("surfaces remainingDurability on bark glance failure roll", () => {
        const axe = AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("lj_glance", "BRONZE_FELLING_AXE", 100000); // 75% success
        const pine = AncientRunicWoodcuttingTimberLumberEngine.discoverTree("ANCIENT_PINE_TREE", 20);

        // Roll 0.95 (95 > 75%) -> Glanced
        const glance = AncientRunicWoodcuttingTimberLumberEngine.chopTree(axe, pine, 0.95);
        expect(glance.success).toBe(false);
        expect(glance.remainingDurability).toBe(72); // 80 - 8
        expect(glance.reason).toContain("glanced off bark");
    });

    it("rejects chopping when axe chopping power is insufficient for wood hardness", () => {
        const bronzeAxe = AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("lj_02", "BRONZE_FELLING_AXE", 100000); // 25 power
        const ironwood = AncientRunicWoodcuttingTimberLumberEngine.discoverTree("IRONWOOD_SENTINEL", 40); // 50 hardness

        const failRes = AncientRunicWoodcuttingTimberLumberEngine.chopTree(bronzeAxe, ironwood);
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Axe deflected");
        expect(bronzeAxe.currentDurability).toBe(80);
    });

    it("rejects chopping when tree is already felled", () => {
        const cleaver = AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("lj_03", "CELESTIAL_VOID_CLEAVER", 100000);
        const felledTree: ActiveAncientTree = {
            treeId: "t_dead",
            treeType: "ANCIENT_PINE_TREE",
            remainingLogCapacity: 0,
            maxLogCapacity: 20,
            isFelled: true,
        };

        const failFelled = AncientRunicWoodcuttingTimberLumberEngine.chopTree(cleaver, felledTree);
        expect(failFelled.success).toBe(false);
        expect(failFelled.reason).toContain("completely felled");
    });

    it("sharpens axe and restores functionality", () => {
        const axe = AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("lj_04", "BRONZE_FELLING_AXE", 100000);
        axe.currentDurability = 0;
        axe.isFunctional = false;

        const rep = AncientRunicWoodcuttingTimberLumberEngine.sharpenAxe(axe, 40);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(40);
        expect(rep.isFunctional).toBe(true);
    });

    it("guards against null inputs and unsupported axe types", () => {
        expect(() => AncientRunicWoodcuttingTimberLumberEngine.forgeAxe("l", "BUTTER_KNIFE" as any)).toThrow(
            "Unsupported axe type"
        );

        expect(AncientRunicWoodcuttingTimberLumberEngine.chopTree(null as any, null as any).success).toBe(false);
        expect(AncientRunicWoodcuttingTimberLumberEngine.sharpenAxe(null as any).success).toBe(false);
    });
});