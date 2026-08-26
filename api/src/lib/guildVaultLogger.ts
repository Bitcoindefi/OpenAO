/**
 * Bitcoindefi/OpenAO - Guild Vault Transaction Logger
 */
export interface VaultTransaction {
  guildId: number;
  userId: string;
  action: 'deposit' | 'withdraw';
  itemId?: number;
  goldAmount?: number;
  timestamp: number;
}

export function validateVaultTransaction(tx: Partial<VaultTransaction>): { valid: boolean; reason?: string } {
  if (!tx.guildId || tx.guildId <= 0) return { valid: false, reason: 'Invalid guildId' };
  if (!tx.userId || tx.userId.trim() === '') return { valid: false, reason: 'Invalid userId' };
  if (tx.action !== 'deposit' && tx.action !== 'withdraw') return { valid: false, reason: 'Invalid action' };
  if ((!tx.itemId || tx.itemId <= 0) && (!tx.goldAmount || tx.goldAmount <= 0)) {
    return { valid: false, reason: 'Must specify item or gold amount' };
  }
  return { valid: true };
}
