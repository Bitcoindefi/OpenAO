/**
 * Bitcoindefi/OpenAO - day-night-light
 */
export function getAmbientLight(tick: number): number { return (Math.sin(tick * Math.PI / 720) + 1) / 2; }
