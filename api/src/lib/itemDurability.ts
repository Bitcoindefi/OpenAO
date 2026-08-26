/**
 * Bitcoindefi/OpenAO - item-durability-loss
 */
export function applyHitDurability(durability: number, loss: number = 1): number { return Math.max(0, durability - loss); }
