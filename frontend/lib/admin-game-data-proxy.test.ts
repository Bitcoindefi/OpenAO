import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminGameDataHeaders } from "./admin-game-data-proxy";

test("admin game-data headers include both the user session and server proxy token", () => {
    const headers = buildAdminGameDataHeaders("session", "proxy-secret", "application/json");

    assert.equal(headers.get("Authorization"), "Bearer session");
    assert.equal(headers.get("x-game-data-admin-token"), "proxy-secret");
    assert.equal(headers.get("Content-Type"), "application/json");
});