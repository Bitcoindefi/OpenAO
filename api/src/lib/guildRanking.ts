/**
 * Bitcoindefi/OpenAO - guild-ranking
 */
export function rankGuilds(guilds: Array<{ id: number; score: number }>) { return [...guilds].sort((a,b) => b.score - a.score); }
