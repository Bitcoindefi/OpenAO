import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as mapValidation from '../lib/mapValidation';
import * as userMaps from '../repositories/userMaps';

// ── In-Memory Mock Database ──────────────────────────────────────────────────

type MockMapRecord = {
    id: string;
    owner_account_id: string;
    name: string;
    map_data: mapValidation.UserMapData;
    state: userMaps.UserMapState;
    rejection_reason: string | null;
    npc_count: number;
    obj_count: number;
    proposed_at: Date | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
};

type MockReportRecord = {
    id: string;
    map_id: string;
    reporter_account_id: string;
    reason: string;
    created_at: Date;
};

type MockReviewRecord = {
    id: string;
    map_id: string;
    reviewer_account_id: string;
    action: string;
    notes: string | null;
    created_at: Date;
};

const mockMaps: MockMapRecord[] = [];
const mockReports: MockReportRecord[] = [];
const mockReviews: MockReviewRecord[] = [];
let nextId = 1;

vi.mock('../db', () => ({
    default: {
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
            const sqlUpper = sql.toUpperCase();

            // 1. Quotas
            if (sqlUpper.includes('USER_MAP_QUOTAS')) {
                if (sqlUpper.includes('SELECT')) {
                    return { rowCount: 0, rows: [] }; // defaults
                }
                return { rowCount: 1, rows: [] };
            }

            // 2. Count active maps
            if (sqlUpper.includes('COUNT(*)') && sqlUpper.includes('USER_MAPS') && sqlUpper.includes('OWNER_ACCOUNT_ID')) {
                const count = mockMaps.filter(
                    (m) => m.owner_account_id === params[0] && m.state !== 'archived',
                ).length;
                return { rowCount: 1, rows: [{ count: String(count) }] };
            }

            // 3. Create Map (INSERT)
            if (sqlUpper.includes('INSERT INTO USER_MAPS')) {
                const record: MockMapRecord = {
                    id: `map-${nextId++}`,
                    owner_account_id: params[0] as string,
                    name: params[1] as string,
                    map_data: JSON.parse(params[2] as string),
                    npc_count: params[3] as number,
                    obj_count: params[4] as number,
                    state: 'draft',
                    rejection_reason: null,
                    proposed_at: null,
                    published_at: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                mockMaps.push(record);
                return { rowCount: 1, rows: [record] };
            }

            // 4. Get by ID
            if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM USER_MAPS') && sqlUpper.includes('WHERE M.ID = $1')) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (!found) return { rowCount: 0, rows: [] };
                const repCount = mockReports.filter((r) => r.map_id === found.id).length;
                return {
                    rowCount: 1,
                    rows: [{ ...found, reports_count: String(repCount) }],
                };
            }

            // 5. Select by ID and owner
            if (sqlUpper.includes('SELECT * FROM USER_MAPS WHERE ID = $1 AND OWNER_ACCOUNT_ID = $2')) {
                const found = mockMaps.find(
                    (m) => m.id === params[0] && m.owner_account_id === params[1],
                );
                return { rowCount: found ? 1 : 0, rows: found ? [found] : [] };
            }

            // 6. Select by ID simple
            if (sqlUpper.includes('SELECT * FROM USER_MAPS WHERE ID = $1')) {
                const found = mockMaps.find((m) => m.id === params[0]);
                return { rowCount: found ? 1 : 0, rows: found ? [found] : [] };
            }

            // 7. Update Map Draft
            if (sqlUpper.includes('UPDATE USER_MAPS') && sqlUpper.includes('SET NAME = $1')) {
                const found = mockMaps.find((m) => m.id === params[4]);
                if (found) {
                    found.name = params[0] as string;
                    found.map_data = JSON.parse(params[1] as string);
                    found.npc_count = params[2] as number;
                    found.obj_count = params[3] as number;
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 8. Propose Map (UPDATE state = 'proposed')
            if (sqlUpper.includes("SET STATE = 'PROPOSED'")) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (found) {
                    found.state = 'proposed';
                    found.rejection_reason = null;
                    found.proposed_at = new Date();
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 9. Claim for Review (UPDATE state = 'in_review')
            if (sqlUpper.includes("SET STATE = 'IN_REVIEW'")) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (found) {
                    found.state = 'in_review';
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 10. Approve Map (UPDATE state = 'published')
            if (sqlUpper.includes("SET STATE = 'PUBLISHED'")) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (found) {
                    found.state = 'published';
                    found.rejection_reason = null;
                    found.published_at = new Date();
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 11. Reject / Unpublish (UPDATE state = 'rejected')
            if (sqlUpper.includes("SET STATE = 'REJECTED'")) {
                const found = mockMaps.find((m) => m.id === params[1]);
                if (found) {
                    found.state = 'rejected';
                    found.rejection_reason = params[0] as string;
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 12. List Moderation Queue
            if (sqlUpper.includes('WHERE M.STATE = ANY($1)')) {
                const allowedStates = params[0] as string[];
                const queued = mockMaps.filter((m) => allowedStates.includes(m.state));
                const mapped = queued.map((m) => {
                    const repCount = mockReports.filter((r) => r.map_id === m.id).length;
                    return { ...m, reports_count: String(repCount) };
                });
                return { rowCount: mapped.length, rows: mapped };
            }

            // 13. List Published Maps
            if (sqlUpper.includes("WHERE STATE = 'PUBLISHED'")) {
                const published = mockMaps.filter((m) => m.state === 'published');
                return { rowCount: published.length, rows: published };
            }

            // 14. List Own Maps
            if (sqlUpper.includes('WHERE OWNER_ACCOUNT_ID = $1')) {
                const owned = mockMaps.filter(
                    (m) => m.owner_account_id === params[0] && m.state !== 'archived',
                );
                return { rowCount: owned.length, rows: owned };
            }

            // 15. Reports & Reviews INSERTs
            if (sqlUpper.includes('INSERT INTO USER_MAP_REPORTS')) {
                mockReports.push({
                    id: `rep-${nextId++}`,
                    map_id: params[0] as string,
                    reporter_account_id: params[1] as string,
                    reason: params[2] as string,
                    created_at: new Date(),
                });
                return { rowCount: 1, rows: [] };
            }

            if (sqlUpper.includes('INSERT INTO USER_MAP_REVIEWS')) {
                mockReviews.push({
                    id: `rev-${nextId++}`,
                    map_id: params[0] as string,
                    reviewer_account_id: params[1] as string,
                    action: params[2] as string,
                    notes: (params[3] as string) ?? null,
                    created_at: new Date(),
                });
                return { rowCount: 1, rows: [] };
            }

            // 16. Reports SELECT
            if (sqlUpper.includes('FROM USER_MAP_REPORTS WHERE MAP_ID = $1')) {
                const found = mockReports.filter((r) => r.map_id === params[0]);
                return { rowCount: found.length, rows: found };
            }

            // 17. Reviews SELECT
            if (sqlUpper.includes('FROM USER_MAP_REVIEWS WHERE MAP_ID = $1')) {
                const found = mockReviews.filter((r) => r.map_id === params[0]);
                return { rowCount: found.length, rows: found };
            }

            return { rowCount: 0, rows: [] };
        }),
    },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('User Map Moderation & Validation System (Issue #25)', () => {
    const OWNER_ID = 'user-owner-001';
    const MOD_ID = 'moderator-999';
    const PLAYER_ID = 'player-456';

    const validMapData: mapValidation.UserMapData = {
        meta: { name: 'Bosque Épico', width: 50, height: 50, spawnX: 25, spawnY: 25 },
        terrain: [
            { x: 1, y: 1, blocked: true },
            { x: 1, y: 2, blocked: true },
        ],
        npcs: [{ x: 26, y: 25, name: 'Mercader Sabio', id: 1 }],
        specials: [{ x: 25, y: 26, entityId: 10 }],
    };

    beforeEach(() => {
        mockMaps.length = 0;
        mockReports.length = 0;
        mockReviews.length = 0;
        nextId = 1;
    });

    // ── 1. Automated Checks ──────────────────────────────────────────────────
    describe('Automated Pre-Filtering Checks', () => {
        it('detects banned/offensive words in map name and texts', () => {
            const clean = mapValidation.checkBannedWords('Mapa del Dragón');
            expect(clean.ok).toBe(true);

            const offensive = mapValidation.checkBannedWords('Mapa nazi secreto');
            expect(offensive.ok).toBe(false);
            expect(offensive.matched).toContain('nazi');

            const textValidation = mapValidation.validateTextContent('Isla Tranquila', {
                meta: { description: 'Una concha de arena' },
                npcs: [{ x: 5, y: 5, name: 'Pelotudo' }],
            });
            expect(textValidation.ok).toBe(false);
            expect(textValidation.errors.length).toBeGreaterThanOrEqual(1);
        });

        it('validates entity quotas and map dimensions', () => {
            const quotas = { maxNpcsPerMap: 2, maxObjsPerMap: 2, maxWidth: 100, maxHeight: 100 };
            const excessData: mapValidation.UserMapData = {
                npcs: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
                specials: [{ x: 4, y: 4 }],
            };
            const res = mapValidation.validateQuotasAndLimits(excessData, quotas);
            expect(res.ok).toBe(false);
            expect(res.errors[0]).toContain('Supera la cuota máxima de NPCs');
        });

        it('validates reachability from spawn point via BFS', () => {
            // Blocked spawn point
            const blockedSpawnMap: mapValidation.UserMapData = {
                meta: { width: 50, height: 50, spawnX: 10, spawnY: 10 },
                terrain: [{ x: 10, y: 10, blocked: true }],
            };
            const resBlocked = mapValidation.validateReachability(blockedSpawnMap);
            expect(resBlocked.ok).toBe(false);
            expect(resBlocked.errors[0]).toContain('bloqueado');

            // Valid spawn with open surroundings
            const validSpawnMap: mapValidation.UserMapData = {
                meta: { width: 50, height: 50, spawnX: 25, spawnY: 25 },
                terrain: [],
            };
            const resValid = mapValidation.validateReachability(validSpawnMap);
            expect(resValid.ok).toBe(true);
            expect(resValid.reachableTilesCount).toBeGreaterThan(10);
        });
    });

    // ── 2. Lifecycle & State Machine ─────────────────────────────────────────
    describe('Map Lifecycle & Moderation Flow', () => {
        it('creates a map in draft state', async () => {
            const created = await userMaps.createMap(OWNER_ID, 'Valle Esmeralda', validMapData);
            expect('id' in created).toBe(true);
            if ('id' in created) {
                expect(created.state).toBe('draft');
                expect(created.name).toBe('Valle Esmeralda');
                expect(created.ownerId).toBe(OWNER_ID);
            }
        });

        it('prevents non-owners from seeing draft maps, but allows moderators to preview', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Valle Oculto', validMapData)) as userMaps.UserMapResponse;

            // Random player cannot see draft
            const otherView = await userMaps.getMapById(created.id, PLAYER_ID, false);
            expect(otherView).toBeNull();

            // Owner can see draft with map data
            const ownerView = await userMaps.getMapById(created.id, OWNER_ID, false);
            expect(ownerView).not.toBeNull();
            expect(ownerView?.mapData).toBeDefined();

            // Moderator can see draft with map data
            const modView = await userMaps.getMapById(created.id, MOD_ID, true);
            expect(modView).not.toBeNull();
            expect(modView?.mapData).toBeDefined();
        });

        it('runs automated checks upon proposal and moves to proposed state if valid', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Isla Pacífica', validMapData)) as userMaps.UserMapResponse;

            const propRes = await userMaps.proposeMap(created.id, OWNER_ID);
            expect(propRes.ok).toBe(true);
            expect(propRes.map?.state).toBe('proposed');
            expect(propRes.map?.proposedAt).toBeDefined();
            expect(propRes.automatedChecks?.passed).toBe(true);
        });

        it('rejects proposal when automated checks fail', async () => {
            const invalidData: mapValidation.UserMapData = {
                meta: { width: 50, height: 50, spawnX: 5, spawnY: 5 },
                terrain: [{ x: 5, y: 5, blocked: true }], // blocked spawn!
            };
            const created = (await userMaps.createMap(OWNER_ID, 'Isla Bloqueada', invalidData)) as userMaps.UserMapResponse;

            const propRes = await userMaps.proposeMap(created.id, OWNER_ID);
            expect(propRes.ok).toBe(false);
            expect(propRes.error).toContain('chequeos automáticos');
            expect(propRes.automatedChecks?.passed).toBe(false);
        });

        it('supports full moderation lifecycle: propose -> in_review -> reject -> re-propose -> approve', async () => {
            // 1. Author creates draft
            const created = (await userMaps.createMap(OWNER_ID, 'Paso Nevado', validMapData)) as userMaps.UserMapResponse;

            // 2. Author proposes map
            await userMaps.proposeMap(created.id, OWNER_ID);

            // 3. Moderator inspects queue (receives map preview without needing to play)
            const queue = await userMaps.getModerationQueue(10, 0);
            expect(queue.length).toBe(1);
            expect(queue[0].id).toBe(created.id);
            expect(queue[0].mapData).toBeDefined();

            // 4. Moderator claims for review
            const claimRes = await userMaps.claimForReview(created.id, MOD_ID);
            expect(claimRes.ok).toBe(true);
            expect(claimRes.map?.state).toBe('in_review');

            // 5. Moderator rejects with mandatory reason
            const noReason = await userMaps.rejectMap(created.id, MOD_ID, '');
            expect(noReason.ok).toBe(false); // Reason is required!

            const rejectRes = await userMaps.rejectMap(
                created.id,
                MOD_ID,
                'Faltan detalles en la zona norte y los caminos son confusos.',
            );
            expect(rejectRes.ok).toBe(true);
            expect(rejectRes.map?.state).toBe('rejected');
            expect(rejectRes.map?.rejectionReason).toContain('Faltan detalles');

            // Author views rejection reason
            const authorView = await userMaps.getMapById(created.id, OWNER_ID);
            expect(authorView?.rejectionReason).toContain('Faltan detalles');

            // 6. Author fixes and re-proposes
            const rePropRes = await userMaps.proposeMap(created.id, OWNER_ID);
            expect(rePropRes.ok).toBe(true);
            expect(rePropRes.map?.state).toBe('proposed');

            // 7. Moderator approves
            const approveRes = await userMaps.approveMap(created.id, MOD_ID, 'Todo corregido correctamente');
            expect(approveRes.ok).toBe(true);
            expect(approveRes.map?.state).toBe('published');
            expect(approveRes.map?.publishedAt).toBeDefined();

            // Now public player can find it
            const publicMap = await userMaps.getMapById(created.id, PLAYER_ID, false);
            expect(publicMap?.state).toBe('published');
        });

        it('allows players to report a published map and sends it back to in_review', async () => {
            // Setup a published map
            const created = (await userMaps.createMap(OWNER_ID, 'Colina del Sol', validMapData)) as userMaps.UserMapResponse;
            await userMaps.proposeMap(created.id, OWNER_ID);
            await userMaps.approveMap(created.id, MOD_ID);

            // Player reports map
            const reportRes = await userMaps.reportMap(
                created.id,
                PLAYER_ID,
                'Contiene una zona donde los personajes quedan atrapados sin poder salir.',
            );
            expect(reportRes.ok).toBe(true);

            // Map is automatically moved to in_review
            const checkMap = await userMaps.getMapById(created.id, MOD_ID, true);
            expect(checkMap?.state).toBe('in_review');
            expect(checkMap?.reportsCount).toBe(1);

            // Reappears in moderation queue
            const queue = await userMaps.getModerationQueue(10, 0);
            expect(queue.some((m) => m.id === created.id)).toBe(true);
        });

        it('allows moderators to unpublish an active map', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Castillo Abierto', validMapData)) as userMaps.UserMapResponse;
            await userMaps.proposeMap(created.id, OWNER_ID);
            await userMaps.approveMap(created.id, MOD_ID);

            const unpub = await userMaps.unpublishMap(created.id, MOD_ID, 'Infracción de derechos de autor en gráficos.');
            expect(unpub.ok).toBe(true);
            expect(unpub.map?.state).toBe('rejected');
            expect(unpub.map?.rejectionReason).toContain('Infracción de derechos');

            // Public player can no longer view it
            const publicCheck = await userMaps.getMapById(created.id, PLAYER_ID, false);
            expect(publicCheck).toBeNull();
        });
    });
});
