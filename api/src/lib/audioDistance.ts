/**
 * Bitcoindefi/OpenAO - sound-fx-distance
 */
export function calcVolume(dist: number, maxDist: number = 20): number { return Math.max(0, 1 - dist / maxDist); }
