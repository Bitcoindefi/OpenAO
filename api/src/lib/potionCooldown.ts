/**
 * Bitcoindefi/OpenAO - Potion Cooldown & Buff Duration Manager
 */
export class PotionCooldownManager {
  private cooldowns = new Map<string, number>();

  public canDrinkPotion(charId: string, now: number = Date.now(), cooldownMs: number = 1500): boolean {
    const lastDrunk = this.cooldowns.get(charId) || 0;
    if (now - lastDrunk < cooldownMs) return false;
    this.cooldowns.set(charId, now);
    return true;
  }
}
