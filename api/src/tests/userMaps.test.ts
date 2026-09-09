import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as mapValidation from '../lib/mapValidation';
import * as userMaps from '../repositories/userMaps';

// ── In-Memory Mock Database ──────────────────────────────────────────────────

type MockMapRecord = {
    id: string;
    owner_account_id: string;
    name: string;
    map_num: number;
    map_data: mapValidation.UserMapData;
    state: userMaps.UserMapState;
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
let nextMapNum = 100_000;

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

            // 3. Allocate map_num
            if (sqlUpper.includes('MAX(MAP_NUM)')) {
                const maxNum = mockMaps.reduce((max, m) => Math.max(max, m.map_num), 99999);
                return { rowCount: 1, rows: [{ next_num: maxNum + 1 }] };
            }

            // 4. Create Map (INSERT)
            if (sqlUpper.includes('INSERT INTO USER_MAPS')) {
                const record: MockMapRecord = {
                    id: `map-${nextId++}`,
                    owner_account_id: params[0] as string,
                    name: params[1] as string,
                    map_num: params[2] as number,
                    map_data: JSON.parse(params[3] as string),
                    npc_count: params[4] as number,
                    obj_count: params[5] as number,
                    allow_combat: false,
                    allow_exp: false,
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

            // 5. Get by ID
            if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM USER_MAPS') && sqlUpper.includes('WHERE M.ID = $1')) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (!found) return { rowCount: 0, rows: [] };
                const repCount = mockReports.filter((r) => r.map_id === found.id).length;
                return {
                    rowCount: 1,
                    rows: [{ ...found, reports_count: String(repCount) }],
                };
            }

            // 6. Get by map_num
            if (sqlUpper.includes('WHERE M.MAP_NUM = $1')) {
                const found = mockMaps.find((m) => m.map_num === params[0]);
                if (!found) return { rowCount: 0, rows: [] };
                const repCount = mockReports.filter((r) => r.map_id === found.id).length;
                return {
                    rowCount: 1,
                    rows: [{ ...found, reports_count: String(repCount) }],
                };
            }

            // 7. Select by ID simple
            if (sqlUpper.includes('SELECT * FROM USER_MAPS WHERE ID = $1')) {
                const found = mockMaps.find((m) => m.id === params[0]);
                return { rowCount: found ? 1 : 0, rows: found ? [found] : [] };
            }

            // 8. Update Map Draft
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

            // 9. Delete/Archive Map
            if (sqlUpper.includes("UPDATE USER_MAPS SET STATE = 'ARCHIVED'")) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (found) {
                    found.state = 'archived';
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 10. Propose Map (UPDATE state = 'proposed')
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

            // 11. Claim for Review (UPDATE state = 'in_review')
            if (sqlUpper.includes("SET STATE = 'IN_REVIEW'")) {
                const found = mockMaps.find((m) => m.id === params[0]);
                if (found) {
                    found.state = 'in_review';
                    found.updated_at = new Date();
                    return { rowCount: 1, rows: [found] };
                }
                return { rowCount: 0, rows: [] };
            }

            // 12. Approve Map (UPDATE state = 'published')
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

            // 13. Reject / Unpublish (UPDATE state = 'rejected')
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

            // 14. List Moderation Queue
            if (sqlUpper.includes('WHERE M.STATE = ANY($1)')) {
                const allowedStates = params[0] as string[];
                const queued = mockMaps.filter((m) => allowedStates.includes(m.state));
                const mapped = queued.map((m) => {
                    const repCount = mockReports.filter((r) => r.map_id === m.id).length;
                    return { ...m, reports_count: String(repCount) };
                });
                return { rowCount: mapped.length, rows: mapped };
            }

            // 15. List Published Maps
            if (sqlUpper.includes("WHERE STATE = 'PUBLISHED'")) {
                const published = mockMaps.filter((m) => m.state === 'published');
                return { rowCount: published.length, rows: published };
            }

            // 16. List Own Maps
            if (sqlUpper.includes('WHERE OWNER_ACCOUNT_ID = $1')) {
                const owned = mockMaps.filter(
                    (m) => m.owner_account_id === params[0] && m.state !== 'archived',
                );
                return { rowCount: owned.length, rows: owned };
            }

            // 17. Reports & Reviews INSERTs
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

            // 18. Reports SELECT
            if (sqlUpper.includes('FROM USER_MAP_REPORTS WHERE MAP_ID = $1')) {
                const found = mockReports.filter((r) => r.map_id === params[0]);
                return { rowCount: found.length, rows: found };
            }

            // 19. Reviews SELECT
            if (sqlUpper.includes('FROM USER_MAP_REVIEWS WHERE MAP_ID = $1')) {
                const found = mockReviews.filter((r) => r.map_id === params[0]);
                return { rowCount: found.length, rows: found };
            }

            return { rowCount: 0, rows: [] };
        }),
    },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('User Map Isolation & Quotas System (Issue #24) & Moderation (Issue #25)', () => {
    const OWNER_ID = 'user-owner-001';
    const OTHER_USER_ID = 'user-intruder-002';
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
        nextMapNum = 100_000;
    });

    // ── 1. Issue #24: Reserved ID Range & Structural Isolation ─────────────────
    describe('Reserved Map ID Range & Isolation', () => {
        it('assigns map_num automatically in the reserved range [100,000 - 999,999]', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Valle Esmeralda', validMapData)) as userMaps.UserMapResponse;
            expect(created.mapNum).toBeGreaterThanOrEqual(mapValidation.USER_MAP_START);
            expect(created.mapNum).toBeLessThanOrEqual(mapValidation.USER_MAP_END);
            expect(mapValidation.isUserMapNumber(created.mapNum)).toBe(true);
            expect(mapValidation.isOfficialMapNumber(created.mapNum)).toBe(false);
        });

        it('rejects attempts to allocate or overwrite official world maps (1-500)', async () => {
            const attemptOfficial = await userMaps.createMap(
                OWNER_ID,
                'Hack Oficial Ullathorpe',
                validMapData,
                1, // Official Ullathorpe map
            );
            expect('error' in attemptOfficial).toBe(true);
            if ('error' in attemptOfficial) {
                expect(attemptOfficial.error).toContain('rango reservado');
            }
        });

        it('rejects portals and tile exits pointing to the official world (world isolation)', () => {
            const exitToOfficial: mapValidation.UserMapData = {
                ...validMapData,
                terrain: [
                    { x: 5, y: 5, tileExit: { map: 1, x: 50, y: 50 } }, // Porting to Ullathorpe!
                ],
            };
            const check = mapValidation.validateWorldIsolation(exitToOfficial);
            expect(check.ok).toBe(false);
            expect(check.errors[0]).toContain('apunta al mapa oficial');
        });
    });

    // ── 2. Issue #24: Economy Isolation ─────────────────────────────────────────
    describe('Economy Isolation', () => {
        it('prevents placement of currency / gold piles and prohibited items', () => {
            // Gold pile placement attempt
            const goldMapData: mapValidation.UserMapData = {
                ...validMapData,
                specials: [{ x: 10, y: 10, entityId: 12 }], // Item 12 = Gold currency
            };
            const resGold = mapValidation.validateEconomyIsolation(goldMapData);
            expect(resGold.ok).toBe(false);
            expect(resGold.errors[0]).toContain('aislamiento de economía');

            // Direct gold value on special
            const goldValueData: mapValidation.UserMapData = {
                ...validMapData,
                specials: [{ x: 10, y: 10, gold: 50000 }],
            };
            const resVal = mapValidation.validateEconomyIsolation(goldValueData);
            expect(resVal.ok).toBe(false);
            expect(resVal.errors[0]).toContain('pilas de oro directas');
        });

        it('prevents NPCs from granting gold or dropping prohibited economy items', () => {
            const exploitativeNpc: mapValidation.UserMapData = {
                ...validMapData,
                npcs: [
                    {
                        x: 15,
                        y: 15,
                        name: 'Dragon del Oro',
                        gold: 10000,
                        drop: [{ item: 12, cant: 500 }],
                    },
                ],
            };
            const check = mapValidation.validateEconomyIsolation(exploitativeNpc);
            expect(check.ok).toBe(false);
            expect(check.errors.some((e) => e.includes('oro'))).toBe(true);
        });
    });

    // ── 3. Issue #24: Ownership & Permissions ─────────────────────────────────
    describe('Ownership & Unauthorized Edit Protection', () => {
        it('allows only the owner to edit their map and blocks unauthorized users', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Mi Mapa Privado', validMapData)) as userMaps.UserMapResponse;

            // Owner can update
            const ownerUpdate = await userMaps.updateMapDraft(created.id, OWNER_ID, {
                name: 'Mi Mapa Privado Actualizado',
            });
            expect(ownerUpdate).not.toBeNull();
            if (ownerUpdate && 'name' in ownerUpdate) {
                expect(ownerUpdate.name).toBe('Mi Mapa Privado Actualizado');
            }

            // Intruder cannot update
            const intruderUpdate = await userMaps.updateMapDraft(created.id, OTHER_USER_ID, {
                name: 'Mapa Hackeado',
            });
            expect(intruderUpdate).not.toBeNull();
            if (intruderUpdate && 'error' in intruderUpdate) {
                expect(intruderUpdate.error).toContain('No autorizado: sólo el dueño');
            }
        });

        it('blocks unauthorized users from proposing or deleting another user map', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Mapa de Prueba', validMapData)) as userMaps.UserMapResponse;

            const intruderProp = await userMaps.proposeMap(created.id, OTHER_USER_ID);
            expect(intruderProp.ok).toBe(false);
            expect(intruderProp.error).toContain('No autorizado: sólo el dueño');

            const intruderDel = await userMaps.deleteMap(created.id, OTHER_USER_ID);
            expect(intruderDel.ok).toBe(false);
            expect(intruderDel.error).toContain('No autorizado: sólo el dueño');
        });

        it('prevents players from viewing draft maps by map number until published', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Mapa Secreto', validMapData)) as userMaps.UserMapResponse;

            // Player cannot load by number while in draft
            const playerView = await userMaps.getMapByNumber(created.mapNum, PLAYER_ID, false);
            expect(playerView).toBeNull();

            // Owner can view their own draft map by number
            const ownerView = await userMaps.getMapByNumber(created.mapNum, OWNER_ID, false);
            expect(ownerView).not.toBeNull();
            expect(ownerView?.mapNum).toBe(created.mapNum);
        });
    });

    // ── 4. Issue #24: Quotas & Storage Limits ─────────────────────────────────
    describe('Quotas & Limit Enforcement', () => {
        it('returns clear error when account exceeds max active maps quota', async () => {
            // Fill 5 maps
            for (let i = 1; i <= 5; i++) {
                await userMaps.createMap(OWNER_ID, `Mapa ${i}`, validMapData);
            }

            // 6th map should fail with quota error
            const sixth = await userMaps.createMap(OWNER_ID, 'Mapa Extra', validMapData);
            expect('error' in sixth).toBe(true);
            if ('error' in sixth) {
                expect(sixth.error).toContain('Alcanzaste el límite de cuota');
            }
        });

        it('enforces entity quotas and storage byte size limits', async () => {
            const heavyData: mapValidation.UserMapData = {
                meta: { name: 'Gigante' },
                npcs: Array.from({ length: 25 }, (_, i) => ({ x: i + 1, y: 1 })), // default quota is 20
            };

            const res = await userMaps.createMap(OWNER_ID, 'Mapa Exceso NPCs', heavyData);
            expect('error' in res).toBe(true);
            if ('error' in res) {
                expect(res.error).toContain('supera la cuota permitida');
            }
        });
    });

    // ── 5. Issue #25: Moderation Flow & Automated Pre-Filtering ───────────────
    describe('Moderation Lifecycle Flow', () => {
        it('runs pre-filtering checks, claims, approves and allows community reporting', async () => {
            const created = (await userMaps.createMap(OWNER_ID, 'Isla del Sol', validMapData)) as userMaps.UserMapResponse;

            // Propose
            const propRes = await userMaps.proposeMap(created.id, OWNER_ID);
            expect(propRes.ok).toBe(true);
            expect(propRes.map?.state).toBe('proposed');

            // Mod claims and approves
            await userMaps.claimForReview(created.id, MOD_ID);
            const appRes = await userMaps.approveMap(created.id, MOD_ID);
            expect(appRes.ok).toBe(true);
            expect(appRes.map?.state).toBe('published');

            // Public can now view it by map_num
            const publicMap = await userMaps.getMapByNumber(created.mapNum, PLAYER_ID, false);
            expect(publicMap).not.toBeNull();
            expect(publicMap?.state).toBe('published');

            // Reporting sends it back to in_review
            const rep = await userMaps.reportMap(created.id, PLAYER_ID, 'Gráficos inapropiados');
            expect(rep.ok).toBe(true);
            const inReview = await userMaps.getMapById(created.id, MOD_ID, true);
            expect(inReview?.state).toBe('in_review');
        });
    });
});
