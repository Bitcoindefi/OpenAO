/**
 * Dynamic NPC Vendor Supply & Demand Economy Engine for OpenAO MMORPG.
 * Simulates price elasticity based on local stock scarcity, server-tick restocking,
 * and robust anti-arbitrage mathematical pricing.
 */

export interface VendorItemEntry {
    itemId: string;
    basePrice: number;
    currentStock: number;
    targetStock: number;
    priceVolatilityExponent: number; // e.g., 0.5 for square root scaling
    restockRatePerTick: number;
}

export interface NpcVendorState {
    vendorId: string;
    inventory: Map<string, VendorItemEntry>;
}

export class NpcEconomyEngine {
    private static readonly MAX_TRADE_QUANTITY = 5000;
    private static readonly VENDOR_BUY_MARKDOWN = 0.50; // Vendor pays 50% of the item's purchase price

    /**
     * Calculates the unit buy price for a given stock level.
     */
    public static calculateUnitBuyPriceForStock(basePrice: number, targetStock: number, currentStock: number, volatility: number): number {
        const safeStock = Math.max(0, currentStock);
        const supplyRatio = (targetStock + 1) / (safeStock + 1);
        const modifier = Math.pow(supplyRatio, volatility);
        return Math.max(1, Math.ceil(basePrice * modifier));
    }

    /**
     * Calculates the current dynamic price of a single unit of the item based on supply scarcity.
     */
    public static calculateUnitBuyPrice(item: VendorItemEntry): number {
        return this.calculateUnitBuyPriceForStock(
            item.basePrice,
            item.targetStock,
            item.currentStock,
            item.priceVolatilityExponent
        );
    }

    /**
     * Sells price calculates payout using stock after addition with markdown to guarantee zero arbitrage.
     */
    public static calculateUnitSellPrice(item: VendorItemEntry): number {
        // Price evaluated against stock AFTER adding 1 unit
        const buyPriceAtNextStock = this.calculateUnitBuyPriceForStock(
            item.basePrice,
            item.targetStock,
            item.currentStock + 1,
            item.priceVolatilityExponent
        );
        return Math.max(1, Math.floor(buyPriceAtNextStock * this.VENDOR_BUY_MARKDOWN));
    }

    /**
     * Executes a player purchase from the vendor with strict validation.
     */
    public static executePlayerPurchase(
        vendor: NpcVendorState,
        itemId: string,
        quantity: number
    ): { success: boolean; totalCost: number; reason?: string } {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return { success: false, totalCost: 0, reason: "Quantity must be a positive integer" };
        }
        if (quantity > this.MAX_TRADE_QUANTITY) {
            return { success: false, totalCost: 0, reason: "Quantity exceeds maximum batch trade limit" };
        }

        const item = vendor.inventory.get(itemId);
        if (!item) return { success: false, totalCost: 0, reason: "Item not sold by this vendor" };

        if (item.currentStock < quantity) {
            return { success: false, totalCost: 0, reason: "Vendor out of stock" };
        }

        let totalCost = 0;
        for (let i = 0; i < quantity; i++) {
            totalCost += this.calculateUnitBuyPrice(item);
            item.currentStock -= 1;
        }

        return { success: true, totalCost };
    }

    /**
     * Executes a player sale to the vendor with strict validation.
     */
    public static executePlayerSale(
        vendor: NpcVendorState,
        itemId: string,
        quantity: number
    ): { success: boolean; totalPayout: number; reason?: string } {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return { success: false, totalPayout: 0, reason: "Quantity must be a positive integer" };
        }
        if (quantity > this.MAX_TRADE_QUANTITY) {
            return { success: false, totalPayout: 0, reason: "Quantity exceeds maximum batch trade limit" };
        }

        const item = vendor.inventory.get(itemId);
        if (!item) return { success: false, totalPayout: 0, reason: "Vendor does not buy this item" };

        let totalPayout = 0;
        for (let i = 0; i < quantity; i++) {
            totalPayout += this.calculateUnitSellPrice(item);
            item.currentStock += 1;
        }

        return { success: true, totalPayout };
    }

    /**
     * Progresses the server economy tick, pushing current stock towards target equilibrium.
     */
    public static tickRestock(vendor: NpcVendorState): void {
        for (const item of vendor.inventory.values()) {
            if (item.currentStock < item.targetStock) {
                item.currentStock = Math.min(item.targetStock, item.currentStock + item.restockRatePerTick);
            } else if (item.currentStock > item.targetStock) {
                item.currentStock = Math.max(item.targetStock, item.currentStock - item.restockRatePerTick);
            }
        }
    }
}