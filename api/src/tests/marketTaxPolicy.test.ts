import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MarketTaxPolicyEngine } from "../lib/marketTaxPolicy.js";

describe("MarketTaxPolicyEngine Refined Bilateral Alignments", () => {
    it("applies allied low tax rate when both buyer and seller are Royal citizens", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "ROYAL_CITIZEN",
            buyerAlignment: "ROYAL_CITIZEN",
            cityJurisdiction: "ROYAL_CAPITAL",
        });

        assert.equal(res.nominalTaxRatePercent, 3.0);
        assert.equal(res.totalTaxPaidGold, 300);
        assert.equal(res.netSellerProceedsGold, 9700);
        assert.equal(res.treasuryDepositGold, 240);
        assert.equal(res.goldSinkBurntGold, 60);
        assert.equal(res.isBlackMarketTariff, false);
    });

    it("triggers black market tariff if either seller or buyer is a Chaos Outlaw in Royal city", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "ROYAL_CITIZEN",
            buyerAlignment: "CHAOS_OUTLAW",
            cityJurisdiction: "ROYAL_CAPITAL",
        });

        assert.equal(res.nominalTaxRatePercent, 15.0);
        assert.equal(res.totalTaxPaidGold, 1500);
        assert.equal(res.isBlackMarketTariff, true);
    });

    it("does NOT allow mayor discount to reduce black market surcharges", () => {
        const res = MarketTaxPolicyEngine.computeMarketTax({
            listingPriceGold: 10000,
            sellerAlignment: "CHAOS_OUTLAW",
            buyerAlignment: "ROYAL_CITIZEN",
            cityJurisdiction: "ROYAL_CAPITAL",
            isMayorGuildMember: true, // Should not halve black market tariff
        });

        assert.equal(res.nominalTaxRatePercent, 15.0);
        assert.equal(res.totalTaxPaidGold, 1500);
        assert.equal(res.isBlackMarketTariff, true);
    });
});