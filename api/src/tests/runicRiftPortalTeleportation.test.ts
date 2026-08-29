import { describe, it, expect } from "vitest";
import {
    RunicRiftPortalTeleportationEngine,
    ActiveRiftPortal,
    TeleportTraveler,
} from "../lib/runicRiftPortalTeleportation.js";

describe("RunicRiftPortalTeleportationEngine Gates, Leylines & Teleportation", () => {
    it("opens rift portal and teleports high-level party to Celestial Observatory", () => {
        const portal = RunicRiftPortalTeleportationEngine.openRiftPortal("SUNFIRE_SPIRES_GATE", "CELESTIAL_OBSERVATORY_GATE", 100, 100000);
        expect(portal.isOpen).toBe(true);
        expect(portal.leylineEnergyCharges).toBe(100);
        expect(portal.riftStabilityPercent).toBe(100);

        const traveler1: TeleportTraveler = { playerId: "p1", playerLevel: 40, currentLocation: { x: 120, y: 340 }, isAlive: true };
        const traveler2: TeleportTraveler = { playerId: "p2", playerLevel: 45, currentLocation: { x: 120, y: 340 }, isAlive: true };

        const res = RunicRiftPortalTeleportationEngine.teleportParty(portal, [traveler1, traveler2]);
        expect(res.success).toBe(true);
        expect(res.teleportedCount).toBe(2);
        expect(res.isDestabilizedStorm).toBe(false);
        expect(res.remainingCharges).toBe(70); // 100 - (15 * 2) = 70
        expect(traveler1.currentLocation).toEqual({ x: 50, y: 45 });
        expect(traveler2.currentLocation).toEqual({ x: 50, y: 45 });
    });

    it("triggers spatial rift storm scattering when stability drops below 20%", () => {
        const portal: ActiveRiftPortal = {
            portalId: "portal_instable",
            originGate: "SUNFIRE_SPIRES_GATE",
            destinationGate: "ABYSSAL_DEPTHS_GATE",
            leylineEnergyCharges: 100,
            riftStabilityPercent: 20,
            isOpen: true,
            createdEpochMs: 100000,
        };

        const warrior: TeleportTraveler = { playerId: "w1", playerLevel: 60, currentLocation: { x: 0, y: 0 }, isAlive: true };

        const scatterRes = RunicRiftPortalTeleportationEngine.teleportParty(portal, [warrior], () => 0.5);
        expect(scatterRes.success).toBe(true);
        expect(scatterRes.isDestabilizedStorm).toBe(true);
        expect(portal.riftStabilityPercent).toBe(10);

        const recharge = RunicRiftPortalTeleportationEngine.rechargePortalLeyline(portal, 50);
        expect(recharge.success).toBe(true);
        expect(recharge.newStability).toBe(100);
    });

    it("rejects travelers below destination level requirement", () => {
        const portal = RunicRiftPortalTeleportationEngine.openRiftPortal("SUNFIRE_SPIRES_GATE", "ABYSSAL_DEPTHS_GATE", 100);
        const noob: TeleportTraveler = { playerId: "noob", playerLevel: 15, currentLocation: { x: 0, y: 0 }, isAlive: true };

        const underlevelRes = RunicRiftPortalTeleportationEngine.teleportParty(portal, [noob]);
        expect(underlevelRes.success).toBe(false);
        expect(underlevelRes.reason).toContain("level requirement");
    });

    it("rejects opening portal when origin equals destination", () => {
        expect(() => RunicRiftPortalTeleportationEngine.openRiftPortal("SUNFIRE_SPIRES_GATE", "SUNFIRE_SPIRES_GATE")).toThrow(
            "Origin and destination gates must be distinct"
        );
    });

    it("guards against closed portals and insufficient leyline energy charges independently", () => {
        const closedPortal: ActiveRiftPortal = {
            portalId: "c",
            originGate: "SUNFIRE_SPIRES_GATE",
            destinationGate: "CELESTIAL_OBSERVATORY_GATE",
            leylineEnergyCharges: 100,
            riftStabilityPercent: 100,
            isOpen: false,
            createdEpochMs: 100000,
        };

        const traveler: TeleportTraveler = { playerId: "t", playerLevel: 50, currentLocation: { x: 0, y: 0 }, isAlive: true };
        const closedRes = RunicRiftPortalTeleportationEngine.teleportParty(closedPortal, [traveler]);
        expect(closedRes.success).toBe(false);
        expect(closedRes.reason).toContain("closed");

        // Open portal with insufficient energy charges (< 15)
        const emptyPortal: ActiveRiftPortal = {
            portalId: "empty",
            originGate: "SUNFIRE_SPIRES_GATE",
            destinationGate: "CELESTIAL_OBSERVATORY_GATE",
            leylineEnergyCharges: 5, // Requires 15
            riftStabilityPercent: 100,
            isOpen: true,
            createdEpochMs: 100000,
        };

        const emptyRes = RunicRiftPortalTeleportationEngine.teleportParty(emptyPortal, [traveler]);
        expect(emptyRes.success).toBe(false);
        expect(emptyRes.reason).toContain("Insufficient leyline charges");
    });
});