import { describe, it, expect } from "vitest";
import {
    NavalShipyardTradeVesselEngine,
    ConstructedVessel,
} from "../lib/navalShipyardTradeVessel.js";

describe("NavalShipyardTradeVesselEngine Full Lifecycle & Naval Warfare", () => {
    it("constructs a War Galleon with Reinforced Ironwood hull scaling", () => {
        // Base 4500 HP * 1.5 = 6750 HP
        const galleon = NavalShipyardTradeVesselEngine.constructVessel(
            "ship_101",
            "WAR_GALLEON",
            "REINFORCED_IRONWOOD",
            "captain_morgan"
        );

        expect(galleon.currentHp).toBe(6750);
        expect(galleon.maxHp).toBe(6750);
        expect(galleon.isSunk).toBe(false);
    });

    it("calculates sailing speed considering tailwind vs headwind and cargo hold penalty", () => {
        const clipper = NavalShipyardTradeVesselEngine.constructVessel(
            "clipper_01",
            "CARGO_CLIPPER",
            "OAK_WOOD",
            "captain_swift"
        );

        // Tailwind: heading 0, wind 0 -> ~22.5 knots
        const tailwindSpeed = NavalShipyardTradeVesselEngine.calculateSailingSpeed(clipper, 0, 0);
        expect(tailwindSpeed).toBeGreaterThan(20);

        // Headwind: heading 0, wind 180 -> ~6.3 knots
        const headwindSpeed = NavalShipyardTradeVesselEngine.calculateSailingSpeed(clipper, 0, 180);
        expect(headwindSpeed).toBeLessThan(tailwindSpeed);

        // Load 100% cargo hold (60 slots) -> speed reduces by 20%
        clipper.loadedCargoCount = 60;
        const loadedTailwindSpeed = NavalShipyardTradeVesselEngine.calculateSailingSpeed(clipper, 0, 0);
        expect(loadedTailwindSpeed).toBeCloseTo(tailwindSpeed * 0.80, 1);
    });

    it("fires cannon broadside volley, sinks target, and enforces reload cooldowns", () => {
        const warGalleon = NavalShipyardTradeVesselEngine.constructVessel("galleon_01", "WAR_GALLEON", "OAK_WOOD", "admiral_1");
        const fishingBoat = NavalShipyardTradeVesselEngine.constructVessel("boat_01", "FISHING_BOAT", "OAK_WOOD", "fisherman_1");

        // Galleon has 16 cannons * 400 = 6400 raw damage -> Sinks 800 HP boat
        const volley1 = NavalShipyardTradeVesselEngine.fireBroadsideVolley(warGalleon, fishingBoat, 0, 100000);
        expect(volley1.damageDealt).toBe(6400);
        expect(volley1.isTargetSunk).toBe(true);
        expect(fishingBoat.isSunk).toBe(true);
        expect(fishingBoat.currentHp).toBe(0);

        // Attempt second volley before 7s reload expires (at 103000)
        const dummyTarget = NavalShipyardTradeVesselEngine.constructVessel("target_02", "CARGO_CLIPPER", "OAK_WOOD", "pirate_1");
        const earlyVolley = NavalShipyardTradeVesselEngine.fireBroadsideVolley(warGalleon, dummyTarget, 0, 103000);
        expect(earlyVolley.isOnCooldown).toBe(true);
        expect(earlyVolley.damageDealt).toBe(0);
        expect(earlyVolley.reason).toContain("Cannons are reloading");
    });

    it("repairs damaged vessels in drydock and blocks repairs on sunken ships", () => {
        const frigate = NavalShipyardTradeVesselEngine.constructVessel("frigate_01", "GHOST_FRIGATE", "OAK_WOOD", "ghost_capt");
        frigate.currentHp = 3000; // Damaged from 6000

        const repairRes = NavalShipyardTradeVesselEngine.repairVessel(frigate, 2000);
        expect(repairRes.success).toBe(true);
        expect(repairRes.healedHp).toBe(2000);
        expect(frigate.currentHp).toBe(5000);

        // Sunk vessel repair rejection
        frigate.isSunk = true;
        const sunkRepair = NavalShipyardTradeVesselEngine.repairVessel(frigate, 1000);
        expect(sunkRepair.success).toBe(false);
        expect(sunkRepair.reason).toContain("Cannot drydock repair a sunken vessel");
    });

    it("guards defensively against unsupported vessel classes and invalid inputs", () => {
        expect(() => NavalShipyardTradeVesselEngine.constructVessel("x", "ALIEN_MOTHERSHIP" as any, "OAK_WOOD", "p")).toThrow(
            "Unsupported vessel class"
        );

        const boat = NavalShipyardTradeVesselEngine.constructVessel("b1", "FISHING_BOAT", "OAK_WOOD", "p");
        // Fishing boat has 0 cannons
        const noCannonRes = NavalShipyardTradeVesselEngine.fireBroadsideVolley(boat, boat);
        expect(noCannonRes.damageDealt).toBe(0);
        expect(noCannonRes.reason).toContain("no mounted cannons");
    });
});