/**
 * Bitcoindefi/OpenAO - market-tax-rate
 */
export function calcMarketTax(price: number, taxRate: number = 0.05): number { return Math.ceil(price * taxRate); }
