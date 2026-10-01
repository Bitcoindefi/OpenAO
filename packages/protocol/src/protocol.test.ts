import { describe, expect, it } from "vitest";
import {
    CLIENT_PACKET_ID,
    SERVER_PACKET_ID,
    PacketReader,
    PacketWriter,
    decodeClientPacket,
    encodeClientPacket,
    type ClientPacketPayloads,
    type ServerPacketName,
} from "./index.js";

const fixtures = {
    changeHeading: { heading: 3 },
    click: { x: 42, y: 67, button: 1 },
    useItemClick: { slot: 18 },
    equiparItem: { slot: 7 },
    connectCharacter: { ticket: "sesión-🦊", typeGame: 1, idChar: 2 },
    position: { heading: 4, moveId: 4_294_000_000 },
    dialog: { message: "¡Hola, Argentum!" },
    ping: { token: 123_456 },
    attackMele: undefined,
    attackRange: { x: 55, y: 44 },
    attackSpell: { spellSlot: 8, x: 51, y: 49, preferSelfIfEmpty: true },
    tirarItem: { slot: 12, amount: 500 },
    agarrarItem: undefined,
    buyItem: { slot: 4, amount: 25 },
    sellItem: { slot: 9, amount: 13 },
    resyncPosition: undefined,
    changeSeguro: undefined,
    reorderSpell: { sourceSlot: 1, targetSlot: 10 },
    reorderInventoryItem: { sourceSlot: 2, targetSlot: 11 },
    toggleHiddenSkill: undefined,
    useItemU: { slot: 20 },
    changeClanSeguro: undefined,
    craftItem: { profession: "tailoring", itemId: 402, amount: 6 },
    reorderBankItem: { sourceSlot: 3, targetSlot: 12 },
    changeBankTab: { tab: "clan" },
    depositBankGold: { amount: 2_000_000 },
    withdrawBankGold: { amount: 750_000 },
    closeTrade: undefined,
    marketAction: { action: "buy", listingId: "listing-7", expectedPrice: 350 },
    retosAction: { action: "join", challengeId: "challenge-2" },
} satisfies { [K in ServerPacketName]: ClientPacketPayloads[K] };

describe("packet opcodes", () => {
    it("keeps every opcode unique within its direction", () => {
        const clientIds = Object.values(CLIENT_PACKET_ID);
        const serverIds = Object.values(SERVER_PACKET_ID);

        expect(new Set(clientIds).size).toBe(clientIds.length);
        expect(new Set(serverIds).size).toBe(serverIds.length);
    });

    it("has a round-trip fixture for every client-to-server packet", () => {
        expect(Object.keys(fixtures).sort()).toEqual(Object.keys(SERVER_PACKET_ID).sort());
    });
});

describe("client-to-server packet round trips", () => {
    const encode = encodeClientPacket as (type: ServerPacketName, payload?: unknown) => Uint8Array;

    for (const type of Object.keys(fixtures) as ServerPacketName[]) {
        it(`round-trips ${type}`, () => {
            const payload = fixtures[type];
            const encoded = encode(type, payload);
            const decoded = decodeClientPacket(encoded);

            expect(encoded).toMatchSnapshot();
            expect(decoded.type).toBe(type);
            expect(decoded.id).toBe(SERVER_PACKET_ID[type]);
            expect(decoded.payload).toEqual(payload);
        });
    }
});

describe("binary primitives", () => {
    it("round-trips every primitive and preserves Unicode character lengths", () => {
        const writer = new PacketWriter();
        writer.writeByte(255);
        writer.writeByte(-12, true);
        writer.writeShort(65_535);
        writer.writeShort(-12_345, true);
        writer.writeInt(4_294_967_295);
        writer.writeInt(-123_456_789, true);
        writer.writeFloat(123.5);
        writer.writeDouble(Math.PI);
        writer.writeString("áéí 🦊");

        const reader = new PacketReader(writer.toUint8Array());
        expect(reader.getByte()).toBe(255);
        expect(reader.getByte(true)).toBe(-12);
        expect(reader.getShort()).toBe(65_535);
        expect(reader.getShort(true)).toBe(-12_345);
        expect(reader.getInt()).toBe(4_294_967_295);
        expect(reader.getInt(true)).toBe(-123_456_789);
        expect(reader.getFloat()).toBe(123.5);
        expect(reader.getDouble()).toBe(Math.PI);
        expect(reader.getString()).toBe("áéí 🦊");
        expect(reader.remainingBytes).toBe(0);
    });

    it("rejects unknown, truncated, and trailing packet bytes", () => {
        expect(() => decodeClientPacket(Uint8Array.of(255))).toThrow(/Unknown/);
        expect(() => decodeClientPacket(Uint8Array.of(SERVER_PACKET_ID.position, 1))).toThrow(/Cannot read/);

        const valid = encodeClientPacket("changeHeading", { heading: 2 });
        expect(() => decodeClientPacket(Uint8Array.from([...valid, 99]))).toThrow(/trailing bytes/);
    });
});
