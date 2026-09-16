import fs from "fs";
import path from "path";
import type { PoolClient } from "pg";
import { z } from "zod";
import pool from "../db";
import { computeChecksum } from "../lib/gameData";

type GameMapData = {
    meta: Record<string, unknown>;
    terrain: Record<string, unknown>;
    specials: Record<string, unknown>;
    npcs: unknown[];
};

type GameMapRow = {
    id: number;
    name: string;
    data: GameMapData;
    checksum: string;
    version: string;
    updated_at: Date;
};

const MAPS_SOURCE_DIR = path.resolve(__dirname, "../mapas_source");

function readJson(filePath: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function listSourceMapIds(): number[] {
    if (!fs.existsSync(MAPS_SOURCE_DIR)) {
        return [];
    }

    return fs
        .readdirSync(MAPS_SOURCE_DIR, { withFileTypes: true })
        .map((entry) => /^mapa_(\d+)$/i.exec(entry.name)?.[1])
        .filter((id): id is string => Boolean(id))
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
        .sort((left, right) => left - right);
}

function loadSourceMap(mapId: number): GameMapData {
    const mapDir = path.join(MAPS_SOURCE_DIR, `mapa_${mapId}`);
    const meta = { ...readJson(path.join(mapDir, "meta.json")), id: mapId };
    const terrain = readJson(path.join(mapDir, "terrain.json"));
    const specialsPath = path.join(mapDir, "specials.json");
    const npcsPath = path.join(mapDir, "npcs.json");
    const specials = fs.existsSync(specialsPath) ? readJson(specialsPath) : {};
    const npcs = fs.existsSync(npcsPath) ? JSON.parse(fs.readFileSync(npcsPath, "utf8")) : [];

    return {
        meta,
        terrain,
        specials,
        npcs: Array.isArray(npcs) ? npcs : [],
    };
}

async function insertRevision(
    client: PoolClient,
    entityId: number,
    checksum: string,
): Promise<number> {
    const revisionResult = await client.query<{ id: string }>(
        `
      INSERT INTO game_data_revisions (kind, entity_id, action, checksum)
      VALUES ('maps', $1, 'upsert', $2)
      RETURNING id
    `,
        [entityId, checksum],
    );

    return Number(revisionResult.rows[0]?.id ?? 0);
}

let seedPromise: Promise<void> | null = null;

export async function importSourceMaps(): Promise<{ imported: number; missing: number }> {
    // Import by map id so a partial migration can be completed without
    // overwriting maps edited after their first import.
    const mapIds = listSourceMapIds();
    const existing = await pool.query<{ id: number; checksum: string }>(
        "SELECT id, checksum FROM game_maps",
    );
    const existingById = new Map(existing.rows.map((row) => [row.id, row.checksum]));
    const missing = mapIds.filter((id) => !existingById.has(id));
    let imported = 0;

    for (const id of missing) {
        const data = loadSourceMap(id);
        const checksum = computeChecksum(data);
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const inserted = await client.query(
                "INSERT INTO game_maps (id, name, data, checksum, version, updated_at) VALUES ($1, $2, $3::jsonb, $4, 0, NOW()) ON CONFLICT (id) DO NOTHING",
                [id, String(data.meta.name ?? `Mapa ${id}`), JSON.stringify(data), checksum],
            );

            if (inserted.rowCount) {
                imported += 1;
                const version = await insertRevision(client, id, checksum);
                await client.query("UPDATE game_maps SET version = $2 WHERE id = $1", [id, version]);
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    return { imported, missing: missing.length };
}

async function ensureSeededInternal(): Promise<void> {
    await importSourceMaps();
}

async function ensureSeeded(): Promise<void> {
    if (!seedPromise) {
        seedPromise = ensureSeededInternal().finally(() => {
            seedPromise = null;
        });
    }

    await seedPromise;
}

function toSummary(row: GameMapRow) {
    return {
        id: row.id,
        name: row.name,
        version: Number(row.version),
        updatedAt: row.updated_at.toISOString(),
    };
}

export async function getGameMapById(id: number) {
    await ensureSeeded();
    const result = await pool.query<GameMapRow>(
        "SELECT id, name, data, checksum, version::text AS version, updated_at FROM game_maps WHERE id = $1 LIMIT 1",
        [id],
    );
    const row = result.rows[0];

    if (!row) {
        return null;
    }

    return {
        ...toSummary(row),
        checksum: row.checksum,
        data: row.data,
    };
}

export async function listGameMapChangesSince(sinceVersion: number) {
    await ensureSeeded();
    const result = await pool.query<GameMapRow>(
        `
      SELECT id, name, data, checksum, version::text AS version, updated_at
      FROM game_maps
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
            data: row.data,
        })),
    };
}

const gameMapSchema = z.object({
    meta: z.record(z.string(), z.unknown()),
    terrain: z.record(z.string(), z.unknown()),
    specials: z.record(z.string(), z.unknown()),
    npcs: z.array(z.unknown()),
});

export async function upsertGameMap(
    id: number,
    input: unknown,
    updatedByAccountId?: string | null,
) {
    await ensureSeeded();
    const data = gameMapSchema.parse(input) as GameMapData;
    data.meta = { ...data.meta, id };
    const name = String(data.meta.name ?? `Mapa ${id}`);
    const checksum = computeChecksum(data);
    const current = await pool.query<{ checksum: string }>(
        "SELECT checksum FROM game_maps WHERE id = $1 LIMIT 1",
        [id],
    );

    if (current.rows[0]?.checksum === checksum) {
        const unchanged = await getGameMapById(id);
        return { unchanged: true, map: unchanged };
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `
        INSERT INTO game_maps (id, name, data, checksum, version, updated_by_account_id, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, 0, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
                                       data = EXCLUDED.data,
                                       checksum = EXCLUDED.checksum,
                                       updated_by_account_id = EXCLUDED.updated_by_account_id,
                                       updated_at = NOW()
      `,
            [id, name, JSON.stringify(data), checksum, updatedByAccountId ?? null],
        );
        const version = await insertRevision(client, id, checksum);
        await client.query("UPDATE game_maps SET version = $2 WHERE id = $1", [id, version]);
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return { unchanged: false, map: await getGameMapById(id) };
}
