import { describe, it, expect } from "vitest";
import { CLIENT_PACKET_ID, SERVER_PACKET_ID } from "../opcodes";
import { PROTOCOL_CONSTANTS, HEADING } from "../constants";

describe("Unified Protocol Serialization & Integrity (Issue #28)", () => {
  it("Opcodes are unique and well-defined across client packets", () => {
    const values = Object.values(CLIENT_PACKET_ID);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("Opcodes are unique and well-defined across server packets", () => {
    const values = Object.values(SERVER_PACKET_ID);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("Constants respect protocol integrity constraints", () => {
    expect(PROTOCOL_CONSTANTS.VISIBLE_TILES_WIDTH).toBe(21);
    expect(PROTOCOL_CONSTANTS.VISIBLE_TILES_HEIGHT).toBe(21);
    expect(PROTOCOL_CONSTANTS.MAP_WIDTH_TILES).toBe(100);
    expect(PROTOCOL_CONSTANTS.MAP_HEIGHT_TILES).toBe(100);
  });

  it("Heading directions cover full cardinal directions", () => {
    expect(HEADING.NORTH).toBe(1);
    expect(HEADING.EAST).toBe(2);
    expect(HEADING.SOUTH).toBe(3);
    expect(HEADING.WEST).toBe(4);
  });
});
