import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { beforeAll, afterAll, test } from "vitest";
import { Pool } from "pg";
import fs from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import config from "../config";

// Todas las tablas y archivos viven en un namespace efimero de esta suite.
const schema = `map_test_${randomUUID().replaceAll("-", "")}`;
const maintenance = new Pool({ connectionString: config.databaseUrl });
const databaseUrl = new URL(config.databaseUrl);
databaseUrl.searchParams.set("options", `-c search_path=${schema},public`);
const pool = new Pool({ connectionString: databaseUrl.toString() });
const mapsDirectory = path.resolve(__dirname, "../../.test-maps", schema);

const admin = randomUUID();
const editor = randomUUID();
const outsider = randomUUID();
const proxyToken = randomUUID();
const tokens = new Map<string, string>([admin, editor, outsider].map((id) => [id, randomUUID()]));
const objectId = 1900000000 + Math.floor(Math.random() * 1000000);
let api: ChildProcess | undefined;
let baseUrl = "";
let serverLog = "";

async function request(account: string, map: number, suffix: string, method = "PUT", body?: unknown, extra: Record<string, string> = {}) {
    return fetch(`${baseUrl}/admin/game-data/maps/${map}/${suffix}`, {
        method,
        headers: {
            Authorization: `Bearer ${tokens.get(account)}`,
            "x-game-data-admin-token": proxyToken,
            "Content-Type": "application/json",
            ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}
const tile = { x: 91, y: 92, layer: 1, grhIndex: 1 };
const placement = { x: 91, y: 92, kind: "obj", entityId: objectId };

beforeAll(async () => {
    await maintenance.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(await fs.readFile(path.resolve(__dirname, "../../schema.sql"), "utf8"));
    await fs.mkdir(mapsDirectory, { recursive: true });
    for (const [id, token] of tokens) {
        await pool.query("INSERT INTO accounts (id, name, email) VALUES ($1, $2, $3)", [id, `Map test ${id}`, `${id}@example.test`]);
        await pool.query("INSERT INTO auth_sessions (token, account_id, expires_at) VALUES ($1, $2, NOW() + interval '1 hour')", [token, id]);
    }
    await pool.query("INSERT INTO game_map_editors (map_num, account_id) VALUES (50, $1)", [editor]);
    await pool.query("INSERT INTO game_objects (id, name, obj_type, data, checksum) VALUES ($1, 'Map permission fixture', 1, '{}', 'fixture')", [objectId]);
    await pool.query("INSERT INTO game_npcs (id, name, npc_type, id_head, id_body, movement, data, checksum) VALUES ($1, 'NPC fixture', 1, 1, 1, 0, '{}', 'fixture')", [objectId]);
    const port = await new Promise<number>((resolve, reject) => {
        const server = createServer();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") return reject(new Error("No test port"));
            server.close(() => resolve(address.port));
        });
    });
    baseUrl = `http://127.0.0.1:${port}`;
    api = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
        cwd: path.resolve(__dirname, "../.."),
        env: { ...process.env, DATABASE_URL: databaseUrl.toString(), GAME_DATA_MAPS_SOURCE_DIR: mapsDirectory, PORT: String(port), GAME_DATA_ADMIN_ACCOUNT_ID: admin,
            GAME_DATA_ADMIN_EMAIL: "", GAME_DATA_ADMIN_PROXY_TOKEN: proxyToken,
            GAME_DATA_PROTECTED_MAP_IDS: "1" },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
    });
    api.stdout?.on("data", (data) => { serverLog += data.toString(); });
    api.stderr?.on("data", (data) => { serverLog += data.toString(); });
    for (let attempt = 0; attempt < 100; attempt++) {
        if (api.exitCode !== null) throw new Error(serverLog);
        if (await fetch(`${baseUrl}/health`).then((r) => r.ok).catch(() => false)) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Test API failed to start: ${serverLog}`);
});

afterAll(async () => {
    if (api && api.exitCode === null) {
        await new Promise<void>((resolve) => { api!.once("exit", () => resolve()); api!.kill(); });
    }
    await pool.end();
    if (!/^map_test_[0-9a-f]{32}$/.test(schema)) throw new Error("Invalid fixture schema");
    await maintenance.query(`DROP SCHEMA "${schema}" CASCADE`);
    await maintenance.end();
    const fixtureRoot = path.resolve(__dirname, "../../.test-maps");
    if (path.dirname(mapsDirectory) !== fixtureRoot) throw new Error("Invalid fixture path");
    await fs.rm(mapsDirectory, { recursive: true, force: true });
});

test("403 for every mutation without map permission, and no mutation/audit occurs", async () => {
    const operations: [string, string, unknown?][] = [
        ["tiles", "PUT", { tiles: [tile] }], ["tiles/91/92/1", "DELETE"],
        ["entities", "PUT", placement], ["entities/91/92/obj", "DELETE"],
        ["publish", "POST"], ["discard", "POST"], ["revert", "POST"],
        ["npcs", "POST", { x: 1, y: 1, npcIndex: 1 }],
        ["npcs/move", "PUT", { fromX: 1, fromY: 1, toX: 2, toY: 2 }],
        ["npcs/1/1", "DELETE"],
    ];
    for (const [suffix, method, body] of operations) {
        assert.equal((await request(outsider, 50, suffix, method, body, { "x-protected-map-override": "true" })).status, 403, suffix);
    }
    const audit = await pool.query("SELECT id FROM game_map_edit_audit WHERE account_id = $1", [outsider]);
    assert.equal(audit.rowCount, 0);
    assert.equal((await pool.query("SELECT 1 FROM game_map_tile_overrides WHERE map_num=50")).rowCount, 0);
    assert.equal((await pool.query("SELECT 1 FROM game_map_tile_entities WHERE map_num=50")).rowCount, 0);
    await assert.rejects(fs.readFile(path.join(mapsDirectory, "mapa_50/npcs.json")), { code: "ENOENT" });
});

test("map 50 grant permits editing only map 50; actor comes from session", async () => {
    assert.equal((await request(editor, 50, "tiles", "PUT", { tiles: [tile], accountId: admin })).status, 200);
    assert.equal((await request(editor, 1, "tiles", "PUT", { tiles: [tile] }, { "x-protected-map-override": "true" })).status, 403);
    assert.equal((await request(editor, 51, "tiles", "PUT", { tiles: [tile] })).status, 403);
    const row = await pool.query("SELECT updated_by_account_id FROM game_map_tile_overrides WHERE map_num=50 AND x=91 AND y=92 AND layer=1 AND status='draft'");
    assert.equal(row.rows[0].updated_by_account_id, editor);
    const audit = await pool.query("SELECT account_id, action, details, created_at FROM game_map_edit_audit WHERE account_id=$1 ORDER BY id DESC LIMIT 1", [editor]);
    assert.equal(audit.rows[0].action, "paintTiles");
    assert.deepEqual(audit.rows[0].details.tiles, [tile]);
    assert.ok(audit.rows[0].created_at instanceof Date);
    const session = await fetch(`${baseUrl}/admin/game-data/session`, { headers: { Authorization: `Bearer ${tokens.get(editor)}`, "x-game-data-admin-token": proxyToken } });
    const access = await session.json();
    assert.equal(access.isGameDataAdmin, false);
    assert.equal(access.canEditMaps, true);
    assert.deepEqual(access.editableMapIds, [50]);
});

test("protected map requires admin and exact explicit override on every mutation", async () => {
    for (const flag of [undefined, "false", "1"]) {
        assert.equal((await request(admin, 1, "tiles", "PUT", { tiles: [tile] }, flag ? { "x-protected-map-override": flag } : {})).status, 403);
    }
    assert.equal((await request(admin, 1, "tiles", "PUT", { tiles: [tile] }, { "x-protected-map-override": "true" })).status, 200);
    for (const [suffix, method] of [["tiles/91/92/1", "DELETE"], ["publish", "POST"], ["discard", "POST"], ["revert", "POST"], ["entities/91/92/obj", "DELETE"], ["npcs/1/1", "DELETE"]]) {
        assert.equal((await request(admin, 1, suffix, method)).status, 403, suffix);
    }
    assert.equal((await request(admin, 1, "entities", "PUT", placement)).status, 403);
    assert.equal((await request(admin, 1, "npcs", "POST", { x: 1, y: 1, npcIndex: objectId })).status, 403);
    assert.equal((await request(admin, 1, "npcs/move", "PUT", { fromX: 1, fromY: 1, toX: 2, toY: 2 })).status, 403);
    // Even a direct map grant cannot turn a collaborator into a protected-map admin.
    await pool.query("INSERT INTO game_map_editors (map_num, account_id) VALUES (1, $1)", [editor]);
    assert.equal((await request(editor, 1, "tiles", "PUT", { tiles: [tile] }, { "x-protected-map-override": "true" })).status, 403);
    await pool.query("DELETE FROM game_map_editors WHERE account_id=$1 AND map_num=1", [editor]);
});

test("all seven SQL mutations preserve the real actor, including clearTile", async () => {
    const operations: [string, string, string, unknown?][] = [
        ["paintTiles", "tiles", "PUT", { tiles: [tile] }],
        ["clearTile", "tiles/91/92/1", "DELETE"],
        ["placeTileEntity", "entities", "PUT", placement],
        ["removeTileEntity", "entities/91/92/obj", "DELETE"],
        ["publishMap", "publish", "POST"],
        ["discardDrafts", "discard", "POST"],
        ["revertMap", "revert", "POST"],
    ];
    for (const [action, suffix, method, body] of operations) {
        const response = await request(editor, 50, suffix, method, body);
        assert.equal(response.status, 200, `${action}: ${await response.text()}`);
        const audit = await pool.query("SELECT account_id, action FROM game_map_edit_audit WHERE account_id=$1 ORDER BY id DESC LIMIT 1", [editor]);
        assert.equal(audit.rows[0].account_id, editor);
        assert.equal(audit.rows[0].action, action);
    }
});

test("failed batch rolls back tiles and audit together", async () => {
    const before = await pool.query("SELECT count(*) FROM game_map_edit_audit WHERE account_id=$1", [editor]);
    const response = await request(editor, 50, "tiles", "PUT", { tiles: [tile, { ...tile, x: 93, grhIndex: 1999999999 }] });
    assert.equal(response.status, 400);
    const after = await pool.query("SELECT count(*) FROM game_map_edit_audit WHERE account_id=$1", [editor]);
    assert.equal(after.rows[0].count, before.rows[0].count);
    const tiles = await pool.query("SELECT 1 FROM game_map_tile_overrides WHERE map_num=50 AND x=91 AND y=92");
    assert.equal(tiles.rowCount, 0);
});

test("missing proxy and forged actor headers never grant access", async () => {
    assert.equal((await request(admin, 50, "tiles", "PUT", { tiles: [tile] }, { "x-game-data-admin-token": "" })).status, 403);
    assert.equal((await request(outsider, 50, "tiles", "PUT", { tiles: [tile] }, { "x-account-id": admin })).status, 403);
});


test("map collaborators read catalogs but cannot change global definitions", async () => {
    for (const catalog of ["objects", "npcs"]) {
        const headers = { Authorization: `Bearer ${tokens.get(editor)}`, "x-game-data-admin-token": proxyToken };
        assert.equal((await fetch(`${baseUrl}/admin/game-data/${catalog}?all=true`, { headers })).status, 200);
        assert.equal((await fetch(`${baseUrl}/admin/game-data/${catalog}/${objectId}`, {
            method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: "{}",
        })).status, 403);
        assert.equal((await fetch(`${baseUrl}/admin/game-data/${catalog}`, {
            headers: { ...headers, Authorization: `Bearer ${tokens.get(outsider)}` },
        })).status, 403);
    }
});

test("file-backed NPC create, move and delete retain authenticated actor and snapshots", async () => {
    for (const [suffix, method, body, action, status] of [
        ["npcs", "POST", { x: 10, y: 10, npcIndex: objectId, accountId: admin }, "placeMapNpc", 201],
        ["npcs/move", "PUT", { fromX: 10, fromY: 10, toX: 11, toY: 12 }, "moveMapNpc", 200],
        ["npcs/11/12", "DELETE", undefined, "removeMapNpc", 200],
    ] as const) {
        const response = await request(editor, 50, suffix, method, body);
        assert.equal(response.status, status, await response.text());
        const audit = await pool.query("SELECT * FROM game_map_edit_audit WHERE action=$1 AND account_id=$2 ORDER BY id DESC LIMIT 1", [action, editor]);
        assert.equal(audit.rowCount, 1);
        assert.equal(audit.rows[0].details.outcome, "applied");
        assert.ok(audit.rows[0].created_at instanceof Date);
        const onDisk = JSON.parse(await fs.readFile(path.join(mapsDirectory, "mapa_50/npcs.json"), "utf8"));
        assert.deepEqual(onDisk, audit.rows[0].details.after);
        assert.notDeepEqual(audit.rows[0].details.before, audit.rows[0].details.after);
    }
});

test("unreadable NPC source rejects the request without changing the file or audit", async () => {
    // A directory at the target filename makes atomic replacement fail on Windows and Linux.
    const mapDir = path.join(mapsDirectory, "mapa_51");
    await fs.mkdir(path.join(mapDir, "npcs.json"), { recursive: true });
    // Reading a directory already fails: there must be no untracked write.
    const response = await request(admin, 51, "npcs", "POST", { x: 1, y: 1, npcIndex: objectId });
    assert.equal(response.status, 400);
    assert.ok((await fs.stat(path.join(mapDir, "npcs.json"))).isDirectory());
    assert.equal((await pool.query("SELECT 1 FROM game_map_edit_audit WHERE map_num=51")).rowCount, 0);
});

test("audit insert failure prevents SQL and file writes", async () => {
    await pool.query(`ALTER TABLE game_map_edit_audit ADD CONSTRAINT reject_test_actor CHECK (account_id <> '${editor}') NOT VALID`);
    try {
        assert.equal((await request(editor, 50, "tiles", "PUT", { tiles: [{ ...tile, x: 88 }] })).status, 400);
        assert.equal((await pool.query("SELECT 1 FROM game_map_tile_overrides WHERE map_num=50 AND x=88")).rowCount, 0);
        assert.equal((await request(editor, 50, "npcs", "POST", { x: 5, y: 5, npcIndex: objectId })).status, 400);
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(mapsDirectory, "mapa_50/npcs.json"), "utf8")), []);
    } finally {
        await pool.query("ALTER TABLE game_map_edit_audit DROP CONSTRAINT reject_test_actor");
    }
});

test("real editor proxy handlers preserve override intent and authenticated actor through HTTP", async () => {
    const source = await fs.readFile(path.resolve(__dirname, "../../../frontend/app/api/editor/[...path]/route.ts"), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    let cookieToken: string | undefined;
    const exports: Record<string, (req: Request, context: { params: Promise<{ path: string[] }> }) => Promise<Response>> = {};
    runInNewContext(code, {
        exports, Request, Response, Headers, URL, fetch, console,
        process: { env: { GAME_DATA_ADMIN_PROXY_TOKEN: proxyToken } },
        require: (name: string) => {
            if (name === "next/server") return { NextResponse: Response };
            if (name === "next/headers") return { cookies: async () => ({ get: () => cookieToken ? { value: cookieToken } : undefined }) };
            if (name === "@/lib/api-base-url") return { getApiBaseUrlCandidates: () => [baseUrl] };
            if (name === "@/lib/auth-session") return { AUTH_COOKIE_NAME: "aoweb_session" };
            throw new Error(`Unexpected proxy dependency: ${name}`);
        },
    });
    const proxy = (method: string, map: number, suffix: string, override?: string, body?: unknown) => exports[method](
        new Request(`http://editor.test/api/editor/maps/${map}/${suffix}`, {
            method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.get(admin)}`,
                ...(override ? { "x-protected-map-override": override } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }), { params: Promise.resolve({ path: ["maps", String(map), ...suffix.split("/")] }) },
    );
    assert.equal((await proxy("POST", 1, "publish", "true")).status, 401);
    cookieToken = tokens.get(editor);
    assert.equal((await proxy("PUT", 1, "tiles", "true", { tiles: [tile] })).status, 403);
    assert.equal((await proxy("PUT", 50, "tiles", undefined, { tiles: [tile] })).status, 200);
    cookieToken = tokens.get(admin);
    for (const flag of [undefined, "false", "1"]) {
        assert.equal((await proxy("PUT", 1, "tiles", flag, { tiles: [tile] })).status, 403);
    }
    assert.equal((await proxy("PUT", 1, "tiles", "true", { tiles: [tile] })).status, 200);
    assert.equal((await proxy("DELETE", 1, "tiles/91/92/1", "true")).status, 200);
    assert.equal((await proxy("POST", 1, "publish", "true")).status, 200);
    const audit = await pool.query("SELECT account_id FROM game_map_edit_audit WHERE map_num=1 ORDER BY id DESC LIMIT 1");
    assert.equal(audit.rows[0].account_id, admin);
});
