import { describe, it, expect } from "vitest";
import { CaravanEscortTradeEngine, TradeCargoManifest, CaravanWaypoint } from "../lib/caravanEscortTrade.js";

describe("CaravanEscortTradeEngine Route Traversal, Ambush Damage & Failure", () => {
    const mockManifest: TradeCargoManifest = {
        manifestId: "silk_road_01",
        cargoName: "Imperial Silk and Gems",
        cargoValueGold: 40000,
        baseRewardGold: 2000,
    };

    const mockWaypoints: CaravanWaypoint[] = [
        { waypointId: "wp_1", mapId: 1, x: 10, y: 10 },
        { waypointId: "wp_2", mapId: 1, x: 20, y: 20 },
    ];

    it("applies ambush damage to cart and scales down final reward payout", () => {
        const mission = CaravanEscortTradeEngine.startMission("player_1", mockManifest, mockWaypoints, 500);

        // WP 1 with ambush triggered (rng = 0.01) -> takes 150 damage (500 -> 350 HP)
        const tick1 = CaravanEscortTradeEngine.advanceWaypoint(mission, { x: 10, y: 10 }, () => 0.01);
        expect(tick1.isAmbushTriggered).toBe(true);
        expect(tick1.cartRemainingHp).toBe(350);
        expect(mission.cartCurrentHp).toBe(350);

        // WP 2 destination without ambush (350 / 500 = 70% health ratio -> 1400 gold payout)
        const tick2 = CaravanEscortTradeEngine.advanceWaypoint(mission, { x: 20, y: 20 }, () => 0.99);
        expect(tick2.isCompleted).toBe(true);
        expect(tick2.rewardGoldAwarded).toBe(1400); // 2000 * 70%
    });

    it("fails mission when cart health is reduced to 0 by ambush attacks", () => {
        const fragileMission = CaravanEscortTradeEngine.startMission("player_1", mockManifest, mockWaypoints, 100); // Only 100 HP

        // Ambush hits for 150 damage -> cart destroyed
        const tick = CaravanEscortTradeEngine.advanceWaypoint(fragileMission, { x: 10, y: 10 }, () => 0.01);
        expect(tick.isFailed).toBe(true);
        expect(tick.cartRemainingHp).toBe(0);
        expect(fragileMission.isFailed).toBe(true);
        expect(tick.reason).toContain("Caravan cart was destroyed");
    });
});