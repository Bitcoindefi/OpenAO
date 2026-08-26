/**
 * Bitcoindefi/OpenAO - fishing-success-rate
 */
export function isFishCaught(skill: number, fishDiff: number): boolean { return skill >= fishDiff && Math.random() > 0.3; }
