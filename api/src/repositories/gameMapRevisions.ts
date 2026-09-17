import type { PoolClient } from "pg";
import pool from "../db";

export const MAP_REVISION_SNAPSHOT_EVERY = 20;

export type MapRevisionOperation =
    | "paint"
    | "clear"
    | "publish"
    | "discard"
    | "revert"
    | "undo"
    | "redo"
    | "rollback"
    | "entity";

export type MapTileState = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
    status: "draft" | "published";
};

export type MapTileDelta = {
    x: number;
    y: number;
    layer: number;
    before: Pick<MapTileState, "grhIndex" | "blocked" | "status"> | null;
    after: Pick<MapTileState, "grhIndex" | "blocked" | "status"> | null;
};

export type MapRevisionSummary = {
    id: number;
    mapNum: number;
    revNum: number;
    operation: MapRevisionOperation;
    authorAccountId: string | null;
    recordKind: "delta" | "snapshot";
    changeCount: number;
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type MapRevisionDetail = MapRevisionSummary & {
    delta: MapTileDelta[];
    snapshot: MapTileState[] | null;
};

function tileKey(tile: Pick<MapTileState, "x" | "y" | "layer" | "status">): string {
    return `${tile.x}:${tile.y}:${tile.layer}:${tile.status}`;
}

function coordKey(tile: Pick<MapTileState, "x" | "y" | "layer">): string {
    return `${tile.x}:${tile.y}:${tile.layer}`;
}

export function normalizeMapState(tiles: MapTileState[]): MapTileState[] {
    return [...tiles].sort(
        (a, b) =>
            a.y - b.y ||
            a.x - b.x ||
            a.layer - b.layer ||
            a.status.localeCompare(b.status),
    );
}

export function diffMapStates(before: MapTileState[], after: MapTileState[]): MapTileDelta[] {
    const beforeByKey = new Map(before.map((t) => [tileKey(t), t]));
    const afterByKey = new Map(after.map((t) => [tileKey(t), t]));
    // Also index by coord ignoring status for publish draft->published moves
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    const out: MapTileDelta[] = [];

    for (const key of keys) {
        const prev = beforeByKey.get(key);
        const next = afterByKey.get(key);
        if (
            prev &&
            next &&
            prev.grhIndex === next.grhIndex &&
            prev.blocked === next.blocked &&
            prev.status === next.status
        ) {
            continue;
        }

        const [x, y, layer] = key.split(":").map(Number);
        out.push({
            x,
            y,
            layer,
            before: prev
                ? { grhIndex: prev.grhIndex, blocked: prev.blocked, status: prev.status }
                : null,
            after: next
                ? { grhIndex: next.grhIndex, blocked: next.blocked, status: next.status }
                : null,
        });
    }

    return out.sort((a, b) => a.y - b.y || a.x - b.x || a.layer - b.layer);
}

/** Apply a forward delta onto a state (used when reconstructing from snapshot). */
export function applyDeltaForward(state: MapTileState[], delta: MapTileDelta[]): MapTileState[] {
    const map = new Map(state.map((t) => [tileKey(t), { ...t }]));

    for (const change of delta) {
        if (change.before) {
            const beforeKey = `${change.x}:${change.y}:${change.layer}:${change.before.status}`;
            map.delete(beforeKey);
        }
        if (change.after) {
            const afterKey = `${change.x}:${change.y}:${change.layer}:${change.after.status}`;
            map.set(afterKey, {
                x: change.x,
                y: change.y,
                layer: change.layer,
                grhIndex: change.after.grhIndex,
                blocked: change.after.blocked,
                status: change.after.status,
            });
        }
    }

    return normalizeMapState([...map.values()]);
}

/** Invert a delta for undo. */
export function invertDelta(delta: MapTileDelta[]): MapTileDelta[] {
    return delta.map((change) => ({
        x: change.x,
        y: change.y,
        layer: change.layer,
        before: change.after,
        after: change.before,
    }));
}

export async function readMapState(
    client: PoolClient,
    mapNum: number,
): Promise<MapTileState[]> {
    const result = await client.query<{
        x: number;
        y: number;
        layer: number;
        grh_index: number | null;
        blocked: boolean | null;
        status: string;
    }>(
        `SELECT x, y, layer, grh_index, blocked, status
         FROM game_map_tile_overrides
         WHERE map_num = $1
         ORDER BY y, x, layer, status`,
        [mapNum],
    );

    return result.rows.map((row) => ({
        x: row.x,
        y: row.y,
        layer: row.layer,
        grhIndex: row.grh_index,
        blocked: row.blocked,
        status: row.status as "draft" | "published",
    }));
}

export async function replaceMapState(
    client: PoolClient,
    mapNum: number,
    state: MapTileState[],
): Promise<void> {
    await client.query(`DELETE FROM game_map_tile_overrides WHERE map_num = $1`, [mapNum]);

    for (const tile of state) {
        await client.query(
            `INSERT INTO game_map_tile_overrides
                 (map_num, x, y, layer, grh_index, blocked, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [mapNum, tile.x, tile.y, tile.layer, tile.grhIndex, tile.blocked, tile.status],
        );
    }
}

async function nextRevNum(client: PoolClient, mapNum: number): Promise<number> {
    const result = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(rev_num), 0) + 1 AS next
         FROM game_map_revisions
         WHERE map_num = $1`,
        [mapNum],
    );
    return Number(result.rows[0]?.next ?? 1);
}

/**
 * Append a revision from before/after states.
 * Stores a compact delta; also stores a full snapshot every N revisions.
 */
export async function appendMapRevisionFromStates(
    client: PoolClient,
    mapNum: number,
    operation: MapRevisionOperation,
    authorAccountId: string | null,
    before: MapTileState[],
    after: MapTileState[],
    metadata: Record<string, unknown> = {},
): Promise<number> {
    const delta = diffMapStates(before, after);
    if (delta.length === 0 && operation !== "undo" && operation !== "redo" && operation !== "rollback") {
        return 0;
    }

    const revNum = await nextRevNum(client, mapNum);
    const recordKind: "delta" | "snapshot" =
        revNum % MAP_REVISION_SNAPSHOT_EVERY === 0 ? "snapshot" : "delta";

    const result = await client.query<{ id: string }>(
        `INSERT INTO game_map_revisions
             (map_num, rev_num, operation, author_account_id, record_kind, delta, snapshot, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
         RETURNING id`,
        [
            mapNum,
            revNum,
            operation,
            authorAccountId,
            recordKind,
            JSON.stringify(delta),
            recordKind === "snapshot" ? JSON.stringify(normalizeMapState(after)) : null,
            JSON.stringify(metadata),
        ],
    );

    const revisionId = Number(result.rows[0]?.id ?? 0);

    await client.query(
        `INSERT INTO game_map_revision_heads
             (map_num, current_rev_num, redo_rev_num, updated_at)
         VALUES ($1, $2, NULL, NOW())
         ON CONFLICT (map_num) DO UPDATE
         SET current_rev_num = EXCLUDED.current_rev_num,
             redo_rev_num = NULL,
             updated_at = NOW()`,
        [mapNum, revNum],
    );

    return revisionId;
}

function rowToSummary(row: {
    id: string;
    map_num: number;
    rev_num: number;
    operation: string;
    author_account_id: string | null;
    record_kind: string;
    delta: MapTileDelta[];
    metadata: Record<string, unknown>;
    created_at: Date;
}): MapRevisionSummary {
    return {
        id: Number(row.id),
        mapNum: row.map_num,
        revNum: row.rev_num,
        operation: row.operation as MapRevisionOperation,
        authorAccountId: row.author_account_id,
        recordKind: row.record_kind as "delta" | "snapshot",
        changeCount: Array.isArray(row.delta) ? row.delta.length : 0,
        metadata: row.metadata ?? {},
        createdAt: row.created_at.toISOString(),
    };
}

export async function listMapRevisions(
    mapNum: number,
    limit = 50,
): Promise<MapRevisionSummary[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const result = await pool.query<{
        id: string;
        map_num: number;
        rev_num: number;
        operation: string;
        author_account_id: string | null;
        record_kind: string;
        delta: MapTileDelta[];
        metadata: Record<string, unknown>;
        created_at: Date;
    }>(
        `SELECT id, map_num, rev_num, operation, author_account_id, record_kind, delta, metadata, created_at
         FROM game_map_revisions
         WHERE map_num = $1
         ORDER BY rev_num DESC
         LIMIT $2`,
        [mapNum, safeLimit],
    );

    return result.rows.map(rowToSummary);
}

export async function getMapRevision(
    mapNum: number,
    revisionId: number,
): Promise<MapRevisionDetail | null> {
    const result = await pool.query<{
        id: string;
        map_num: number;
        rev_num: number;
        operation: string;
        author_account_id: string | null;
        record_kind: string;
        delta: MapTileDelta[];
        snapshot: MapTileState[] | null;
        metadata: Record<string, unknown>;
        created_at: Date;
    }>(
        `SELECT id, map_num, rev_num, operation, author_account_id, record_kind, delta, snapshot, metadata, created_at
         FROM game_map_revisions
         WHERE map_num = $1 AND id = $2
         LIMIT 1`,
        [mapNum, revisionId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
        ...rowToSummary(row),
        delta: row.delta ?? [],
        snapshot: row.snapshot ?? null,
    };
}

/** Rebuild map state at a given rev_num using nearest prior snapshot + deltas. */
export async function reconstructStateAtRev(
    client: PoolClient,
    mapNum: number,
    targetRevNum: number,
): Promise<MapTileState[]> {
    const snapshotResult = await client.query<{
        rev_num: number;
        snapshot: MapTileState[];
    }>(
        `SELECT rev_num, snapshot
         FROM game_map_revisions
         WHERE map_num = $1 AND record_kind = 'snapshot' AND rev_num <= $2 AND snapshot IS NOT NULL
         ORDER BY rev_num DESC
         LIMIT 1`,
        [mapNum, targetRevNum],
    );

    let state: MapTileState[] = snapshotResult.rows[0]?.snapshot
        ? normalizeMapState(snapshotResult.rows[0].snapshot)
        : [];
    const fromRev = Number(snapshotResult.rows[0]?.rev_num ?? 0);

    const deltas = await client.query<{ rev_num: number; delta: MapTileDelta[] }>(
        `SELECT rev_num, delta
         FROM game_map_revisions
         WHERE map_num = $1 AND rev_num > $2 AND rev_num <= $3
         ORDER BY rev_num ASC`,
        [mapNum, fromRev, targetRevNum],
    );

    for (const row of deltas.rows) {
        state = applyDeltaForward(state, row.delta ?? []);
    }

    return state;
}

export async function diffMapRevisions(
    mapNum: number,
    fromRevisionId: number,
    toRevisionId: number,
): Promise<MapTileDelta[]> {
    const client = await pool.connect();
    try {
        const from = await getMapRevision(mapNum, fromRevisionId);
        const to = await getMapRevision(mapNum, toRevisionId);
        if (!from || !to) {
            throw new Error("Revision de mapa no encontrada.");
        }

        const before = await reconstructStateAtRev(client, mapNum, from.revNum);
        const after = await reconstructStateAtRev(client, mapNum, to.revNum);
        return diffMapStates(before, after);
    } finally {
        client.release();
    }
}

export async function undoMap(
    mapNum: number,
    accountId: string,
): Promise<{ changed: boolean; revisionId: number | null; requiresRepublish: boolean }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const head = await client.query<{
            current_rev_num: number | null;
        }>(
            `SELECT current_rev_num FROM game_map_revision_heads WHERE map_num = $1 FOR UPDATE`,
            [mapNum],
        );

        const currentRevNum = Number(head.rows[0]?.current_rev_num ?? 0);
        if (!currentRevNum) {
            await client.query("COMMIT");
            return { changed: false, revisionId: null, requiresRepublish: false };
        }

        const currentRow = await client.query<{
            id: string;
            operation: string;
            delta: MapTileDelta[];
        }>(
            `SELECT id, operation, delta FROM game_map_revisions
             WHERE map_num = $1 AND rev_num = $2 LIMIT 1`,
            [mapNum, currentRevNum],
        );
        const current = currentRow.rows[0];
        if (!current || current.operation === "undo") {
            await client.query("COMMIT");
            return { changed: false, revisionId: null, requiresRepublish: false };
        }

        const before = await readMapState(client, mapNum);
        const inverted = invertDelta(current.delta ?? []);
        const after = applyDeltaForward(before, inverted);
        await replaceMapState(client, mapNum, after);

        const revisionId = await appendMapRevisionFromStates(
            client,
            mapNum,
            "undo",
            accountId,
            before,
            after,
            { undoneRevisionId: Number(current.id), undoneRevNum: currentRevNum },
        );

        // Point redo at the undone revision; current is the new undo rev.
        const newHead = await client.query<{ rev_num: number }>(
            `SELECT rev_num FROM game_map_revisions WHERE id = $1`,
            [revisionId],
        );
        await client.query(
            `UPDATE game_map_revision_heads
             SET current_rev_num = $2, redo_rev_num = $3, updated_at = NOW()
             WHERE map_num = $1`,
            [mapNum, Number(newHead.rows[0]?.rev_num ?? 0), currentRevNum],
        );

        await client.query("COMMIT");
        return {
            changed: true,
            revisionId,
            requiresRepublish: current.operation === "publish",
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function redoMap(
    mapNum: number,
    accountId: string,
): Promise<{ changed: boolean; revisionId: number | null }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const head = await client.query<{
            current_rev_num: number | null;
            redo_rev_num: number | null;
        }>(
            `SELECT current_rev_num, redo_rev_num FROM game_map_revision_heads WHERE map_num = $1 FOR UPDATE`,
            [mapNum],
        );

        const redoRevNum = Number(head.rows[0]?.redo_rev_num ?? 0);
        if (!redoRevNum) {
            await client.query("COMMIT");
            return { changed: false, revisionId: null };
        }

        const targetRow = await client.query<{ id: string; delta: MapTileDelta[] }>(
            `SELECT id, delta FROM game_map_revisions WHERE map_num = $1 AND rev_num = $2 LIMIT 1`,
            [mapNum, redoRevNum],
        );
        const target = targetRow.rows[0];
        if (!target) {
            await client.query("COMMIT");
            return { changed: false, revisionId: null };
        }

        const before = await readMapState(client, mapNum);
        const after = applyDeltaForward(before, target.delta ?? []);
        await replaceMapState(client, mapNum, after);

        const revisionId = await appendMapRevisionFromStates(
            client,
            mapNum,
            "redo",
            accountId,
            before,
            after,
            { redoneRevisionId: Number(target.id), redoneRevNum: redoRevNum },
        );

        const newHead = await client.query<{ rev_num: number }>(
            `SELECT rev_num FROM game_map_revisions WHERE id = $1`,
            [revisionId],
        );
        await client.query(
            `UPDATE game_map_revision_heads
             SET current_rev_num = $2, redo_rev_num = NULL, updated_at = NOW()
             WHERE map_num = $1`,
            [mapNum, Number(newHead.rows[0]?.rev_num ?? 0)],
        );

        await client.query("COMMIT");
        return { changed: true, revisionId };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function rollbackMap(
    mapNum: number,
    revisionId: number,
    accountId: string,
): Promise<{ revisionId: number; targetRevisionId: number; requiresRepublish: boolean }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const target = await client.query<{
            id: string;
            rev_num: number;
            operation: string;
        }>(
            `SELECT id, rev_num, operation FROM game_map_revisions
             WHERE map_num = $1 AND id = $2 LIMIT 1`,
            [mapNum, revisionId],
        );
        const row = target.rows[0];
        if (!row) {
            throw new Error("Revision de mapa no encontrada.");
        }

        const before = await readMapState(client, mapNum);
        const after = await reconstructStateAtRev(client, mapNum, Number(row.rev_num));
        await replaceMapState(client, mapNum, after);

        const createdId = await appendMapRevisionFromStates(
            client,
            mapNum,
            "rollback",
            accountId,
            before,
            after,
            { targetRevisionId: revisionId, targetRevNum: Number(row.rev_num) },
        );

        await client.query("COMMIT");

        const publishedBefore = before.some((t) => t.status === "published");
        const publishedAfter = after.some((t) => t.status === "published");
        return {
            revisionId: createdId,
            targetRevisionId: revisionId,
            requiresRepublish: publishedBefore !== publishedAfter || row.operation === "publish",
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
