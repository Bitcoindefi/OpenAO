import { describe, it, expect } from "vitest";
import {
    AncientRunicSiegeTrebuchetCatapultEngine,
    ActiveSiegeArtillery,
    FortificationTarget,
} from "../lib/ancientRunicSiegeTrebuchetCatapult.js";

describe("AncientRunicSiegeTrebuchetCatapultEngine Heavy Demolition Artillery", () => {
    it("bombards Obsidian Citadel Wall with Celestial Gravity Mortar and damages nearby palisade with own armor reduction", () => {
        const mortar = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("commander_01", "CELESTIAL_GRAVITY_MORTAR", 0, 0, 100000);
        expect(mortar.artilleryType).toBe("CELESTIAL_GRAVITY_MORTAR");
        expect(mortar.currentDurability).toBe(350);

        const citadelWall: FortificationTarget = {
            targetId: "wall_citadel_01",
            structureType: "OBSIDIAN_CITADEL_WALL",
            location: { x: 50, y: 0 },
            currentHealth: 2500,
            maxHealth: 8000,
            isCollapsed: false,
        };

        const nearbyPalisade: FortificationTarget = {
            targetId: "palisade_near",
            structureType: "WOODEN_PALISADE", // 10% armor
            location: { x: 54, y: 0 }, // 4 tiles away <= 8 tile splash radius
            currentHealth: 2000,
            maxHealth: 2000,
            isCollapsed: false,
        };

        // Raw dmg 4500. Direct (40% wall armor) = 2700 -> Citadel collapses.
        // Raw splash 1800. Palisade (10% armor) = 1620 dmg.
        const strikeRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(
            mortar,
            citadelWall,
            "VOID_ARC_SHATTER_SPHERE",
            [nearbyPalisade],
            100000
        );

        expect(strikeRes.success).toBe(true);
        expect(strikeRes.result?.directDamageDealt).toBe(2700);
        expect(strikeRes.result?.splashDamageDealt).toBe(1620);
        expect(strikeRes.result?.splashTargetsAffected).toBe(1);
        expect(strikeRes.result?.isTargetCollapsed).toBe(true);
        expect(citadelWall.isCollapsed).toBe(true);
        expect(nearbyPalisade.currentHealth).toBe(380); // 2000 - 1620
        expect(mortar.currentDurability).toBe(338);
    });

    it("rejects bombardment when target is out of ballistic firing range", () => {
        const catapult = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_02", "IRON_SIEGE_CATAPULT", 0, 0);
        const farGate: FortificationTarget = {
            targetId: "gate_01",
            structureType: "STONE_FORTRESS_GATE",
            location: { x: 80, y: 0 },
            currentHealth: 3500,
            maxHealth: 3500,
            isCollapsed: false,
        };

        const failRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(catapult, farGate, "KINETIC_STONE_BOULDER");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("out of artillery ballistic range");
        expect(catapult.currentDurability).toBe(120);
    });

    it("rejects bombardment when target is already collapsed", () => {
        const trebuchet = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_03", "RUNIC_HEAVY_TREBUCHET", 0, 0);
        const deadPalisade: FortificationTarget = {
            targetId: "pal_01",
            structureType: "WOODEN_PALISADE",
            location: { x: 30, y: 0 },
            currentHealth: 0,
            maxHealth: 1000,
            isCollapsed: true,
        };

        const failRes = AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(trebuchet, deadPalisade, "INCENDIARY_PITCH_ORB");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already destroyed");
    });

    it("repairs damaged artillery and restores operational status", () => {
        const catapult = AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c_04", "IRON_SIEGE_CATAPULT", 0, 0);
        catapult.currentDurability = 0;
        catapult.isOperational = false;

        const rep = AncientRunicSiegeTrebuchetCatapultEngine.repairArtillery(catapult, 60);
        expect(rep.success).toBe(true);
        expect(rep.newDurability).toBe(60);
        expect(rep.isOperational).toBe(true);
    });

    it("guards against null inputs and unsupported artillery types", () => {
        expect(() => AncientRunicSiegeTrebuchetCatapultEngine.deployArtillery("c", "SLINGSHOT" as any)).toThrow(
            "Unsupported siege artillery type"
        );

        expect(AncientRunicSiegeTrebuchetCatapultEngine.bombardStructure(null as any, null as any, "INCENDIARY_PITCH_ORB").success).toBe(false);
        expect(AncientRunicSiegeTrebuchetCatapultEngine.repairArtillery(null as any).success).toBe(false);
    });
});