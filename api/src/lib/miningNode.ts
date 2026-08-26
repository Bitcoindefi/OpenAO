/**
 * Bitcoindefi/OpenAO - mining-resource-node
 */
export function mineVein(vein: { oreRemaining: number }): boolean { if (vein.oreRemaining <= 0) return false; vein.oreRemaining--; return true; }
