import pool from '../db';
import {
    runAutomatedMapChecks,
    UserMapData,
    UserMapQuotaLimits,
    AutomatedCheckResult,
    USER_MAP_START,
    USER_MAP_END,
    isUserMapNumber,
    isOfficialMapNumber,
    validateEconomyIsolation,
    validateWorldIsolation,
} from '../lib/mapValidation';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserMapState =
    | 'draft'
    | 'proposed'
    | 'in_review'
    | 'published'
    | 'rejected'
    | 'archived';

export type UserMapRecord = {
    id: string;
    owner_account_id: string;
    name: string;
    map_num: number;
    map_data: UserMapData;
    state: UserMapState;
    rejection_reason: string | null;
    npc_count: number;
    obj_count: number;
    allow_combat: boolean;
    allow_exp: boolean;
    proposed_at: Date | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
};

export type UserMapResponse = {
    id: string;
    ownerId: string;
    name: string;
    mapNum: number;
    state: UserMapState;
    rejectionReason: string | null;
    npcCount: number;
    objCount: number;
    allowCombat: boolean;
    allowExp: boolean;
    proposedAt: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    /** Preview data included for owner or moderators */
    mapData?: UserMapData;
    reportsCount?: number;
};

export type UserMapQuota = {
    maxMaps: number;
    maxNpcsPerMap: number;
    maxObjsPerMap: number;
    maxStorageBytes: number;
};

export type UserMapReport = {
    id: string;
    mapId: string;
    reporterAccountId: string;
    reason: string;
    createdAt: Date;
};

export type UserMapReview = {
    id: string;
    mapId: string;
    reviewerAccountId: string;
    action: 'approved' | 'rejected' | 'queued' | 'unpublished';
    notes: string | null;
    createdAt: Date;
};

// Default quotas applied to accounts unless overridden in user_map_quotas
export const DEFAULT_QUOTA: UserMapQuota = {
    maxMaps: 5,
    maxNpcsPerMap: 20,
    maxObjsPerMap: 50,
    maxStorageBytes: 5 * 1024 * 1024, // 5 MB
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toResponse(
    row: UserMapRecord & { reports_count?: string | number },
    includeMapData = false,
): UserMapResponse {
    return {
        id: row.id,
        ownerId: row.owner_account_id,
        name: row.name,
        mapNum: row.map_num,
        state: row.state,
        rejectionReason: row.rejection_reason,
        npcCount: row.npc_count,
        objCount: row.obj_count,
        allowCombat: row.allow_combat ?? false,
        allowExp: row.allow_exp ?? false,
        proposedAt: row.proposed_at,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(includeMapData ? { mapData: row.map_data } : {}),
        ...(row.reports_count !== undefined
            ? { reportsCount: Number(row.reports_count) }
            : {}),
    };
}

function countEntities(mapData: UserMapData): { npcCount: number; objCount: number } {
    const npcs = Array.isArray(mapData?.npcs) ? mapData.npcs.length : 0;
    const objs = Array.isArray(mapData?.specials) ? mapData.specials.length : 0;
    return { npcCount: npcs, objCount: objs };
}

// ── Range & Map Number Allocation ────────────────────────────────────────────

export async function allocateUserMapNumber(): Promise<number> {
    const res = await pool.query<{ next_num: string | number }>(
        `SELECT COALESCE(MAX(map_num), $1 - 1) + 1 AS next_num
         FROM user_maps
         WHERE map_num >= $1 AND map_num <= $2`,
        [USER_MAP_START, USER_MAP_END],
    );
    const next = Number(res.rows[0]?.next_num ?? USER_MAP_START);
    if (next > USER_MAP_END) {
        throw new Error('Se ha agotado el rango de IDs de mapas de usuario disponibles.');
    }
    return next;
}

// ── Quota Management ─────────────────────────────────────────────────────────

export async function getQuota(accountId: string): Promise<UserMapQuota> {
    const res = await pool.query<{
        max_maps: number;
        max_npcs_per_map: number;
        max_objs_per_map: number;
        max_storage_bytes?: number;
    }>(
        `SELECT max_maps, max_npcs_per_map, max_objs_per_map, max_storage_bytes
         FROM user_map_quotas
         WHERE account_id = $1`,
        [accountId],
    );
    if (res.rowCount === 0) return DEFAULT_QUOTA;
    const row = res.rows[0];
    return {
        maxMaps: row.max_maps,
        maxNpcsPerMap: row.max_npcs_per_map,
        maxObjsPerMap: row.max_objs_per_map,
        maxStorageBytes: row.max_storage_bytes ?? DEFAULT_QUOTA.maxStorageBytes,
    };
}

export async function setQuota(
    accountId: string,
    quota: Partial<UserMapQuota>,
): Promise<UserMapQuota> {
    const current = await getQuota(accountId);
    const updated: UserMapQuota = {
        maxMaps: quota.maxMaps ?? current.maxMaps,
        maxNpcsPerMap: quota.maxNpcsPerMap ?? current.maxNpcsPerMap,
        maxObjsPerMap: quota.maxObjsPerMap ?? current.maxObjsPerMap,
        maxStorageBytes: quota.maxStorageBytes ?? current.maxStorageBytes,
    };

    await pool.query(
        `INSERT INTO user_map_quotas (account_id, max_maps, max_npcs_per_map, max_objs_per_map, max_storage_bytes, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (account_id) DO UPDATE
         SET max_maps = EXCLUDED.max_maps,
             max_npcs_per_map = EXCLUDED.max_npcs_per_map,
             max_objs_per_map = EXCLUDED.max_objs_per_map,
             max_storage_bytes = EXCLUDED.max_storage_bytes,
             updated_at = NOW()`,
        [accountId, updated.maxMaps, updated.maxNpcsPerMap, updated.maxObjsPerMap, updated.maxStorageBytes],
    );

    return updated;
}

export async function countOwnedMaps(accountId: string): Promise<number> {
    const res = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM user_maps WHERE owner_account_id = $1 AND state != 'archived'`,
        [accountId],
    );
    return parseInt(res.rows[0]?.count ?? '0', 10);
}

// ── Map CRUD & State Transitions ─────────────────────────────────────────────

export async function createMap(
    ownerAccountId: string,
    name: string,
    mapData: UserMapData,
    requestedMapNum?: number,
): Promise<UserMapResponse | { error: string }> {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
        return { error: 'El nombre del mapa debe tener al menos 3 caracteres.' };
    }

    // 1. Quota checks
    const quota = await getQuota(ownerAccountId);
    const owned = await countOwnedMaps(ownerAccountId);
    if (owned >= quota.maxMaps) {
        return { error: `Alcanzaste el límite de cuota: máximo ${quota.maxMaps} mapas activos.` };
    }

    const { npcCount, objCount } = countEntities(mapData);
    if (npcCount > quota.maxNpcsPerMap) {
        return { error: `Cantidad de NPCs (${npcCount}) supera la cuota permitida (${quota.maxNpcsPerMap}).` };
    }
    if (objCount > quota.maxObjsPerMap) {
        return { error: `Cantidad de objetos (${objCount}) supera la cuota permitida (${quota.maxObjsPerMap}).` };
    }

    const byteSize = Buffer.byteLength(JSON.stringify(mapData), 'utf8');
    if (byteSize > quota.maxStorageBytes) {
        return { error: `El peso del mapa (${byteSize} bytes) supera la cuota de almacenamiento permitida (${quota.maxStorageBytes} bytes).` };
    }

    // 2. Economy & World isolation checks
    const economyCheck = validateEconomyIsolation(mapData);
    if (!economyCheck.ok) {
        return { error: `Aislamiento de economía: ${economyCheck.errors.join(' | ')}` };
    }

    const worldCheck = validateWorldIsolation(mapData);
    if (!worldCheck.ok) {
        return { error: `Aislamiento de mundo: ${worldCheck.errors.join(' | ')}` };
    }

    // 3. Allocate map_num in reserved range (100,000 - 999,999)
    let mapNum: number;
    if (requestedMapNum !== undefined) {
        if (!isUserMapNumber(requestedMapNum)) {
            return {
                error: `Número de mapa ${requestedMapNum} inválido. Los mapas de usuario deben estar en el rango reservado [${USER_MAP_START} - ${USER_MAP_END}]. No se permite solapar mapas del mundo oficial.`,
            };
        }
        // Verify not taken
        const exists = await pool.query(`SELECT 1 FROM user_maps WHERE map_num = $1`, [requestedMapNum]);
        if (exists.rowCount && exists.rowCount > 0) {
            return { error: `El número de mapa ${requestedMapNum} ya está en uso.` };
        }
        mapNum = requestedMapNum;
    } else {
        mapNum = await allocateUserMapNumber();
    }

    const res = await pool.query<UserMapRecord>(
        `INSERT INTO user_maps (owner_account_id, name, map_num, map_data, npc_count, obj_count, allow_combat, allow_exp, state, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'draft', NOW(), NOW())
         RETURNING *`,
        [ownerAccountId, trimmedName, mapNum, JSON.stringify(mapData), npcCount, objCount],
    );
    return toResponse(res.rows[0], true);
}

export async function getMapById(
    mapId: string,
    requestingAccountId?: string,
    isModerator = false,
): Promise<UserMapResponse | null> {
    const res = await pool.query<UserMapRecord & { reports_count?: string }>(
        `SELECT m.*,
                (SELECT COUNT(*) FROM user_map_reports r WHERE r.map_id = m.id) AS reports_count
         FROM user_maps m
         WHERE m.id = $1`,
        [mapId],
    );
    if (res.rowCount === 0) return null;

    const map = res.rows[0];
    const isOwner = map.owner_account_id === requestingAccountId;
    const canSeeData = isOwner || isModerator;

    // Non-owners and non-moderators can only see published maps
    if (!isOwner && !isModerator && map.state !== 'published') {
        return null;
    }

    return toResponse(map, canSeeData);
}

export async function getMapByNumber(
    mapNum: number,
    requestingAccountId?: string,
    isModerator = false,
): Promise<UserMapResponse | null> {
    if (!isUserMapNumber(mapNum)) {
        return null;
    }

    const res = await pool.query<UserMapRecord & { reports_count?: string }>(
        `SELECT m.*,
                (SELECT COUNT(*) FROM user_map_reports r WHERE r.map_id = m.id) AS reports_count
         FROM user_maps m
         WHERE m.map_num = $1`,
        [mapNum],
    );
    if (res.rowCount === 0) return null;

    const map = res.rows[0];
    const isOwner = map.owner_account_id === requestingAccountId;
    const canSeeData = isOwner || isModerator;

    if (!isOwner && !isModerator && map.state !== 'published') {
        return null;
    }

    return toResponse(map, canSeeData);
}

export async function listPublishedMaps(
    limit = 20,
    offset = 0,
): Promise<UserMapResponse[]> {
    const res = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps
         WHERE state = 'published'
         ORDER BY published_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
    );
    return res.rows.map((r) => toResponse(r, false));
}

export async function listOwnMaps(
    ownerAccountId: string,
): Promise<UserMapResponse[]> {
    const res = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps
         WHERE owner_account_id = $1 AND state != 'archived'
         ORDER BY updated_at DESC`,
        [ownerAccountId],
    );
    return res.rows.map((r) => toResponse(r, true));
}

export async function updateMapDraft(
    mapId: string,
    requestingAccountId: string,
    updates: { name?: string; mapData?: UserMapData },
): Promise<UserMapResponse | { error: string } | null> {
    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return null;

    const current = existing.rows[0];

    // Ownership check (Issue #24: Solo el dueño puede editar su mapa)
    if (current.owner_account_id !== requestingAccountId) {
        return { error: 'No autorizado: sólo el dueño puede modificar este mapa.' };
    }

    if (current.state !== 'draft' && current.state !== 'rejected') {
        return { error: 'Solo se pueden editar mapas en estado borrador o rechazado.' };
    }

    const newName = updates.name !== undefined ? updates.name.trim() : current.name;
    if (newName.length < 3) {
        return { error: 'El nombre del mapa debe tener al menos 3 caracteres.' };
    }

    const newMapData = updates.mapData ?? current.map_data;

    // Economy & World isolation validation
    const economyCheck = validateEconomyIsolation(newMapData);
    if (!economyCheck.ok) {
        return { error: `Aislamiento de economía: ${economyCheck.errors.join(' | ')}` };
    }

    const worldCheck = validateWorldIsolation(newMapData);
    if (!worldCheck.ok) {
        return { error: `Aislamiento de mundo: ${worldCheck.errors.join(' | ')}` };
    }

    const { npcCount, objCount } = countEntities(newMapData);
    const quota = await getQuota(requestingAccountId);
    if (npcCount > quota.maxNpcsPerMap) {
        return { error: `Cantidad de NPCs (${npcCount}) supera la cuota permitida (${quota.maxNpcsPerMap}).` };
    }
    if (objCount > quota.maxObjsPerMap) {
        return { error: `Cantidad de objetos (${objCount}) supera la cuota permitida (${quota.maxObjsPerMap}).` };
    }

    const byteSize = Buffer.byteLength(JSON.stringify(newMapData), 'utf8');
    if (byteSize > quota.maxStorageBytes) {
        return { error: `El peso del mapa (${byteSize} bytes) supera la cuota de almacenamiento (${quota.maxStorageBytes} bytes).` };
    }

    const res = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET name = $1,
             map_data = $2,
             npc_count = $3,
             obj_count = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [newName, JSON.stringify(newMapData), npcCount, objCount, mapId],
    );
    return toResponse(res.rows[0], true);
}

export async function deleteMap(
    mapId: string,
    requestingAccountId: string,
): Promise<{ ok: boolean; error?: string }> {
    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const current = existing.rows[0];
    if (current.owner_account_id !== requestingAccountId) {
        return { ok: false, error: 'No autorizado: sólo el dueño puede eliminar este mapa.' };
    }

    await pool.query(
        `UPDATE user_maps SET state = 'archived', updated_at = NOW() WHERE id = $1`,
        [mapId],
    );
    return { ok: true };
}

/**
 * Propose a map for moderation:
 * Runs automated pre-filtering checks before the map reaches human moderators.
 */
export async function proposeMap(
    mapId: string,
    requestingAccountId: string,
): Promise<{
    ok: boolean;
    map?: UserMapResponse;
    automatedChecks?: AutomatedCheckResult;
    error?: string;
}> {
    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) {
        return { ok: false, error: 'Mapa no encontrado.' };
    }

    const map = existing.rows[0];
    if (map.owner_account_id !== requestingAccountId) {
        return { ok: false, error: 'No autorizado: sólo el dueño puede proponer este mapa.' };
    }

    if (map.state !== 'draft' && map.state !== 'rejected') {
        return { ok: false, error: `El mapa no se puede proponer desde el estado '${map.state}'.` };
    }

    // 1. Run automated pre-moderation checks
    const quota = await getQuota(requestingAccountId);
    const checks = runAutomatedMapChecks(map.name, map.map_data, quota);

    if (!checks.passed) {
        return {
            ok: false,
            error: `El mapa no superó los chequeos automáticos: ${checks.errors.join(' | ')}`,
            automatedChecks: checks,
        };
    }

    // 2. Transition state to 'proposed'
    const res = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET state = 'proposed',
             rejection_reason = NULL,
             proposed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [mapId],
    );

    return {
        ok: true,
        map: toResponse(res.rows[0], true),
        automatedChecks: checks,
    };
}

// ── Moderation Queue & Actions ───────────────────────────────────────────────

export async function getModerationQueue(
    limit = 20,
    offset = 0,
    stateFilter?: 'proposed' | 'in_review',
): Promise<UserMapResponse[]> {
    const states = stateFilter ? [stateFilter] : ['proposed', 'in_review'];
    const res = await pool.query<UserMapRecord & { reports_count: string }>(
        `SELECT m.*,
                COALESCE(r.report_count, 0) AS reports_count
         FROM user_maps m
         LEFT JOIN (
             SELECT map_id, COUNT(*) AS report_count
             FROM user_map_reports
             GROUP BY map_id
         ) r ON r.map_id = m.id
         WHERE m.state = ANY($1)
         ORDER BY reports_count DESC, m.proposed_at ASC NULLS LAST, m.updated_at ASC
         LIMIT $2 OFFSET $3`,
        [states, limit, offset],
    );

    return res.rows.map((row) => toResponse(row, true));
}

export async function claimForReview(
    mapId: string,
    reviewerAccountId: string,
    notes?: string,
): Promise<{ ok: boolean; map?: UserMapResponse; error?: string }> {
    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const map = existing.rows[0];
    if (map.state !== 'proposed' && map.state !== 'in_review') {
        return { ok: false, error: `No se puede revisar un mapa en estado '${map.state}'.` };
    }

    const updated = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET state = 'in_review',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [mapId],
    );

    await pool.query(
        `INSERT INTO user_map_reviews (map_id, reviewer_account_id, action, notes, created_at)
         VALUES ($1, $2, 'queued', $3, NOW())`,
        [mapId, reviewerAccountId, notes ?? null],
    );

    return { ok: true, map: toResponse(updated.rows[0], true) };
}

export async function approveMap(
    mapId: string,
    reviewerAccountId: string,
    notes?: string,
): Promise<{ ok: boolean; map?: UserMapResponse; error?: string }> {
    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const map = existing.rows[0];
    if (map.state !== 'proposed' && map.state !== 'in_review') {
        return { ok: false, error: `No se puede aprobar un mapa en estado '${map.state}'.` };
    }

    const updated = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET state = 'published',
             published_at = NOW(),
             rejection_reason = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [mapId],
    );

    await pool.query(
        `INSERT INTO user_map_reviews (map_id, reviewer_account_id, action, notes, created_at)
         VALUES ($1, $2, 'approved', $3, NOW())`,
        [mapId, reviewerAccountId, notes ?? null],
    );

    return { ok: true, map: toResponse(updated.rows[0], true) };
}

export async function rejectMap(
    mapId: string,
    reviewerAccountId: string,
    reason: string,
    notes?: string,
): Promise<{ ok: boolean; map?: UserMapResponse; error?: string }> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
        return { ok: false, error: 'El motivo de rechazo es obligatorio para que el autor pueda corregirlo.' };
    }

    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const map = existing.rows[0];
    if (map.state !== 'proposed' && map.state !== 'in_review') {
        return { ok: false, error: `No se puede rechazar un mapa en estado '${map.state}'.` };
    }

    const updated = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET state = 'rejected',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [trimmedReason, mapId],
    );

    await pool.query(
        `INSERT INTO user_map_reviews (map_id, reviewer_account_id, action, notes, created_at)
         VALUES ($1, $2, 'rejected', $3, NOW())`,
        [mapId, reviewerAccountId, notes ? `${trimmedReason} | ${notes}` : trimmedReason],
    );

    return { ok: true, map: toResponse(updated.rows[0], true) };
}

export async function reportMap(
    mapId: string,
    reporterAccountId: string,
    reason: string,
): Promise<{ ok: boolean; error?: string }> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
        return { ok: false, error: 'El motivo del reporte es obligatorio.' };
    }

    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const map = existing.rows[0];
    if (map.state !== 'published') {
        return { ok: false, error: 'Solo se pueden reportar mapas actualmente publicados.' };
    }

    await pool.query(
        `INSERT INTO user_map_reports (map_id, reporter_account_id, reason, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (map_id, reporter_account_id) DO UPDATE
         SET reason = EXCLUDED.reason, created_at = NOW()`,
        [mapId, reporterAccountId, trimmedReason],
    );

    await pool.query(
        `UPDATE user_maps
         SET state = 'in_review',
             updated_at = NOW()
         WHERE id = $1`,
        [mapId],
    );

    return { ok: true };
}

export async function unpublishMap(
    mapId: string,
    moderatorAccountId: string,
    reason: string,
): Promise<{ ok: boolean; map?: UserMapResponse; error?: string }> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
        return { ok: false, error: 'El motivo de despublicación es obligatorio.' };
    }

    const existing = await pool.query<UserMapRecord>(
        `SELECT * FROM user_maps WHERE id = $1`,
        [mapId],
    );
    if (existing.rowCount === 0) return { ok: false, error: 'Mapa no encontrado.' };

    const map = existing.rows[0];
    if (map.state !== 'published' && map.state !== 'in_review') {
        return { ok: false, error: `No se puede despublicar un mapa en estado '${map.state}'.` };
    }

    const updated = await pool.query<UserMapRecord>(
        `UPDATE user_maps
         SET state = 'rejected',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [trimmedReason, mapId],
    );

    await pool.query(
        `INSERT INTO user_map_reviews (map_id, reviewer_account_id, action, notes, created_at)
         VALUES ($1, $2, 'unpublished', $3, NOW())`,
        [mapId, moderatorAccountId, trimmedReason],
    );

    return { ok: true, map: toResponse(updated.rows[0], true) };
}

export async function getMapReports(mapId: string): Promise<UserMapReport[]> {
    const res = await pool.query<{
        id: string;
        map_id: string;
        reporter_account_id: string;
        reason: string;
        created_at: Date;
    }>(
        `SELECT id, map_id, reporter_account_id, reason, created_at
         FROM user_map_reports
         WHERE map_id = $1
         ORDER BY created_at DESC`,
        [mapId],
    );
    return res.rows.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        reporterAccountId: r.reporter_account_id,
        reason: r.reason,
        createdAt: r.created_at,
    }));
}

export async function getMapReviews(mapId: string): Promise<UserMapReview[]> {
    const res = await pool.query<{
        id: string;
        map_id: string;
        reviewer_account_id: string;
        action: string;
        notes: string | null;
        created_at: Date;
    }>(
        `SELECT id, map_id, reviewer_account_id, action, notes, created_at
         FROM user_map_reviews
         WHERE map_id = $1
         ORDER BY created_at DESC`,
        [mapId],
    );
    return res.rows.map((r) => ({
        id: r.id,
        mapId: r.map_id,
        reviewerAccountId: r.reviewer_account_id,
        action: r.action as UserMapReview['action'],
        notes: r.notes,
        createdAt: r.created_at,
    }));
}
