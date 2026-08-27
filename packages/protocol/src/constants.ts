/**
 * OpenAO Protocol Constants & World Constraints
 */

export const PROTOCOL_CONSTANTS = {
  PROTOCOL_VERSION: 1,
  MAX_PACKET_SIZE_BYTES: 65536,
  HEADER_SIZE_BYTES: 2,
  MAX_MESSAGE_LENGTH: 255,
  MAX_NAME_LENGTH: 30,
  VISIBLE_RADIUS_X: 10,
  VISIBLE_RADIUS_Y: 10,
  VISIBLE_TILES_WIDTH: 21,
  VISIBLE_TILES_HEIGHT: 21,
  MAP_WIDTH_TILES: 100,
  MAP_HEIGHT_TILES: 100
} as const;

export const HEADING = {
  NORTH: 1,
  EAST: 2,
  SOUTH: 3,
  WEST: 4
} as const;

export type Heading = typeof HEADING[keyof typeof HEADING];
