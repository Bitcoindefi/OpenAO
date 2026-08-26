/**
 * Bitcoindefi/OpenAO - resurrection-timer
 */
export function getResSicknessDuration(level: number): number { return Math.max(5, level * 2); }
