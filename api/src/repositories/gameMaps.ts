import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { PoolClient } from "pg";
import pool from "../db";

type MapMeta = {
  id: number;
  name: string;
  musicNum: number;
  terreno: string;
  zona: string;
  pk: number;
};

type PaletteEntry = {
  graphics: (number | null)[];
  blocked: boolean;
};

type TerrainData = {
  id: number;
  width: number;
  height: number;
  palette: Record<string, PaletteEntry>;
  tiles?: number[][] | number[];
};

type MapRow = {
  id: number;
  name: string;
  terrain: string;
  zone: string;
  pk: boolean;
  music: number;
  version: string;
  checksum: string;
  updated_at: Date;
};

const MAP_SIZE = 100;

function computeChecksum(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function getMapsSourceDir(): string {
  return path.resolve(__dirname, "../mapas_source");
}

function resolveTiles(terrain: TerrainData): number[] {
  if (!terrain.tiles) return Array(terrain.width * terrain.height).fill(1);
  if (Array.isArray(terrain.tiles)) {
    if (terrain.tiles.length > 0 && Array.isArray(terrain.tiles[0])) {
      return (terrain.tiles as number[][]).flat();
    }
    return terrain.tiles as number[];
  }
  return Array(terrain.width * terrain.height).fill(1);
}

async function insertRevision(client: PoolClient, entityId: number, checksum: string): Promise<number> {
  const r = await client.query<{ id: string }>(
    'INSERT INTO game_data_revisions (kind, entity_id, action, checksum) VALUES (\'maps\', $1, \'upsert\', $2) RETURNING id',
    [entityId, checksum],
  );
  return Number(r.rows[0]?.id ?? 0);
}

// --- Seed ---

let seedPromise: Promise<void> | null = null;

async function ensureMapsSeededInternal(): Promise<void> {
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM game_maps',
  );
  if (Number(countResult.rows[0]?.count ?? 0) > 0) return;

  const sourceDir = getMapsSourceDir();
  if (!fs.existsSync(sourceDir)) {
    console.warn("Map source directory not found:", sourceDir);
    return;
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const mapDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name.match(/^mapa_(\d+)$/i))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => Number.parseInt(m[1], 10))
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const mapId of mapDirs) {
      const dir = path.join(sourceDir, "mapa_" + mapId);
      const metaPath = path.join(dir, "meta.json");
      const terrainPath = path.join(dir, "terrain.json");
      if (!fs.existsSync(metaPath) || !fs.existsSync(terrainPath)) continue;

      const meta: MapMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const terrain: TerrainData = JSON.parse(fs.readFileSync(terrainPath, "utf8"));
      const mapChecksum = computeChecksum({ meta, terrain });

      await client.query(
        'INSERT INTO game_maps (id, name, terrain, zone, pk, music, checksum, version, updated_at) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW()) ON CONFLICT (id) DO NOTHING',
        [mapId, meta.name, meta.terreno, meta.zona, meta.pk === 1, meta.musicNum ?? 0, mapChecksum],
      );

      if (terrain.palette) {
        const paletteEntries = Object.entries(terrain.palette);
        for (const [slotIndex, entry] of paletteEntries) {
          const graphicIds = entry.graphics.filter((g): g is number => g !== null);
          await client.query(
            'INSERT INTO game_map_palette (map_id, slot_index, graphic_ids, blocked) ' +
            'VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (map_id, slot_index) DO NOTHING',
            [mapId, Number(slotIndex), JSON.stringify(graphicIds), entry.blocked],
          );
        }
      }

      const tiles = resolveTiles(terrain);
      for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
          const tileIdx = tiles[y * terrain.width + x];
          const paletteEntry = terrain.palette?.[String(tileIdx)];
          const blocked = paletteEntry?.blocked ?? false;
          await client.query(
            'INSERT INTO game_map_tiles (map_id, x, y, tile_id, blocked) ' +
            'VALUES ($1, $2, $3, $4, $5) ON CONFLICT (map_id, x, y) DO NOTHING',
            [mapId, x + 1, y + 1, tileIdx, blocked],
          );
        }
      }

      const version = await insertRevision(client, mapId, mapChecksum);
      await client.query('UPDATE game_maps SET version = $2 WHERE id = $1', [mapId, version]);
    }
    await client.query("COMMIT");
    console.log("Seeded " + mapDirs.length + " maps");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureMapsSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureMapsSeededInternal().finally(() => { seedPromise = null; });
  }
  await seedPromise;
}

// --- Queries ---

export async function listGameMaps(filters?: { search?: string; limit?: number; page?: number }) {
  await ensureMapsSeeded();
  const search = filters?.search?.trim();
  const pageSize = Math.min(filters?.limit ?? 100, 200);
  const page = filters?.page ?? 1;
  const offset = (page - 1) * pageSize;
  const values: (string | number)[] = [];
  const conditions: string[] = [];

  if (search) {
    values.push("%" + search.toLowerCase() + "%");
    conditions.push("(LOWER(name) LIKE $" + (values.length) + " OR CAST(id AS TEXT) LIKE $" + (values.length) + ")");
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM game_maps ' + whereClause,
    values,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  values.push(pageSize, offset);
  const result = await pool.query<MapRow>(
    'SELECT id, name, terrain, zone, pk, music, version::text AS version, checksum, updated_at FROM game_maps ' +
    whereClause + " ORDER BY id ASC LIMIT $" + (values.length - 1) + " OFFSET $" + values.length,
    values,
  );

  return {
    maps: result.rows.map(function(r) {
      return { id: r.id, name: r.name, terrain: r.terrain, zone: r.zone, pk: r.pk, music: r.music, version: Number(r.version), updatedAt: r.updated_at.toISOString() };
    }),
    pagination: { page: page, pageSize: pageSize, total: total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getGameMapById(id: number) {
  await ensureMapsSeeded();
  const result = await pool.query<MapRow>(
    'SELECT id, name, terrain, zone, pk, music, version::text AS version, checksum, updated_at FROM game_maps WHERE id = $1 LIMIT 1',
    [id],
  );
  const mapRow = result.rows[0];
  if (!mapRow) return getMapFromFile(id);

  const tilesResult = await pool.query<{ x: number; y: number; tile_id: number; blocked: boolean }>(
    'SELECT x, y, tile_id, blocked FROM game_map_tiles WHERE map_id = $1 ORDER BY y, x',
    [id],
  );
  const paletteResult = await pool.query<{ slot_index: number; graphic_ids: number[]; blocked: boolean }>(
    'SELECT slot_index, graphic_ids, blocked FROM game_map_palette WHERE map_id = $1 ORDER BY slot_index',
    [id],
  );

  const tiles: number[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    tiles[y] = Array(MAP_SIZE).fill(1);
  }
  for (const t of tilesResult.rows) {
    const row = t.y - 1, col = t.x - 1;
    if (row >= 0 && row < MAP_SIZE && col >= 0 && col < MAP_SIZE) tiles[row][col] = t.tile_id;
  }

  const palette: Record<string, { graphics: number[]; blocked: boolean }> = {};
  for (const p of paletteResult.rows) {
    palette[String(p.slot_index)] = { graphics: p.graphic_ids, blocked: p.blocked };
  }

  return { id: mapRow.id, name: mapRow.name, terrain: mapRow.terrain, zone: mapRow.zone, pk: mapRow.pk, music: mapRow.music, version: Number(mapRow.version), width: MAP_SIZE, height: MAP_SIZE, palette: palette, tiles: tiles };
}

async function getMapFromFile(id: number) {
  const sourceDir = getMapsSourceDir();
  const dir = path.join(sourceDir, "mapa_" + id);
  const metaPath = path.join(dir, "meta.json");
  const terrainPath = path.join(dir, "terrain.json");
  if (!fs.existsSync(metaPath) || !fs.existsSync(terrainPath)) return null;
  const meta: MapMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const terrain: TerrainData = JSON.parse(fs.readFileSync(terrainPath, "utf8"));
  return { id: meta.id, name: meta.name, terrain: meta.terreno, zone: meta.zona, pk: meta.pk === 1, music: meta.musicNum ?? 0, width: terrain.width, height: terrain.height, palette: terrain.palette, tiles: terrain.tiles, fileFallback: true };
}

export async function listGameMapChangesSince(sinceVersion: number) {
  await ensureMapsSeeded();
  const result = await pool.query<MapRow>(
    'SELECT id, version::text AS version, checksum FROM game_maps WHERE version > $1 ORDER BY version ASC',
    [sinceVersion],
  );
  const currentVersion = result.rows.reduce(function(max, r) { return Math.max(max, Number(r.version)); }, sinceVersion);
  return { currentVersion: currentVersion, changes: result.rows.map(function(r) { return { id: r.id, version: Number(r.version), checksum: r.checksum }; }) };
}