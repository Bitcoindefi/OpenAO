import { describe, it, expect } from "vitest";
import { CLIENT_PACKET_ID, SERVER_PACKET_ID } from "../opcodes";
import { PROTOCOL_CONSTANTS, HEADING } from "../constants";
import {
  ClientWalkPacket,
  ClientTalkPacket,
  ServerChatMessagePacket,
  ServerUserPositionPacket,
} from "../types";

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

  it("Strongly typed packets instantiate and validate correctly", () => {
    const walk: ClientWalkPacket = {
      packetId: CLIENT_PACKET_ID.walk,
      heading: HEADING.NORTH,
    };
    expect(walk.packetId).toBe(4);
    expect(walk.heading).toBe(1);

    const talk: ClientTalkPacket = {
      packetId: CLIENT_PACKET_ID.talk,
      message: "Hello world",
    };
    expect(talk.packetId).toBe(2);
    expect(talk.message).toBe("Hello world");

    const chat: ServerChatMessagePacket = {
      packetId: SERVER_PACKET_ID.chatMessage,
      sender: "System",
      message: "Server rebooting",
      color: "#FFFFFF",
    };
    expect(chat.packetId).toBe(4);

    const pos: ServerUserPositionPacket = {
      packetId: SERVER_PACKET_ID.userPositionUpdate,
      x: 50,
      y: 50,
    };
    expect(pos.packetId).toBe(5);
  });
});