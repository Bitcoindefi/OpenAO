export declare const CLIENT_PACKET_ID: {
    readonly getMyCharacter: 1;
    readonly getCharacter: 2;
    readonly changeRopa: 3;
    readonly actPosition: 4;
    readonly changeHeading: 5;
    readonly deleteCharacter: 6;
    readonly dialog: 7;
    readonly console: 8;
    readonly pong: 9;
    readonly animFX: 10;
    readonly inmo: 11;
    readonly updateHP: 12;
    readonly updateMaxHP: 13;
    readonly updateMana: 14;
    readonly telepMe: 15;
    readonly actOnline: 19;
    readonly consoleOnline: 20;
    readonly actPositionServer: 21;
    readonly actExp: 22;
    readonly actMyLevel: 23;
    readonly actGold: 24;
    readonly actColorName: 25;
    readonly changeHelmet: 26;
    readonly changeWeapon: 27;
    readonly error: 28;
    readonly changeName: 29;
    readonly getNpc: 30;
    readonly changeShield: 31;
    readonly putBodyAndHeadDead: 32;
    readonly revivirUsuario: 33;
    readonly quitarUserInvItem: 34;
    readonly renderItem: 35;
    readonly deleteItem: 36;
    readonly agregarUserInvItem: 37;
    readonly changeArrow: 38;
    readonly blockMap: 39;
    readonly changeObjIndex: 40;
    readonly openTrade: 41;
    readonly aprenderSpell: 42;
    readonly closeForce: 43;
    readonly nameMap: 44;
    readonly changeBody: 45;
    readonly navegando: 46;
    readonly updateAgilidad: 47;
    readonly updateFuerza: 48;
    readonly playSound: 49;
    readonly openBail: 50;
    readonly closeBail: 51;
    readonly openAdminIntervals: 52;
    readonly panelSnapshot: 53;
    readonly panelSnapshotChunk: 54;
    readonly partyState: 55;
    readonly clanState: 56;
    readonly characterStatsSnapshot: 57;
    readonly characterStatsSnapshotChunk: 58;
    readonly startCastBar: 59;
    readonly stopCastBar: 60;
    readonly openCrafting: 61;
    readonly closeTrade: 62;
    readonly openMarket: 63;
    readonly openRetos: 64;
    readonly createProjectile: 65;
    readonly spellProjectile: 66;
    readonly globalNotice: 67;
    readonly batch: 68;
    readonly tInmo: 69;
    readonly tUpdateHP: 70;
    readonly tUpdateMana: 71;
    readonly areaCharactersSnapshot: 72;
    readonly areaNpcsSnapshot: 73;
    readonly areaItemsSnapshot: 74;
    readonly areaMetaSnapshot: 75;
    readonly moveEntity: 76;
    readonly selfFlagsDelta: 77;
    readonly selfVitalsDelta: 78;
    readonly selfMapMetaDelta: 79;
    readonly spellVisual: 80;
    readonly entityVitalsDelta: 81;
};

export declare const SERVER_PACKET_ID: {
    readonly changeHeading: 175;
    readonly click: 183;
    readonly useItemClick: 197;
    readonly equiparItem: 210;
    readonly connectCharacter: 212;
    readonly position: 176;
    readonly dialog: 221;
    readonly ping: 184;
    readonly attackMele: 229;
    readonly attackRange: 236;
    readonly attackSpell: 243;
    readonly tirarItem: 200;
    readonly agarrarItem: 205;
    readonly buyItem: 214;
    readonly sellItem: 222;
    readonly resyncPosition: 187;
    readonly changeSeguro: 196;
    readonly reorderSpell: 228;
    readonly reorderInventoryItem: 235;
    readonly toggleHiddenSkill: 244;
    readonly useItemU: 203;
    readonly changeClanSeguro: 209;
    readonly craftItem: 246;
    readonly reorderBankItem: 230;
    readonly changeBankTab: 216;
    readonly depositBankGold: 224;
    readonly withdrawBankGold: 237;
    readonly closeTrade: 190;
    readonly marketAction: 239;
    readonly retosAction: 248;
};

export declare const PROTOCOL_LIMITS: {
    readonly mapMinCoordinate: 1;
    readonly mapMaxCoordinate: 100;
    readonly clientViewRangeX: 10;
    readonly clientViewRangeY: 10;
    readonly clientViewExtraBottomY: 1;
    readonly areaVisionWidth: 31;
    readonly areaVisionHeight: 31;
    readonly areaVisionRangeX: 15;
    readonly areaVisionRangeY: 15;
};

export declare const FIELD_KIND: {
    readonly byte: "byte";
    readonly short: "short";
    readonly int: "int";
    readonly string: "string";
};

export type ProtocolFieldKind = (typeof FIELD_KIND)[keyof typeof FIELD_KIND];

export type ProtocolField = {
    readonly name: string;
    readonly kind: ProtocolFieldKind;
};

export type ServerPacketPayloads = {
    changeHeading: { heading: number };
    click: { x: number; y: number; button: number };
    useItemClick: { slot: number };
    equiparItem: { slot: number };
    connectCharacter: { ticket: string; typeGame: number; idChar: number };
    position: { heading: number; moveId: number };
    dialog: { message: string };
    ping: { token: number };
    attackMele: Record<string, never>;
    attackRange: { x: number; y: number };
    attackSpell: { spellSlot: number; x: number; y: number; preferSelfIfEmpty: number };
    tirarItem: { slot: number; amount: number };
    agarrarItem: Record<string, never>;
    buyItem: { slot: number; amount: number };
    sellItem: { slot: number; amount: number };
    resyncPosition: Record<string, never>;
    changeSeguro: Record<string, never>;
    reorderSpell: { sourceSlot: number; targetSlot: number };
    reorderInventoryItem: { sourceSlot: number; targetSlot: number };
    toggleHiddenSkill: Record<string, never>;
    useItemU: { slot: number };
    changeClanSeguro: Record<string, never>;
    craftItem: { profession: number; itemId: number; amount: number };
    reorderBankItem: { sourceSlot: number; targetSlot: number };
    changeBankTab: { tab: number };
    depositBankGold: { amount: number };
    withdrawBankGold: { amount: number };
    closeTrade: Record<string, never>;
    marketAction: { payload: string };
    retosAction: { payload: string };
};

export type ServerPacketName = keyof ServerPacketPayloads;
export type ClientPacketID = typeof CLIENT_PACKET_ID;
export type ServerPacketID = typeof SERVER_PACKET_ID;

export declare const SERVER_PACKET_SCHEMA: {
    readonly [Name in ServerPacketName]: {
        readonly packetId: (typeof SERVER_PACKET_ID)[Name];
        readonly fields: readonly ProtocolField[];
    };
};

export declare function getServerPacketSchema<Name extends ServerPacketName>(
    packetName: Name,
): (typeof SERVER_PACKET_SCHEMA)[Name];

export declare function encodeServerPacket<Name extends ServerPacketName>(
    packetName: Name,
    payload?: ServerPacketPayloads[Name],
): ArrayBuffer;

export declare function decodeServerPacket<Name extends ServerPacketName>(
    packetName: Name,
    buffer: ArrayBuffer | ArrayBufferView,
): ServerPacketPayloads[Name];

export declare function readPacketId(buffer: ArrayBuffer | ArrayBufferView): number;
