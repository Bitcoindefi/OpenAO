/**
 * Shared protocol type definitions for OpenAO.
 *
 * These types define the shape of data exchanged between client and server.
 */

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

export interface CraftingMaterial {
    itemId: number;
    name: string;
    amount: number;
    owned: number;
}

export interface CraftingRecipe {
    itemId: number;
    name: string;
    grhIndex: number;
    details: string;
    stats: string;
    skill: number;
    category: string;
    materials: CraftingMaterial[];
}

export interface CraftingState {
    profession: "carpentry" | "blacksmith" | "tailoring";
    title: string;
    recipes: CraftingRecipe[];
}

export interface MarketListingEntry {
    id: string;
    itemId: number;
    sellerName: string;
    itemName: string;
    itemGrhIndex: number;
    quantity: number;
    price: number;
    status: "active" | "sold" | "expired" | "cancelled";
    expiresAt: string;
    createdAt: string;
}

export interface MarketListingGroupEntry {
    itemId: number;
    itemName: string;
    itemGrhIndex: number;
    totalListings: number;
    totalQuantity: number;
    minUnitPrice: number;
    listings: MarketListingEntry[];
}

export interface MarketClaimEntry {
    id: string;
    claimType: "gold" | "item";
    goldAmount: number;
    itemName: string | null;
    itemGrhIndex: number | null;
    itemQuantity: number | null;
    createdAt: string;
}

export type MarketPriceSort = "recent" | "asc" | "desc";

export interface MarketState {
    npcName: string;
    publicationFeeBps: number;
    defaultDurationHours: number;
    maxDurationHours: number;
    hasMoreListings: boolean;
    listingGroups: MarketListingGroupEntry[];
    myListings: MarketListingEntry[];
    claims: MarketClaimEntry[];
}

export interface RetoEntry {
    id: string;
    createdAt: number;
    teamSize: 1 | 2;
    proposer: {
        id: string;
        persistedId: string;
        name: string;
        level: number;
        className: string;
        raceName: string;
    };
    participants: Array<{
        id: string;
        persistedId: string;
        name: string;
        level: number;
        className: string;
        raceName: string;
    }>;
}

export interface RetosState {
    challenges: RetoEntry[];
}

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

export interface PanelShare {
    type: string;
    count: number;
    percentage: number;
}

export interface PanelRow {
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
}

export interface PanelSnapshot {
    sampledAt: number;
    baselinePps60: number;
    entries: PanelRow[];
}

export interface PanelSnapshotChunk {
    chunkIndex: number;
    totalChunks: number;
    chunk: string;
}

export interface CharacterStatsSnapshot {
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
            rankTitle: string;
            nextRankTitle: string;
            scoreForNextRank: number;
        };
        caos: {
            score: number;
            currentRank: number;
            rankTitle: string;
            nextRankTitle: string;
            scoreForNextRank: number;
        };
    };
}

export interface CharacterStatsSnapshotChunk {
    chunkIndex: number;
    totalChunks: number;
    chunk: string;
}
