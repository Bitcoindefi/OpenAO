import type { PoolClient } from "pg";
import { z } from "zod";
import pool from "../db";
import { computeChecksum, loadSeedObjectsJson, normalizeObjectData, type GameObjectRecordData } from "../lib/gameData";

type GameObjectRow = {
  id: number;
  name: string;
  obj_type: number;
  data: GameObjectRecordData;
  checksum: string;
  version: string;
  updated_at: Date;
};

const gameObjectSchema = z.object({
  name: z.string().trim().min(1),
  objType: z.coerce.number().int().nonnegative(),
  grhIndex: z.coerce.number().int().nonnegative(),
  valor: z.coerce.number().int(),
}).catchall(z.unknown());

const listFiltersSchema = z.object({
  search: z.string().trim().optional(),
  objType: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  /**
   * Devuelve el catalogo completo en una sola pagina. El editor visual lo
   * necesita para buscar y filtrar del lado del cliente sobre 1.062 objetos.
   */
  all: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw === true || raw === "true" || raw === "1";
  }, z.boolean()),
});

/**
 * Tamano de pagina cuando se pide el catalogo entero. Es un techo, no un
 * objetivo: el catalogo real ronda los mil objetos y esto solo evita que un
 * `all=true` se convierta en una consulta sin limite.
 */
const FULL_CATALOG_PAGE_SIZE = 10_000;

let seedPromise: Promise<void> | null = null;

async function insertRevision(client: PoolClient, entityId: number, checksum: string): Promise<number> {
  const revisionResult = await client.query<{ id: string }>(
    `
      INSERT INTO game_data_revisions (kind, entity_id, action, checksum)
      VALUES ('objs', $1, 'upsert', $2)
      RETURNING id
    `,
    [entityId, checksum],
  );

  return Number(revisionResult.rows[0]?.id ?? 0);
}

async function ensureSeededInternal(): Promise<void> {
  const countResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM game_objects");
  if (Number(countResult.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rows = loadSeedObjectsJson();
    for (const row of rows) {
      const checksum = computeChecksum(row.data);
      await client.query(
        `
          INSERT INTO game_objects (id, name, obj_type, data, checksum, version, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, $5, 0, NOW())
          ON CONFLICT (id) DO NOTHING
        `,
        [row.id, row.data.name, row.data.objType, JSON.stringify(row.data), checksum],
      );
      const version = await insertRevision(client, row.id, checksum);
      await client.query("UPDATE game_objects SET version = $2 WHERE id = $1", [row.id, version]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureSeededInternal().finally(() => {
      seedPromise = null;
    });
  }

  await seedPromise;
}

export async function getCurrentGameObjectVersion(): Promise<number> {
  await ensureSeeded();
  const result = await pool.query<{ version: string }>(
    "SELECT COALESCE(MAX(version), 0)::text AS version FROM game_objects",
  );
  return Number(result.rows[0]?.version ?? 0);
}

function toGameObjectSummary(row: GameObjectRow) {
  return {
    id: row.id,
    name: row.name,
    objType: row.obj_type,
    grhIndex: Number(row.data.grhIndex ?? 0),
    version: Number(row.version),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listGameObjects(filters: unknown) {
  await ensureSeeded();
  const parsed = listFiltersSchema.parse(filters ?? {});
  const values: Array<string | number> = [];
  const conditions: string[] = [];
  const pageSize = parsed.all ? FULL_CATALOG_PAGE_SIZE : (parsed.limit ?? 100);
  const page = parsed.all ? 1 : (parsed.page ?? 1);
  const offset = (page - 1) * pageSize;

  if (parsed.search) {
    values.push(`%${parsed.search.toLowerCase()}%`);
    conditions.push(`(LOWER(name) LIKE $${values.length} OR CAST(id AS TEXT) LIKE $${values.length})`);
  }

  if (typeof parsed.objType === "number" && Number.isFinite(parsed.objType)) {
    values.push(parsed.objType);
    conditions.push(`obj_type = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM game_objects
      ${whereClause}
    `,
    values,
  );
  values.push(pageSize);
  values.push(offset);
  const result = await pool.query<GameObjectRow>(
    `
      SELECT id, name, obj_type, data, checksum, version::text AS version, updated_at
      FROM game_objects
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  const total = Number(countResult.rows[0]?.count ?? 0);

  return {
    objects: result.rows.map(toGameObjectSummary),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getGameObjectById(id: number) {
  await ensureSeeded();
  const result = await pool.query<GameObjectRow>(
    `
      SELECT id, name, obj_type, data, checksum, version::text AS version, updated_at
      FROM game_objects
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Game object not found");
  }

  return {
    ...toGameObjectSummary(row),
    checksum: row.checksum,
    data: normalizeObjectData(row.data),
  };
}

export async function upsertGameObject(id: number, input: unknown, updatedByAccountId?: string | null) {
  await ensureSeeded();
  const parsed = gameObjectSchema.parse(input);
  const data = normalizeObjectData(parsed as GameObjectRecordData);
  const checksum = computeChecksum(data);
  const current = await pool.query<{ checksum: string }>("SELECT checksum FROM game_objects WHERE id = $1 LIMIT 1", [id]);
  const currentChecksum = current.rows[0]?.checksum ?? null;

  if (currentChecksum === checksum) {
    const unchanged = await getGameObjectById(id);
    return { unchanged: true, object: unchanged };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO game_objects (id, name, obj_type, data, checksum, version, updated_by_account_id, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, 0, $6, NOW())
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name,
                      obj_type = EXCLUDED.obj_type,
                      data = EXCLUDED.data,
                      checksum = EXCLUDED.checksum,
                      updated_by_account_id = EXCLUDED.updated_by_account_id,
                      updated_at = NOW()
      `,
      [id, data.name, data.objType, JSON.stringify(data), checksum, updatedByAccountId ?? null],
    );
    const version = await insertRevision(client, id, checksum);
    await client.query("UPDATE game_objects SET version = $2 WHERE id = $1", [id, version]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const next = await getGameObjectById(id);
  return { unchanged: false, object: next };
}

export async function listGameObjectChangesSince(sinceVersion: number) {
  await ensureSeeded();
  const result = await pool.query<GameObjectRow>(
    `
      SELECT id, name, obj_type, data, checksum, version::text AS version, updated_at
      FROM game_objects
      WHERE version > $1
      ORDER BY version ASC
    `,
    [sinceVersion],
  );
  const currentVersion = result.rows.reduce((max, row) => Math.max(max, Number(row.version)), sinceVersion);

  return {
    currentVersion,
    changes: result.rows.map((row) => ({
      id: row.id,
      version: Number(row.version),
      data: normalizeObjectData(row.data),
    })),
  };
}
