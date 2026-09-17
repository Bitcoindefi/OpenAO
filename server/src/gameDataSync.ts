import type { DataObject } from "./types/runtime";

import { normalizeNpcData, type DataNpc } from "./npcData";
import { normalizeObjectsData } from "./objectData";
import { applyBalanceDataToVars, normalizeBalanceData, type RuntimeBalanceData } from "./balanceData";
import { normalizeCraftingRecipesData } from "./craftingRecipeData";
import { normalizeSmeltingRecipesData } from "./smeltingRecipeData";
import { getClientById } from "./runtimeRegistry";
import type { CraftingRecipe } from "./craftingRecipes";
import type { SmeltingRecipe } from "./smeltingRecipes";

export type ReloadObjectsDiffResult = {
    previousVersion: number;
    currentVersion: number;
    updatedObjects: number;
};

export type InitializeObjectsResult = {
    currentVersion: number;
    loadedObjects: number;
};

export type ReloadBalanceDiffResult = {
    previousVersion: number;
    currentVersion: number;
    updatedProfiles: number;
    refreshedCharacters: number;
};

export type InitializeBalanceResult = {
    currentVersion: number;
    loadedProfiles: number;
    refreshedCharacters: number;
};

export type ReloadNpcsDiffResult = {
    previousVersion: number;
    currentVersion: number;
    updatedTemplates: number;
    patchedLiveNpcs: number;
    skippedLiveNpcs: number;
};

export type ReloadCraftingRecipesDiffResult = {
    previousVersion: number;
    currentVersion: number;
    updatedRecipes: number;
};

export type ReloadMapsDiffResult = {
    reloadedMaps: number[];
    charactersPreserved: number;
    npcsPreserved: number;
};

export type InitializeNpcTemplatesResult = {
    currentVersion: number;
    loadedTemplates: number;
};

export type InitializeCraftingRecipesResult = {
    currentVersion: number;
    loadedRecipes: number;
};

export type InitializeSmeltingRecipesResult = {
    currentVersion: number;
    loadedRecipes: number;
};

type ObjectChangesResponse = {
    currentVersion: number;
    changes: Array<{ id: number; version: number; data: DataObject }>;
};

type NpcChangesResponse = {
    currentVersion: number;
    changes: Array<{ id: number; version: number; data: DataNpc }>;
};

type CraftingRecipeChangesResponse = {
    currentVersion: number;
    changes: Array<{ id: number; version: number; data: CraftingRecipe }>;
};

type BalanceChangesResponse = {
    currentVersion: number;
    changes: Array<{ id: number; version: number; data: RuntimeBalanceData }>;
};

type SmeltingRecipeChangesResponse = {
    currentVersion: number;
    changes: Array<{ id: number; version: number; data: SmeltingRecipe }>;
};

const vars = require("./vars");
const funct = require("./functions");
const game = require("./game");
const balance = require("./balance");

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

function stableStringify(value: unknown): string {
    return JSON.stringify(sortValue(value));
}

function applyObjectChanges(changes: ObjectChangesResponse["changes"]): number {
    const normalizedObjects = normalizeObjectsData(
        Object.fromEntries(changes.map((change) => [String(change.id), change.data])) as Record<string, DataObject>,
    );
    let updatedObjects = 0;

    for (const [id, data] of Object.entries(normalizedObjects)) {
        if (stableStringify(vars.datObj[id] ?? null) !== stableStringify(data)) {
            updatedObjects += 1;
        }

        vars.datObj[id] = data;
    }

    return updatedObjects;
}

function applyNpcTemplateChanges(changes: NpcChangesResponse["changes"]): Set<number> {
    const changedIds = new Set<number>();

    for (const change of changes) {
        const normalizedData = normalizeNpcData(change.data);
        vars.datNpc[change.id] = normalizedData;
        changedIds.add(change.id);
    }

    return changedIds;
}

function applyCraftingRecipeChanges(changes: CraftingRecipeChangesResponse["changes"]): void {
    const currentRecipes = Array.isArray(vars.craftingRecipes) ? (vars.craftingRecipes as CraftingRecipe[]) : [];
    const mergedRecipes = new Map<number, CraftingRecipe>(currentRecipes.map((recipe) => [recipe.id, recipe]));

    for (const recipe of normalizeCraftingRecipesData(changes.map((change) => change.data))) {
        if (recipe.deleted) {
            mergedRecipes.delete(recipe.id);
            continue;
        }
        mergedRecipes.set(recipe.id, recipe);
    }

    vars.craftingRecipes = Array.from(mergedRecipes.values()).sort((left, right) => left.id - right.id);
}

function applySmeltingRecipeChanges(changes: SmeltingRecipeChangesResponse["changes"]): void {
    vars.smeltingRecipes = normalizeSmeltingRecipesData(changes.map((change) => change.data));
}

function refreshConnectedCharactersFromBalance(): number {
    const handleProtocol = require("./handleProtocol");
    const socket = require("./socket");
    let refreshedCharacters = 0;

    for (const user of Object.values(vars.personajes as Record<string, Record<string, unknown>>)) {
        const raceId = Number(user.idRaza ?? 0);
        const classId = Number(user.idClase ?? 0);
        const level = Number(user.level ?? 0);
        const raceBalance = vars.balanceRazas?.[raceId];

        if (!raceBalance || !classId || !level) {
            continue;
        }

        const nextBkAttrFuerza = 18 + Number(raceBalance.fuerza ?? 0);
        const nextBkAttrAgilidad = 18 + Number(raceBalance.agilidad ?? 0);
        const nextAttrInteligencia = 18 + Number(raceBalance.inteligencia ?? 0);
        const nextAttrConstitucion = 18 + Number(raceBalance.constitucion ?? 0);
        const fuerzaDelta = Math.max(0, Number(user.attrFuerza ?? 0) - Number(user.bkAttrFuerza ?? nextBkAttrFuerza));
        const agilidadDelta = Math.max(
            0,
            Number(user.attrAgilidad ?? 0) - Number(user.bkAttrAgilidad ?? nextBkAttrAgilidad),
        );

        user.bkAttrFuerza = nextBkAttrFuerza;
        user.bkAttrAgilidad = nextBkAttrAgilidad;
        user.attrFuerza = nextBkAttrFuerza + fuerzaDelta;
        user.attrAgilidad = nextBkAttrAgilidad + agilidadDelta;
        user.attrInteligencia = nextAttrInteligencia;
        user.attrConstitucion = nextAttrConstitucion;

        const newMaxHp = balance.getMaxHpForLevel(classId, nextAttrConstitucion, level);
        const newMaxMana = balance.getMaxManaForLevel(classId, nextAttrInteligencia, level);
        const newMinHit = balance.getMinHitForLevel(classId, level);
        const newMaxHit = balance.getMaxHitForLevel(classId, level);

        user.maxHp = newMaxHp;
        user.hp = Math.min(Number(user.hp ?? newMaxHp), newMaxHp);
        user.maxMana = newMaxMana;
        user.mana = Math.min(Number(user.mana ?? newMaxMana), newMaxMana);
        user.minHit = newMinHit;
        user.maxHit = newMaxHit;

        const userId = Number(user.id ?? 0);
        const client = getClientById(userId);

        if (userId && client && client.readyState === client.OPEN) {
            handleProtocol.sendMyCharacter(user as any);
            socket.send(client);
        }

        refreshedCharacters += 1;
    }

    return refreshedCharacters;
}

function applyBalanceChanges(changes: BalanceChangesResponse["changes"]): number {
    for (const change of changes) {
        applyBalanceDataToVars(vars, normalizeBalanceData(change.data));
    }

    return refreshConnectedCharactersFromBalance();
}

function isNpcSafeToPatch(npc: Record<string, unknown>): boolean {
    const hp = Number(npc.hp ?? 0);
    const maxHp = Number(npc.maxHp ?? 0);
    const now = Date.now();

    if (maxHp > 0 && hp < maxHp) return false;
    if (Number(npc.paralizado ?? 0) > 0) return false;
    if (Number(npc.inmovilizado ?? 0) > 0) return false;
    if (npc.currentTargetId) return false;
    if (npc.summonedByUserId) return false;
    if (typeof npc.lastAggressedAt === "number" && now - npc.lastAggressedAt < 15000) return false;
    if (typeof npc.currentTargetLockedUntil === "number" && npc.currentTargetLockedUntil > now) return false;
    if (typeof npc.attackReservationExpiresAt === "number" && npc.attackReservationExpiresAt > now) return false;
    if (typeof npc.cooldownAtaque === "number" && npc.cooldownAtaque > now) return false;

    return true;
}

function patchLiveNpc(npc: Record<string, unknown>, data: DataNpc): void {
    npc.nameCharacter = data.name;
    npc.idHead = data.idHead;
    npc.idBody = data.idBody;
    npc.movement = data.movement;
    npc.npcType = data.npcType;
    npc.aguaValida = data.aguaValida ?? 0;
    npc.tierraInvalida = data.tierraInvalida ?? 0;
    npc.maxHp = data.maxHp ?? 0;
    npc.hp = data.maxHp ?? data.hp ?? 0;
    npc.minHit = data.minHit ?? 0;
    npc.maxHit = data.maxHit ?? 0;
    npc.def = data.def ?? 0;
    npc.defM = data.defM ?? data.magicDef ?? 0;
    npc.magicDef = data.magicDef ?? data.defM ?? 0;
    npc.magicResistance = data.magicResistance ?? 0;
    npc.poderAtaque = data.poderAtaque ?? 0;
    npc.poderEvasion = data.poderEvasion ?? 0;
    npc.snd1 = data.snd1 ?? 0;
    npc.snd2 = data.snd2 ?? 0;
    npc.soundClose = data.soundClose ?? 0;
    npc.drop = data.drop ?? [];
    npc.objs = data.objs ?? [];
    npc.desc = data.desc ?? "";
    npc.exp = data.exp ?? 0;
    npc.gold = data.gold ?? 0;

    const map = Number(npc.map ?? 0);
    const pos = npc.pos as { x?: number; y?: number } | undefined;

    if (
        map > 0 &&
        pos &&
        !game.validInitialNpcSpawn(
            { x: Number(pos.x ?? 0), y: Number(pos.y ?? 0) },
            map,
            Boolean(npc.aguaValida),
            Number(npc.movement ?? 0),
            Boolean(npc.tierraInvalida),
        )
    ) {
        const respawnPos = game.respawnNpc(map, Boolean(npc.aguaValida), Boolean(npc.tierraInvalida));

        npc.pos = {
            x: respawnPos.posNewX,
            y: respawnPos.posNewY,
        };
    }
}

async function reloadObjectsDiff(): Promise<ReloadObjectsDiffResult> {
    const previousVersion = Number(vars.gameDataVersions?.objs ?? 0);
    const result = (await funct.fetchUrl(`/internal/game-data/objects/changes?sinceVersion=${previousVersion}`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as ObjectChangesResponse;

    const updatedObjects = applyObjectChanges(result.changes);

    if (result.changes.length === 0) {
        const fullResult = (await funct.fetchUrl(`/internal/game-data/objects/changes?sinceVersion=0`, {
            headers: {
                Authorization: vars.tokenAuth,
            },
        })) as ObjectChangesResponse;

        const refreshedObjects = applyObjectChanges(fullResult.changes);
        vars.gameDataVersions.objs = fullResult.currentVersion;

        return {
            previousVersion,
            currentVersion: fullResult.currentVersion,
            updatedObjects: refreshedObjects,
        };
    }

    vars.gameDataVersions.objs = result.currentVersion;

    return {
        previousVersion,
        currentVersion: result.currentVersion,
        updatedObjects,
    };
}

async function reloadNpcsDiff(): Promise<ReloadNpcsDiffResult> {
    const previousVersion = Number(vars.gameDataVersions?.npcs ?? 0);
    const result = (await funct.fetchUrl(`/internal/game-data/npcs/changes?sinceVersion=${previousVersion}`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as NpcChangesResponse;
    const changedIds = applyNpcTemplateChanges(result.changes);
    let patchedLiveNpcs = 0;
    let skippedLiveNpcs = 0;

    for (const npc of Object.values(vars.npcs as Record<string, Record<string, unknown>>)) {
        const templateNpcIndex = Number(npc.templateNpcIndex ?? 0);
        if (!templateNpcIndex || !changedIds.has(templateNpcIndex)) {
            continue;
        }

        if (!isNpcSafeToPatch(npc)) {
            skippedLiveNpcs += 1;
            continue;
        }

        const data = vars.datNpc[templateNpcIndex] as DataNpc | undefined;
        if (!data) {
            continue;
        }

        patchLiveNpc(npc, data);
        patchedLiveNpcs += 1;
    }

    vars.gameDataVersions.npcs = result.currentVersion;

    return {
        previousVersion,
        currentVersion: result.currentVersion,
        updatedTemplates: result.changes.length,
        patchedLiveNpcs,
        skippedLiveNpcs,
    };
}

async function reloadCraftingRecipesDiff(): Promise<ReloadCraftingRecipesDiffResult> {
    const previousVersion = Number(vars.gameDataVersions?.craftingRecipes ?? 0);
    const result = (await funct.fetchUrl(
        `/internal/game-data/crafting-recipes/changes?sinceVersion=${previousVersion}`,
        {
            headers: {
                Authorization: vars.tokenAuth,
            },
        },
    )) as CraftingRecipeChangesResponse;

    applyCraftingRecipeChanges(result.changes);
    vars.gameDataVersions.craftingRecipes = result.currentVersion;

    return {
        previousVersion,
        currentVersion: result.currentVersion,
        updatedRecipes: result.changes.length,
    };
}

async function reloadBalanceDiff(): Promise<ReloadBalanceDiffResult> {
    const previousVersion = Number(vars.gameDataVersions?.balance ?? 0);
    const result = (await funct.fetchUrl(`/internal/game-data/balance/changes?sinceVersion=${previousVersion}`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as BalanceChangesResponse;

    const refreshedCharacters = applyBalanceChanges(result.changes);
    vars.gameDataVersions.balance = result.currentVersion;

    return {
        previousVersion,
        currentVersion: result.currentVersion,
        updatedProfiles: result.changes.length,
        refreshedCharacters,
    };
}

async function initializeObjectsFromApi(): Promise<InitializeObjectsResult> {
    const result = (await funct.fetchUrl(`/internal/game-data/objects/changes?sinceVersion=0`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as ObjectChangesResponse;

    applyObjectChanges(result.changes);
    vars.gameDataVersions.objs = result.currentVersion;

    return {
        currentVersion: result.currentVersion,
        loadedObjects: result.changes.length,
    };
}

async function initializeNpcTemplatesFromApi(): Promise<InitializeNpcTemplatesResult> {
    const result = (await funct.fetchUrl(`/internal/game-data/npcs/changes?sinceVersion=0`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as NpcChangesResponse;

    applyNpcTemplateChanges(result.changes);
    vars.gameDataVersions.npcs = result.currentVersion;

    return {
        currentVersion: result.currentVersion,
        loadedTemplates: result.changes.length,
    };
}

async function initializeCraftingRecipesFromApi(): Promise<InitializeCraftingRecipesResult> {
    const result = (await funct.fetchUrl(`/internal/game-data/crafting-recipes/changes?sinceVersion=0`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as CraftingRecipeChangesResponse;

    applyCraftingRecipeChanges(result.changes);
    vars.gameDataVersions.craftingRecipes = result.currentVersion;

    return {
        currentVersion: result.currentVersion,
        loadedRecipes: result.changes.length,
    };
}

async function initializeSmeltingRecipesFromApi(): Promise<InitializeSmeltingRecipesResult> {
    const result = (await funct.fetchUrl(`/internal/game-data/smelting-recipes/changes?sinceVersion=0`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as SmeltingRecipeChangesResponse;

    applySmeltingRecipeChanges(result.changes);
    vars.gameDataVersions.smeltingRecipes = result.currentVersion;

    return {
        currentVersion: result.currentVersion,
        loadedRecipes: result.changes.length,
    };
}

async function initializeBalanceFromApi(): Promise<InitializeBalanceResult> {
    const result = (await funct.fetchUrl(`/internal/game-data/balance/changes?sinceVersion=0`, {
        headers: {
            Authorization: vars.tokenAuth,
        },
    })) as BalanceChangesResponse;

    const refreshedCharacters = applyBalanceChanges(result.changes);
    vars.gameDataVersions.balance = result.currentVersion;

    return {
        currentVersion: result.currentVersion,
        loadedProfiles: result.changes.length,
        refreshedCharacters,
    };
}

function notifyCharactersOnReloadedMaps(reloadedMapIds: number[]): number {
    const handleProtocol = require("./handleProtocol");
    const socket = require("./socket");
    let notifiedCount = 0;
    const mapSet = new Set(reloadedMapIds);

    if (vars.personajes) {
        for (const user of Object.values(vars.personajes) as any[]) {
            const userMap = Number(user?.map ?? 0);
            const userId = Number(user?.id ?? 0);
            if (userMap && mapSet.has(userMap) && userId) {
                const client = getClientById(userId);
                if (client && client.readyState === client.OPEN) {
                    try {
                        handleProtocol.sendMyCharacter(user);
                        socket.send(client);
                        notifiedCount += 1;
                    } catch {
                        // Ignore detached socket
                    }
                }
            }
        }
    }
    return notifiedCount;
}

async function reloadMapsDiff(mapNum?: number): Promise<ReloadMapsDiffResult> {
    const LoadMaps = require("./loadMaps");
    const loader = new LoadMaps();

    let result: ReloadMapsDiffResult;
    if (typeof mapNum === "number" && mapNum > 0) {
        const singleResult = await loader.reloadMap(mapNum);
        result = {
            reloadedMaps: singleResult.reloaded ? [mapNum] : [],
            charactersPreserved: singleResult.charactersPreserved,
            npcsPreserved: singleResult.npcsPreserved,
        };
    } else {
        result = await loader.reloadAllMaps();
    }

    if (result.reloadedMaps.length > 0) {
        notifyCharactersOnReloadedMaps(result.reloadedMaps);
    }

    return result;
}

export {
    initializeBalanceFromApi,
    initializeCraftingRecipesFromApi,
    initializeNpcTemplatesFromApi,
    initializeObjectsFromApi,
    initializeSmeltingRecipesFromApi,
    reloadBalanceDiff,
    reloadCraftingRecipesDiff,
    reloadMapsDiff,
    reloadObjectsDiff,
    reloadNpcsDiff,
};
