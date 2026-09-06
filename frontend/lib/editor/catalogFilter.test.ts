import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    countByObjType,
    favoriteKey,
    filterByNameOrId,
    filterObjects,
    isFavorite,
    parseFavorites,
    toggleFavoriteEntry,
    type CatalogFavorite,
    type TypedCatalogEntry,
} from "./catalogFilter.ts";

const SAMPLE: TypedCatalogEntry[] = [
    { id: 1, name: "Manzana Roja", objType: 1 },
    { id: 2, name: "Espada Corta", objType: 2 },
    { id: 10, name: "Manzana Verde", objType: 1 },
    { id: 42, name: "Puerta de Roble", objType: 6 },
    { id: 100, name: "Pocion Roja", objType: 11 },
];

describe("filterByNameOrId", () => {
    it("returns all entries for empty query", () => {
        assert.equal(filterByNameOrId(SAMPLE, "").length, SAMPLE.length);
        assert.equal(filterByNameOrId(SAMPLE, "   ").length, SAMPLE.length);
    });

    it("matches name substring case-insensitively", () => {
        const hits = filterByNameOrId(SAMPLE, "manzana");
        assert.deepEqual(
            hits.map((e) => e.id),
            [1, 10],
        );
    });

    it("matches by id substring", () => {
        const hits = filterByNameOrId(SAMPLE, "42");
        assert.equal(hits.length, 1);
        assert.equal(hits[0].id, 42);
    });
});

describe("filterObjects", () => {
    it("filters by type then by query", () => {
        const hits = filterObjects(SAMPLE, { objType: 1, query: "verde" });
        assert.equal(hits.length, 1);
        assert.equal(hits[0].id, 10);
    });

    it("keeps all types when objType is null", () => {
        const hits = filterObjects(SAMPLE, { objType: null, query: "roja" });
        assert.deepEqual(
            hits.map((e) => e.id),
            [1, 100],
        );
    });
});

describe("countByObjType", () => {
    it("counts chips for full catalog", () => {
        const counts = countByObjType(SAMPLE);
        assert.equal(counts.get(1), 2);
        assert.equal(counts.get(2), 1);
        assert.equal(counts.get(6), 1);
        assert.equal(counts.get(11), 1);
        assert.equal(counts.get(99), undefined);
    });
});

describe("favorites helpers", () => {
    const apple: CatalogFavorite = {
        kind: "object",
        id: 1,
        grhIndex: 500,
        name: "Manzana Roja",
    };
    const sword: CatalogFavorite = {
        kind: "object",
        id: 2,
        grhIndex: 501,
        name: "Espada Corta",
    };

    it("builds stable keys", () => {
        assert.equal(favoriteKey("object", 1), "object:1");
        assert.equal(favoriteKey("npc", 9), "npc:9");
    });

    it("toggles add then remove", () => {
        const added = toggleFavoriteEntry([], apple);
        assert.equal(added.length, 1);
        assert.equal(isFavorite(added, "object", 1), true);

        const removed = toggleFavoriteEntry(added, apple);
        assert.equal(removed.length, 0);
        assert.equal(isFavorite(removed, "object", 1), false);
    });

    it("prepends newest and respects limit", () => {
        const once = toggleFavoriteEntry([], apple);
        const twice = toggleFavoriteEntry(once, sword);
        assert.deepEqual(
            twice.map((e) => e.id),
            [2, 1],
        );

        const capped = toggleFavoriteEntry(
            Array.from({ length: 24 }, (_, i) => ({
                kind: "object" as const,
                id: i + 10,
                grhIndex: i,
                name: `Item ${i}`,
            })),
            apple,
            24,
        );
        assert.equal(capped.length, 24);
        assert.equal(capped[0].id, 1);
    });

    it("parseFavorites rejects garbage", () => {
        assert.deepEqual(parseFavorites(null), []);
        assert.deepEqual(parseFavorites("nope"), []);
        assert.deepEqual(
            parseFavorites([{ kind: "object", id: 1, grhIndex: 1, name: "ok" }]),
            [{ kind: "object", id: 1, grhIndex: 1, name: "ok" }],
        );
        assert.deepEqual(
            parseFavorites([{ kind: "wizard", id: 1, grhIndex: 1, name: "x" }]),
            [],
        );
    });
});
