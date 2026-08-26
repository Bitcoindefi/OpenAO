/**
 * Bitcoindefi/OpenAO - stamina-regeneration
 */
export function updateStamina(current: number, max: number, isResting: boolean): number { return isResting ? Math.min(max, current + 5) : Math.max(0, current - 2); }
