import assert from "node:assert/strict";
import { beforeAll, test } from "vitest";
import { getMapTerrainPalette } from "../repositories/worldBuilder";
import {
    API_AUTH,
    ensureApiReady,
    requestJson,
} from "./helpers/api";

beforeAll(async () => {
    await ensureApiReady();
});

test("world builder admin endpoints are forbidden without the admin proxy token", async () => {
    const [entities, terrain, status] = await Promise.all([
        requestJson<{ error?: string }>(
            "/admin/game-data/maps/1/entities",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_AUTH}`,
                },
                body: JSON.stringify({
                    x: 1,
                    y: 1,
                    kind: "obj",
                    entityId: 1,
                }),
            },
        ),
        requestJson<{ error?: string }>(
            "/admin/game-data/maps/1/terrain",
            {
                headers: {
                    Authorization: `Bearer ${API_AUTH}`,
                },
            },
        ),
        requestJson<{ error?: string }>(
            "/admin/game-data/maps/1/status",
            {
                headers: {
                    Authorization: `Bearer ${API_AUTH}`,
                },
            },
        ),
    ]);

    assert.equal(entities.status, 403);
    assert.equal(terrain.status, 403);
    assert.equal(status.status, 403);
});

test("map overrides endpoint returns entities alongside tiles", async () => {
    const response = await requestJson<{
        mapNum?: number;
        overrides?: unknown[];
        entities?: unknown[];
        error?: string;
    }>("/maps/1/overrides");

    assert.equal(response.status, 200);
    assert.equal(response.data.mapNum, 1);
    assert.equal(Array.isArray(response.data.overrides), true);
    assert.equal(Array.isArray(response.data.entities), true);
});

test("admin map overrides endpoint is forbidden without the admin proxy token", async () => {
    const response = await requestJson<{ error?: string }>(
        "/admin/game-data/maps/1/overrides",
        {
            headers: {
                Authorization: `Bearer ${API_AUTH}`,
            },
        },
    );

    assert.equal(response.status, 403);
});

test("game data session endpoint is forbidden without the admin proxy token", async () => {
    const response = await requestJson<{
        isGameDataAdmin?: boolean;
        error?: string;
    }>("/admin/game-data/session", {
        headers: {
            Authorization: `Bearer ${API_AUTH}`,
        },
    });

    // El frontend usa este endpoint para decidir si muestra el editor: si
    // dejara de exigir el token, cualquier cuenta veria el modo construccion.
    assert.equal(response.status, 403);
    assert.notEqual(response.data.isGameDataAdmin, true);
});

test("terrain palette keeps one graphic per layer and lists uploaded graphics", async () => {
    const result = await getMapTerrainPalette(1);

    assert.equal(result.mapNum, 1);
    assert.ok(result.palette.length > 0);
    // El nombre del campo es parte del contrato: el editor lo lee para la
    // pestaña de graficos subidos y un `?? []` esconderia el error.
    assert.equal(Array.isArray(result.uploadedGraphics), true);

    for (const entry of result.palette) {
        assert.equal(Number.isInteger(entry.id), true);
        assert.ok(entry.id > 0);
        assert.equal(typeof entry.blocked, "boolean");
        assert.equal(Array.isArray(entry.graphics), true);
        assert.ok(entry.graphics.length >= 1);
        assert.ok(entry.graphics.length <= 4);

        for (const graphic of entry.graphics) {
            assert.ok(
                graphic === null ||
                    (Number.isInteger(graphic) && graphic > 0),
                `grafico invalido en la entrada ${entry.id}`,
            );
        }
    }

    // Una entrada de la paleta es el tile completo: si el arreglo se aplanara a
    // un solo grafico, pintar dejaria las capas de arriba del tile anterior.
    assert.ok(
        result.palette.some((entry) => entry.graphics.length > 1),
        "la paleta del mapa 1 tiene tiles de varias capas",
    );
});

test("objects internal endpoint supports all=true for the editor catalog", async () => {
    const response = await requestJson<{
        objects?: Array<{ id: number; name: string; objType: number }>;
        pagination?: { total?: number; totalPages?: number };
        error?: string;
    }>("/internal/game-data/objects?all=true", {
        headers: {
            Authorization: API_AUTH,
        },
    });

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(response.data.objects), true);
    assert.ok((response.data.objects?.length ?? 0) > 900);
    assert.equal(response.data.pagination?.totalPages, 1);
});

test("npcs internal endpoint supports all=true for the editor catalog", async () => {
    const response = await requestJson<{
        npcs?: Array<{ id: number; name: string }>;
        pagination?: { total?: number; totalPages?: number };
        error?: string;
    }>("/internal/game-data/npcs?all=true", {
        headers: {
            Authorization: API_AUTH,
        },
    });

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(response.data.npcs), true);
    assert.ok((response.data.npcs?.length ?? 0) > 300);
    assert.equal(response.data.pagination?.totalPages, 1);
});

test("catalog flags accept the shapes a query string can produce", async () => {
    // `?all=1` y `?all=false` llegan como texto: el editor pide el catalogo
    // completo por query string, y un flag mal interpretado le devuelve 100
    // objetos sin ningun error visible.
    const [numeric, falsy] = await Promise.all([
        requestJson<{
            objects?: unknown[];
            pagination?: { totalPages?: number };
        }>("/internal/game-data/objects?all=1", {
            headers: {
                Authorization: API_AUTH,
            },
        }),
        requestJson<{
            objects?: unknown[];
            pagination?: { totalPages?: number };
        }>("/internal/game-data/objects?all=false", {
            headers: {
                Authorization: API_AUTH,
            },
        }),
    ]);

    assert.equal(numeric.status, 200);
    assert.equal(numeric.data.pagination?.totalPages, 1);
    assert.ok((numeric.data.objects?.length ?? 0) > 900);

    assert.equal(falsy.status, 200);
    assert.equal(falsy.data.objects?.length, 100);
    assert.ok((falsy.data.pagination?.totalPages ?? 0) > 1);
});

test("unrecognized catalog flags default to false instead of failing", async () => {
    // Las rutas de catalogo envuelven cualquier error en un 500, asi que un flag
    // que no se reconoce tiene que valer `false` y no reventar: un `?all=quizas`
    // es una query mal escrita del cliente, no una falla del servidor.
    const [objects, npcs, hostile] = await Promise.all([
        requestJson<{ objects?: unknown[] }>(
            "/internal/game-data/objects?all=quizas",
            { headers: { Authorization: API_AUTH } },
        ),
        requestJson<{ npcs?: unknown[] }>(
            "/internal/game-data/npcs?all=quizas",
            { headers: { Authorization: API_AUTH } },
        ),
        requestJson<{ pagination?: { total?: number } }>(
            "/internal/game-data/npcs?hostileOnly=quizas",
            { headers: { Authorization: API_AUTH } },
        ),
    ]);

    assert.equal(objects.status, 200);
    assert.equal(objects.data.objects?.length, 100);

    assert.equal(npcs.status, 200);
    assert.equal(npcs.data.npcs?.length, 100);

    // Sin filtrar: el catalogo entero, no solo los hostiles.
    assert.equal(hostile.status, 200);
    assert.ok((hostile.data.pagination?.total ?? 0) > 300);
});