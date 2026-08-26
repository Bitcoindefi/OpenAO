/**
 * Bitcoindefi/OpenAO - dungeon-instance-key
 */
export function makeDungeonKey(partyId: string, dungeonId: number): string { return `${partyId}_inst_${dungeonId}`; }
