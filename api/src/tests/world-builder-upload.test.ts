import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    clientQuery: vi.fn(),
    release: vi.fn(),
    connect: vi.fn(),
}));

vi.mock("../db", () => ({
    default: { query: mocks.query, connect: mocks.connect },
}));

import { uploadGraphic } from "../repositories/worldBuilder";

function makePng(): Buffer {
    const image = new PNG({ width: 32, height: 32 });
    image.data.fill(255);
    return PNG.sync.write(image);
}

describe("uploadGraphic", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.query.mockResolvedValue({ rows: [] });
        mocks.connect.mockResolvedValue({
            query: mocks.clientQuery,
            release: mocks.release,
        });
        mocks.clientQuery.mockImplementation(async (sql: string) => {
            if (sql.includes("COALESCE(MAX")) {
                return { rows: [{ next_index: 1_000_000 }] };
            }
            if (sql.includes("RETURNING created_at")) {
                return {
                    rows: [{ created_at: new Date("2026-08-17T00:00:00Z") }],
                };
            }
            return { rows: [] };
        });
    });

    it("stores and hashes only canonical PNG bytes", async () => {
        const input = Buffer.concat([
            makePng(),
            Buffer.from("hidden-payload-after-iend"),
        ]);

        const result = await uploadGraphic(input, "account-123");

        expect(result.ok).toBe(true);
        const insert = mocks.clientQuery.mock.calls.find(([sql]) =>
            String(sql).includes("INSERT INTO game_uploaded_graphics"),
        );
        expect(insert).toBeDefined();

        const params = insert?.[1] as unknown[];
        const stored = params[5] as Buffer;
        const checksum = crypto
            .createHash("sha256")
            .update(stored)
            .digest("hex");

        expect(stored.includes("hidden-payload-after-iend")).toBe(false);
        expect(() => PNG.sync.read(stored)).not.toThrow();
        expect(params[1]).toBe(checksum);
        expect(params[4]).toBe(stored.length);
        expect(params[6]).toBe("account-123");
        expect(mocks.release).toHaveBeenCalledOnce();
    });

    it("rejects invalid bytes before touching the database", async () => {
        const result = await uploadGraphic(Buffer.from("not-a-png"), "acct");

        expect(result.ok).toBe(false);
        expect(mocks.query).not.toHaveBeenCalled();
        expect(mocks.connect).not.toHaveBeenCalled();
    });
});
