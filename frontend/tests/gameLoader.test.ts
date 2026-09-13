import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    USER_MAP_ID_RANGE,
    isUserMapId,
    assertUserMapId,
} from "../utils/gameLoader";

describe("user map ID reservation (issue #24)", () => {
    it("accepts IDs inside the reserved 600-1999 range as user maps", () => {
        assert.equal(isUserMapId(USER_MAP_ID_RANGE.min), true);
        assert.equal(isUserMapId(1000), true);
        assert.equal(isUserMapId(USER_MAP_ID_RANGE.max), true);
    });

    it("rejects IDs outside the reserved range for user maps", () => {
        assert.equal(isUserMapId(599), false);
        assert.equal(isUserMapId(2000), false);
        assert.equal(isUserMapId(29999), false);
        assert.equal(isUserMapId(30000), false);
        assert.equal(isUserMapId(Number.NaN), false);
        assert.throws(
            () => assertUserMapId(599),
            /user map IDs must be between/,
        );
        assert.throws(
            () => assertUserMapId(2000),
            /user map IDs must be between/,
        );
    });

    it("leaves official map ID handling unchanged", () => {
        assert.equal(USER_MAP_ID_RANGE.min, 600);
        assert.equal(USER_MAP_ID_RANGE.max, 1999);
        assert.ok(USER_MAP_ID_RANGE.min > 599);
        assert.ok(USER_MAP_ID_RANGE.max < 2000);
    });
});
