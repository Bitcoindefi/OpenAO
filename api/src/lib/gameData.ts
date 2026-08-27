import crypto from "crypto";
import fs from "fs";
import path from "path";

export type GameObjectRecordData = {
    name: string;
    objType: number;
    tipoPocion?: number;
    minModificador?: number;
    maxModificador?: number;
    grhIndex: number;
    anim?: number;
    agarrable?: number;
    valor: number;
    minHit?: number;
    maxHit?: number;
    minDef?: number;
    maxDef?: number;
    newbie?: number;
    proyectil?: number;
    noSeCae?: number;
    clasesNoPermitidas?: number[];
    indexAbierta?: number;
    indexCerrada?: number;
    llave?: number;
    cerrada?: number;
    spellIndex?: number;
    razaEnana?: number;
    abriga?: number;
    apu?: number;
    porcentaje?: number;
    resistenciaMagica?: number;
    staffDamageBonus?: number;
    magicDamageBonus?: number;
    magicPenetration?: number;
    minDefMag?: number;
    maxDefMag?: number;
    [key: string]: unknown;
};

export type GameNpcTradeEntry = { item: number; cant: number };

export type GameNpcRecordData = {
    name: string;
    npcType: number;
    idHead: number;
    idBody: number;
    movement: number;
    desc?: string;
    aguaValida?: number;
    exp?: number;
    gold?: number;
    hp?: number;
    maxHp?: number;
    minHit?: number;
    maxHit?: number;
    def?: number;
    poderAtaque?: number;
    poderEvasion?: number;
    magicResistance?: number;
    magicDef?: number;
    defM?: number;
    snd1?: number;
    snd2?: number;
    soundClose?: number;
    drop?: GameNpcTradeEntry[];
    objs?: GameNpcTradeEntry[];
    [key: string]: unknown;
};

export type GameCraftingRecipeRecordData = {
    id: number;
    profession: "carpentry" | "blacksmith" | "tailoring";
    category: string;
    sortOrder?: number;
    deleted?: boolean;
    itemId: number;
    skill: number;
    materials: Array<{ itemId: number; amount: number }>;
};

export type GameSmeltingRecipeRecordData = {
    id: number;
    mineralItemId: number;
    ingotItemId: number;
    requiredSkill: number;
    mineralsPerIngot: number;
};

type ObjectsById = Record<string, GameObjectRecordData>;
type NpcsById = Record<string, GameNpcRecordData>;
type CraftingRecipes = GameCraftingRecipeRecordData[];
type SmeltingRecipes = GameSmeltingRecipeRecordData[];

function resolveSeedJsonPath(
    fileName: string,
    compactFileName: string,
): string {
    const jsonDirectory = path.resolve(__dirname, "../jsons");
    const compactPath = path.join(jsonDirectory, compactFileName);

    if (fs.existsSync(compactPath)) {
        return compactPath;
    }

    return path.join(jsonDirectory, fileName);
}

const OBJECT_DEFAULTS: Record<string, unknown> = {
    name: "",
    objType: 0,
    tipoPocion: 0,
    minModificador: 0,
    maxModificador: 0,
    grhIndex: 0,
    anim: 0,
    agarrable: 0,
    valor: 0,
    minHit: 0,
    maxHit: 0,
    minDef: 0,
    maxDef: 0,
    newbie: 0,
    proyectil: 0,
    noSeCae: 0,
    clasesNoPermitidas: [],
    indexAbierta: 0,
    indexCerrada: 0,
    llave: 0,
    cerrada: 0,
    spellIndex: 0,
    razaEnana: 0,
    abriga: 0,
    apu: 0,
    porcentaje: 0,
    resistenciaMagica: 0,
    staffDamageBonus: 0,
    magicDamageBonus: 0,
    magicPenetration: 0,
    minDefMag: 0,
    maxDefMag: 0,
};

const NPC_DEFAULTS: Record<string, unknown> = {
    name: "",
    npcType: 0,
    idHead: 0,
    idBody: 0,
    movement: 0,
    aguaValida: 0,
    exp: 0,
    gold: 0,
    hp: 0,
    maxHp: 0,
    minHit: 0,
    maxHit: 0,
    def: 0,
    poderAtaque: 0,
    poderEvasion: 0,
    magicResistance: 0,
    magicDef: 0,
    defM: 0,
    snd1: 0,
    snd2: 0,
    soundClose: 0,
    objs: [],
    drop: [],
};

function sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
        );
    }

    return value;
}

export function stableStringify(value: unknown): string {
    return JSON.stringify(sortValue(value));
}

export function computeChecksum(value: unknown): string {
    return crypto
        .createHash("sha256")
        .update(stableStringify(value))
        .digest("hex");
}

export function normalizeObjectData(
    data: GameObjectRecordData,
): GameObjectRecordData {
    return {
        ...OBJECT_DEFAULTS,
        ...data,
        clasesNoPermitidas: Array.isArray(data.clasesNoPermitidas)
            ? data.clasesNoPermitidas
            : [],
    } as GameObjectRecordData;
}

export function normalizeNpcData(data: GameNpcRecordData): GameNpcRecordData {
    const normalized = {
        ...NPC_DEFAULTS,
        ...data,
        objs: Array.isArray(data.objs) ? data.objs : [],
        drop: Array.isArray(data.drop) ? data.drop : [],
    } as GameNpcRecordData;

    if (typeof data.magicDef === "number" && typeof data.defM !== "number") {
        normalized.defM = data.magicDef;
    }

    if (typeof data.defM === "number" && typeof data.magicDef !== "number") {
        normalized.magicDef = data.defM;
    }

    return normalized;
}

export function loadSeedObjectsJson(): Array<{
    id: number;
    data: GameObjectRecordData;
}> {
    const filePath = resolveSeedJsonPath("objs.json", "objs.compact.json");
    return loadObjectsJsonFromFile(filePath);
}

export function loadObjectsJsonFromFile(
    filePath: string,
): Array<{ id: number; data: GameObjectRecordData }> {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as ObjectsById;
    return Object.entries(raw)
        .map(([id, data]) => ({
            id: Number(id),
            data: normalizeObjectData(data),
        }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
}

export function loadSeedNpcsJson(): Array<{
    id: number;
    data: GameNpcRecordData;
}> {
    const filePath = resolveSeedJsonPath("npcs.json", "npcs.compact.json");
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return loadNpcsJsonFromFile(filePath);
}

export function loadNpcsJsonFromFile(
    filePath: string,
): Array<{ id: number; data: GameNpcRecordData }> {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as NpcsById;
    return Object.entries(raw)
        .map(([id, data]) => ({ id: Number(id), data: normalizeNpcData(data) }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
}

export function normalizeCraftingRecipeData(
    data: GameCraftingRecipeRecordData,
): GameCraftingRecipeRecordData {
    return {
        id: Number(data.id ?? 0),
        profession: data.profession,
        category: String(data.category ?? ""),
        sortOrder: Number(data.sortOrder ?? data.id ?? 0),
        deleted: Boolean(data.deleted ?? false),
        itemId: Number(data.itemId ?? 0),
        skill: Number(data.skill ?? 0),
        materials: Array.isArray(data.materials)
            ? data.materials.map((material) => ({
                  itemId: Number(material.itemId ?? 0),
                  amount: Number(material.amount ?? 0),
              }))
            : [],
    };
}

export function normalizeSmeltingRecipeData(
    data: GameSmeltingRecipeRecordData,
): GameSmeltingRecipeRecordData {
    return {
        id: Number(data.id ?? 0),
        mineralItemId: Number(data.mineralItemId ?? 0),
        ingotItemId: Number(data.ingotItemId ?? 0),
        requiredSkill: Number(data.requiredSkill ?? 0),
        mineralsPerIngot: Number(data.mineralsPerIngot ?? 0),
    };
}

export function loadSeedCraftingRecipesJson(): Array<{
    id: number;
    data: GameCraftingRecipeRecordData;
}> {
    const filePath = path.resolve(__dirname, "../jsons/craftingRecipes.json");
    return loadCraftingRecipesJsonFromFile(filePath);
}

export function loadCraftingRecipesJsonFromFile(
    filePath: string,
): Array<{ id: number; data: GameCraftingRecipeRecordData }> {
    const raw = JSON.parse(
        fs.readFileSync(filePath, "utf8"),
    ) as CraftingRecipes;
    return raw
        .map((data) => ({
            id: Number(data.id),
            data: normalizeCraftingRecipeData(data),
        }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
}

export function loadSeedSmeltingRecipesJson(): Array<{
    id: number;
    data: GameSmeltingRecipeRecordData;
}> {
    const filePath = path.resolve(__dirname, "../jsons/smeltingRecipes.json");
    return loadSmeltingRecipesJsonFromFile(filePath);
}

export function loadSmeltingRecipesJsonFromFile(
    filePath: string,
): Array<{ id: number; data: GameSmeltingRecipeRecordData }> {
    const raw = JSON.parse(
        fs.readFileSync(filePath, "utf8"),
    ) as SmeltingRecipes;
    return raw
        .map((data) => ({
            id: Number(data.id),
            data: normalizeSmeltingRecipeData(data),
        }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
}
