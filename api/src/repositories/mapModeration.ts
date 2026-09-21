import { z } from "zod";
import pool from "../db";
import { sanitizeName } from "../lib/text";
import {
    MAP_SIZE,
    listMapOverrides,
    listMapTileEntities,
    publishMap,
    unpublishMap,
    UPLOADED_GRAPHIC_INDEX_START,
    type MapTileEntity,
    type MapTileOverride,
} from "./worldBuilder";

/**
 * Etapa 5: propuesta y moderacion de mapas de usuario.
 *
 * El contenido de un mapa de usuario vive en game_map_tile_overrides /
 * game_map_tile_entities. Esta capa agrega el flujo de estados que decide
 * cuando ese contenido llega al mundo:
 *
 *   draft -> proposed -> in_review -> published
 *                    \-> rejected (con motivo)
 *
 * Publicar es lo unico que hace visible el mapa para el resto de los jugadores,
 * asi que mientras una propuesta no este aprobada sus borradores no salen del
 * editor. Los chequeos automaticos corren al enviar, antes de que la propuesta
 * llegue a la cola de un humano.
 */

export const MAP_PROPOSAL_STATUSES = [
    "draft",
    "proposed",
    "in_review",
    "published",
    "rejected",
] as const;

export type MapProposalStatus = (typeof MAP_PROPOSAL_STATUSES)[number];

export type MapAutoCheckIssue = {
    code: string;
    message: string;
};

export type MapAutoCheckReport = {
    ok: boolean;
    checkedAt: string;
    issues: MapAutoCheckIssue[];
};

export type MapProposal = {
    id: string;
    mapNum: number;
    ownerAccountId: string;
    name: string;
    description: string;
    entry: { x: number; y: number };
    status: MapProposalStatus;
    rejectionReason: string | null;
    autoCheckReport: MapAutoCheckReport | null;
    reviewedByAccountId: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type MapAssetGraphic = {
    grhIndex: number;
    width: number;
    height: number;
    byteSize: number;
    createdAt: string;
    url: string;
};

export type MapModerationDetail = {
    proposal: MapProposal;
    overrides: MapTileOverride[];
    entities: MapTileEntity[];
    graphics: MapAssetGraphic[];
};

type MapProposalRow = {
    id: string;
    map_num: number;
    owner_account_id: string;
    name: string;
    description: string;
    entry_x: number;
    entry_y: number;
    status: string;
    rejection_reason: string | null;
    auto_check_report: unknown;
    reviewed_by_account_id: string | null;
    submitted_at: Date | null;
    reviewed_at: Date | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
};

/**
 * Cuota maxima de tiles editados por mapa.
 *
 * Un mapa tiene MAP_SIZE x MAP_SIZE posiciones y el editor admite hasta 4 capas
 * por posicion (ver tilePaintSchema), asi que este es el techo fisico. Es una
 * red de seguridad contra datos corruptos, no un limite de diseno.
 */
export const MAX_MAP_TILE_OVERRIDES = MAP_SIZE * MAP_SIZE * 4;

/** Cuota maxima de objetos/NPCs colocados por mapa. */
export const MAX_MAP_ENTITIES = 500;

/** Cuota maxima de graficos subidos distintos que puede referenciar un mapa. */
export const MAX_MAP_UPLOADED_GRAPHICS = 500;

/**
 * Primera pasada de palabras prohibidas. Es una lista corta y explicita: la
 * idea es que la moderacion automatica ataje lo evidente y que el revisor vea
 * el resto. Ampliarla no requiere tocar la logica.
 */
export const DEFAULT_FORBIDDEN_WORDS = [
    "puta",
    "puto",
    "mierda",
    "porno",
    "nazi",
    "hitler",
    "violacion",
    "prostituta",
];

function normalizeForbiddenText(value: string): string {
    return ` ${sanitizeName(value).replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Devuelve una alerta por cada palabra prohibida encontrada en los textos. */
export function findForbiddenWords(
    texts: string[],
    forbidden: string[] = DEFAULT_FORBIDDEN_WORDS,
): MapAutoCheckIssue[] {
    const issues: MapAutoCheckIssue[] = [];
    const seen = new Set<string>();

    for (const text of texts) {
        const normalized = normalizeForbiddenText(text);

        for (const word of forbidden) {
            const needle = normalizeForbiddenText(word);

            if (needle.length <= 2 || !normalized.includes(needle)) {
                continue;
            }

            const key = `forbidden_word:${word}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            issues.push({
                code: "forbidden_word",
                message: `El texto contiene una palabra prohibida: "${word}".`,
            });
        }
    }

    return issues;
}

export type ReachabilityInput = {
    width: number;
    height: number;
    entry: { x: number; y: number };
    isBlocked: (x: number, y: number) => boolean;
};

/**
 * Detecta regiones aisladas y trampas sin salida.
 *
 * Recorre en anchura los tiles transitables alcanzables desde la entrada. Si
 * queda algun tile transitable afuera del recorrido, esta encerrado por tiles
 * bloqueados: nadie puede llegar ahi y, si hay personajes adentro, tampoco
 * pueden salir.
 */
export function checkReachability(
    input: ReachabilityInput,
): MapAutoCheckIssue[] {
    const { width, height, entry } = input;
    const inBounds = (x: number, y: number): boolean =>
        x >= 1 && x <= width && y >= 1 && y <= height;

    if (!inBounds(entry.x, entry.y)) {
        return [
            {
                code: "entry_out_of_bounds",
                message: "El punto de entrada esta fuera de los limites del mapa.",
            },
        ];
    }

    if (input.isBlocked(entry.x, entry.y)) {
        return [
            {
                code: "entry_blocked",
                message: "El punto de entrada esta sobre un tile bloqueado.",
            },
        ];
    }

    const key = (x: number, y: number): number => y * (width + 1) + x;
    const visited = new Set<number>([key(entry.x, entry.y)]);
    const queue: Array<{ x: number; y: number }> = [{ x: entry.x, y: entry.y }];
    const neighbors = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ] as const;

    let walkable = 0;

    for (let y = 1; y <= height; y += 1) {
        for (let x = 1; x <= width; x += 1) {
            if (!input.isBlocked(x, y)) {
                walkable += 1;
            }
        }
    }

    while (queue.length > 0) {
        const current = queue.pop() as { x: number; y: number };

        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;

            if (!inBounds(nx, ny) || input.isBlocked(nx, ny)) {
                continue;
            }

            const cellKey = key(nx, ny);

            if (visited.has(cellKey)) {
                continue;
            }

            visited.add(cellKey);
            queue.push({ x: nx, y: ny });
        }
    }

    const issues: MapAutoCheckIssue[] = [];

    if (walkable <= 1) {
        issues.push({
            code: "no_path_from_entry",
            message:
                "No hay ningun camino transitable desde el punto de entrada.",
        });
    }

    if (visited.size < walkable) {
        issues.push({
            code: "isolated_region",
            message: `Hay ${walkable - visited.size} tile(s) a los que no se puede llegar desde la entrada (zonas inalcanzables o trampas sin salida).`,
        });
    }

    return issues;
}

export type MapQuotaInput = {
    overrideCount: number;
    entityCount: number;
    uploadedGraphicCount: number;
};

/** Compara el contenido del mapa contra las cuotas permitidas. */
export function checkQuotas(input: MapQuotaInput): MapAutoCheckIssue[] {
    const issues: MapAutoCheckIssue[] = [];

    if (input.overrideCount > MAX_MAP_TILE_OVERRIDES) {
        issues.push({
            code: "too_many_tiles",
            message: `El mapa pinta ${input.overrideCount} tiles y el maximo es ${MAX_MAP_TILE_OVERRIDES}.`,
        });
    }

    if (input.entityCount > MAX_MAP_ENTITIES) {
        issues.push({
            code: "too_many_entities",
            message: `El mapa coloca ${input.entityCount} objetos/NPCs y el maximo es ${MAX_MAP_ENTITIES}.`,
        });
    }

    if (input.uploadedGraphicCount > MAX_MAP_UPLOADED_GRAPHICS) {
        issues.push({
            code: "too_many_uploaded_graphics",
            message: `El mapa usa ${input.uploadedGraphicCount} graficos subidos distintos y el maximo es ${MAX_MAP_UPLOADED_GRAPHICS}.`,
        });
    }

    return issues;
}

export type MapAutoCheckInput = {
    name: string;
    description: string;
    texts?: string[];
    entry: { x: number; y: number };
    blockedTiles: Array<{ x: number; y: number }>;
    overrideCount: number;
    entityCount: number;
    uploadedGraphicCount: number;
    width?: number;
    height?: number;
    now?: Date;
};

/**
 * Corre todos los chequeos automatizables de un mapa.
 *
 * Es una funcion pura (salvo el timestamp) para poder cubrirla con tests sin
 * base de datos y para reutilizarla desde cualquier punto del flujo.
 */
export function runAutomaticChecks(
    input: MapAutoCheckInput,
): MapAutoCheckReport {
    const width = input.width ?? MAP_SIZE;
    const height = input.height ?? MAP_SIZE;
    const blocked = new Set(
        input.blockedTiles.map((tile) => `${tile.x},${tile.y}`),
    );

    const issues: MapAutoCheckIssue[] = [
        ...findForbiddenWords([
            input.name,
            input.description,
            ...(input.texts ?? []),
        ]),
        ...checkReachability({
            width,
            height,
            entry: input.entry,
            isBlocked: (x, y) => blocked.has(`${x},${y}`),
        }),
        ...checkQuotas({
            overrideCount: input.overrideCount,
            entityCount: input.entityCount,
            uploadedGraphicCount: input.uploadedGraphicCount,
        }),
    ];

    return {
        ok: issues.length === 0,
        checkedAt: (input.now ?? new Date()).toISOString(),
        issues,
    };
}

export const proposalDraftSchema = z.object({
    mapNum: z.coerce.number().int().positive(),
    name: z.string().trim().min(3).max(60),
    description: z.string().trim().max(500).optional().default(""),
    entryX: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
    entryY: z.coerce.number().int().min(1).max(MAP_SIZE).optional(),
});

export const proposalReasonSchema = z.object({
    reason: z.string().trim().min(3).max(500),
});

function normalizeAutoCheckReport(value: unknown): MapAutoCheckReport | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const report = value as Partial<MapAutoCheckReport>;

    if (!Array.isArray(report.issues)) {
        return null;
    }

    return {
        ok: Boolean(report.ok),
        checkedAt:
            typeof report.checkedAt === "string" ? report.checkedAt : "",
        issues: report.issues.filter(
            (issue): issue is MapAutoCheckIssue =>
                Boolean(issue) &&
                typeof (issue as MapAutoCheckIssue).code === "string" &&
                typeof (issue as MapAutoCheckIssue).message === "string",
        ),
    };
}

function toMapProposal(row: MapProposalRow): MapProposal {
    return {
        id: row.id,
        mapNum: row.map_num,
        ownerAccountId: row.owner_account_id,
        name: row.name,
        description: row.description,
        entry: { x: row.entry_x, y: row.entry_y },
        status: row.status as MapProposalStatus,
        rejectionReason: row.rejection_reason,
        autoCheckReport: normalizeAutoCheckReport(row.auto_check_report),
        reviewedByAccountId: row.reviewed_by_account_id,
        submittedAt: row.submitted_at ? row.submitted_at.toISOString() : null,
        reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
        publishedAt: row.published_at ? row.published_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

async function getProposalRow(id: string): Promise<MapProposalRow | null> {
    const result = await pool.query<MapProposalRow>(
        `SELECT * FROM game_map_proposals WHERE id = $1 LIMIT 1`,
        [id],
    );

    return result.rows[0] ?? null;
}

async function getProposalRowByMap(
    mapNum: number,
): Promise<MapProposalRow | null> {
    const result = await pool.query<MapProposalRow>(
        `SELECT * FROM game_map_proposals WHERE map_num = $1 LIMIT 1`,
        [mapNum],
    );

    return result.rows[0] ?? null;
}

async function countMapUploadedGraphics(mapNum: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT grh_index)::text AS count
         FROM game_map_tile_overrides
         WHERE map_num = $1 AND grh_index >= $2`,
        [mapNum, UPLOADED_GRAPHIC_INDEX_START],
    );

    return Number(result.rows[0]?.count ?? 0);
}

async function listMapNpcNames(entities: MapTileEntity[]): Promise<string[]> {
    const ids = [
        ...new Set(
            entities
                .filter((entity) => entity.kind === "npc")
                .map((entity) => entity.entityId),
        ),
    ];

    if (ids.length === 0) {
        return [];
    }

    const result = await pool.query<{ name: string }>(
        `SELECT name FROM game_npcs WHERE id = ANY($1::int[])`,
        [ids],
    );

    return result.rows.map((row) => row.name);
}

async function listMapGraphics(
    overrides: MapTileOverride[],
): Promise<MapAssetGraphic[]> {
    const indices = [
        ...new Set(
            overrides
                .map((tile) => tile.grhIndex)
                .filter(
                    (grhIndex): grhIndex is number =>
                        grhIndex != null &&
                        grhIndex >= UPLOADED_GRAPHIC_INDEX_START,
                ),
        ),
    ];

    if (indices.length === 0) {
        return [];
    }

    const result = await pool.query<{
        grh_index: number;
        width: number;
        height: number;
        byte_size: number;
        created_at: Date;
    }>(
        `SELECT grh_index, width, height, byte_size, created_at
         FROM game_uploaded_graphics
         WHERE grh_index = ANY($1::int[])
         ORDER BY grh_index ASC`,
        [indices],
    );

    return result.rows.map((row) => ({
        grhIndex: row.grh_index,
        width: row.width,
        height: row.height,
        byteSize: row.byte_size,
        createdAt: row.created_at.toISOString(),
        url: `/game-data/graphics/${row.grh_index}.png`,
    }));
}

/**
 * Crea o actualiza el borrador de una propuesta.
 *
 * Un mapa sin propuesta arranca en 'draft'. Si ya existe y el autor la habia
 * enviado o rechazado, se reescribe el contenido y vuelve a borrador: el autor
 * corrige sobre lo mismo sin acumular filas.
 */
export async function saveProposalDraft(
    payload: unknown,
    ownerAccountId: string,
): Promise<MapProposal> {
    const parsed = proposalDraftSchema.parse(payload);
    const existing = await getProposalRowByMap(parsed.mapNum);

    if (existing) {
        if (existing.owner_account_id !== ownerAccountId) {
            throw new Error("Ese mapa ya tiene una propuesta de otra cuenta.");
        }

        if (
            existing.status === "proposed" ||
            existing.status === "in_review" ||
            existing.status === "published"
        ) {
            throw new Error(
                "No se puede editar una propuesta enviada o publicada.",
            );
        }

        const updated = await pool.query<MapProposalRow>(
            `UPDATE game_map_proposals
             SET name = $2,
                 description = $3,
                 entry_x = $4,
                 entry_y = $5,
                 status = 'draft',
                 rejection_reason = NULL,
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [
                existing.id,
                parsed.name,
                parsed.description,
                parsed.entryX ?? existing.entry_x,
                parsed.entryY ?? existing.entry_y,
            ],
        );

        return toMapProposal(updated.rows[0]);
    }

    const inserted = await pool.query<MapProposalRow>(
        `INSERT INTO game_map_proposals
             (map_num, owner_account_id, name, description, entry_x, entry_y)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            parsed.mapNum,
            ownerAccountId,
            parsed.name,
            parsed.description,
            parsed.entryX ?? 1,
            parsed.entryY ?? 1,
        ],
    );

    return toMapProposal(inserted.rows[0]);
}

/** Propuestas de un autor, con el motivo de rechazo si lo hay. */
export async function listOwnProposals(
    ownerAccountId: string,
): Promise<MapProposal[]> {
    const result = await pool.query<MapProposalRow>(
        `SELECT * FROM game_map_proposals
         WHERE owner_account_id = $1
         ORDER BY updated_at DESC`,
        [ownerAccountId],
    );

    return result.rows.map(toMapProposal);
}

/** Cola de moderacion: lo enviado, esperando o siendo revisado. */
export async function listModerationQueue(): Promise<MapProposal[]> {
    const result = await pool.query<MapProposalRow>(
        `SELECT * FROM game_map_proposals
         WHERE status IN ('proposed', 'in_review')
         ORDER BY submitted_at ASC NULLS LAST, updated_at ASC`,
    );

    return result.rows.map(toMapProposal);
}

/**
 * Envia una propuesta a revision.
 *
 * Corre los chequeos automaticos antes de encolarla. Si algo falla no llega a
 * un humano: queda rechazada automaticamente con el detalle para que el autor
 * corrija. Si pasa, queda en 'proposed' esperando que un moderador la abra.
 */
export async function submitProposal(
    id: string,
    ownerAccountId: string,
): Promise<MapProposal> {
    const existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (existing.owner_account_id !== ownerAccountId) {
        throw new Error("No sos el autor de esta propuesta.");
    }

    if (existing.status !== "draft" && existing.status !== "rejected") {
        throw new Error("La propuesta ya fue enviada.");
    }

    const [overrides, entities] = await Promise.all([
        listMapOverrides(existing.map_num, true),
        listMapTileEntities(existing.map_num, true),
    ]);

    const [uploadedGraphicCount, npcNames] = await Promise.all([
        countMapUploadedGraphics(existing.map_num),
        listMapNpcNames(entities),
    ]);

    const report = runAutomaticChecks({
        name: existing.name,
        description: existing.description,
        texts: npcNames,
        entry: { x: existing.entry_x, y: existing.entry_y },
        blockedTiles: overrides
            .filter((tile) => tile.blocked === true)
            .map((tile) => ({ x: tile.x, y: tile.y })),
        overrideCount: overrides.length,
        entityCount: entities.length,
        uploadedGraphicCount,
    });

    const nextStatus: MapProposalStatus = report.ok ? "proposed" : "rejected";
    const rejectionReason = report.ok
        ? null
        : report.issues.map((issue) => issue.message).join(" ");

    const result = await pool.query<MapProposalRow>(
        `UPDATE game_map_proposals
         SET status = $2,
             rejection_reason = $3,
             auto_check_report = $4::jsonb,
             submitted_at = NOW(),
             reviewed_by_account_id = NULL,
             reviewed_at = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, nextStatus, rejectionReason, JSON.stringify(report)],
    );

    return toMapProposal(result.rows[0]);
}

/**
 * Detalle para que un moderador revise sin entrar a jugar.
 *
 * Devuelve el mapa completo con borradores, las entidades colocadas y los
 * graficos subidos que referencia. Abrir una propuesta en 'proposed' la marca
 * como 'in_review': asi queda claro quien la tiene en la mano.
 */
export async function getModerationDetail(
    id: string,
): Promise<MapModerationDetail> {
    let existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (existing.status === "proposed") {
        const claimed = await pool.query<MapProposalRow>(
            `UPDATE game_map_proposals
             SET status = 'in_review', updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id],
        );

        existing = claimed.rows[0] ?? existing;
    }

    const [overrides, entities] = await Promise.all([
        listMapOverrides(existing.map_num, true),
        listMapTileEntities(existing.map_num, true),
    ]);

    return {
        proposal: toMapProposal(existing),
        overrides,
        entities,
        graphics: await listMapGraphics(overrides),
    };
}

/** Aprueba una propuesta: recien aca el mapa pasa a ser visible. */
export async function approveProposal(
    id: string,
    moderatorAccountId: string,
): Promise<MapProposal> {
    const existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (existing.status !== "proposed" && existing.status !== "in_review") {
        throw new Error("La propuesta no esta en revision.");
    }

    await publishMap(existing.map_num, moderatorAccountId);

    const result = await pool.query<MapProposalRow>(
        `UPDATE game_map_proposals
         SET status = 'published',
             rejection_reason = NULL,
             reviewed_by_account_id = $2,
             reviewed_at = NOW(),
             published_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, moderatorAccountId],
    );

    await pool.query(
        `UPDATE game_map_reports
         SET status = 'resolved',
             resolved_by_account_id = $2,
             resolved_at = NOW()
         WHERE proposal_id = $1 AND status = 'open'`,
        [id, moderatorAccountId],
    );

    return toMapProposal(result.rows[0]);
}

/**
 * Rechaza una propuesta con un motivo obligatorio.
 *
 * Si el mapa ya estaba publicado, ademas lo saca del mundo. El motivo viaja en
 * la fila y es lo que ve el autor para corregir y volver a proponer.
 */
export async function rejectProposal(
    id: string,
    moderatorAccountId: string,
    payload: unknown,
): Promise<MapProposal> {
    const { reason } = proposalReasonSchema.parse(payload);
    const existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (
        existing.status !== "proposed" &&
        existing.status !== "in_review" &&
        existing.status !== "published"
    ) {
        throw new Error(
            "La propuesta no se puede rechazar en su estado actual.",
        );
    }

    if (existing.published_at) {
        await unpublishMap(existing.map_num, moderatorAccountId);
    }

    const result = await pool.query<MapProposalRow>(
        `UPDATE game_map_proposals
         SET status = 'rejected',
             rejection_reason = $2,
             reviewed_by_account_id = $3,
             reviewed_at = NOW(),
             published_at = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, reason, moderatorAccountId],
    );

    return toMapProposal(result.rows[0]);
}

/**
 * Cualquier jugador reporta un mapa publicado.
 *
 * El reporte lo devuelve a la cola para que un moderador lo mire, pero no lo
 * despublica solo: mientras se revisa sigue visible. Bajar el mapa es una
 * accion explicita de moderacion.
 */
export async function reportProposal(
    id: string,
    reporterAccountId: string,
    payload: unknown,
): Promise<{ proposal: MapProposal; reportId: string }> {
    const { reason } = proposalReasonSchema.parse(payload);
    const existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (existing.status !== "published") {
        throw new Error("Solo se puede reportar un mapa publicado.");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const report = await client.query<{ id: string }>(
            `INSERT INTO game_map_reports (proposal_id, reporter_account_id, reason)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [id, reporterAccountId, reason],
        );

        const updated = await client.query<MapProposalRow>(
            `UPDATE game_map_proposals
             SET status = 'in_review',
                 reviewed_by_account_id = NULL,
                 reviewed_at = NULL,
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id],
        );

        await client.query("COMMIT");

        return {
            proposal: toMapProposal(updated.rows[0]),
            reportId: report.rows[0].id,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Despublica un mapa que ya estaba vivo sin borrar el trabajo del autor.
 *
 * Los tiles vuelven a borrador, asi dejan de verse en el juego, y la propuesta
 * queda rechazada con el motivo para que el autor pueda corregir.
 */
export async function unpublishProposal(
    id: string,
    moderatorAccountId: string,
    payload: unknown,
): Promise<MapProposal> {
    const parsed = proposalReasonSchema.partial().parse(payload ?? {});
    const reason = parsed.reason ?? "Despublicado por moderacion.";
    const existing = await getProposalRow(id);

    if (!existing) {
        throw new Error("La propuesta no existe.");
    }

    if (!existing.published_at) {
        throw new Error("El mapa no esta publicado.");
    }

    await unpublishMap(existing.map_num, moderatorAccountId);

    const result = await pool.query<MapProposalRow>(
        `UPDATE game_map_proposals
         SET status = 'rejected',
             rejection_reason = $2,
             reviewed_by_account_id = $3,
             reviewed_at = NOW(),
             published_at = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, reason, moderatorAccountId],
    );

    return toMapProposal(result.rows[0]);
}

export async function isModerator(accountId: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1 FROM game_map_moderators WHERE account_id = $1 LIMIT 1`,
        [accountId],
    );

    return (result.rowCount ?? 0) > 0;
}

export async function listModerators(): Promise<
    Array<{ accountId: string; name: string; email: string; createdAt: string }>
> {
    const result = await pool.query<{
        account_id: string;
        name: string;
        email: string;
        created_at: Date;
    }>(
        `SELECT m.account_id, a.name, a.email, m.created_at
         FROM game_map_moderators m
         JOIN accounts a ON a.id = m.account_id
         ORDER BY m.created_at ASC`,
    );

    return result.rows.map((row) => ({
        accountId: row.account_id,
        name: row.name,
        email: row.email,
        createdAt: row.created_at.toISOString(),
    }));
}

export async function addModerator(
    accountId: string,
    addedByAccountId: string,
): Promise<void> {
    const exists = await pool.query(
        `SELECT 1 FROM accounts WHERE id = $1 LIMIT 1`,
        [accountId],
    );

    if (exists.rowCount === 0) {
        throw new Error("La cuenta no existe.");
    }

    await pool.query(
        `INSERT INTO game_map_moderators (account_id, added_by_account_id)
         VALUES ($1, $2)
         ON CONFLICT (account_id) DO NOTHING`,
        [accountId, addedByAccountId],
    );
}

export async function removeModerator(accountId: string): Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM game_map_moderators WHERE account_id = $1`,
        [accountId],
    );

    return (result.rowCount ?? 0) > 0;
}
