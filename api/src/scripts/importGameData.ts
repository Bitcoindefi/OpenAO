import path from "path";

import pool from "../db";
import {
  loadCraftingRecipesJsonFromFile,
  loadNpcsJsonFromFile,
  loadObjectsJsonFromFile,
  loadSeedCraftingRecipesJson,
  loadSeedNpcsJson,
  loadSeedObjectsJson,
  loadSeedSmeltingRecipesJson,
  loadSmeltingRecipesJsonFromFile,
} from "../lib/gameData";
import { upsertGameCraftingRecipe } from "../repositories/gameCraftingRecipes";
import { importGameMapsFromSource } from "../repositories/gameMaps";
import { upsertGameNpc } from "../repositories/gameNpcs";
import { upsertGameObject } from "../repositories/gameObjects";
import { upsertGameSmeltingRecipe } from "../repositories/gameSmeltingRecipes";

function getOptionValue(name: string): string | null {
  const index = process.argv.findIndex((argument) => argument === `--${name}`);
  if (index < 0) {
    return null;
  }

  const nextValue = process.argv[index + 1];
  return nextValue?.trim() ? nextValue.trim() : null;
}

function resolveOptionalPath(value: string | null): string | null {
  return value ? path.resolve(process.cwd(), value) : null;
}

async function importObjects(filePath?: string | null): Promise<{ total: number; changed: number; unchanged: number }> {
  const rows = filePath ? loadObjectsJsonFromFile(filePath) : loadSeedObjectsJson();
  let changed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const result = await upsertGameObject(row.id, row.data);
    if (result.unchanged) {
      unchanged += 1;
    } else {
      changed += 1;
    }
  }

  return { total: rows.length, changed, unchanged };
}

async function importNpcs(filePath?: string | null): Promise<{ total: number; changed: number; unchanged: number }> {
  const rows = filePath ? loadNpcsJsonFromFile(filePath) : loadSeedNpcsJson();
  let changed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const result = await upsertGameNpc(row.id, row.data);
    if (result.unchanged) {
      unchanged += 1;
    } else {
      changed += 1;
    }
  }

  return { total: rows.length, changed, unchanged };
}

async function importCraftingRecipes(filePath?: string | null): Promise<{ total: number; changed: number; unchanged: number }> {
  const rows = filePath ? loadCraftingRecipesJsonFromFile(filePath) : loadSeedCraftingRecipesJson();
  let changed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const result = await upsertGameCraftingRecipe(row.id, row.data);
    if (result.unchanged) unchanged += 1;
    else changed += 1;
  }

  return { total: rows.length, changed, unchanged };
}

async function importSmeltingRecipes(filePath?: string | null): Promise<{ total: number; changed: number; unchanged: number }> {
  const rows = filePath ? loadSmeltingRecipesJsonFromFile(filePath) : loadSeedSmeltingRecipesJson();
  let changed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const result = await upsertGameSmeltingRecipe(row.id, row.data);
    if (result.unchanged) unchanged += 1;
    else changed += 1;
  }

  return { total: rows.length, changed, unchanged };
}

async function main(): Promise<void> {
  const positionalArgs = process.argv.slice(2).filter((argument) => argument !== "--");
  const mode = (positionalArgs[0] ?? "all").trim().toLowerCase();
  const objectsPath = resolveOptionalPath(getOptionValue("objects-path"));
  const npcsPath = resolveOptionalPath(getOptionValue("npcs-path"));
  const craftingPath = resolveOptionalPath(getOptionValue("crafting-path"));
  const smeltingPath = resolveOptionalPath(getOptionValue("smelting-path"));
  const mapsPath = resolveOptionalPath(getOptionValue("maps-path"));

  if (!["all", "objs", "npcs", "crafting", "smelting", "maps"].includes(mode)) {
    throw new Error(
      "Uso: pnpm import-game-data [all|objs|npcs|crafting|smelting|maps] [--objects-path ruta] [--npcs-path ruta] [--crafting-path ruta] [--smelting-path ruta] [--maps-path directorio]",
    );
  }

  if (mode === "all" || mode === "objs") {
    const objects = await importObjects(objectsPath);
    console.log(
      `Objects importados. Total: ${objects.total}. Nuevos/actualizados: ${objects.changed}. Sin cambios: ${objects.unchanged}.`,
    );
  }

  if (mode === "all" || mode === "npcs") {
    const npcs = await importNpcs(npcsPath);
    console.log(
      `NPCs importados. Total: ${npcs.total}. Nuevos/actualizados: ${npcs.changed}. Sin cambios: ${npcs.unchanged}.`,
    );
  }

  if (mode === "all" || mode === "crafting") {
    const crafting = await importCraftingRecipes(craftingPath);
    console.log(
      `Crafting importado. Total: ${crafting.total}. Nuevos/actualizados: ${crafting.changed}. Sin cambios: ${crafting.unchanged}.`,
    );
  }

  if (mode === "all" || mode === "smelting") {
    const smelting = await importSmeltingRecipes(smeltingPath);
    console.log(
      `Fundicion importada. Total: ${smelting.total}. Nuevos/actualizados: ${smelting.changed}. Sin cambios: ${smelting.unchanged}.`,
    );
  }

  if (mode === "all" || mode === "maps") {
    const maps = await importGameMapsFromSource(mapsPath ?? undefined);
    console.log(
      `Mapas importados. Total: ${maps.total}. Nuevos/actualizados: ${maps.changed}. Sin cambios: ${maps.unchanged}.`,
    );
  }
}

void main()
  .catch((error) => {
    console.error("No se pudo importar game data", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
