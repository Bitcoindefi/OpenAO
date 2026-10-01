import {
    CLIENT_PACKET_ID,
    SERVER_PACKET_ID,
    PacketReader,
    PacketWriter,
    encodeClientPacket,
    type CraftingMaterial,
    type CraftingRecipe,
    type CraftingState,
    type MarketClaimEntry,
    type MarketListingEntry,
    type MarketListingGroupEntry,
    type MarketPriceSort,
    type MarketState,
    type RetoEntry,
    type RetosState,
} from "@openao/protocol";

export { CLIENT_PACKET_ID, SERVER_PACKET_ID, PacketWriter };
export type {
    CraftingMaterial,
    CraftingRecipe,
    CraftingState,
    MarketClaimEntry,
    MarketListingEntry,
    MarketListingGroupEntry,
    MarketPriceSort,
    MarketState,
    RetoEntry,
    RetosState,
};

export type PanelShare = {
    type: string;
    count: number;
    percentage: number;
};

export type PanelRow = {
    name: string;
    onlineMs: number;
    totalPackets: number;
    nonPingPackets: number;
    pingPackets: number;
    css: number;
    odh: number;
    frh: number;
    fph: number;
    rth: number;
    csh: number;
    oaa: number;
    oau: number;
    oan: number;
    avgSessionPpm: number;
    pps5: number;
    pps60: number;
    peakPps1s: number;
    burstSecondsOver10Pps1m: number;
    minRecentPacketIntervalMs: number;
    medianRecentPacketIntervalMs: number;
    p95RecentPacketIntervalMs: number;
    burstUnder10Pct: number;
    burstUnder20Pct: number;
    intervalsSampleSize: number;
    baselineRatioPps60: number;
    topPacketTypes: PanelShare[];
};

export type PanelSnapshot = {
    sampledAt: number;
    baselinePps60: number;
    entries: PanelRow[];
};

export type PanelSnapshotChunk = {
    chunkIndex: number;
    totalChunks: number;
    chunk: string;
};

export type CharacterStatsSnapshot = {
    sampledAt: number;
    skills: {
        tacticasCombate: number;
        defensa: number;
        armas: number;
        proyectiles: number;
        wrestling: number;
        ocultarse: number;
        apunalar: number;
    };
    kills: {
        npcMatados: number;
        ciudadanosMatados: number;
        criminalesMatados: number;
    };
    factions: {
        activeFaction: "none" | "armada" | "caos";
        armada: {
            score: number;
            currentRank: number;
            currentTitle: string | null;
            nextRank: number | null;
            nextTitle: string | null;
            scoreToNextRank: number;
        };
        caos: {
            score: number;
            currentRank: number;
            currentTitle: string | null;
            nextRank: number | null;
            nextTitle: string | null;
            scoreToNextRank: number;
        };
    };
};

export type CharacterStatsSnapshotChunk = {
    chunkIndex: number;
    totalChunks: number;
    chunk: string;
};

export interface CharacterSnapshot {
    id: number;
    nameCharacter: string;
    idClase: number;
    map: number;
    pos: { x: number; y: number };
    idHead: number;
    idHelmet: number;
    idWeapon: number;
    idShield: number;
    idBody: number;
    heading: number;
    privileges?: number;
    dead?: boolean;
    deadWorldActive?: boolean;
    invisibleAdmin?: boolean;
    invisibleSpell?: boolean;
    hiddenSkill?: boolean;
    invisibleSpellRemainingMs?: number;
    isPartyMember?: boolean;
    color?: string;
    clan?: string;
    inmovilizado?: number;
    tInmo?: number;
    crowdControlRemainingMs?: number;
    zonaSegura?: number;
    seguroActivado?: boolean;
    seguroClanActivado?: boolean;
    hp?: number;
    tHp?: number;
    maxHp?: number;
    mana?: number;
    tMana?: number;
    maxMana?: number;
    adminSummonedBot?: boolean;
    exp?: number;
    expNextLevel?: number;
    level?: number;
    gold?: number;
    navegando?: number;
    attrAgilidad?: number;
    attrFuerza?: number;
    attrInteligencia?: number;
    attrConstitucion?: number;
    minHit?: number;
    maxHit?: number;
    buffAgilidadSeconds?: number;
    buffFuerzaSeconds?: number;
    stateVersion?: number;
    inventory?: InventoryItem[];
    spells?: SpellEntry[];
    isNpc?: boolean;
    tt?: number;
}

export interface InventoryItem {
    slot: number;
    idItem: number;
    name: string;
    equipped: boolean;
    grhIndex: number;
    amount: number;
    value: number;
    objType: number;
    validForUser: boolean;
    details: string;
}

export interface SpellEntry {
    slot: number;
    idSpell: number;
    name: string;
    manaRequired: number;
}

export interface TradeItem {
    slot: number;
    name: string;
    grhIndex: number;
    amount: number;
    value: number;
    validForUser: boolean;
    details: string;
    equipped?: boolean;
}

export interface TradeState {
    mode: "merchant" | "bank";
    merchantItems: TradeItem[];
    playerItems: TradeItem[];
    bankTab?: "character" | "account" | "clan";
    vaultGold?: number;
    hasClanVault?: boolean;
    clanName?: string | null;
}

export interface PartyHudMember {
    id: number | string;
    nameCharacter: string;
    map: number;
    pos: { x: number; y: number };
    online: boolean;
    isLeader: boolean;
}

export interface ClanHudMember {
    id: number | string;
    nameCharacter: string;
    map: number;
    pos: { x: number; y: number };
    online: boolean;
}

export interface PartyHudStateDelta {
    upsert: PartyHudMember[];
    remove: Array<number | string>;
}

export interface ClanHudStateDelta {
    upsert: ClanHudMember[];
    remove: Array<number | string>;
}

export interface BailOffer {
    kills: number;
    citizensKilled: number;
    fianza: number;
    goldRequired: number;
    goldAvailable: number;
    canPay: boolean;
}

export interface PlayerHudState {
    id?: number;
    nameCharacter: string;
    clan?: string;
    map: number;
    pos: { x: number; y: number };
    idHead?: number;
    idBody?: number;
    privileges?: number;
    navegando?: boolean;
    dead?: boolean;
    deadWorldActive?: boolean;
    color?: string;
    inmovilizado?: boolean;
    paralizado?: boolean;
    zonaSegura?: number;
    seguroActivado?: boolean;
    seguroClanActivado?: boolean;
    invisibleSpell?: boolean;
    invisibleSpellRemainingMs?: number;
    invisibleSpellUpdatedAt?: number;
    hiddenSkill?: boolean;
    idClase?: number;
    level?: number;
    exp?: number;
    expNextLevel?: number;
    hp?: number;
    maxHp?: number;
    mana?: number;
    maxMana?: number;
    attrAgilidad?: number;
    attrFuerza?: number;
    attrInteligencia?: number;
    attrConstitucion?: number;
    minHit?: number;
    maxHit?: number;
    buffAgilidadSeconds?: number;
    buffFuerzaSeconds?: number;
    buffAgilidadUpdatedAt?: number;
    buffFuerzaUpdatedAt?: number;
    gold?: number;
    inventory: InventoryItem[];
    spells: SpellEntry[];
    partyMembers: PartyHudMember[];
    clanMembers: ClanHudMember[];
}

export type ChatChannel =
    | "console"
    | "local"
    | "global"
    | "party"
    | "clan"
    | "whisper";

export const OBJECT_TYPE = {
    arboles: 4,
    armas: 2,
    armaduras: 3,
    lenia: 14,
    metales: 23,
    pociones: 11,
    anillos: 18,
    escudos: 16,
    cascos: 17,
    gemas: 29,
    lingotes: 36,
    instrumentosMusicales: 26,
    flechas: 32,
} as const;

export interface ConsolePacket {
    msg: string;
    color?: string;
    bold: number;
    italica: number;
    channel?: Exclude<ChatChannel, "local">;
    senderName?: string;
}

export interface DialogPacket {
    id: number;
    msg: string;
    name?: string;
    color: string;
    writeToConsole: number;
}

export interface GlobalNoticePacket {
    msg: string;
    durationMs: number;
}

export interface AnimFXPacket {
    id: number;
    fxGrh: number;
}

export interface CreateProjectilePacket {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    grhIndex: number;
}

export interface SpellProjectilePacket {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    spellId: number;
}

export interface SpellVisualPacket {
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    spellId?: number;
    targetId?: number;
    fxGrh?: number;
    soundId?: number;
    casterId?: number;
    msg?: string;
}

export interface AreaItemSnapshot {
    idItem: number;
    map: number;
    x: number;
    y: number;
}

export interface AreaBlockedTileSnapshot {
    x: number;
    y: number;
    blocked: number;
}

export interface AreaMetaSnapshot {
    map: number;
    name: string;
    blockedTiles: AreaBlockedTileSnapshot[];
}

export interface SelfFlagsDelta {
    zonaSegura: number;
    seguroActivado: boolean;
    seguroClanActivado: boolean;
}

export interface SelfVitalsDelta {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
}

export interface SelfMapMetaDelta {
    map?: number;
    name?: string;
    navegando?: number;
}

export interface EntityVitalsDelta {
    id: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
}

export type ParsedServerPacket =
    | { type: "getMyCharacter"; payload: CharacterSnapshot }
    | { type: "getCharacter"; payload: CharacterSnapshot }
    | { type: "getNpc"; payload: CharacterSnapshot }
    | { type: "areaCharactersSnapshot"; payload: CharacterSnapshot[] }
    | { type: "areaNpcsSnapshot"; payload: CharacterSnapshot[] }
    | { type: "areaItemsSnapshot"; payload: AreaItemSnapshot[] }
    | { type: "areaMetaSnapshot"; payload: AreaMetaSnapshot }
    | { type: "selfFlagsDelta"; payload: SelfFlagsDelta }
    | { type: "selfVitalsDelta"; payload: SelfVitalsDelta }
    | { type: "selfMapMetaDelta"; payload: SelfMapMetaDelta }
    | { type: "entityVitalsDelta"; payload: EntityVitalsDelta }
    | {
          type: "changeRopa";
          payload: { id: number; body: number; slot: number };
      }
    | {
          type: "putBodyAndHeadDead";
          payload: {
              id: number;
              head: number;
              helmet: number;
              weapon: number;
              shield: number;
              body: number;
          };
      }
    | {
          type: "revivirUsuario";
          payload: { id: number; head: number; body: number };
      }
    | { type: "actPosition"; payload: { id: number; x: number; y: number } }
    | {
          type: "actPositionServer";
          payload: {
              map: number;
              x: number;
              y: number;
              heading: number;
              lastProcessedMoveId: number;
              stateVersion: number;
          };
      }
    | {
          type: "moveEntity";
          payload: { id: number; x: number; y: number; heading: number };
      }
    | { type: "changeHeading"; payload: { id: number; heading: number } }
    | { type: "deleteCharacter"; payload: { id: number } }
    | {
          type: "telepMe";
          payload: {
              id: number;
              map: number;
              x: number;
              y: number;
              heading: number;
              lastProcessedMoveId: number;
              stateVersion: number;
              movementLockMs: number;
          };
      }
    | { type: "actOnline"; payload: { usersOnline: number } }
    | { type: "nameMap"; payload: { name: string } }
    | {
          type: "inmo";
          payload: {
              inmovilizado: number;
              x: number;
              y: number;
              remainingMs?: number;
          };
      }
    | {
          type: "tInmo";
          payload: {
              tInmo: number;
              x: number;
              y: number;
              remainingMs?: number;
          };
      }
    | { type: "console"; payload: ConsolePacket }
    | { type: "dialog"; payload: DialogPacket }
    | { type: "globalNotice"; payload: GlobalNoticePacket }
    | { type: "animFX"; payload: AnimFXPacket }
    | { type: "createProjectile"; payload: CreateProjectilePacket }
    | { type: "spellProjectile"; payload: SpellProjectilePacket }
    | { type: "spellVisual"; payload: SpellVisualPacket }
    | { type: "playSound"; payload: { id: number; soundId: number } }
    | { type: "updateHP"; payload: { hp: number } }
    | { type: "tUpdateHP"; payload: { tHp: number } }
    | {
          type: "updateMaxHP";
          payload: { hp: number; tHp: number; maxHp: number };
      }
    | { type: "updateMana"; payload: { mana: number } }
    | { type: "tUpdateMana"; payload: { tMana: number } }
    | { type: "actExp"; payload: { exp: number } }
    | {
          type: "actMyLevel";
          payload: {
              exp: number;
              expNextLevel: number;
              level: number;
              hp: number;
              tHp: number;
              maxHp: number;
              mana: number;
              tMana: number;
              maxMana: number;
          };
      }
    | { type: "actGold"; payload: { gold: number } }
    | { type: "actColorName"; payload: { id: number; color: string } }
    | {
          type: "changeHelmet";
          payload: { id: number; helmet: number; slot: number };
      }
    | {
          type: "changeWeapon";
          payload: { id: number; weapon: number; slot: number };
      }
    | {
          type: "quitarUserInvItem";
          payload: { id: number; slot: number; amount: number };
      }
    | { type: "agregarUserInvItem"; payload: InventoryItem }
    | {
          type: "renderItem";
          payload: { idItem: number; map: number; x: number; y: number };
      }
    | { type: "deleteItem"; payload: { map: number; x: number; y: number } }
    | {
          type: "blockMap";
          payload: { map: number; x: number; y: number; blocked: number };
      }
    | {
          type: "changeBody";
          payload: {
              id: number;
              head: number;
              body: number;
              helmet: number;
              weapon: number;
              shield: number;
          };
      }
    | {
          type: "changeShield";
          payload: { id: number; shield: number; slot: number };
      }
    | { type: "changeArrow"; payload: { id: number; slot: number } }
    | { type: "openTrade"; payload: TradeState }
    | { type: "closeTrade"; payload: null }
    | { type: "aprenderSpell"; payload: SpellEntry }
    | { type: "navegando"; payload: { navegando: number } }
    | {
          type: "updateAgilidad";
          payload: { agilidad: number; buffSecondsRemaining: number };
      }
    | {
          type: "updateFuerza";
          payload: { fuerza: number; buffSecondsRemaining: number };
      }
    | { type: "openBail"; payload: BailOffer }
    | { type: "openCrafting"; payload: CraftingState }
    | { type: "openMarket"; payload: MarketState }
    | { type: "openRetos"; payload: RetosState }
    | { type: "closeBail"; payload: null }
    | { type: "openAdminIntervals"; payload: null }
    | { type: "panelSnapshot"; payload: PanelSnapshot }
    | { type: "panelSnapshotChunk"; payload: PanelSnapshotChunk }
    | { type: "characterStatsSnapshot"; payload: CharacterStatsSnapshot }
    | {
          type: "characterStatsSnapshotChunk";
          payload: CharacterStatsSnapshotChunk;
      }
    | { type: "partyState"; payload: PartyHudStateDelta }
    | { type: "clanState"; payload: ClanHudStateDelta }
    | { type: "startCastBar"; payload: { id: number; durationMs: number } }
    | { type: "stopCastBar"; payload: { id: number } }
    | { type: "error"; payload: { msg: string } }
    | { type: "closeForce" }
    | {
          type: "pong";
          payload: {
              token: number;
          };
      }
    | { type: "unknown"; payload: { packetId: number } };

function parseInventoryItem(reader: PacketReader): InventoryItem {
    return {
        slot: reader.getByte(),
        idItem: reader.getInt(),
        name: reader.getString(),
        equipped: reader.getByte() === 1,
        grhIndex: reader.getShort(),
        amount: reader.getShort(),
        value: reader.getInt(),
        objType: reader.getByte(),
        validForUser: reader.getByte() === 1,
        details: reader.getString(),
    };
}

function parseSpellEntry(reader: PacketReader): SpellEntry {
    return {
        slot: reader.getByte(),
        idSpell: reader.getShort(),
        name: reader.getString(),
        manaRequired: reader.getShort(),
    };
}

function parseMerchantTradeItem(reader: PacketReader): TradeItem {
    return {
        slot: reader.getByte(),
        grhIndex: reader.getShort(),
        name: reader.getString(),
        amount: reader.getShort(),
        value: reader.getInt(),
        validForUser: reader.getByte() === 1,
        details: reader.getString(),
    };
}

function parsePlayerTradeItem(reader: PacketReader): TradeItem {
    return {
        grhIndex: reader.getShort(),
        name: reader.getString(),
        amount: reader.getShort(),
        value: reader.getInt(),
        equipped: reader.getByte() === 1,
        slot: reader.getByte(),
        validForUser: reader.getByte() === 1,
        details: reader.getString(),
    };
}

function decodeHtmlEntities(value: string): string {
    const normalized = value.replace(
        /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+)(?![a-zA-Z0-9]);?/g,
        "&$1;",
    );

    if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = normalized;
        return textarea.value;
    }

    return normalized.replace(
        /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g,
        (entity, rawCode: string) => {
            const code = rawCode.toLowerCase();

            if (code.startsWith("#x")) {
                const parsed = Number.parseInt(code.slice(2), 16);
                return Number.isNaN(parsed)
                    ? entity
                    : String.fromCodePoint(parsed);
            }

            if (code.startsWith("#")) {
                const parsed = Number.parseInt(code.slice(1), 10);
                return Number.isNaN(parsed)
                    ? entity
                    : String.fromCodePoint(parsed);
            }

            const namedEntities: Record<string, string> = {
                lt: "<",
                gt: ">",
                amp: "&",
                quot: '"',
                apos: "'",
                nbsp: " ",
            };

            return namedEntities[code] ?? entity;
        },
    );
}

function parseCharacter(
    reader: PacketReader,
    isOwnCharacter: boolean,
): CharacterSnapshot {
    const snapshot: CharacterSnapshot = {
        id: reader.getDouble(),
        nameCharacter: reader.getString(),
        idClase: reader.getByte(),
        map: reader.getShort(),
        pos: { x: reader.getByte(), y: reader.getByte() },
        idHead: reader.getShort(),
        idHelmet: reader.getShort(),
        idWeapon: reader.getShort(),
        idShield: reader.getShort(),
        idBody: reader.getShort(),
        heading: 2,
    };

    if (isOwnCharacter) {
        snapshot.hp = reader.getShort();
        snapshot.tHp = reader.canReadBytes(2) ? reader.getShort() : snapshot.hp;
        snapshot.maxHp = reader.getShort();
        snapshot.mana = reader.getShort();
        snapshot.tMana = reader.canReadBytes(2)
            ? reader.getShort()
            : snapshot.mana;
        snapshot.maxMana = reader.getShort();
        snapshot.privileges = reader.getByte();
        snapshot.exp = reader.getDouble();
        snapshot.expNextLevel = reader.getDouble();
        snapshot.level = reader.getByte();
        snapshot.gold = reader.getInt();
        snapshot.heading = reader.getByte();
        snapshot.inmovilizado = reader.getByte();
        snapshot.tInmo = reader.canReadBytes(1)
            ? reader.getByte()
            : snapshot.inmovilizado;
        snapshot.crowdControlRemainingMs = reader.canReadBytes(4)
            ? reader.getInt()
            : undefined;
        snapshot.zonaSegura = reader.getByte();
        snapshot.seguroActivado = reader.getByte() === 1;
        snapshot.seguroClanActivado = reader.getByte() === 1;
        snapshot.color = reader.getString();
        snapshot.clan = reader.getString();
        snapshot.dead = reader.getByte() === 1;
        snapshot.deadWorldActive = reader.getByte() === 1;
        snapshot.invisibleAdmin = reader.getByte() === 1;
        snapshot.invisibleSpell = reader.getByte() === 1;
        snapshot.hiddenSkill = reader.getByte() === 1;
        snapshot.navegando = reader.getByte();
        snapshot.attrAgilidad = reader.getByte();
        snapshot.attrFuerza = reader.getByte();
        snapshot.attrInteligencia = reader.getByte();
        snapshot.attrConstitucion = reader.getByte();
        snapshot.minHit = reader.getShort();
        snapshot.maxHit = reader.getShort();
        snapshot.buffAgilidadSeconds = reader.getShort();
        snapshot.buffFuerzaSeconds = reader.getShort();
        snapshot.stateVersion = reader.getInt();
        snapshot.inventory = [];
        snapshot.spells = [];

        const inventoryCount = reader.getByte();
        for (let index = 0; index < inventoryCount; index++) {
            snapshot.inventory.push(parseInventoryItem(reader));
        }

        if ((snapshot.maxMana || 0) > 0) {
            const spellsCount = reader.getByte();
            for (let index = 0; index < spellsCount; index++) {
                snapshot.spells.push(parseSpellEntry(reader));
            }
        }

        snapshot.invisibleSpellRemainingMs = reader.canReadBytes(4)
            ? reader.getInt()
            : undefined;
    } else {
        snapshot.privileges = reader.getByte();
        snapshot.heading = reader.getByte();
        snapshot.color = reader.getString();
        snapshot.clan = reader.getString();
        snapshot.dead = reader.getByte() === 1;
        snapshot.invisibleSpell = reader.getByte() === 1;
        snapshot.hiddenSkill = reader.getByte() === 1;
        snapshot.isPartyMember = reader.getByte() === 1;
        snapshot.inmovilizado = reader.canReadBytes(1) ? reader.getByte() : 0;
        snapshot.crowdControlRemainingMs = reader.canReadBytes(4)
            ? reader.getInt()
            : undefined;
        snapshot.hp = reader.getShort();
        snapshot.maxHp = reader.getShort();
        if (reader.canReadBytes(5)) {
            snapshot.mana = reader.getShort();
            snapshot.maxMana = reader.getShort();
            snapshot.adminSummonedBot = reader.getByte() === 1;
        }
        snapshot.tt = reader.canReadBytes(1) ? reader.getByte() : 0;
    }

    return snapshot;
}

function parseNpc(reader: PacketReader): CharacterSnapshot {
    const snapshot: CharacterSnapshot = {
        id: reader.getDouble(),
        nameCharacter: reader.getString(),
        idClase: reader.getByte(),
        map: reader.getShort(),
        pos: { x: reader.getByte(), y: reader.getByte() },
        idHead: reader.getShort(),
        idHelmet: reader.getShort(),
        idWeapon: reader.getShort(),
        idShield: reader.getShort(),
        idBody: reader.getShort(),
        heading: reader.getByte(),
        color: reader.getString(),
        clan: reader.getString(),
        inmovilizado: reader.getByte(),
        crowdControlRemainingMs: reader.getInt(),
        hp: reader.getShort(),
        maxHp: reader.getShort(),
        isNpc: true,
    };

    snapshot.tt = reader.canReadBytes(1) ? reader.getByte() : 0;
    return snapshot;
}

function parseCharacterSnapshotArray(
    reader: PacketReader,
): CharacterSnapshot[] {
    const count = reader.getShort();
    const snapshots: CharacterSnapshot[] = [];

    for (let index = 0; index < count; index++) {
        snapshots.push(parseCharacter(reader, false));
    }

    return snapshots;
}

function parseNpcSnapshotArray(reader: PacketReader): CharacterSnapshot[] {
    const count = reader.getShort();
    const snapshots: CharacterSnapshot[] = [];

    for (let index = 0; index < count; index++) {
        snapshots.push(parseNpc(reader));
    }

    return snapshots;
}

function parseAreaItemSnapshotArray(reader: PacketReader): AreaItemSnapshot[] {
    const count = reader.getShort();
    const snapshots: AreaItemSnapshot[] = [];

    for (let index = 0; index < count; index++) {
        snapshots.push({
            idItem: reader.getInt(),
            map: reader.getShort(),
            x: reader.getByte(),
            y: reader.getByte(),
        });
    }

    return snapshots;
}

function parseAreaMetaSnapshot(reader: PacketReader): AreaMetaSnapshot {
    const map = reader.getShort();
    const name = reader.getString();
    const blockedCount = reader.getShort();
    const blockedTiles: AreaBlockedTileSnapshot[] = [];

    for (let index = 0; index < blockedCount; index++) {
        blockedTiles.push({
            x: reader.getByte(),
            y: reader.getByte(),
            blocked: reader.getByte(),
        });
    }

    return { map, name, blockedTiles };
}

function parseSelfMapMetaDelta(reader: PacketReader): SelfMapMetaDelta {
    const flags = reader.getByte();
    const payload: SelfMapMetaDelta = {};

    if (flags & 1) {
        payload.map = reader.getShort();
    }

    if (flags & (1 << 1)) {
        payload.name = reader.getString();
    }

    if (flags & (1 << 2)) {
        payload.navegando = reader.getByte();
    }

    return payload;
}

function parseServerPacketById(
    packetId: number,
    reader: PacketReader,
): ParsedServerPacket {
    console.log(`Parsing server packet with ID: ${packetId}`);

    switch (packetId) {
        case CLIENT_PACKET_ID.getMyCharacter:
            return {
                type: "getMyCharacter",
                payload: parseCharacter(reader, true),
            };
        case CLIENT_PACKET_ID.getCharacter:
            return {
                type: "getCharacter",
                payload: parseCharacter(reader, false),
            };
        case CLIENT_PACKET_ID.getNpc:
            return { type: "getNpc", payload: parseNpc(reader) };
        case CLIENT_PACKET_ID.areaCharactersSnapshot:
            return {
                type: "areaCharactersSnapshot",
                payload: parseCharacterSnapshotArray(reader),
            };
        case CLIENT_PACKET_ID.areaNpcsSnapshot:
            return {
                type: "areaNpcsSnapshot",
                payload: parseNpcSnapshotArray(reader),
            };
        case CLIENT_PACKET_ID.areaItemsSnapshot:
            return {
                type: "areaItemsSnapshot",
                payload: parseAreaItemSnapshotArray(reader),
            };
        case CLIENT_PACKET_ID.areaMetaSnapshot:
            return {
                type: "areaMetaSnapshot",
                payload: parseAreaMetaSnapshot(reader),
            };
        case CLIENT_PACKET_ID.selfFlagsDelta:
            return {
                type: "selfFlagsDelta",
                payload: {
                    zonaSegura: reader.getByte(),
                    seguroActivado: reader.getByte() === 1,
                    seguroClanActivado: reader.getByte() === 1,
                },
            };
        case CLIENT_PACKET_ID.selfVitalsDelta:
            return {
                type: "selfVitalsDelta",
                payload: {
                    hp: reader.getShort(),
                    maxHp: reader.getShort(),
                    mana: reader.getShort(),
                    maxMana: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.selfMapMetaDelta:
            return {
                type: "selfMapMetaDelta",
                payload: parseSelfMapMetaDelta(reader),
            };
        case CLIENT_PACKET_ID.entityVitalsDelta:
            return {
                type: "entityVitalsDelta",
                payload: {
                    id: reader.getDouble(),
                    hp: reader.getShort(),
                    maxHp: reader.getShort(),
                    mana: reader.canReadBytes(4) ? reader.getShort() : 0,
                    maxMana: reader.canReadBytes(2) ? reader.getShort() : 0,
                },
            };
        case CLIENT_PACKET_ID.changeRopa:
            return {
                type: "changeRopa",
                payload: {
                    id: reader.getDouble(),
                    body: reader.getShort(),
                    slot: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.putBodyAndHeadDead:
            return {
                type: "putBodyAndHeadDead",
                payload: {
                    id: reader.getDouble(),
                    head: reader.getShort(),
                    helmet: reader.getShort(),
                    weapon: reader.getShort(),
                    shield: reader.getShort(),
                    body: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.revivirUsuario:
            return {
                type: "revivirUsuario",
                payload: {
                    id: reader.getDouble(),
                    head: reader.getShort(),
                    body: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.actPosition:
            return {
                type: "actPosition",
                payload: {
                    id: reader.getDouble(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.actPositionServer:
            return {
                type: "actPositionServer",
                payload: {
                    map: reader.getShort(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    heading: reader.getByte(),
                    lastProcessedMoveId: reader.getInt(),
                    stateVersion: reader.getInt(),
                },
            };
        case CLIENT_PACKET_ID.moveEntity:
            return {
                type: "moveEntity",
                payload: {
                    id: reader.getDouble(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    heading: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.changeHeading:
            return {
                type: "changeHeading",
                payload: { id: reader.getDouble(), heading: reader.getByte() },
            };
        case CLIENT_PACKET_ID.deleteCharacter:
            return {
                type: "deleteCharacter",
                payload: { id: reader.getDouble() },
            };
        case CLIENT_PACKET_ID.telepMe:
            return {
                type: "telepMe",
                payload: {
                    id: reader.getDouble(),
                    map: reader.getShort(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    heading: reader.getByte(),
                    lastProcessedMoveId: reader.getInt(),
                    stateVersion: reader.getInt(),
                    movementLockMs: reader.canReadBytes(4)
                        ? reader.getInt()
                        : 0,
                },
            };
        case CLIENT_PACKET_ID.actOnline:
            return {
                type: "actOnline",
                payload: { usersOnline: reader.getShort() },
            };
        case CLIENT_PACKET_ID.nameMap:
            return { type: "nameMap", payload: { name: reader.getString() } };
        case CLIENT_PACKET_ID.inmo:
            return {
                type: "inmo",
                payload: {
                    inmovilizado: reader.getByte(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    remainingMs: reader.canReadBytes(4)
                        ? reader.getInt()
                        : undefined,
                },
            };
        case CLIENT_PACKET_ID.tInmo:
            return {
                type: "tInmo",
                payload: {
                    tInmo: reader.getByte(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    remainingMs: reader.canReadBytes(4)
                        ? reader.getInt()
                        : undefined,
                },
            };
        case CLIENT_PACKET_ID.updateHP:
            return { type: "updateHP", payload: { hp: reader.getShort() } };
        case CLIENT_PACKET_ID.tUpdateHP:
            return {
                type: "tUpdateHP",
                payload: { tHp: reader.getShort() },
            };
        case CLIENT_PACKET_ID.updateMaxHP:
            return {
                type: "updateMaxHP",
                payload: {
                    hp: reader.getShort(),
                    tHp: reader.getShort(),
                    maxHp: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.updateMana:
            return { type: "updateMana", payload: { mana: reader.getShort() } };
        case CLIENT_PACKET_ID.tUpdateMana:
            return {
                type: "tUpdateMana",
                payload: { tMana: reader.getShort() },
            };
        case CLIENT_PACKET_ID.actExp:
            return { type: "actExp", payload: { exp: reader.getDouble() } };
        case CLIENT_PACKET_ID.actMyLevel:
            return {
                type: "actMyLevel",
                payload: {
                    exp: reader.getDouble(),
                    expNextLevel: reader.getDouble(),
                    level: reader.getByte(),
                    hp: reader.getShort(),
                    tHp: reader.getShort(),
                    maxHp: reader.getShort(),
                    mana: reader.getShort(),
                    tMana: reader.getShort(),
                    maxMana: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.actGold:
            return { type: "actGold", payload: { gold: reader.getInt() } };
        case CLIENT_PACKET_ID.actColorName:
            return {
                type: "actColorName",
                payload: {
                    id: reader.getDouble(),
                    color: reader.getString(),
                },
            };
        case CLIENT_PACKET_ID.changeHelmet:
            return {
                type: "changeHelmet",
                payload: {
                    id: reader.getDouble(),
                    helmet: reader.getShort(),
                    slot: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.changeWeapon:
            return {
                type: "changeWeapon",
                payload: {
                    id: reader.getDouble(),
                    weapon: reader.getShort(),
                    slot: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.console: {
            const msg = reader.getString();
            const hasColor = reader.getByte();
            const color = hasColor ? reader.getString() : undefined;
            const bold = reader.getByte();
            const italica = reader.getByte();
            const hasChannel = reader.canReadBytes(1) ? reader.getByte() : 0;
            const channel = hasChannel
                ? (reader.getString() as ConsolePacket["channel"])
                : undefined;
            const hasSenderName = reader.canReadBytes(1) ? reader.getByte() : 0;
            const senderName = hasSenderName ? reader.getString() : undefined;
            return {
                type: "console",
                payload: {
                    msg,
                    color,
                    bold,
                    italica,
                    channel,
                    senderName,
                },
            };
        }
        case CLIENT_PACKET_ID.dialog: {
            const id = reader.getDouble();
            const msg = reader.getString();
            const hasName = reader.getByte();
            const name = hasName ? reader.getString() : undefined;
            return {
                type: "dialog",
                payload: {
                    id,
                    msg,
                    name,
                    color: reader.getString(),
                    writeToConsole: reader.getByte(),
                },
            };
        }
        case CLIENT_PACKET_ID.globalNotice:
            return {
                type: "globalNotice",
                payload: {
                    msg: reader.getString(),
                    durationMs: reader.getInt(),
                },
            };
        case CLIENT_PACKET_ID.animFX:
            return {
                type: "animFX",
                payload: {
                    id: reader.getDouble(),
                    fxGrh: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.createProjectile:
            return {
                type: "createProjectile",
                payload: {
                    startX: reader.getByte(),
                    startY: reader.getByte(),
                    endX: reader.getByte(),
                    endY: reader.getByte(),
                    grhIndex: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.spellProjectile:
            return {
                type: "spellProjectile",
                payload: {
                    startX: reader.getByte(),
                    startY: reader.getByte(),
                    endX: reader.getByte(),
                    endY: reader.getByte(),
                    spellId: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.spellVisual: {
            const flags = reader.getByte();
            const hasProjectile = (flags & 1) !== 0;
            const hasFx = (flags & (1 << 1)) !== 0;
            const hasSound = (flags & (1 << 2)) !== 0;
            const hasWords = (flags & (1 << 3)) !== 0;
            const hasTargetId = hasFx || hasSound;
            const payload: SpellVisualPacket = {};

            if (hasProjectile) {
                payload.startX = reader.getByte();
                payload.startY = reader.getByte();
                payload.endX = reader.getByte();
                payload.endY = reader.getByte();
                payload.spellId = reader.getShort();
            }

            if (hasTargetId) {
                payload.targetId = reader.getDouble();
            }

            if (hasFx) {
                payload.fxGrh = reader.getShort();
            }

            if (hasSound) {
                payload.soundId = reader.getShort();
            }

            if (hasWords) {
                payload.casterId = reader.getDouble();
                payload.msg = reader.getString();
            }

            return {
                type: "spellVisual",
                payload,
            };
        }
        case CLIENT_PACKET_ID.playSound:
            return {
                type: "playSound",
                payload: {
                    id: reader.getDouble(),
                    soundId: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.quitarUserInvItem:
            return {
                type: "quitarUserInvItem",
                payload: {
                    id: reader.getDouble(),
                    slot: reader.getByte(),
                    amount: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.agregarUserInvItem:
            return {
                type: "agregarUserInvItem",
                payload: parseInventoryItem(reader),
            };
        case CLIENT_PACKET_ID.renderItem:
            return {
                type: "renderItem",
                payload: {
                    idItem: reader.getInt(),
                    map: reader.getShort(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.deleteItem:
            return {
                type: "deleteItem",
                payload: {
                    map: reader.getShort(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.blockMap:
            return {
                type: "blockMap",
                payload: {
                    map: reader.getShort(),
                    x: reader.getByte(),
                    y: reader.getByte(),
                    blocked: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.changeBody:
            return {
                type: "changeBody",
                payload: {
                    id: reader.getDouble(),
                    head: reader.getShort(),
                    body: reader.getShort(),
                    helmet: reader.getShort(),
                    weapon: reader.getShort(),
                    shield: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.changeShield:
            return {
                type: "changeShield",
                payload: {
                    id: reader.getDouble(),
                    shield: reader.getShort(),
                    slot: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.changeArrow:
            return {
                type: "changeArrow",
                payload: {
                    id: reader.getDouble(),
                    slot: reader.getByte(),
                },
            };
        case CLIENT_PACKET_ID.openTrade: {
            const mode = reader.getByte() === 1 ? "bank" : "merchant";
            const merchantItems: TradeItem[] = [];
            const merchantCount = reader.getByte();

            for (let index = 0; index < merchantCount; index++) {
                merchantItems.push(parseMerchantTradeItem(reader));
            }

            const playerItems: TradeItem[] = [];
            const playerCount = reader.getByte();

            for (let index = 0; index < playerCount; index++) {
                playerItems.push(parsePlayerTradeItem(reader));
            }

            const bankTab =
                mode === "bank"
                    ? ((["character", "account", "clan"] as const)[
                          Math.max(0, Math.min(2, reader.getByte()))
                      ] ?? "character")
                    : undefined;
            const vaultGold = mode === "bank" ? reader.getInt() : undefined;
            const hasClanVault =
                mode === "bank" ? reader.getByte() === 1 : undefined;
            const clanName = mode === "bank" ? reader.getString() : undefined;

            return {
                type: "openTrade",
                payload: {
                    mode,
                    merchantItems,
                    playerItems,
                    bankTab,
                    vaultGold,
                    hasClanVault,
                    clanName,
                },
            };
        }
        case CLIENT_PACKET_ID.aprenderSpell:
            return { type: "aprenderSpell", payload: parseSpellEntry(reader) };
        case CLIENT_PACKET_ID.navegando:
            return {
                type: "navegando",
                payload: { navegando: reader.getByte() },
            };
        case CLIENT_PACKET_ID.updateAgilidad:
            return {
                type: "updateAgilidad",
                payload: {
                    agilidad: reader.getByte(),
                    buffSecondsRemaining: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.updateFuerza:
            return {
                type: "updateFuerza",
                payload: {
                    fuerza: reader.getByte(),
                    buffSecondsRemaining: reader.getShort(),
                },
            };
        case CLIENT_PACKET_ID.openBail:
            return {
                type: "openBail",
                payload: {
                    kills: reader.getInt(),
                    citizensKilled: reader.getInt(),
                    fianza: reader.getInt(),
                    goldRequired: reader.getInt(),
                    goldAvailable: reader.getInt(),
                    canPay: reader.getByte() === 1,
                },
            };
        case CLIENT_PACKET_ID.openCrafting: {
            const rawState = reader.getString();
            return {
                type: "openCrafting",
                payload: JSON.parse(rawState) as CraftingState,
            };
        }
        case CLIENT_PACKET_ID.openMarket: {
            const rawState = reader.getString();
            return {
                type: "openMarket",
                payload: JSON.parse(rawState) as MarketState,
            };
        }
        case CLIENT_PACKET_ID.openRetos: {
            const rawState = reader.getString();
            return {
                type: "openRetos",
                payload: JSON.parse(rawState) as RetosState,
            };
        }
        case CLIENT_PACKET_ID.closeTrade:
            return { type: "closeTrade", payload: null };
        case CLIENT_PACKET_ID.closeBail:
            return { type: "closeBail", payload: null };
        case CLIENT_PACKET_ID.openAdminIntervals:
            return { type: "openAdminIntervals", payload: null };
        case CLIENT_PACKET_ID.panelSnapshot: {
            const rawSnapshot = reader.getString();

            try {
                return {
                    type: "panelSnapshot",
                    payload: JSON.parse(rawSnapshot) as PanelSnapshot,
                };
            } catch {
                return { type: "unknown", payload: { packetId } };
            }
        }
        case CLIENT_PACKET_ID.panelSnapshotChunk:
            return {
                type: "panelSnapshotChunk",
                payload: {
                    chunkIndex: reader.getShort(),
                    totalChunks: reader.getShort(),
                    chunk: reader.getString(),
                },
            };

        case CLIENT_PACKET_ID.characterStatsSnapshot: {
            const rawSnapshot = reader.getString();
            return {
                type: "characterStatsSnapshot",
                payload: JSON.parse(rawSnapshot) as CharacterStatsSnapshot,
            };
        }

        case CLIENT_PACKET_ID.characterStatsSnapshotChunk:
            return {
                type: "characterStatsSnapshotChunk",
                payload: {
                    chunkIndex: reader.getShort(),
                    totalChunks: reader.getShort(),
                    chunk: reader.getString(),
                },
            };
        case CLIENT_PACKET_ID.partyState: {
            const rawMembers = reader.getString();

            try {
                return {
                    type: "partyState",
                    payload: JSON.parse(rawMembers) as PartyHudStateDelta,
                };
            } catch {
                return { type: "unknown", payload: { packetId } };
            }
        }
        case CLIENT_PACKET_ID.clanState: {
            const rawMembers = reader.getString();

            try {
                return {
                    type: "clanState",
                    payload: JSON.parse(rawMembers) as ClanHudStateDelta,
                };
            } catch {
                return { type: "unknown", payload: { packetId } };
            }
        }
        case CLIENT_PACKET_ID.startCastBar:
            return {
                type: "startCastBar",
                payload: {
                    id: reader.getDouble(),
                    durationMs: reader.getInt(),
                },
            };
        case CLIENT_PACKET_ID.stopCastBar:
            return {
                type: "stopCastBar",
                payload: { id: reader.getDouble() },
            };
        case CLIENT_PACKET_ID.error:
            return { type: "error", payload: { msg: reader.getString() } };
        case CLIENT_PACKET_ID.closeForce:
            return { type: "closeForce" };
        case CLIENT_PACKET_ID.pong:
            return {
                type: "pong",
                payload: {
                    token: reader.canReadBytes(4) ? reader.getInt() : 0,
                },
            };
        default:
            return { type: "unknown", payload: { packetId } };
    }
}

export function parseServerPacket(buffer: ArrayBuffer): ParsedServerPacket {
    if (buffer.byteLength === 0) {
        return { type: "unknown", payload: { packetId: -1 } };
    }

    const reader = new PacketReader(buffer, decodeHtmlEntities);
    const packetId = reader.getByte();
    return parseServerPacketById(packetId, reader);
}

export function parseServerFrame(buffer: ArrayBuffer): ParsedServerPacket[] {
    if (buffer.byteLength === 0) {
        return [{ type: "unknown", payload: { packetId: -1 } }];
    }

    const reader = new PacketReader(buffer, decodeHtmlEntities);
    const packetId = reader.getByte();

    if (packetId !== CLIENT_PACKET_ID.batch) {
        return [parseServerPacketById(packetId, reader)];
    }

    const packetCount = reader.getShort();
    const packets: ParsedServerPacket[] = [];

    for (let index = 0; index < packetCount; index++) {
        if (!reader.canReadBytes(2)) {
            return [{ type: "unknown", payload: { packetId } }];
        }

        const frameLength = reader.getShort();

        if (frameLength <= 0 || !reader.canReadBytes(frameLength)) {
            return [{ type: "unknown", payload: { packetId } }];
        }

        const frameBuffer = reader.getBytes(frameLength);
        packets.push(parseServerPacket(frameBuffer));
    }

    return packets;
}

export function inspectServerFramePacketIds(buffer: ArrayBuffer): number[] {
    if (buffer.byteLength === 0) {
        return [-1];
    }

    const reader = new PacketReader(buffer, decodeHtmlEntities);
    const packetId = reader.getByte();

    if (packetId !== CLIENT_PACKET_ID.batch) {
        return [packetId];
    }

    const packetCount = reader.getShort();
    const packetIds: number[] = [];

    for (let index = 0; index < packetCount; index++) {
        if (!reader.canReadBytes(2)) {
            return [packetId];
        }

        const frameLength = reader.getShort();

        if (frameLength <= 0 || !reader.canReadBytes(frameLength)) {
            return [packetId];
        }

        const frameBuffer = reader.getBytes(frameLength);

        if (frameBuffer.byteLength === 0) {
            packetIds.push(-1);
            continue;
        }

        packetIds.push(new DataView(frameBuffer).getUint8(0));
    }

    return packetIds;
}

export async function normalizeSocketMessageData(
    data: Blob | ArrayBuffer | ArrayBufferView,
): Promise<ArrayBuffer> {
    if (data instanceof ArrayBuffer) {
        return data;
    }

    if (data instanceof Blob) {
        return await data.arrayBuffer();
    }

    const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return view.slice().buffer;
}

export function createConnectCharacterPacket(params: {
    ticket: string;
    typeGame?: number;
    idChar?: number;
}): ArrayBuffer {
    return encodeClientPacket("connectCharacter", {
        ticket: params.ticket.trim(),
        typeGame: params.typeGame ?? 1,
        idChar: params.idChar ?? 0,
    }).buffer as ArrayBuffer;
}

export function createPositionPacket(
    heading: number,
    moveId: number,
): ArrayBuffer {
    return encodeClientPacket("position", { heading, moveId }).buffer as ArrayBuffer;
}

export function createResyncPositionPacket(): ArrayBuffer {
    return encodeClientPacket("resyncPosition").buffer as ArrayBuffer;
}

export function createClickPacket(
    x: number,
    y: number,
    button = 0,
): ArrayBuffer {
    return encodeClientPacket("click", { x, y, button }).buffer as ArrayBuffer;
}

export function createChangeHeadingPacket(heading: number): ArrayBuffer {
    return encodeClientPacket("changeHeading", { heading }).buffer as ArrayBuffer;
}

export function createPingPacket(token = 0): ArrayBuffer {
    return encodeClientPacket("ping", { token }).buffer as ArrayBuffer;
}

export function createChangeSeguroPacket(): ArrayBuffer {
    return encodeClientPacket("changeSeguro").buffer as ArrayBuffer;
}

export function createChangeClanSeguroPacket(): ArrayBuffer {
    return encodeClientPacket("changeClanSeguro").buffer as ArrayBuffer;
}

export function createDialogPacket(message: string): ArrayBuffer {
    return encodeClientPacket("dialog", { message }).buffer as ArrayBuffer;
}

export function createEquipItemPacket(slot: number): ArrayBuffer {
    return encodeClientPacket("equiparItem", { slot }).buffer as ArrayBuffer;
}

export function createUseItemClickPacket(slot: number): ArrayBuffer {
    return encodeClientPacket("useItemClick", { slot }).buffer as ArrayBuffer;
}

export function createUseItemUPacket(slot: number): ArrayBuffer {
    return encodeClientPacket("useItemU", { slot }).buffer as ArrayBuffer;
}

export function createDropItemPacket(
    slot: number,
    amount: number,
): ArrayBuffer {
    return encodeClientPacket("tirarItem", { slot, amount }).buffer as ArrayBuffer;
}

export function createPickupItemPacket(): ArrayBuffer {
    return encodeClientPacket("agarrarItem").buffer as ArrayBuffer;
}

export function createBuyItemPacket(slot: number, amount: number): ArrayBuffer {
    return encodeClientPacket("buyItem", { slot, amount }).buffer as ArrayBuffer;
}

export function createSellItemPacket(
    slot: number,
    amount: number,
): ArrayBuffer {
    return encodeClientPacket("sellItem", { slot, amount }).buffer as ArrayBuffer;
}

export function createAttackMeleePacket(): ArrayBuffer {
    return encodeClientPacket("attackMele").buffer as ArrayBuffer;
}

export function createAttackRangePacket(x: number, y: number): ArrayBuffer {
    return encodeClientPacket("attackRange", { x, y }).buffer as ArrayBuffer;
}

export function createAttackSpellPacket(
    spellSlot: number,
    x: number,
    y: number,
    preferSelfIfEmpty = false,
): ArrayBuffer {
    return encodeClientPacket("attackSpell", {
        spellSlot,
        x,
        y,
        preferSelfIfEmpty,
    }).buffer as ArrayBuffer;
}

export function createReorderSpellPacket(
    sourceSlot: number,
    targetSlot: number,
): ArrayBuffer {
    return encodeClientPacket("reorderSpell", { sourceSlot, targetSlot }).buffer as ArrayBuffer;
}

export function createReorderInventoryItemPacket(
    sourceSlot: number,
    targetSlot: number,
): ArrayBuffer {
    return encodeClientPacket("reorderInventoryItem", { sourceSlot, targetSlot }).buffer as ArrayBuffer;
}

export function createReorderBankItemPacket(
    sourceSlot: number,
    targetSlot: number,
): ArrayBuffer {
    return encodeClientPacket("reorderBankItem", { sourceSlot, targetSlot }).buffer as ArrayBuffer;
}

export function createChangeBankTabPacket(
    tab: "character" | "account" | "clan",
): ArrayBuffer {
    return encodeClientPacket("changeBankTab", { tab }).buffer as ArrayBuffer;
}

export function createDepositBankGoldPacket(amount: number): ArrayBuffer {
    return encodeClientPacket("depositBankGold", { amount }).buffer as ArrayBuffer;
}

export function createWithdrawBankGoldPacket(amount: number): ArrayBuffer {
    return encodeClientPacket("withdrawBankGold", { amount }).buffer as ArrayBuffer;
}

export function createCloseTradePacket(): ArrayBuffer {
    return encodeClientPacket("closeTrade").buffer as ArrayBuffer;
}

export function createMarketActionPacket(
    action: "refresh" | "create" | "buy" | "cancel" | "claim",
    payload: Record<string, unknown> = {},
): ArrayBuffer {
    return encodeClientPacket("marketAction", {
        action,
        ...payload,
    } as { action: typeof action } & Record<string, unknown>).buffer as ArrayBuffer;
}

export function createRetosActionPacket(
    action: "refresh" | "create" | "join" | "cancel",
    payload: Record<string, unknown> = {},
): ArrayBuffer {
    return encodeClientPacket("retosAction", {
        action,
        ...payload,
    } as { action: typeof action } & Record<string, unknown>).buffer as ArrayBuffer;
}

export function createToggleHiddenSkillPacket(): ArrayBuffer {
    return encodeClientPacket("toggleHiddenSkill").buffer as ArrayBuffer;
}

export function createCraftItemPacket(
    profession: "carpentry" | "blacksmith" | "tailoring",
    itemId: number,
    amount: number,
): ArrayBuffer {
    return encodeClientPacket("craftItem", {
        profession,
        itemId,
        amount,
    }).buffer as ArrayBuffer;
}

export function toPlayerHudState(snapshot: CharacterSnapshot): PlayerHudState {
    const now = Date.now();

    return {
        nameCharacter: snapshot.nameCharacter,
        id: snapshot.id,
        clan: snapshot.clan,
        map: snapshot.map,
        pos: snapshot.pos,
        idHead: snapshot.idHead,
        idBody: snapshot.idBody,
        privileges: snapshot.privileges,
        idClase: snapshot.idClase,
        color: snapshot.color,
        navegando: Boolean(snapshot.navegando),
        dead: snapshot.dead,
        deadWorldActive: snapshot.deadWorldActive,
        inmovilizado: (snapshot.tInmo ?? snapshot.inmovilizado) === 1,
        paralizado: (snapshot.tInmo ?? snapshot.inmovilizado) === 2,
        zonaSegura: snapshot.zonaSegura,
        seguroActivado: snapshot.seguroActivado,
        seguroClanActivado: snapshot.seguroClanActivado,
        invisibleSpell: snapshot.invisibleSpell,
        invisibleSpellRemainingMs: snapshot.invisibleSpellRemainingMs,
        invisibleSpellUpdatedAt:
            snapshot.invisibleSpell &&
            snapshot.invisibleSpellRemainingMs !== undefined
                ? now
                : 0,
        hiddenSkill: snapshot.hiddenSkill,
        level: snapshot.level,
        exp: snapshot.exp,
        expNextLevel: snapshot.expNextLevel,
        hp: snapshot.tHp ?? snapshot.hp,
        maxHp: snapshot.maxHp,
        mana: snapshot.tMana ?? snapshot.mana,
        maxMana: snapshot.maxMana,
        attrAgilidad: snapshot.attrAgilidad,
        attrFuerza: snapshot.attrFuerza,
        attrInteligencia: snapshot.attrInteligencia,
        attrConstitucion: snapshot.attrConstitucion,
        minHit: snapshot.minHit,
        maxHit: snapshot.maxHit,
        buffAgilidadSeconds: snapshot.buffAgilidadSeconds,
        buffFuerzaSeconds: snapshot.buffFuerzaSeconds,
        buffAgilidadUpdatedAt: snapshot.buffAgilidadSeconds ? now : 0,
        buffFuerzaUpdatedAt: snapshot.buffFuerzaSeconds ? now : 0,
        gold: snapshot.gold,
        inventory: snapshot.inventory ?? [],
        spells: snapshot.spells ?? [],
        partyMembers: [],
        clanMembers: [],
    };
}
