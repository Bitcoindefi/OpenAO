/**
 * OpenAO Standard Binary Protocol Opcodes & Message IDs
 * Resolves Issue #28: Unified protocol definitions between client and server
 */

export const CLIENT_PACKET_ID = {
  login: 1,
  talk: 2,
  whisper: 3,
  walk: 4,
  requestPositionUpdate: 5,
  attack: 6,
  castSpell: 7,
  useItem: 8,
  equipItem: 9,
  dropItem: 10,
  pickUpItem: 11,
  buyItem: 12,
  sellItem: 13,
  meditate: 14,
  rest: 15,
  toggleSafe: 16,
  ping: 17,
  pong: 18,
  adminCommand: 19,
  interactNpc: 20
} as const;

export type ClientPacketId = typeof CLIENT_PACKET_ID[keyof typeof CLIENT_PACKET_ID];

export const SERVER_PACKET_ID = {
  logged: 1,
  disconnect: 2,
  consoleMessage: 3,
  chatMessage: 4,
  userPositionUpdate: 5,
  userStatsUpdate: 6,
  userInventoryUpdate: 7,
  userSpellsUpdate: 8,
  areaCharacterCreate: 9,
  areaCharacterRemove: 10,
  areaCharacterMove: 11,
  areaItemCreate: 12,
  areaItemRemove: 13,
  areaSoundFx: 14,
  areaVisualFx: 15,
  ping: 16,
  pong: 17,
  error: 18,
  dialogBubble: 19,
  castBarUpdate: 20
} as const;

export type ServerPacketId = typeof SERVER_PACKET_ID[keyof typeof SERVER_PACKET_ID];
