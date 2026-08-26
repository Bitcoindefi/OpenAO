/**
 * Bitcoindefi/OpenAO - Inventory Weight & Capacity Calculator
 */
export function calculateMaxWeightCapacity(strength: number, baseCapacity: number = 50): number {
  const safeStrength = Math.max(1, Math.min(50, Math.floor(strength)));
  return Math.floor(baseCapacity + (safeStrength * 10.5));
}

export function isInventoryOverburdened(currentWeight: number, strength: number): boolean {
  return currentWeight > calculateMaxWeightCapacity(strength);
}
