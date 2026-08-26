/**
 * Bitcoindefi/OpenAO - Chat Flood Rate Limiter
 */
export class ChatRateLimiter {
  private userMessageTimestamps = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number = 5000,
    private readonly maxMessagesPerWindow: number = 5
  ) {}

  public canSendMessage(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const timestamps = (this.userMessageTimestamps.get(userId) || []).filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxMessagesPerWindow) {
      return { allowed: false, remaining: 0 };
    }

    timestamps.push(now);
    this.userMessageTimestamps.set(userId, timestamps);
    return { allowed: true, remaining: this.maxMessagesPerWindow - timestamps.length };
  }
}
