import { describe, it, expect } from "vitest";
import { AmmLiquidityPoolEngine } from "../lib/ammLiquidityPool.js";

describe("AmmLiquidityPoolEngine Integer Precision & AMM Constant Invariant", () => {
    it("initializes pool with exact constant product k", () => {
        const pool = AmmLiquidityPoolEngine.createPool("pool_iron", "iron_ore", 10000, 1000, 30);
        expect(pool.reserveGold).toBe(10000);
        expect(pool.reserveMaterial).toBe(1000);
        expect(pool.k).toBe(10000000);
        expect(pool.totalLpTokens).toBe(3162); // sqrt(10,000,000)
    });

    it("calculates buy quote and enforces integer output yields", () => {
        const pool = AmmLiquidityPoolEngine.createPool("pool_iron", "iron_ore", 10000, 1000, 30);
        const quote = AmmLiquidityPoolEngine.getBuyQuote(pool, 1000); // Pay 1000 gold

        expect(Number.isInteger(quote.amountOut)).toBe(true);
        expect(quote.amountOut).toBeGreaterThan(0);
        expect(quote.feePaid).toBe(3); // 1000 * 30 / 10000 = 3 gold fee
    });

    it("calculates sell quote and deducts trading fees", () => {
        const pool = AmmLiquidityPoolEngine.createPool("pool_iron", "iron_ore", 10000, 1000, 30);
        const quote = AmmLiquidityPoolEngine.getSellQuote(pool, 100); // Sell 100 ore

        expect(Number.isInteger(quote.amountOut)).toBe(true);
        expect(quote.amountOut).toBeGreaterThan(0);
        expect(quote.priceImpactPercent).toBeGreaterThan(0);
    });
});