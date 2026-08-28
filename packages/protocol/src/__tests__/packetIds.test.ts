import { describe, it, expect } from "vitest";
import { CLIENT_PACKET_ID, SERVER_PACKET_ID } from "../index";

describe("CLIENT_PACKET_ID", () => {
    it("should have consistent packet IDs for server-to-client messages", () => {
        // Verify a representative sample of packet IDs
        expect(CLIENT_PACKET_ID.getMyCharacter).toBe(1);
        expect(CLIENT_PACKET_ID.getCharacter).toBe(2);
        expect(CLIENT_PACKET_ID.changeRopa).toBe(3);
        expect(CLIENT_PACKET_ID.actPosition).toBe(4);
        expect(CLIENT_PACKET_ID.changeHeading).toBe(5);
        expect(CLIENT_PACKET_ID.deleteCharacter).toBe(6);
        expect(CLIENT_PACKET_ID.dialog).toBe(7);
        expect(CLIENT_PACKET_ID.console).toBe(8);
        expect(CLIENT_PACKET_ID.pong).toBe(9);
        expect(CLIENT_PACKET_ID.animFX).toBe(10);
    });

    it("should have batch packet ID at position 68", () => {
        expect(CLIENT_PACKET_ID.batch).toBe(68);
    });

    it("should have area snapshot packet IDs in sequence", () => {
        expect(CLIENT_PACKET_ID.areaCharactersSnapshot).toBe(72);
        expect(CLIENT_PACKET_ID.areaNpcsSnapshot).toBe(73);
        expect(CLIENT_PACKET_ID.areaItemsSnapshot).toBe(74);
        expect(CLIENT_PACKET_ID.areaMetaSnapshot).toBe(75);
    });

    it("should have 78 total client packet IDs", () => {
        const keys = Object.keys(CLIENT_PACKET_ID);
        expect(keys.length).toBe(78);
    });
});

describe("SERVER_PACKET_ID", () => {
    it("should have consistent packet IDs for client-to-server messages", () => {
        // Verify a representative sample of packet IDs
        expect(SERVER_PACKET_ID.changeHeading).toBe(175);
        expect(SERVER_PACKET_ID.click).toBe(183);
        expect(SERVER_PACKET_ID.ping).toBe(184);
        expect(SERVER_PACKET_ID.position).toBe(176);
        expect(SERVER_PACKET_ID.dialog).toBe(221);
    });

    it("should have attack packet IDs in sequence", () => {
        expect(SERVER_PACKET_ID.attackMele).toBe(229);
        expect(SERVER_PACKET_ID.attackRange).toBe(236);
        expect(SERVER_PACKET_ID.attackSpell).toBe(243);
    });

    it("should have 30 total server packet IDs", () => {
        const keys = Object.keys(SERVER_PACKET_ID);
        expect(keys.length).toBe(30);
    });
});

describe("Packet ID separation", () => {
    it("should have no overlapping IDs between client and server packets", () => {
        const clientIds = new Set(Object.values(CLIENT_PACKET_ID));
        const serverIds = new Set(Object.values(SERVER_PACKET_ID));

        for (const id of serverIds) {
            expect(clientIds.has(id)).toBe(false);
        }
    });

    it("should have client packet IDs below 100 and server above 100", () => {
        const maxClientId = Math.max(...Object.values(CLIENT_PACKET_ID));
        const minServerId = Math.min(...Object.values(SERVER_PACKET_ID));

        expect(maxClientId).toBeLessThan(100);
        expect(minServerId).toBeGreaterThanOrEqual(175);
    });
});
