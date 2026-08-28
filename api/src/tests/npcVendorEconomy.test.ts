import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NpcEconomyEngine, NpcVendorState, VendorItemEntry } from "../lib/npcVendorEconomy.js";

describe("Dynamic NPC Vendor Economy Refined", () => {
    const createMockVendor = (): NpcVendorState => {
        const potion: VendorItemEntry = {
            itemId: "health_potion_01",
            basePrice: 50,
            currentStock: 100,
            targetStock: 100,
            priceVolatilityExponent: 0.5,
            restockRatePerTick: 5,
        };
        const vendor = { vendorId: "vendor_city_01", inventory: new Map() };
        vendor.inventory.set("health_potion_01", potion);
        return vendor;
    };

    it("rejects non-positive, non-integer, and oversized quantities", () => {
        const vendor = createMockVendor();
        assert.equal(NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 0).success, false);
        assert.equal(NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", -5).success, false);
        assert.equal(NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 2.5).success, false);
        assert.equal(NpcEconomyEngine.executePlayerSale(vendor, "health_potion_01", 10000).success, false);
    });

    it("strictly prevents buy-and-sell round-trip arbitrage", () => {
        const vendor = createMockVendor();
        
        // Buy 10 items
        const buyRes = NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 10);
        assert.equal(buyRes.success, true);

        // Immediately sell them back
        const sellRes = NpcEconomyEngine.executePlayerSale(vendor, "health_potion_01", 10);
        assert.equal(sellRes.success, true);

        // Player must have spent more than they received
        assert.ok(buyRes.totalCost > sellRes.totalPayout);
    });

    it("gradually recovers stock equilibrium over server ticks", () => {
        const vendor = createMockVendor();
        const item = vendor.inventory.get("health_potion_01")!;

        NpcEconomyEngine.executePlayerPurchase(vendor, "health_potion_01", 100);
        assert.equal(item.currentStock, 0);

        NpcEconomyEngine.tickRestock(vendor);
        assert.equal(item.currentStock, 5);
    });
});