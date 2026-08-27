import assert from "node:assert/strict";
import protocol from "../index.js";

const {
    SERVER_PACKET_ID,
    SERVER_PACKET_SCHEMA,
    PROTOCOL_LIMITS,
    encodeServerPacket,
    decodeServerPacket,
    readPacketId,
} = protocol;

const samplePayloads = {
    changeHeading: { heading: 3 },
    click: { x: 44, y: 55, button: 1 },
    useItemClick: { slot: 9 },
    equiparItem: { slot: 2 },
    connectCharacter: { ticket: "ticket-nandu-42", typeGame: 1, idChar: 7 },
    position: { heading: 2, moveId: 1024 },
    dialog: { message: "hola \u00f1andu" },
    ping: { token: 123456 },
    attackMele: {},
    attackRange: { x: 48, y: 49 },
    attackSpell: { spellSlot: 6, x: 50, y: 51, preferSelfIfEmpty: 1 },
    tirarItem: { slot: 4, amount: 25 },
    agarrarItem: {},
    buyItem: { slot: 3, amount: 12 },
    sellItem: { slot: 5, amount: 8 },
    resyncPosition: {},
    changeSeguro: {},
    reorderSpell: { sourceSlot: 2, targetSlot: 6 },
    reorderInventoryItem: { sourceSlot: 1, targetSlot: 8 },
    toggleHiddenSkill: {},
    useItemU: { slot: 10 },
    changeClanSeguro: {},
    craftItem: { profession: 1, itemId: 402, amount: 3 },
    reorderBankItem: { sourceSlot: 2, targetSlot: 7 },
    changeBankTab: { tab: 2 },
    depositBankGold: { amount: 1500 },
    withdrawBankGold: { amount: 900 },
    closeTrade: {},
    marketAction: { payload: JSON.stringify({ action: "refresh" }) },
    retosAction: { payload: JSON.stringify({ action: "join", id: 4 }) },
};

for (const [packetName, packetId] of Object.entries(SERVER_PACKET_ID)) {
    assert.ok(SERVER_PACKET_SCHEMA[packetName], `${packetName} has a shared schema`);

    const encoded = encodeServerPacket(packetName, samplePayloads[packetName]);
    assert.equal(readPacketId(encoded), packetId, `${packetName} writes its shared opcode`);
    assert.deepEqual(decodeServerPacket(packetName, encoded), samplePayloads[packetName]);
}

assert.deepEqual(PROTOCOL_LIMITS.clientViewRangeX, 10);
assert.deepEqual(PROTOCOL_LIMITS.clientViewRangeY, 10);
assert.deepEqual(PROTOCOL_LIMITS.clientViewExtraBottomY, 1);
