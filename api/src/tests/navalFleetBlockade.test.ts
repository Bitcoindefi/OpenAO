import { describe, it, expect } from "vitest";
import {
    NavalFleetBlockadeEngine,
    ActiveNavalBlockade,
    InterceptedVessel,
} from "../lib/navalFleetBlockade.js";

describe("NavalFleetBlockadeEngine Fleet Blockades, Harpoons & Broadsides", () => {
    it("establishes an Armored Frigate blockade at Storm Strait", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral_nelson", "ARMORED_FRIGATE", "STORM_STRAIT", 100, 100, 35, 80);
        expect(blockade.warshipClass).toBe("ARMORED_FRIGATE");
        expect(blockade.currentHullHp).toBe(4500);
        expect(blockade.controlRadiusTiles).toBe(35);
        expect(blockade.tollTaxGoldAmount).toBe(80);
    });

    it("verifies blockade zone territory coordinates", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "WAR_GALLEON", "SKULL_REEF", 50, 50, 30);

        expect(NavalFleetBlockadeEngine.isVesselInBlockadeZone(blockade, 60, 50)).toBe(true);
        expect(NavalFleetBlockadeEngine.isVesselInBlockadeZone(blockade, 150, 50)).toBe(false);
    });

    it("gates harpoon grappling specifically by warship harpoonRangeTiles", () => {
        // War Galleon has 25 tiles harpoon range and 50 control radius
        const galleonBlockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "WAR_GALLEON", "KRAKEN_ABYSS", 0, 0, 50);
        const merchantVessel: InterceptedVessel = {
            vesselId: "vessel_01",
            captainPlayerId: "merchant_tom",
            currentHullHp: 1000,
            maxHullHp: 1000,
            cargoGoldValue: 400,
            isGrappled: false,
            isSunken: false,
        };

        // Within 25 tiles (20, 0) -> Succeeds
        const grappleRes = NavalFleetBlockadeEngine.fireHarpoonGrapple(galleonBlockade, merchantVessel, 20, 0);
        expect(grappleRes.success).toBe(true);
        expect(merchantVessel.isGrappled).toBe(true);

        merchantVessel.isGrappled = false;
        // At 30 tiles (30, 0) inside control zone (50) but beyond Galleon harpoon range (25) -> Rejects
        const outRangeGrapple = NavalFleetBlockadeEngine.fireHarpoonGrapple(galleonBlockade, merchantVessel, 30, 0);
        expect(outRangeGrapple.success).toBe(false);
        expect(outRangeGrapple.reason).toContain("beyond blockade harpoon perimeter");
    });

    it("fires broadside cannon salvo and salvages 75% cargo when sunken", () => {
        const blockade = NavalFleetBlockadeEngine.establishBlockade("admiral", "DREADNOUGHT_IRONCLAD", "STORM_STRAIT", 0, 0, 50);
        const weakSloop: InterceptedVessel = {
            vesselId: "sloop_01",
            captainPlayerId: "smuggler_1",
            currentHullHp: 400,
            maxHullHp: 400,
            cargoGoldValue: 600,
            isGrappled: true,
            isSunken: false,
        };

        const salvoRes = NavalFleetBlockadeEngine.fireBroadsideSalvo(blockade, weakSloop, 0);
        expect(salvoRes.success).toBe(true);
        expect(salvoRes.isSunken).toBe(true);
        expect(weakSloop.isSunken).toBe(true);
        expect(salvoRes.plunderGoldAwarded).toBe(450);
    });

    it("guards against unsupported warship classes", () => {
        expect(() => NavalFleetBlockadeEngine.establishBlockade("a", "SPACE_CARRIER" as any, "STORM_STRAIT")).toThrow(
            "Unsupported warship class"
        );
    });
});