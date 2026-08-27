/**
 * OpenAO Standard Strongly-Typed Packet Interfaces
 */

import { ClientPacketId, ServerPacketId } from "./opcodes";
import { Heading } from "./constants";

export interface Position {
  x: number;
  y: number;
  map?: number;
}

export interface CharacterStats {
  minHp: number;
  maxHp: number;
  minMana: number;
  maxMana: number;
  minSta: number;
  maxSta: number;
  gold: number;
  level: number;
  exp: number;
  expNextLevel: number;
}

export interface ClientWalkPacket {
  packetId: ClientPacketId;
  heading: Heading;
}

export interface ClientTalkPacket {
  packetId: ClientPacketId;
  message: string;
}

export interface ServerChatMessagePacket {
  packetId: ServerPacketId;
  sender: string;
  message: string;
  color: string;
}

export interface ServerUserPositionPacket {
  packetId: ServerPacketId;
  x: number;
  y: number;
}