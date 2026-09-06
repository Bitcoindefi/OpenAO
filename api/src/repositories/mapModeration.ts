import { z } from "zod";
import pool from "../db";
import {
    runAutomatedMapPreChecks,
    type MapPrecheckInput,
    type MapPrecheckResult,
} from "../lib/mapModerationPrecheck";

export const USER_MAP_ID_MIN = 600;
export const USER_MAP_ID_MAX = 999;

export const MODERATION_STATUSES = [
    "draft",
    "proposed",
    "in_review",
    "published",
    "rejected",
    "archived",
] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const REPORT_THRESHOLD = 3;

type UserMapRow = {
    map_num: number;
    owner_account_id: string;
    name: string;
    status: ModerationStatus;
    npc_count: number;
    object_count: number;
    asset_bytes: string;
    metadata: Record<string, unknown>;
    rejection_reason: string | null;
    proposed_at: Date | null;
    reviewed_at: Date | null;
    reviewer_account_id: string | null;
    automated_flags: unknown;
    created_at: Date;
    updated_at: Date;
};

function assertUserMapId(mapNum: number): void {
    if (
        !Number.isInteger(mapNum) ||
        mapNum < USER_MAP_ID_MIN ||
        mapNum > USER_MAP_ID_MAX
    ) {
        throw Object.assign(
            new Error(
                `map_num fuera del rango de mapas de usuario (${USER_MAP_ID_MIN}-${USER_MAP_ID_MAX})`,
            ),
            { statusCode: 400 },
        );
    }
}

function httpError(message: string, statusCode: number): Error {
    return Object.assign(new Error(message), { statusCode });
}

function flagsOf(row: UserMapRow): string[] {
    return Array.isArray(row.automated_flags)
        ? (row.automated_flags as string[])
        : [];
}

function toPublic(row: UserMapRow, extras?: { reportCount?: number }) {
    return {
        mapNum: row.map_num,
        ownerAccountId: row.owner_account_id,
        name: row.name,
        status: row.status,
        npcCount: row.npc_count,
        objectCount: row.object_count,
        assetBytes: Number(row.asset_bytes),
        metadata: row.metadata,
        rejectionReason: row.rejection_reason,
        proposedAt: row.proposed_at?.toISOString() ?? null,
        reviewedAt: row.reviewed_at?.toISOString() ?? null,
        reviewerAccountId: row.reviewer_account_id,
        automatedFlags: flagsOf(row),
        reportCount: extras?.reportCount ?? 0,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

const SELECT_MAP = `
  SELECT map_num, owner_account_id, name, status, npc_count, object_count,
         asset_bytes::text AS asset_bytes, metadata, rejection_reason,
         proposed_at, reviewed_at, reviewer_account_id, automated_flags,
         created_at, updated_at
  FROM user_maps
`;

const RETURNING_MAP = `
  RETURNING map_num, owner_account_id, name, status, npc_count, object_count,
            asset_bytes::text AS asset_bytes, metadata, rejection_reason,
            proposed_at, reviewed_at, reviewer_account_id, automated_flags,
            created_at, updated_at
`;

async function getMapRow(mapNum: number): Promise<UserMapRow> {
    assertUserMapId(mapNum);
    const result = await pool.query<UserMapRow>(
        `${SELECT_MAP} WHERE map_num = $1 LIMIT 1`,
        [mapNum],
    );
    const row = result.rows[0];
    if (!row) throw httpError("User map not found", 404);
    return row;
}

async function reportCountFor(mapNum: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_map_reports WHERE map_num = $1`,
        [mapNum],
    );
    return Number(result.rows[0]?.count ?? 0);
}

async function recordEvent(input: {
    mapNum: number;
    actorAccountId: string | null;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    note?: string | null;
}): Promise<void> {
    await pool.query(
        `
      INSERT INTO user_map_review_events (
        map_num, actor_account_id, action, from_status, to_status, note
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
        [
            input.mapNum,
            input.actorAccountId,
            input.action,
            input.fromStatus,
            input.toStatus,
            input.note ?? null,
        ],
    );
}

export async function isMapModerator(accountId: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM map_moderators WHERE account_id = $1 LIMIT 1`,
        [accountId],
    );
    return result.rows.length > 0;
}

export async function addMapModerator(
    accountId: string,
    addedByAccountId: string,
    notes = "",
) {
    await pool.query(
        `
      INSERT INTO map_moderators (account_id, added_by_account_id, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (account_id) DO UPDATE
        SET notes = EXCLUDED.notes,
            added_by_account_id = EXCLUDED.added_by_account_id
    `,
        [accountId, addedByAccountId, notes],
    );
}

export async function listMapModerators() {
    const result = await pool.query<{
        account_id: string;
        notes: string;
        created_at: Date;
    }>(
        `SELECT account_id, notes, created_at FROM map_moderators ORDER BY created_at ASC`,
    );
    return result.rows.map((row) => ({
        accountId: row.account_id,
        notes: row.notes,
        createdAt: row.created_at.toISOString(),
    }));
}

export function evaluateProposalContent(
    content: MapPrecheckInput,
): MapPrecheckResult {
    return runAutomatedMapPreChecks(content);
}

export function isPubliclyVisibleStatus(status: ModerationStatus): boolean {
    return status === "published";
}

const proposeSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    texts: z.array(z.string()).optional(),
    npcNames: z.array(z.string()).optional(),
    tiles: z
        .array(
            z.object({
                x: z.number().int(),
                y: z.number().int(),
                blocked: z.boolean(),
            }),
        )
        .default([]),
    spawnPoint: z
        .object({ x: z.number().int(), y: z.number().int() })
        .optional(),
    npcCount: z.number().int().min(0).optional(),
    objectCount: z.number().int().min(0).optional(),
    maxNpcsPerMap: z.number().int().min(0).optional(),
    maxObjectsPerMap: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function proposeUserMap(
    mapNum: number,
    ownerAccountId: string,
    input: unknown,
) {
    const parsed = proposeSchema.parse(input ?? {});
    const row = await getMapRow(mapNum);
    if (row.owner_account_id !== ownerAccountId) {
        throw httpError("No autorizado para proponer este mapa", 403);
    }
    if (row.status !== "draft" && row.status !== "rejected") {
        throw httpError(
            `Solo se pueden proponer mapas en draft o rejected (actual: ${row.status})`,
            400,
        );
    }

    const content: MapPrecheckInput = {
        name: parsed.name ?? row.name,
        texts: parsed.texts,
        npcNames: parsed.npcNames,
        tiles: parsed.tiles,
        spawnPoint: parsed.spawnPoint,
        npcCount: parsed.npcCount ?? row.npc_count,
        objectCount: parsed.objectCount ?? row.object_count,
        maxNpcsPerMap: parsed.maxNpcsPerMap,
        maxObjectsPerMap: parsed.maxObjectsPerMap,
    };
    const checks = evaluateProposalContent(content);
    const nextName = parsed.name ?? row.name;

    if (!checks.passed) {
        const reason = `Rechazado automaticamente: ${checks.flags.join("; ")}`;
        const updated = await pool.query<UserMapRow>(
            `
          UPDATE user_maps
          SET name = $2,
              status = 'rejected',
              rejection_reason = $3,
              automated_flags = $4::jsonb,
              proposed_at = NOW(),
              reviewed_at = NOW(),
              reviewer_account_id = NULL,
              metadata = COALESCE($5::jsonb, metadata),
              npc_count = COALESCE($6, npc_count),
              object_count = COALESCE($7, object_count),
              updated_at = NOW()
          WHERE map_num = $1
          ${RETURNING_MAP}
        `,
            [
                mapNum,
                nextName,
                reason,
                JSON.stringify(checks.flags),
                parsed.metadata ? JSON.stringify(parsed.metadata) : null,
                parsed.npcCount ?? null,
                parsed.objectCount ?? null,
            ],
        );
        await recordEvent({
            mapNum,
            actorAccountId: ownerAccountId,
            action: "propose",
            fromStatus: row.status,
            toStatus: "rejected",
            note: reason,
        });
        return {
            map: toPublic(updated.rows[0]),
            automatedChecks: checks,
            queued: false,
        };
    }

    const updated = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET name = $2,
          status = 'proposed',
          rejection_reason = NULL,
          automated_flags = '[]'::jsonb,
          proposed_at = NOW(),
          reviewed_at = NULL,
          reviewer_account_id = NULL,
          metadata = COALESCE($3::jsonb, metadata),
          npc_count = COALESCE($4, npc_count),
          object_count = COALESCE($5, object_count),
          updated_at = NOW()
      WHERE map_num = $1
      ${RETURNING_MAP}
    `,
        [
            mapNum,
            nextName,
            parsed.metadata ? JSON.stringify(parsed.metadata) : null,
            parsed.npcCount ?? null,
            parsed.objectCount ?? null,
        ],
    );
    await recordEvent({
        mapNum,
        actorAccountId: ownerAccountId,
        action: row.status === "rejected" ? "repropose" : "propose",
        fromStatus: row.status,
        toStatus: "proposed",
    });
    return {
        map: toPublic(updated.rows[0]),
        automatedChecks: checks,
        queued: true,
    };
}

export async function listModerationQueue() {
    const result = await pool.query<UserMapRow>(
        `
      ${SELECT_MAP}
      WHERE status IN ('proposed', 'in_review')
      ORDER BY COALESCE(proposed_at, created_at) ASC, map_num ASC
    `,
    );
    const maps = [];
    for (const row of result.rows) {
        maps.push(
            toPublic(row, { reportCount: await reportCountFor(row.map_num) }),
        );
    }
    return { maps };
}

export async function getModeratorPreview(mapNum: number) {
    const row = await getMapRow(mapNum);
    const graphics = await pool.query<{
        grh_index: number;
        width: number;
        height: number;
        byte_size: number;
        checksum: string;
        created_at: Date;
    }>(
        `
      SELECT grh_index, width, height, byte_size, checksum, created_at
      FROM game_uploaded_graphics
      WHERE uploaded_by_account_id = $1
      ORDER BY created_at DESC
      LIMIT 40
    `,
        [row.owner_account_id],
    );
    const events = await pool.query<{
        action: string;
        from_status: string | null;
        to_status: string | null;
        note: string | null;
        actor_account_id: string | null;
        created_at: Date;
    }>(
        `
      SELECT action, from_status, to_status, note, actor_account_id, created_at
      FROM user_map_review_events
      WHERE map_num = $1
      ORDER BY created_at DESC
      LIMIT 30
    `,
        [mapNum],
    );
    const reports = await pool.query<{
        reason: string;
        reporter_account_id: string;
        created_at: Date;
    }>(
        `
      SELECT reason, reporter_account_id, created_at
      FROM user_map_reports
      WHERE map_num = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
        [mapNum],
    );

    return {
        map: toPublic(row, { reportCount: reports.rows.length }),
        preview: {
            name: row.name,
            texts: [
                row.name,
                ...(Array.isArray(row.metadata?.signs)
                    ? (row.metadata.signs as unknown[]).map(String)
                    : []),
            ],
            metadata: row.metadata,
            assets: graphics.rows.map((g) => ({
                grhIndex: g.grh_index,
                width: g.width,
                height: g.height,
                byteSize: g.byte_size,
                checksum: g.checksum,
                createdAt: g.created_at.toISOString(),
            })),
            reports: reports.rows.map((r) => ({
                reason: r.reason,
                reporterAccountId: r.reporter_account_id,
                createdAt: r.created_at.toISOString(),
            })),
            events: events.rows.map((e) => ({
                action: e.action,
                fromStatus: e.from_status,
                toStatus: e.to_status,
                note: e.note,
                actorAccountId: e.actor_account_id,
                createdAt: e.created_at.toISOString(),
            })),
        },
    };
}

export async function claimUserMapForReview(
    mapNum: number,
    reviewerAccountId: string,
) {
    const row = await getMapRow(mapNum);
    if (row.status !== "proposed" && row.status !== "in_review") {
        throw httpError("El mapa no esta en cola de moderacion", 400);
    }
    const updated = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET status = 'in_review',
          reviewer_account_id = $2,
          updated_at = NOW()
      WHERE map_num = $1
      ${RETURNING_MAP}
    `,
        [mapNum, reviewerAccountId],
    );
    await recordEvent({
        mapNum,
        actorAccountId: reviewerAccountId,
        action: "claim",
        fromStatus: row.status,
        toStatus: "in_review",
    });
    return toPublic(updated.rows[0], {
        reportCount: await reportCountFor(mapNum),
    });
}

export async function approveUserMap(
    mapNum: number,
    reviewerAccountId: string,
) {
    const row = await getMapRow(mapNum);
    if (row.status !== "proposed" && row.status !== "in_review") {
        throw httpError(
            `No se puede aprobar un mapa en estado ${row.status}`,
            400,
        );
    }
    const updated = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET status = 'published',
          rejection_reason = NULL,
          reviewer_account_id = $2,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE map_num = $1
      ${RETURNING_MAP}
    `,
        [mapNum, reviewerAccountId],
    );
    await pool.query(`DELETE FROM user_map_reports WHERE map_num = $1`, [
        mapNum,
    ]);
    await recordEvent({
        mapNum,
        actorAccountId: reviewerAccountId,
        action: "approve",
        fromStatus: row.status,
        toStatus: "published",
    });
    return toPublic(updated.rows[0], { reportCount: 0 });
}

export async function rejectUserMap(
    mapNum: number,
    reviewerAccountId: string,
    reasonRaw: unknown,
) {
    const reason = String(reasonRaw ?? "").trim();
    if (reason.length < 3) {
        throw httpError(
            "Es obligatorio especificar un motivo al rechazar un mapa",
            400,
        );
    }
    const row = await getMapRow(mapNum);
    if (row.status !== "proposed" && row.status !== "in_review") {
        throw httpError(
            `No se puede rechazar un mapa en estado ${row.status}`,
            400,
        );
    }
    const updated = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET status = 'rejected',
          rejection_reason = $2,
          reviewer_account_id = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE map_num = $1
      ${RETURNING_MAP}
    `,
        [mapNum, reason, reviewerAccountId],
    );
    await recordEvent({
        mapNum,
        actorAccountId: reviewerAccountId,
        action: "reject",
        fromStatus: row.status,
        toStatus: "rejected",
        note: reason,
    });
    return toPublic(updated.rows[0], {
        reportCount: await reportCountFor(mapNum),
    });
}

export async function reportPublishedUserMap(
    mapNum: number,
    reporterAccountId: string,
    reasonRaw: unknown,
) {
    const reason = String(reasonRaw ?? "").trim();
    if (reason.length < 3) {
        throw httpError("El reporte necesita un motivo", 400);
    }
    const row = await getMapRow(mapNum);
    if (row.status !== "published") {
        throw httpError("Solo se pueden reportar mapas publicados", 400);
    }
    if (row.owner_account_id === reporterAccountId) {
        throw httpError("No podes reportar tu propio mapa", 400);
    }

    await pool.query(
        `
      INSERT INTO user_map_reports (map_num, reporter_account_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (map_num, reporter_account_id) DO UPDATE
        SET reason = EXCLUDED.reason, created_at = NOW()
    `,
        [mapNum, reporterAccountId, reason],
    );

    const count = await reportCountFor(mapNum);
    await recordEvent({
        mapNum,
        actorAccountId: reporterAccountId,
        action: "report",
        fromStatus: row.status,
        toStatus: count >= REPORT_THRESHOLD ? "in_review" : row.status,
        note: reason,
    });

    if (count >= REPORT_THRESHOLD && row.status === "published") {
        const updated = await pool.query<UserMapRow>(
            `
          UPDATE user_maps
          SET status = 'in_review',
              updated_at = NOW()
          WHERE map_num = $1
          ${RETURNING_MAP}
        `,
            [mapNum],
        );
        return {
            map: toPublic(updated.rows[0], { reportCount: count }),
            returnedToQueue: true,
            reportThreshold: REPORT_THRESHOLD,
        };
    }

    return {
        map: toPublic(row, { reportCount: count }),
        returnedToQueue: false,
        reportThreshold: REPORT_THRESHOLD,
    };
}

export async function unpublishUserMap(
    mapNum: number,
    reviewerAccountId: string,
    reasonRaw: unknown,
) {
    const reason = String(reasonRaw ?? "").trim();
    if (reason.length < 3) {
        throw httpError("Despublicar exige un motivo", 400);
    }
    const row = await getMapRow(mapNum);
    if (row.status !== "published" && row.status !== "in_review") {
        throw httpError(
            `No se puede despublicar un mapa en estado ${row.status}`,
            400,
        );
    }
    const updated = await pool.query<UserMapRow>(
        `
      UPDATE user_maps
      SET status = 'rejected',
          rejection_reason = $2,
          reviewer_account_id = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE map_num = $1
      ${RETURNING_MAP}
    `,
        [mapNum, reason, reviewerAccountId],
    );
    await recordEvent({
        mapNum,
        actorAccountId: reviewerAccountId,
        action: "unpublish",
        fromStatus: row.status,
        toStatus: "rejected",
        note: reason,
    });
    return toPublic(updated.rows[0], {
        reportCount: await reportCountFor(mapNum),
    });
}

export async function ensureDraftUserMapForTests(input: {
    mapNum: number;
    ownerAccountId: string;
    name: string;
}) {
    assertUserMapId(input.mapNum);
    await pool.query(
        `
      INSERT INTO user_maps (map_num, owner_account_id, name, status)
      VALUES ($1, $2, $3, 'draft')
      ON CONFLICT (map_num) DO UPDATE
        SET owner_account_id = EXCLUDED.owner_account_id,
            name = EXCLUDED.name,
            status = 'draft',
            rejection_reason = NULL,
            automated_flags = '[]'::jsonb,
            reviewer_account_id = NULL,
            updated_at = NOW()
    `,
        [input.mapNum, input.ownerAccountId, input.name],
    );
}
