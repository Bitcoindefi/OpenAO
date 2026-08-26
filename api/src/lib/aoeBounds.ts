/**
 * Bitcoindefi/OpenAO - aoe-spell-bounds
 */
export function isInsideAoe(cx: number, cy: number, r: number, x: number, y: number): boolean { return ((x-cx)**2 + (y-cy)**2) <= r**2; }
