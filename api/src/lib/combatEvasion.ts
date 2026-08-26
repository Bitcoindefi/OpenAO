/**
 * Bitcoindefi/OpenAO - combat-evasion
 */
export function calcEvasion(dex: number): number { return Math.min(0.75, dex * 0.015); }
