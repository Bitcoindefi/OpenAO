/**
 * Bitcoindefi/OpenAO - armor-penetration
 */
export function applyArmorPen(armor: number, pen: number): number { return Math.max(0, armor - pen); }
