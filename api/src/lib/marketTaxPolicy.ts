/**
 * City Alignment Market Transaction Tax Policy Engine for OpenAO MMORPG.
 * Computes bilateral buyer/seller alignment tariffs, mayor guild discounts,
 * and immutable black market surcharges.
 */

export type CityAlignment = "ORDER_CITIZEN" | "NEUTRAL_MERCHANT" | "CHAOS_OUTLAW";

export interface TransactionTaxParams {
    cityAlignment: CityAlignment;
    sellerAlignment: CityAlignment;
    buyerAlignment: CityAlignment;
    itemGoldPrice: number;
    isSellerInMayorGuild: boolean;
}

export interface TaxCalculationResult {
    effectiveTaxRatePercent: number; // e.g. 5.0 for 5%
    taxGoldAmount: number;
    sellerNetYieldGold: number;
    appliedDiscounts: string[];
    appliedSurcharges: string[];
}

export class MarketTaxPolicyEngine {
    private static readonly BASE_TAX_RATE = 0.05;          // 5% standard city tax
    private static readonly MAYOR_DISCOUNT = 0.50;         // 50% discount on base tax (tax becomes 2.5%)
    private static readonly BLACK_MARKET_SURCHARGE = 0.15; // +15% surcharge for outlaw / enemy trades

    /**
     * Calculates the tax rate and net proceeds for a market transaction.
     */
    public static calculateTax(params: TransactionTaxParams): TaxCalculationResult {
        const basePrice = Math.max(1, Math.floor(params.itemGoldPrice));
        const appliedDiscounts: string[] = [];
        const appliedSurcharges: string[] = [];

        // Check if trade involves enemy alignment (e.g. Chaos outlaw trading in Order city)
        const isBlackMarketTrade =
            (params.cityAlignment === "ORDER_CITIZEN" && (params.sellerAlignment === "CHAOS_OUTLAW" || params.buyerAlignment === "CHAOS_OUTLAW")) ||
            (params.cityAlignment === "CHAOS_OUTLAW" && (params.sellerAlignment === "ORDER_CITIZEN" || params.buyerAlignment === "ORDER_CITIZEN"));

        let baseRate = this.BASE_TAX_RATE;

        // Apply Mayor discount only to legal aligned trades
        if (params.isSellerInMayorGuild && !isBlackMarketTrade) {
            baseRate *= this.MAYOR_DISCOUNT;
            appliedDiscounts.push("Mayor Guild 50% Base Tax Discount");
        }

        let totalRate = baseRate;

        // Black market tariff cannot be reduced by mayor discount
        if (isBlackMarketTrade) {
            totalRate += this.BLACK_MARKET_SURCHARGE;
            appliedSurcharges.push("Cross-Faction Black Market Surcharge (+15%)");
        }

        const taxGold = Math.max(1, Math.floor(basePrice * totalRate));
        const netYield = Math.max(0, basePrice - taxGold);

        return {
            effectiveTaxRatePercent: Math.round(totalRate * 1000) / 10,
            taxGoldAmount: taxGold,
            sellerNetYieldGold: netYield,
            appliedDiscounts,
            appliedSurcharges,
        };
    }
}