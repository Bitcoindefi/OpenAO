import assert from "node:assert/strict";
import { test, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());

vi.mock("../db", () => ({
    default: { query },
}));

import { resetAllCharactersConnectedStatus } from "../repositories/characters";
import { resetAllArenaRoomMembersConnectedStatus } from "../repositories/arenas";

test("reset helpers clear connected characters and arena members", async () => {
    query
        .mockReset()
        .mockResolvedValueOnce({ rowCount: 4 })
        .mockResolvedValueOnce({ rowCount: 2 });

    const [updatedCharacters, updatedArenaMembers] = await Promise.all([
        resetAllCharactersConnectedStatus(),
        resetAllArenaRoomMembersConnectedStatus(),
    ]);

    assert.equal(updatedCharacters, 4);
    assert.equal(updatedArenaMembers, 2);
    assert.equal(query.mock.calls.length, 2);

    const sqlStatements = query.mock.calls.map(([sql]) => String(sql));
    assert.equal(
        sqlStatements.some(
            (sql) =>
                sql.includes("UPDATE characters") &&
                sql.includes("connected = FALSE") &&
                sql.includes("deleted_at IS NULL"),
        ),
        true,
    );
    assert.equal(
        sqlStatements.some(
            (sql) =>
                sql.includes("UPDATE arena_room_members") &&
                sql.includes("connected = FALSE"),
        ),
        true,
    );
});
