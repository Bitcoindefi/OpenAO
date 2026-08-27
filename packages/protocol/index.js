const CLIENT_PACKET_ID = Object.freeze({
    getMyCharacter: 1,
    getCharacter: 2,
    changeRopa: 3,
    actPosition: 4,
    changeHeading: 5,
    deleteCharacter: 6,
    dialog: 7,
    console: 8,
    pong: 9,
    animFX: 10,
    inmo: 11,
    updateHP: 12,
    updateMaxHP: 13,
    updateMana: 14,
    telepMe: 15,
    actOnline: 19,
    consoleOnline: 20,
    actPositionServer: 21,
    actExp: 22,
    actMyLevel: 23,
    actGold: 24,
    actColorName: 25,
    changeHelmet: 26,
    changeWeapon: 27,
    error: 28,
    changeName: 29,
    getNpc: 30,
    changeShield: 31,
    putBodyAndHeadDead: 32,
    revivirUsuario: 33,
    quitarUserInvItem: 34,
    renderItem: 35,
    deleteItem: 36,
    agregarUserInvItem: 37,
    changeArrow: 38,
    blockMap: 39,
    changeObjIndex: 40,
    openTrade: 41,
    aprenderSpell: 42,
    closeForce: 43,
    nameMap: 44,
    changeBody: 45,
    navegando: 46,
    updateAgilidad: 47,
    updateFuerza: 48,
    playSound: 49,
    openBail: 50,
    closeBail: 51,
    openAdminIntervals: 52,
    panelSnapshot: 53,
    panelSnapshotChunk: 54,
    partyState: 55,
    clanState: 56,
    characterStatsSnapshot: 57,
    characterStatsSnapshotChunk: 58,
    startCastBar: 59,
    stopCastBar: 60,
    openCrafting: 61,
    closeTrade: 62,
    openMarket: 63,
    openRetos: 64,
    createProjectile: 65,
    spellProjectile: 66,
    globalNotice: 67,
    batch: 68,
    tInmo: 69,
    tUpdateHP: 70,
    tUpdateMana: 71,
    areaCharactersSnapshot: 72,
    areaNpcsSnapshot: 73,
    areaItemsSnapshot: 74,
    areaMetaSnapshot: 75,
    moveEntity: 76,
    selfFlagsDelta: 77,
    selfVitalsDelta: 78,
    selfMapMetaDelta: 79,
    spellVisual: 80,
    entityVitalsDelta: 81,
});

const SERVER_PACKET_ID = Object.freeze({
    changeHeading: 175,
    click: 183,
    useItemClick: 197,
    equiparItem: 210,
    connectCharacter: 212,
    position: 176,
    dialog: 221,
    ping: 184,
    attackMele: 229,
    attackRange: 236,
    attackSpell: 243,
    tirarItem: 200,
    agarrarItem: 205,
    buyItem: 214,
    sellItem: 222,
    resyncPosition: 187,
    changeSeguro: 196,
    reorderSpell: 228,
    reorderInventoryItem: 235,
    toggleHiddenSkill: 244,
    useItemU: 203,
    changeClanSeguro: 209,
    craftItem: 246,
    reorderBankItem: 230,
    changeBankTab: 216,
    depositBankGold: 224,
    withdrawBankGold: 237,
    closeTrade: 190,
    marketAction: 239,
    retosAction: 248,
});

const PROTOCOL_LIMITS = Object.freeze({
    mapMinCoordinate: 1,
    mapMaxCoordinate: 100,
    clientViewRangeX: 10,
    clientViewRangeY: 10,
    clientViewExtraBottomY: 1,
    areaVisionWidth: 31,
    areaVisionHeight: 31,
    areaVisionRangeX: 15,
    areaVisionRangeY: 15,
});

const FIELD_KIND = Object.freeze({
    byte: "byte",
    short: "short",
    int: "int",
    string: "string",
});

const SERVER_PACKET_SCHEMA = deepFreeze({
    changeHeading: {
        packetId: SERVER_PACKET_ID.changeHeading,
        fields: [{ name: "heading", kind: FIELD_KIND.byte }],
    },
    click: {
        packetId: SERVER_PACKET_ID.click,
        fields: [
            { name: "x", kind: FIELD_KIND.byte },
            { name: "y", kind: FIELD_KIND.byte },
            { name: "button", kind: FIELD_KIND.byte },
        ],
    },
    useItemClick: {
        packetId: SERVER_PACKET_ID.useItemClick,
        fields: [{ name: "slot", kind: FIELD_KIND.int }],
    },
    equiparItem: {
        packetId: SERVER_PACKET_ID.equiparItem,
        fields: [{ name: "slot", kind: FIELD_KIND.int }],
    },
    connectCharacter: {
        packetId: SERVER_PACKET_ID.connectCharacter,
        fields: [
            { name: "ticket", kind: FIELD_KIND.string },
            { name: "typeGame", kind: FIELD_KIND.byte },
            { name: "idChar", kind: FIELD_KIND.byte },
        ],
    },
    position: {
        packetId: SERVER_PACKET_ID.position,
        fields: [
            { name: "heading", kind: FIELD_KIND.byte },
            { name: "moveId", kind: FIELD_KIND.int },
        ],
    },
    dialog: {
        packetId: SERVER_PACKET_ID.dialog,
        fields: [{ name: "message", kind: FIELD_KIND.string }],
    },
    ping: {
        packetId: SERVER_PACKET_ID.ping,
        fields: [{ name: "token", kind: FIELD_KIND.int }],
    },
    attackMele: {
        packetId: SERVER_PACKET_ID.attackMele,
        fields: [],
    },
    attackRange: {
        packetId: SERVER_PACKET_ID.attackRange,
        fields: [
            { name: "x", kind: FIELD_KIND.byte },
            { name: "y", kind: FIELD_KIND.byte },
        ],
    },
    attackSpell: {
        packetId: SERVER_PACKET_ID.attackSpell,
        fields: [
            { name: "spellSlot", kind: FIELD_KIND.byte },
            { name: "x", kind: FIELD_KIND.byte },
            { name: "y", kind: FIELD_KIND.byte },
            { name: "preferSelfIfEmpty", kind: FIELD_KIND.byte },
        ],
    },
    tirarItem: {
        packetId: SERVER_PACKET_ID.tirarItem,
        fields: [
            { name: "slot", kind: FIELD_KIND.int },
            { name: "amount", kind: FIELD_KIND.short },
        ],
    },
    agarrarItem: {
        packetId: SERVER_PACKET_ID.agarrarItem,
        fields: [],
    },
    buyItem: {
        packetId: SERVER_PACKET_ID.buyItem,
        fields: [
            { name: "slot", kind: FIELD_KIND.byte },
            { name: "amount", kind: FIELD_KIND.short },
        ],
    },
    sellItem: {
        packetId: SERVER_PACKET_ID.sellItem,
        fields: [
            { name: "slot", kind: FIELD_KIND.byte },
            { name: "amount", kind: FIELD_KIND.short },
        ],
    },
    resyncPosition: {
        packetId: SERVER_PACKET_ID.resyncPosition,
        fields: [],
    },
    changeSeguro: {
        packetId: SERVER_PACKET_ID.changeSeguro,
        fields: [],
    },
    reorderSpell: {
        packetId: SERVER_PACKET_ID.reorderSpell,
        fields: [
            { name: "sourceSlot", kind: FIELD_KIND.byte },
            { name: "targetSlot", kind: FIELD_KIND.byte },
        ],
    },
    reorderInventoryItem: {
        packetId: SERVER_PACKET_ID.reorderInventoryItem,
        fields: [
            { name: "sourceSlot", kind: FIELD_KIND.byte },
            { name: "targetSlot", kind: FIELD_KIND.byte },
        ],
    },
    toggleHiddenSkill: {
        packetId: SERVER_PACKET_ID.toggleHiddenSkill,
        fields: [],
    },
    useItemU: {
        packetId: SERVER_PACKET_ID.useItemU,
        fields: [{ name: "slot", kind: FIELD_KIND.int }],
    },
    changeClanSeguro: {
        packetId: SERVER_PACKET_ID.changeClanSeguro,
        fields: [],
    },
    craftItem: {
        packetId: SERVER_PACKET_ID.craftItem,
        fields: [
            { name: "profession", kind: FIELD_KIND.byte },
            { name: "itemId", kind: FIELD_KIND.int },
            { name: "amount", kind: FIELD_KIND.short },
        ],
    },
    reorderBankItem: {
        packetId: SERVER_PACKET_ID.reorderBankItem,
        fields: [
            { name: "sourceSlot", kind: FIELD_KIND.byte },
            { name: "targetSlot", kind: FIELD_KIND.byte },
        ],
    },
    changeBankTab: {
        packetId: SERVER_PACKET_ID.changeBankTab,
        fields: [{ name: "tab", kind: FIELD_KIND.byte }],
    },
    depositBankGold: {
        packetId: SERVER_PACKET_ID.depositBankGold,
        fields: [{ name: "amount", kind: FIELD_KIND.int }],
    },
    withdrawBankGold: {
        packetId: SERVER_PACKET_ID.withdrawBankGold,
        fields: [{ name: "amount", kind: FIELD_KIND.int }],
    },
    closeTrade: {
        packetId: SERVER_PACKET_ID.closeTrade,
        fields: [],
    },
    marketAction: {
        packetId: SERVER_PACKET_ID.marketAction,
        fields: [{ name: "payload", kind: FIELD_KIND.string }],
    },
    retosAction: {
        packetId: SERVER_PACKET_ID.retosAction,
        fields: [{ name: "payload", kind: FIELD_KIND.string }],
    },
});

function deepFreeze(value) {
    Object.freeze(value);

    for (const child of Object.values(value)) {
        if (child && typeof child === "object" && !Object.isFrozen(child)) {
            deepFreeze(child);
        }
    }

    return value;
}

function normalizeNumericInput(value) {
    if (value === true) {
        return 1;
    }

    if (value === false || value == null || value === "") {
        return 0;
    }

    return Number.parseInt(String(value), 10) || 0;
}

class ProtocolWriter {
    constructor(packetId) {
        this.bytes = [];
        this.encoder = new TextEncoder();
        this.writeByte(packetId);
    }

    writeByte(value) {
        this.bytes.push(normalizeNumericInput(value) & 0xff);
    }

    writeShort(value) {
        const normalized = normalizeNumericInput(value);
        this.bytes.push(normalized & 0xff, (normalized >> 8) & 0xff);
    }

    writeInt(value) {
        const normalized = normalizeNumericInput(value);
        this.bytes.push(
            normalized & 0xff,
            (normalized >> 8) & 0xff,
            (normalized >> 16) & 0xff,
            (normalized >> 24) & 0xff,
        );
    }

    writeString(value) {
        const normalized = value == null ? "" : String(value);
        const encoded = this.encoder.encode(normalized);
        this.writeShort(Array.from(normalized).length);
        for (const byte of encoded) {
            this.bytes.push(byte);
        }
    }

    toArrayBuffer() {
        return Uint8Array.from(this.bytes).buffer;
    }
}

class ProtocolReader {
    constructor(buffer) {
        this.view = new DataView(toArrayBuffer(buffer));
        this.offset = 0;
        this.decoder = new TextDecoder();
    }

    getByte() {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    getShort() {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    getInt() {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getString() {
        const charLength = this.getShort();
        const byteLength = this.getUtf8ByteLength(charLength);
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, byteLength);
        this.offset += byteLength;
        return this.decoder.decode(bytes);
    }

    getUtf8ByteLength(charLength) {
        let byteLength = 0;
        let charactersRead = 0;

        while (charactersRead < charLength) {
            const currentByte = this.view.getUint8(this.offset + byteLength);

            if ((currentByte & 0x80) === 0) {
                byteLength += 1;
            } else if ((currentByte & 0xe0) === 0xc0) {
                byteLength += 2;
            } else if ((currentByte & 0xf0) === 0xe0) {
                byteLength += 3;
            } else if ((currentByte & 0xf8) === 0xf0) {
                byteLength += 4;
            } else {
                throw new Error("Invalid UTF-8 sequence in protocol string.");
            }

            charactersRead += 1;
        }

        return byteLength;
    }
}

function getServerPacketSchema(packetName) {
    const schema = SERVER_PACKET_SCHEMA[packetName];

    if (!schema) {
        throw new Error(`Unknown server packet schema: ${packetName}`);
    }

    return schema;
}

function writeField(writer, kind, value) {
    switch (kind) {
        case FIELD_KIND.byte:
            writer.writeByte(value);
            return;
        case FIELD_KIND.short:
            writer.writeShort(value);
            return;
        case FIELD_KIND.int:
            writer.writeInt(value);
            return;
        case FIELD_KIND.string:
            writer.writeString(value);
            return;
        default:
            throw new Error(`Unsupported protocol field kind: ${kind}`);
    }
}

function readField(reader, kind) {
    switch (kind) {
        case FIELD_KIND.byte:
            return reader.getByte();
        case FIELD_KIND.short:
            return reader.getShort();
        case FIELD_KIND.int:
            return reader.getInt();
        case FIELD_KIND.string:
            return reader.getString();
        default:
            throw new Error(`Unsupported protocol field kind: ${kind}`);
    }
}

function encodeServerPacket(packetName, payload = {}) {
    const schema = getServerPacketSchema(packetName);
    const writer = new ProtocolWriter(schema.packetId);

    for (const field of schema.fields) {
        writeField(writer, field.kind, payload[field.name]);
    }

    return writer.toArrayBuffer();
}

function decodeServerPacket(packetName, buffer) {
    const schema = getServerPacketSchema(packetName);
    const reader = new ProtocolReader(buffer);
    const packetId = reader.getByte();

    if (packetId !== schema.packetId) {
        throw new Error(`Expected packet ${schema.packetId} for ${packetName}, received ${packetId}.`);
    }

    const payload = {};

    for (const field of schema.fields) {
        payload[field.name] = readField(reader, field.kind);
    }

    return payload;
}

function readPacketId(buffer) {
    return new ProtocolReader(buffer).getByte();
}

function toArrayBuffer(buffer) {
    if (buffer instanceof ArrayBuffer) {
        return buffer;
    }

    if (ArrayBuffer.isView(buffer)) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    throw new TypeError("Expected an ArrayBuffer or ArrayBuffer view.");
}

module.exports = {
    CLIENT_PACKET_ID,
    SERVER_PACKET_ID,
    PROTOCOL_LIMITS,
    FIELD_KIND,
    SERVER_PACKET_SCHEMA,
    encodeServerPacket,
    decodeServerPacket,
    getServerPacketSchema,
    readPacketId,
};
