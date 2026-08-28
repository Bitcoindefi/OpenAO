/**
 * Naval Shipyard, Coastal War Galleon & Ocean Navigation Engine for OpenAO MMORPG.
 * Simulates vessel shipyard construction, hull material durability scaling,
 * wind vector navigation speeds, cannon broadside volleys with reload timers, and drydock repairs.
 */

export type VesselClass = "FISHING_BOAT" | "CARGO_CLIPPER" | "WAR_GALLEON" | "GHOST_FRIGATE";
export type HullMaterial = "OAK_WOOD" | "REINFORCED_IRONWOOD" | "CURSED_GHOSTWOOD";

export interface VesselBlueprint {
    vesselClass: VesselClass;
    baseMaxHp: number;
    baseSpeedKnots: number;
    cargoHoldCapacitySlots: number;
    cannonCount: number;
    cannonBaseDamage: number;
    cannonReloadSeconds: number;
}

export interface ConstructedVessel {
    vesselId: string;
    vesselClass: VesselClass;
    hullMaterial: HullMaterial;
    captainPlayerId: string;
    currentHp: number;
    maxHp: number;
    loadedCargoCount: number;
    lastCannonVolleyEpochMs: number;
    isSunk: boolean;
}

export interface CannonVolleyResult {
    damageDealt: number;
    isTargetSunk: boolean;
    remainingTargetHp: number;
    isOnCooldown: boolean;
    reason?: string;
}

export const VESSEL_BLUEPRINTS: Record<VesselClass, VesselBlueprint> = {
    FISHING_BOAT: {
        vesselClass: "FISHING_BOAT",
        baseMaxHp: 800,
        baseSpeedKnots: 12,
        cargoHoldCapacitySlots: 10,
        cannonCount: 0,
        cannonBaseDamage: 0,
        cannonReloadSeconds: 0,
    },
    CARGO_CLIPPER: {
        vesselClass: "CARGO_CLIPPER",
        baseMaxHp: 2200,
        baseSpeedKnots: 18,
        cargoHoldCapacitySlots: 60,
        cannonCount: 4,
        cannonBaseDamage: 250,
        cannonReloadSeconds: 5,
    },
    WAR_GALLEON: {
        vesselClass: "WAR_GALLEON",
        baseMaxHp: 4500,
        baseSpeedKnots: 14,
        cargoHoldCapacitySlots: 30,
        cannonCount: 16,
        cannonBaseDamage: 400,
        cannonReloadSeconds: 7,
    },
    GHOST_FRIGATE: {
        vesselClass: "GHOST_FRIGATE",
        baseMaxHp: 6000,
        baseSpeedKnots: 22,
        cargoHoldCapacitySlots: 40,
        cannonCount: 24,
        cannonBaseDamage: 550,
        cannonReloadSeconds: 6,
    },
};

export const HULL_MULTIPLIERS: Record<HullMaterial, number> = {
    OAK_WOOD: 1.0,
    REINFORCED_IRONWOOD: 1.5,
    CURSED_GHOSTWOOD: 2.0,
};

export class NavalShipyardTradeVesselEngine {
    /**
     * Constructs a new seaworthy vessel at the shipyard.
     */
    public static constructVessel(
        vesselId: string,
        vesselClass: VesselClass,
        hullMaterial: HullMaterial,
        captainPlayerId: string
    ): ConstructedVessel {
        const bp = VESSEL_BLUEPRINTS[vesselClass];
        if (!bp) {
            throw new Error(`Unsupported vessel class: ${String(vesselClass)}`);
        }

        const hullFactor = HULL_MULTIPLIERS[hullMaterial] ?? 1.0;
        const totalMaxHp = Math.floor(bp.baseMaxHp * hullFactor);

        return {
            vesselId,
            vesselClass,
            hullMaterial,
            captainPlayerId,
            currentHp: totalMaxHp,
            maxHp: totalMaxHp,
            loadedCargoCount: 0,
            lastCannonVolleyEpochMs: 0,
            isSunk: false,
        };
    }

    /**
     * Computes the effective sailing speed in knots based on ship heading and wind vector angle.
     * @param headingDegrees Vessel heading (0 to 360)
     * @param windDegrees Wind origin direction (0 to 360)
     */
    public static calculateSailingSpeed(
        vessel: ConstructedVessel,
        headingDegrees: number,
        windDegrees: number
    ): number {
        if (!vessel || vessel.isSunk) return 0;

        const bp = VESSEL_BLUEPRINTS[vessel.vesselClass];
        const heading = Number.isFinite(headingDegrees) ? ((headingDegrees % 360) + 360) % 360 : 0;
        const wind = Number.isFinite(windDegrees) ? ((windDegrees % 360) + 360) % 360 : 0;

        // Angle difference
        let angleDiff = Math.abs(heading - wind);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Wind factor: Tailwind (0 deg) = 1.25x speed, Headwind (180 deg) = 0.35x speed
        const rad = (angleDiff * Math.PI) / 180;
        const windEfficiency = 0.35 + 0.90 * ((1 + Math.cos(rad)) / 2);

        // Cargo weight penalty: up to -20% speed when cargo hold is 100% full
        const cargoRatio = Math.min(1.0, vessel.loadedCargoCount / Math.max(1, bp.cargoHoldCapacitySlots));
        const cargoPenalty = 1.0 - cargoRatio * 0.20;

        const speed = bp.baseSpeedKnots * windEfficiency * cargoPenalty;
        return Math.round(speed * 100) / 100;
    }

    /**
     * Fires a cannon broadside volley at a target vessel, enforcing reload timers and armor mitigation.
     */
    public static fireBroadsideVolley(
        attacker: ConstructedVessel,
        defender: ConstructedVessel,
        targetArmorRating = 0,
        currentEpochMs = Date.now()
    ): CannonVolleyResult {
        if (!attacker || attacker.isSunk) {
            return { damageDealt: 0, isTargetSunk: false, remainingTargetHp: defender?.currentHp ?? 0, isOnCooldown: false, reason: "Attacking vessel is sunken or invalid." };
        }
        if (!defender || defender.isSunk) {
            return { damageDealt: 0, isTargetSunk: true, remainingTargetHp: 0, isOnCooldown: false, reason: "Target vessel is already sunken." };
        }

        const bp = VESSEL_BLUEPRINTS[attacker.vesselClass];
        if (bp.cannonCount === 0) {
            return { damageDealt: 0, isTargetSunk: false, remainingTargetHp: defender.currentHp, isOnCooldown: false, reason: "Vessel has no mounted cannons." };
        }

        const reloadMs = bp.cannonReloadSeconds * 1000;
        if (attacker.lastCannonVolleyEpochMs > 0 && currentEpochMs - attacker.lastCannonVolleyEpochMs < reloadMs) {
            return {
                damageDealt: 0,
                isTargetSunk: false,
                remainingTargetHp: defender.currentHp,
                isOnCooldown: true,
                reason: `Cannons are reloading. Cooldown: ${Math.ceil((reloadMs - (currentEpochMs - attacker.lastCannonVolleyEpochMs)) / 1000)}s remaining.`,
            };
        }

        // Armor mitigation formula: RawDamage * (100 / (100 + armor))
        const armor = Number.isFinite(targetArmorRating) ? Math.max(0, targetArmorRating) : 0;
        const armorFactor = 100 / (100 + armor);
        const rawDamage = bp.cannonCount * bp.cannonBaseDamage;
        const finalDamage = Math.max(20, Math.floor(rawDamage * armorFactor));

        defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
        if (defender.currentHp === 0) {
            defender.isSunk = true;
        }

        attacker.lastCannonVolleyEpochMs = currentEpochMs;

        return {
            damageDealt: finalDamage,
            isTargetSunk: defender.isSunk,
            remainingTargetHp: defender.currentHp,
            isOnCooldown: false,
        };
    }

    /**
     * Conducts drydock repairs on a damaged vessel, restoring hit points.
     */
    public static repairVessel(
        vessel: ConstructedVessel,
        repairHpAmount: number
    ): { success: boolean; healedHp: number; currentHp: number; reason?: string } {
        if (!vessel || vessel.isSunk) {
            return { success: false, healedHp: 0, currentHp: 0, reason: "Cannot drydock repair a sunken vessel." };
        }

        const amount = Number.isFinite(repairHpAmount) ? Math.max(0, Math.floor(repairHpAmount)) : 0;
        const missingHp = vessel.maxHp - vessel.currentHp;
        const actualHeal = Math.min(missingHp, amount);

        vessel.currentHp += actualHeal;

        return {
            success: true,
            healedHp: actualHeal,
            currentHp: vessel.currentHp,
        };
    }
}