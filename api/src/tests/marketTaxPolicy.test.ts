import { describe, it, expect } from "vitest";
import { MarketTaxPolicyEngine } from "../lib/marketTaxPolicy.js";

describe("MarketTaxPolicyEngine Bilateral Tax Rates & Mayor Discounts", () => {
    it("applies standard 5% tax for peaceful aligned citizens", () => {
        const res = MarketTaxPolicyEngine.calculateTax({
            cityAlignment: "ORDER_CITIZEN",
            sellerAlignment: "ORDER_CITIZEN",
            buyerAlignment: "ORDER_CITIZEN",
            itemGoldPrice: 1000,
            isSellerInMayorGuild: false,
        });

        expect(res.effectiveTaxRatePercent).toBe(5.0);
        expect(res.taxGoldAmount).toBe(50);
        expect(res.sellerNetYieldGold).toBe(950);
        expect(res.appliedDiscounts.length).toBe(0);
    });

    it("applies 50% mayor guild discount reducing base tax to 2.5%", () => {
        const res = MarketTaxPolicyEngine.calculateTax({
            cityAlignment: "ORDER_CITIZEN",
            sellerAlignment: "ORDER_CITIZEN",
            buyerAlignment: "ORDER_CITIZEN",
            itemGoldPrice: 1000,
            isSellerInMayorGuild: true, // Mayor guild member
        });

        expect(res.effectiveTaxRatePercent).toBe(2.5);
        expect(res.taxGoldAmount).toBe(25);
        expect(res.sellerNetYieldGold).toBe(975);
        expect(res.appliedDiscounts).toContain("Mayor Guild 50% Base Tax Discount");
    });

    it("applies black market surcharge (+15%) for outlaw trades without mayor discount", () => {
        const res = MarketTaxPolicyEngine.calculateTax({
            cityAlignment: "ORDER_CITIZEN",
            sellerAlignment: "CHAOS_OUTLAW", // Outlaw
            buyerAlignment: "ORDER_CITIZEN",
            itemGoldPrice: 1000,
            isSellerInMayorGuild: true, // Mayor discount should NOT reduce black market surcharge
        });

        expect(res.effectiveTaxRatePercent).toBe(20.0); // 5% base + 15% surcharge = 20%
        expect(res.taxGoldAmount).toBe(200);
        expect(res.appliedSurcharges.length).toBe(1);
    });
});