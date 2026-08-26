/**
 * Bitcoindefi/OpenAO - critical-strike
 */
export function calcCrit(agi: number): { chance: number; mult: number } { return { chance: agi * 0.01, mult: 1.5 }; }
