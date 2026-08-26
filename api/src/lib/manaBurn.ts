/**
 * Bitcoindefi/OpenAO - mana-burn
 */
export function calcManaBurn(mana: number, drain: number): { burned: number; dmg: number } { const b = Math.min(mana, drain); return { burned: b, dmg: b * 0.8 }; }
