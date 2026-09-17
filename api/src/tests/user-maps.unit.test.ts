import assert from "node:assert/strict";
import { test } from "vitest";

import {
    assertUserMapId,
    USER_MAP_ECONOMY_POLICY,
    USER_MAP_ID_MAX,
    USER_MAP_ID_MIN,
    validateEconomyPlacement,
} from "../repositories/userMaps";

test("user map id range sits between local static and challenge maps", () => {
    assert.equal(USER_MAP_ID_MIN, 600);
    assert.equal(USER_MAP_ID_MAX, 999);
    assertUserMapId(600);
    assertUserMapId(999);
    assert.throws(() => assertUserMapId(599), /fuera del rango/);
    assert.throws(() => assertUserMapId(1000), /fuera del rango/);
    assert.throws(() => assertUserMapId(2000), /fuera del rango/);
});

test("economy isolation blocks gold and banned obj types", () => {
    assert.equal(USER_MAP_ECONOMY_POLICY.allowCombat, false);
    assert.equal(USER_MAP_ECONOMY_POLICY.allowExp, false);
    assert.throws(() => validateEconomyPlacement({ goldAmount: 1 }), /oro/);
    assert.throws(() => validateEconomyPlacement({ objType: 1 }), /economico/);
    validateEconomyPlacement({ objType: 999, goldAmount: 0 });
});
