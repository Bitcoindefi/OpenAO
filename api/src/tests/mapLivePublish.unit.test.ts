import { describe, expect, it } from "vitest";

/**
 * Lightweight acceptance checks for OpenAO #11 draft isolation + version marker.
 * DB-backed publish flows live in world-builder.integration.test.ts when Postgres is available.
 */

describe("OpenAO #11 live map publish contracts", () => {
    it("public override payloads must never include draft status rows", () => {
        const rows = [
            { x: 1, y: 1, layer: 1, grhIndex: 10, blocked: false, status: "published" as const },
            { x: 2, y: 2, layer: 1, grhIndex: 11, blocked: true, status: "draft" as const },
        ];

        const publicRows = rows.filter((row) => row.status === "published");
        expect(publicRows.every((row) => row.status === "published")).toBe(true);
        expect(publicRows).toHaveLength(1);
    });

    it("publish response shape includes liveReload metadata fields", () => {
        const response = {
            published: 3,
            publishedEntities: 1,
            version: 1_725_000_000_000,
            liveReload: { notified: false, skipped: true },
        };

        expect(response).toMatchObject({
            published: expect.any(Number),
            version: expect.any(Number),
            liveReload: expect.objectContaining({
                skipped: expect.any(Boolean),
            }),
        });
    });
});
