/**
 * Bitcoindefi/OpenAO - Trade Escrow Lock
 */
export interface TradeSession {
  tradeId: string;
  senderId: string;
  receiverId: string;
  senderItems: Array<{ itemId: number; count: number }>;
  receiverItems: Array<{ itemId: number; count: number }>;
  senderAccepted: boolean;
  receiverAccepted: boolean;
  lockedAt: number;
}

export function isTradeReadyForSettlement(session: TradeSession, timeoutMs: number = 30000): boolean {
  if (!session.senderAccepted || !session.receiverAccepted) return false;
  const now = Date.now();
  if (now - session.lockedAt > timeoutMs) return false; // expired
  return true;
}
