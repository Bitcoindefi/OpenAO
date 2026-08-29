import crypto from "node:crypto";

/**
 * Astral Rift Portal Matrix, Leyline Resonance & Teleportation Network Engine for OpenAO MMORPG.
 * Simulates activating ancient waypoint gates (Sunfire Spires, Abyssal Depths, Celestial Observatory),
 * consuming leyline energy crystals, managing spatial rift stability, and mass party teleportation.
 */

export type WaypointGateType = "SUNFIRE_SPIRES_GATE" | "ABYSSAL_DEPTHS_GATE" | "CELESTIAL_OBSERVATORY_GATE";

export interface WaypointGateDefinition {
    gateType: WaypointGateType;
    gateName: string;
    coordinates: { x: number; y: number };
    requiredMinimumLevel: number;
}

export interface ActiveRiftPortal {
    portalId: string;
    originGate: WaypointGateType;
    destinationGate: WaypointGateType;
    leylineEnergyCharges: number; // 0 to 100
    riftStabilityPercent: number; // 0 to 100
    isOpen: boolean;
    createdEpochMs: number;
}

export interface TeleportTraveler {
    playerId: string;
    playerLevel: number;
    currentLocation: { x: number; y: number };
    isAlive: boolean;
}

export const WAYPOINT_GATE_CATALOG: Record<WaypointGateType, WaypointGateDefinition> = {
    SUNFIRE_SPIRES_GATE: { gateType: "SUNFIRE_SPIRES_GATE", gateName: "Sunfire Spires Waypoint", coordinates: { x: 120, y: 340 }, requiredMinimumLevel: 20 },
    ABYSSAL_DEPTHS_GATE: { gateType: "ABYSSAL_DEPTHS_GATE", gateName: "Abyssal Depths Gateway", coordinates: { x: 800, y: 950 }, requiredMinimumLevel: 50 },
    CELESTIAL_OBSERVATORY_GATE: { gateType: "CELESTIAL_OBSERVATORY_GATE", gateName: "Celestial Observatory Gate", coordinates: { x: 50, y: 45 }, requiredMinimumLevel: 35 },
};

export class RunicRiftPortalTeleportationEngine {
    public static readonly CHARGE_COST_PER_TRAVELER = 15;
    public static readonly INSTABILITY_THRESHOLD_PERCENT = 20;

    /**
     * Opens an astral rift portal connecting two distinct waypoint gates.
     */
    public static openRiftPortal(
        origin: WaypointGateType,
        destination: WaypointGateType,
        initialLeylineCharges = 100,
        currentEpochMs = Date.now()
    ): ActiveRiftPortal {
        if (!WAYPOINT_GATE_CATALOG[origin] || !WAYPOINT_GATE_CATALOG[destination]) {
            throw new Error(`Unsupported waypoint gate type: origin=${String(origin)}, dest=${String(destination)}`);
        }

        if (origin === destination) {
            throw new Error("Origin and destination gates must be distinct.");
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            portalId: `portal_rift_${uuid}`,
            originGate: origin,
            destinationGate: destination,
            leylineEnergyCharges: Math.min(100, Math.max(0, Number.isFinite(initialLeylineCharges) ? initialLeylineCharges : 100)),
            riftStabilityPercent: 100,
            isOpen: true,
            createdEpochMs: currentEpochMs,
        };
    }

    /**
     * Teleports a group of party travelers through the active portal to the destination gate.
     */
    public static teleportParty(
        portal: ActiveRiftPortal,
        travelers: TeleportTraveler[],
        rng: () => number = Math.random
    ): { success: boolean; teleportedCount: number; isDestabilizedStorm: boolean; remainingCharges: number; reason?: string } {
        if (!portal || !portal.isOpen) {
            return { success: false, teleportedCount: 0, isDestabilizedStorm: false, remainingCharges: portal?.leylineEnergyCharges ?? 0, reason: "Portal is closed or invalid." };
        }

        if (!Array.isArray(travelers) || travelers.length === 0) {
            return { success: false, teleportedCount: 0, isDestabilizedStorm: false, remainingCharges: portal.leylineEnergyCharges, reason: "No travelers provided." };
        }

        const destData = WAYPOINT_GATE_CATALOG[portal.destinationGate];
        const validTravelers = travelers.filter(t => t && t.isAlive && t.playerLevel >= destData.requiredMinimumLevel);

        if (validTravelers.length === 0) {
            return { success: false, teleportedCount: 0, isDestabilizedStorm: false, remainingCharges: portal.leylineEnergyCharges, reason: "No eligible living travelers meet the destination level requirement." };
        }

        const totalEnergyCost = validTravelers.length * this.CHARGE_COST_PER_TRAVELER;
        if (portal.leylineEnergyCharges < totalEnergyCost) {
            return { success: false, teleportedCount: 0, isDestabilizedStorm: false, remainingCharges: portal.leylineEnergyCharges, reason: `Insufficient leyline charges. Required: ${totalEnergyCost}, Available: ${portal.leylineEnergyCharges}.` };
        }

        portal.leylineEnergyCharges -= totalEnergyCost;
        portal.riftStabilityPercent = Math.max(0, portal.riftStabilityPercent - validTravelers.length * 10);

        const isDestabilized = portal.riftStabilityPercent < this.INSTABILITY_THRESHOLD_PERCENT;

        for (const traveler of validTravelers) {
            if (isDestabilized) {
                // Spatial distortion rift storm scatters travelers (+-5 tiles)
                const offsetX = Math.floor(rng() * 11) - 5;
                const offsetY = Math.floor(rng() * 11) - 5;
                traveler.currentLocation = {
                    x: destData.coordinates.x + offsetX,
                    y: destData.coordinates.y + offsetY,
                };
            } else {
                traveler.currentLocation = {
                    x: destData.coordinates.x,
                    y: destData.coordinates.y,
                };
            }
        }

        return {
            success: true,
            teleportedCount: validTravelers.length,
            isDestabilizedStorm: isDestabilized,
            remainingCharges: portal.leylineEnergyCharges,
        };
    }

    /**
     * Recharges portal leyline energy and restores rift stability to 100%.
     */
    public static rechargePortalLeyline(
        portal: ActiveRiftPortal,
        rechargeCharges = 50
    ): { success: boolean; newCharges: number; newStability: number } {
        if (!portal || !portal.isOpen) return { success: false, newCharges: 0, newStability: 0 };

        const added = Number.isFinite(rechargeCharges) ? Math.max(1, rechargeCharges) : 50;
        portal.leylineEnergyCharges = Math.min(100, portal.leylineEnergyCharges + added);
        portal.riftStabilityPercent = 100;

        return {
            success: true,
            newCharges: portal.leylineEnergyCharges,
            newStability: portal.riftStabilityPercent,
        };
    }
}