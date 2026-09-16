import { PacketReader, PacketWriter, type BinaryInput } from "./binary.js";
import { SERVER_PACKET_ID, type ServerPacketName } from "./opcodes.js";

export type MarketAction = "refresh" | "create" | "buy" | "cancel" | "claim";
export type RetosAction = "refresh" | "create" | "join" | "cancel";
export type CraftingProfession = "carpentry" | "blacksmith" | "tailoring";
export type BankTab = "character" | "account" | "clan";

export type MarketActionPayload = { action: MarketAction } & Record<string, unknown>;
export type RetosActionPayload = { action: RetosAction } & Record<string, unknown>;

export type ClientPacketPayloads = {
    changeHeading: { heading: number };
    click: { x: number; y: number; button: number };
    useItemClick: { slot: number };
    equiparItem: { slot: number };
    connectCharacter: { ticket: string; typeGame: number; idChar: number };
    position: { heading: number; moveId: number };
    dialog: { message: string };
    ping: { token: number };
    attackMele: undefined;
    attackRange: { x: number; y: number };
    attackSpell: { spellSlot: number; x: number; y: number; preferSelfIfEmpty: boolean };
    tirarItem: { slot: number; amount: number };
    agarrarItem: undefined;
    buyItem: { slot: number; amount: number };
    sellItem: { slot: number; amount: number };
    resyncPosition: undefined;
    changeSeguro: undefined;
    reorderSpell: { sourceSlot: number; targetSlot: number };
    reorderInventoryItem: { sourceSlot: number; targetSlot: number };
    toggleHiddenSkill: undefined;
    useItemU: { slot: number };
    changeClanSeguro: undefined;
    craftItem: { profession: CraftingProfession; itemId: number; amount: number };
    reorderBankItem: { sourceSlot: number; targetSlot: number };
    changeBankTab: { tab: BankTab };
    depositBankGold: { amount: number };
    withdrawBankGold: { amount: number };
    closeTrade: undefined;
    marketAction: MarketActionPayload;
    retosAction: RetosActionPayload;
};

type PacketArguments<K extends ServerPacketName> = ClientPacketPayloads[K] extends undefined
    ? [type: K, payload?: undefined]
    : [type: K, payload: ClientPacketPayloads[K]];

export type DecodedClientPacket = {
    [K in ServerPacketName]: {
        type: K;
        id: (typeof SERVER_PACKET_ID)[K];
        payload: ClientPacketPayloads[K];
    };
}[ServerPacketName];

export function encodeClientPacket<K extends ServerPacketName>(...args: PacketArguments<K>): Uint8Array {
    const [type, rawPayload] = args as [ServerPacketName, ClientPacketPayloads[ServerPacketName]];
    const writer = new PacketWriter(SERVER_PACKET_ID[type]);
    const payload = rawPayload as Record<string, unknown> | undefined;

    switch (type) {
        case "connectCharacter":
            writer.writeString(String(payload?.ticket ?? ""));
            writer.writeByte(Number(payload?.typeGame ?? 0));
            writer.writeByte(Number(payload?.idChar ?? 0));
            break;
        case "position":
            writer.writeByte(Number(payload?.heading ?? 0));
            writer.writeInt(Number(payload?.moveId ?? 0));
            break;
        case "click":
            writer.writeByte(Number(payload?.x ?? 0));
            writer.writeByte(Number(payload?.y ?? 0));
            writer.writeByte(Number(payload?.button ?? 0));
            break;
        case "changeHeading":
            writer.writeByte(Number(payload?.heading ?? 0));
            break;
        case "ping":
            writer.writeInt(Number(payload?.token ?? 0));
            break;
        case "dialog":
            writer.writeString(String(payload?.message ?? ""));
            break;
        case "equiparItem":
        case "useItemClick":
        case "useItemU":
            writer.writeInt(Number(payload?.slot ?? 0));
            break;
        case "tirarItem":
            writer.writeInt(Number(payload?.slot ?? 0));
            writer.writeShort(Number(payload?.amount ?? 0));
            break;
        case "buyItem":
        case "sellItem":
            writer.writeByte(Number(payload?.slot ?? 0));
            writer.writeShort(Number(payload?.amount ?? 0));
            break;
        case "attackRange":
            writer.writeByte(Number(payload?.x ?? 0));
            writer.writeByte(Number(payload?.y ?? 0));
            break;
        case "attackSpell":
            writer.writeByte(Number(payload?.spellSlot ?? 0));
            writer.writeByte(Number(payload?.x ?? 0));
            writer.writeByte(Number(payload?.y ?? 0));
            writer.writeByte(Boolean(payload?.preferSelfIfEmpty));
            break;
        case "reorderSpell":
        case "reorderInventoryItem":
        case "reorderBankItem":
            writer.writeByte(Number(payload?.sourceSlot ?? 0));
            writer.writeByte(Number(payload?.targetSlot ?? 0));
            break;
        case "changeBankTab":
            writer.writeByte(payload?.tab === "account" ? 1 : payload?.tab === "clan" ? 2 : 0);
            break;
        case "depositBankGold":
        case "withdrawBankGold":
            writer.writeInt(Number(payload?.amount ?? 0));
            break;
        case "marketAction":
        case "retosAction":
            writer.writeString(JSON.stringify(payload ?? {}));
            break;
        case "craftItem":
            writer.writeByte(payload?.profession === "blacksmith" ? 1 : payload?.profession === "tailoring" ? 2 : 0);
            writer.writeInt(Number(payload?.itemId ?? 0));
            writer.writeShort(Number(payload?.amount ?? 0));
            break;
        case "attackMele":
        case "agarrarItem":
        case "resyncPosition":
        case "changeSeguro":
        case "toggleHiddenSkill":
        case "changeClanSeguro":
        case "closeTrade":
            break;
        default:
            assertNever(type);
    }

    return writer.toUint8Array();
}

export function decodeClientPacket(input: BinaryInput): DecodedClientPacket {
    const reader = new PacketReader(input);
    const id = reader.getByte();
    const type = getServerPacketName(id);
    let payload: ClientPacketPayloads[ServerPacketName];

    switch (type) {
        case "connectCharacter":
            payload = { ticket: reader.getString(), typeGame: reader.getByte(), idChar: reader.getByte() };
            break;
        case "position":
            payload = { heading: reader.getByte(), moveId: reader.getInt() };
            break;
        case "click":
            payload = { x: reader.getByte(), y: reader.getByte(), button: reader.getByte() };
            break;
        case "changeHeading":
            payload = { heading: reader.getByte() };
            break;
        case "ping":
            payload = { token: reader.canReadBytes(4) ? reader.getInt() : 0 };
            break;
        case "dialog":
            payload = { message: reader.getString() };
            break;
        case "equiparItem":
        case "useItemClick":
        case "useItemU":
            payload = { slot: reader.getInt() };
            break;
        case "tirarItem":
            payload = { slot: reader.getInt(), amount: reader.getShort() };
            break;
        case "buyItem":
        case "sellItem":
            payload = { slot: reader.getByte(), amount: reader.getShort() };
            break;
        case "attackRange":
            payload = { x: reader.getByte(), y: reader.getByte() };
            break;
        case "attackSpell":
            payload = {
                spellSlot: reader.getByte(),
                x: reader.getByte(),
                y: reader.getByte(),
                preferSelfIfEmpty: reader.canReadBytes(1) && reader.getByte() === 1,
            };
            break;
        case "reorderSpell":
        case "reorderInventoryItem":
        case "reorderBankItem":
            payload = { sourceSlot: reader.getByte(), targetSlot: reader.getByte() };
            break;
        case "changeBankTab": {
            const rawTab = reader.getByte();
            payload = { tab: rawTab === 1 ? "account" : rawTab === 2 ? "clan" : "character" };
            break;
        }
        case "depositBankGold":
        case "withdrawBankGold":
            payload = { amount: reader.getInt() };
            break;
        case "marketAction":
            payload = JSON.parse(reader.getString() || "{}") as MarketActionPayload;
            break;
        case "retosAction":
            payload = JSON.parse(reader.getString() || "{}") as RetosActionPayload;
            break;
        case "craftItem": {
            const rawProfession = reader.getByte();
            payload = {
                profession: rawProfession === 1 ? "blacksmith" : rawProfession === 2 ? "tailoring" : "carpentry",
                itemId: reader.getInt(),
                amount: reader.getShort(),
            };
            break;
        }
        case "attackMele":
        case "agarrarItem":
        case "resyncPosition":
        case "changeSeguro":
        case "toggleHiddenSkill":
        case "changeClanSeguro":
        case "closeTrade":
            payload = undefined;
            break;
        default:
            assertNever(type);
    }

    if (reader.remainingBytes !== 0) {
        throw new RangeError(`${reader.remainingBytes} trailing bytes remain in ${type} packet.`);
    }

    return { type, id: SERVER_PACKET_ID[type], payload } as DecodedClientPacket;
}

function getServerPacketName(id: number): ServerPacketName {
    const entry = Object.entries(SERVER_PACKET_ID).find(([, packetId]) => packetId === id);

    if (!entry) {
        throw new RangeError(`Unknown client packet opcode: ${id}.`);
    }

    return entry[0] as ServerPacketName;
}

function assertNever(value: never): never {
    throw new Error(`Unhandled client packet type: ${String(value)}.`);
}
