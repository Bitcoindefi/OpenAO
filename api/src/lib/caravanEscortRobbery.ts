/**
 * Trade Caravan Escort, Bandit Ambush & Cargo Robbery Engine for OpenAO MMORPG.
 * Simulates route waypoint progression, bandit raider ambush encounters,
 * wagon hull durability loss, cargo plundering, and depot delivery payout scaling.
 */

export type CaravanTier = "MERCHANT_SUPPLY_CART" | "ROYAL_TREASURY_CARRIAGE" | "SILK_ROAD_CONVOY";
export type CaravanStatus = "IN_TRANSIT" | "AMBUSH_ENGAGED" | "DELIVERED_SUCCESS" | "PLUNDERED_FAILURE";

export interface CaravanDefinition {
    tier: CaravanTier;
    baseCargoHp: number;
    baseGoldPayout: number;
    totalWaypoints: number;
}

export interface ActiveTradeCaravan {
    caravanId: string;
    escortPlayerId: string;
    tier: CaravanTier;
    status: CaravanStatus;
    currentHp: number;
    maxHp: number;
    currentWaypointIndex: number;
    totalWaypoints: number;
    escortGuardCount: number;
    startedAtEpochMs: number;
}

export const CARAVAN_CATALOG: Record<CaravanTier, CaravanDefinition> = {
    MERCHANT_SUPPLY_CART: { tier: "MERCHANT_SUPPLY_CART", baseCargoHp: 1000, baseGoldPayout: 100, totalWaypoints: 4 },
    ROYAL_TREASURY_CARRIAGE: { tier: "ROYAL_TREASURY_CARRIAGE", baseCargoHp: 2500, baseGoldPayout: 500, totalWaypoints: 6 },
    SILK_ROAD_CONVOY: { tier: "SILK_ROAD_CONVOY", baseCargoHp: 5000, baseGoldPayout: 1200, totalWaypoints: 8 },
};

export class CaravanEscortRobberyEngine {
    /**
     * Initializes a new trade caravan escort mission.
     */
    public static dispatchCaravan(
        escortPlayerId: string,
        tier: CaravanTier,
        escortGuardCount = 2,
        currentEpochMs = Date.now()
    ): ActiveTradeCaravan {
        const def = CARAVAN_CATALOG[tier];
        if (!def) {
            throw new Error(`Unsupported caravan tier: ${String(tier)}`);
        }

        const guards = Number.isFinite(escortGuardCount) ? Math.max(0, Math.min(10, Math.floor(escortGuardCount))) : 2;

        return {
            caravanId: `caravan_${tier.toLowerCase()}_${currentEpochMs}_${Math.random().toString(36).substring(2, 7)}`,
            escortPlayerId,
            tier,
            status: "IN_TRANSIT",
            currentHp: def.baseCargoHp,
            maxHp: def.baseCargoHp,
            currentWaypointIndex: 0,
            totalWaypoints: def.totalWaypoints,
            escortGuardCount: guards,
            startedAtEpochMs: currentEpochMs,
        };
    }

    /**
     * Advances caravan to the next waypoint along its route.
     */
    public static advanceWaypoint(
        caravan: ActiveTradeCaravan
    ): { success: boolean; waypointIndex: number; isArrived: boolean; status: CaravanStatus; reason?: string } {
        if (!caravan || caravan.status === "DELIVERED_SUCCESS" || caravan.status === "PLUNDERED_FAILURE") {
            return { success: false, waypointIndex: caravan?.currentWaypointIndex ?? 0, isArrived: false, status: caravan?.status ?? "PLUNDERED_FAILURE", reason: "Caravan route is no longer active." };
        }

        if (caravan.status === "AMBUSH_ENGAGED") {
            return { success: false, waypointIndex: caravan.currentWaypointIndex, isArrived: false, status: caravan.status, reason: "Cannot advance waypoint while engaged in a bandit ambush!" };
        }

        caravan.currentWaypointIndex += 1;
        if (caravan.currentWaypointIndex >= caravan.totalWaypoints) {
            caravan.status = "DELIVERED_SUCCESS";
            return { success: true, waypointIndex: caravan.currentWaypointIndex, isArrived: true, status: caravan.status };
        }

        return { success: true, waypointIndex: caravan.currentWaypointIndex, isArrived: false, status: caravan.status };
    }

    /**
     * Engages an ambush, locking caravan progression until resolved.
     */
    public static engageAmbush(
        caravan: ActiveTradeCaravan
    ): { success: boolean; status: CaravanStatus; reason?: string } {
        if (!caravan || caravan.status !== "IN_TRANSIT") {
            return { success: false, status: caravan?.status ?? "PLUNDERED_FAILURE", reason: "Caravan is not in transit." };
        }

        caravan.status = "AMBUSH_ENGAGED";
        return { success: true, status: "AMBUSH_ENGAGED" };
    }

    /**
     * Resolves a bandit ambush encounter, mitigating damage based on hired escort guards and returning to transit if intact.
     */
    public static triggerBanditAmbush(
        caravan: ActiveTradeCaravan,
        banditRaidStrength: number
    ): { success: boolean; damageTaken: number; currentHp: number; status: CaravanStatus; isPlundered: boolean } {
        if (!caravan || caravan.status === "DELIVERED_SUCCESS" || caravan.status === "PLUNDERED_FAILURE") {
            return { success: false, damageTaken: 0, currentHp: caravan?.currentHp ?? 0, status: caravan?.status ?? "PLUNDERED_FAILURE", isPlundered: caravan?.status === "PLUNDERED_FAILURE" };
        }

        const raidPower = Number.isFinite(banditRaidStrength) ? Math.max(10, Math.floor(banditRaidStrength)) : 50;
        const guardMitigation = Math.min(0.70, caravan.escortGuardCount * 0.10);
        const damageTaken = Math.max(10, Math.floor(raidPower * (1 - guardMitigation)));

        caravan.currentHp = Math.max(0, caravan.currentHp - damageTaken);

        if (caravan.currentHp === 0) {
            caravan.status = "PLUNDERED_FAILURE";
            return { success: true, damageTaken, currentHp: 0, status: "PLUNDERED_FAILURE", isPlundered: true };
        }

        caravan.status = "IN_TRANSIT";
        return { success: true, damageTaken, currentHp: caravan.currentHp, status: "IN_TRANSIT", isPlundered: false };
    }

    /**
     * Completes delivery at the trade depot and calculates payout based on exact intact cargo percentage.
     */
    public static completeDepotDelivery(
        caravan: ActiveTradeCaravan
    ): { success: boolean; goldAwarded: number; cargoHealthRatio: number; reason?: string } {
        if (!caravan || caravan.status !== "DELIVERED_SUCCESS") {
            return { success: false, goldAwarded: 0, cargoHealthRatio: 0, reason: "Caravan has not reached the final delivery depot." };
        }

        const def = CARAVAN_CATALOG[caravan.tier];
        const healthRatio = Math.max(0, caravan.currentHp / caravan.maxHp);
        const goldAwarded = Math.round(def.baseGoldPayout * healthRatio);

        return {
            success: true,
            goldAwarded,
            cargoHealthRatio: Math.round(healthRatio * 100) / 100,
        };
    }
}