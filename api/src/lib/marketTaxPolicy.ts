/**
 * City Alignment Market Transaction Tax & Tariff Engine for OpenAO MMORPG.
 * Simulates bilateral faction alignments (buyer & seller), city governance tariffs,
 * black market surcharges, and municipal treasury revenue distribution.
 */

export type CharacterFactionAlignment = "ROYAL_CITIZEN" | "IMPERIAL_LEGION" | "CHAOS_OUTLAW" | "NEUTRAL_NOMAD";
export type CityJurisdiction = "ROYAL_CAPITAL" | "IMPERIAL_STRONGHOLD" | "CHAOS_HAVEN" | "FREE_TRADE_OUTPOST";

export interface MarketTaxCalculationParams {
    listingPriceGold: number;
    sellerAlignment: CharacterFactionAlignment;
    buyerAlignment: CharacterFactionAlignment;
    cityJurisdiction: CityJurisdiction;
    isMayorGuildMember?: boolean; // Ruling guild members get 50% discount on standard taxes
}

export interface MarketTaxCalculationResult {
    listingPriceGold: number;
    nominalTaxRatePercent: number;
    effectiveTaxRatePercent: number;
    totalTaxPaidGold: number;
    netSellerProceedsGold: number;
    treasuryDepositGold: number; // 80% to city vault
    goldSinkBurntGold: number;   // 20% permanently removed from economy
    isBlackMarketTariff: boolean;
}

export class MarketTaxPolicyEngine {
    private static readonly BASE_TAX_ALLIED = 0.03;      // 3%
    private static readonly BASE_TAX_NEUTRAL = 0.06;     // 6%
    private static readonly BASE_TAX_FREE_OUTPOST = 0.04; // 4%
    private static readonly BLACK_MARKET_SURCHARGE = 0.15; // 15% for outlaws or cross-enemy trades in civilized capitals
    private static readonly TREASURY_SHARE = 0.80;       // 80% to city treasury

    public static computeMarketTax(params: MarketTaxCalculationParams): MarketTaxCalculationResult {
        if (!Number.isInteger(params.listingPriceGold) || params.listingPriceGold <= 0) {
            throw new Error("Listing price must be a positive integer");
        }

        const price = params.listingPriceGold;
        let taxRate = this.BASE_TAX_NEUTRAL;
        let isBlackMarket = false;

        if (params.cityJurisdiction === "FREE_TRADE_OUTPOST") {
            taxRate = this.BASE_TAX_FREE_OUTPOST;
        } else if (params.cityJurisdiction === "ROYAL_CAPITAL") {
            if (params.sellerAlignment === "CHAOS_OUTLAW" || params.buyerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BLACK_MARKET_SURCHARGE;
                isBlackMarket = true;
            } else if (params.sellerAlignment === "ROYAL_CITIZEN" && params.buyerAlignment === "ROYAL_CITIZEN") {
                taxRate = this.BASE_TAX_ALLIED;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        } else if (params.cityJurisdiction === "IMPERIAL_STRONGHOLD") {
            if (params.sellerAlignment === "CHAOS_OUTLAW" || params.buyerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BLACK_MARKET_SURCHARGE;
                isBlackMarket = true;
            } else if (params.sellerAlignment === "IMPERIAL_LEGION" && params.buyerAlignment === "IMPERIAL_LEGION") {
                taxRate = this.BASE_TAX_ALLIED;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        } else if (params.cityJurisdiction === "CHAOS_HAVEN") {
            if (params.sellerAlignment === "CHAOS_OUTLAW" && params.buyerAlignment === "CHAOS_OUTLAW") {
                taxRate = this.BASE_TAX_ALLIED;
            } else {
                taxRate = this.BASE_TAX_NEUTRAL;
            }
        }

        // Mayor discount applies ONLY to legitimate trade, never to illicit black market tariffs
        if (params.isMayorGuildMember && !isBlackMarket) {
            taxRate *= 0.50;
        }

        const totalTaxPaid = Math.max(1, Math.ceil(price * taxRate));
        const netSeller = Math.max(0, price - totalTaxPaid);

        const treasuryDeposit = Math.floor(totalTaxPaid * this.TREASURY_SHARE);
        const goldSinkBurnt = totalTaxPaid - treasuryDeposit;

        const effectivePercent = Math.round((totalTaxPaid / price) * 10000) / 100;

        return {
            listingPriceGold: price,
            nominalTaxRatePercent: Math.round(taxRate * 10000) / 100,
            effectiveTaxRatePercent: effectivePercent,
            totalTaxPaidGold: totalTaxPaid,
            netSellerProceedsGold: netSeller,
            treasuryDepositGold: treasuryDeposit,
            goldSinkBurntGold: goldSinkBurnt,
            isBlackMarketTariff: isBlackMarket,
        };
    }
}