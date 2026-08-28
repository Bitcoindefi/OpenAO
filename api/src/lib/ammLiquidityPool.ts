/**
 * Automated Market Maker (AMM) Constant Product (x * y = k) Liquidity Pool Engine for OpenAO.
 * Simulates decentralized barter/trading of raw crafting materials against Gold coins
 * with integer precision clamping, slippage calculation, and liquidity provider share minting.
 */

export interface LiquidityPool {
    poolId: string;
    materialId: string;
    reserveGold: number;     // Integer gold reserve (x)
    reserveMaterial: number; // Integer material units reserve (y)
    k: number;               // Constant product invariant = x * y
    feeBps: number;          // Trading fee in basis points (e.g. 30 = 0.3%)
    totalLpTokens: number;
}

export interface SwapQuote {
    amountIn: number;
    amountOut: number;
    feePaid: number;
    priceImpactPercent: number;
    effectivePricePerUnit: number;
    newReserveGold: number;
    newReserveMaterial: number;
}

export class AmmLiquidityPoolEngine {
    private static readonly BPS_DIVISOR = 10000;

    /**
     * Initializes a constant-product liquidity pool with integer balance validation.
     */
    public static createPool(
        poolId: string,
        materialId: string,
        initialGold: number,
        initialMaterial: number,
        feeBps = 30
    ): LiquidityPool {
        const gold = Math.max(1, Math.floor(initialGold));
        const material = Math.max(1, Math.floor(initialMaterial));
        const k = gold * material;

        return {
            poolId,
            materialId,
            reserveGold: gold,
            reserveMaterial: material,
            k,
            feeBps: Math.min(1000, Math.max(0, feeBps)),
            totalLpTokens: Math.floor(Math.sqrt(k)),
        };
    }

    /**
     * Calculates output material received for a given amount of gold paid (Buy Material).
     */
    public static getBuyQuote(pool: LiquidityPool, goldPaid: number): SwapQuote {
        const safeGoldIn = Math.max(1, Math.floor(goldPaid));
        const fee = Math.floor((safeGoldIn * pool.feeBps) / this.BPS_DIVISOR);
        const goldAfterFee = safeGoldIn - fee;

        const spotPrice = pool.reserveGold / pool.reserveMaterial;
        const newGoldReserve = pool.reserveGold + goldAfterFee;
        const newMaterialReserve = Math.floor(pool.k / newGoldReserve);
        const materialOut = Math.max(0, pool.reserveMaterial - newMaterialReserve);

        const effectivePrice = safeGoldIn / Math.max(1, materialOut);
        const priceImpact = ((effectivePrice - spotPrice) / spotPrice) * 100;

        return {
            amountIn: safeGoldIn,
            amountOut: materialOut,
            feePaid: fee,
            priceImpactPercent: Math.round(Math.max(0, priceImpact) * 100) / 100,
            effectivePricePerUnit: Math.round(effectivePrice * 100) / 100,
            newReserveGold: pool.reserveGold + safeGoldIn,
            newReserveMaterial: newMaterialReserve,
        };
    }

    /**
     * Calculates output gold received for a given amount of material sold (Sell Material).
     */
    public static getSellQuote(pool: LiquidityPool, materialSold: number): SwapQuote {
        const safeMaterialIn = Math.max(1, Math.floor(materialSold));
        const spotPrice = pool.reserveGold / pool.reserveMaterial;

        const newMaterialReserve = pool.reserveMaterial + safeMaterialIn;
        const newGoldReserve = Math.floor(pool.k / newMaterialReserve);
        const rawGoldOut = Math.max(0, pool.reserveGold - newGoldReserve);

        const fee = Math.floor((rawGoldOut * pool.feeBps) / this.BPS_DIVISOR);
        const goldYield = Math.max(0, rawGoldOut - fee);

        const effectivePrice = goldYield / safeMaterialIn;
        const priceImpact = ((spotPrice - effectivePrice) / spotPrice) * 100;

        return {
            amountIn: safeMaterialIn,
            amountOut: goldYield,
            feePaid: fee,
            priceImpactPercent: Math.round(Math.max(0, priceImpact) * 100) / 100,
            effectivePricePerUnit: Math.round(effectivePrice * 100) / 100,
            newReserveGold: pool.reserveGold - goldYield,
            newReserveMaterial: newMaterialReserve,
        };
    }
}