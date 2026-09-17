import assert from "node:assert/strict";
import test from "node:test";
import {
    PROTECTED_MAPS,
    evaluateMapEditPermission,
    isProtectedMap,
    parseProtectedOverride,
} from "../lib/mapEditPermissions";

test("PROTECTED_MAPS covers main cities from issue #4", () => {
    assert.ok(isProtectedMap(1));
    assert.ok(isProtectedMap(34));
    assert.ok(isProtectedMap(59));
    assert.ok(isProtectedMap(150));
    assert.equal(isProtectedMap(50), false);
    assert.ok(PROTECTED_MAPS.size >= 4);
});

test("account without grant is forbidden on a normal map", () => {
    const result = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 50,
        isSuperAdmin: false,
        overrideProtected: false,
        grantedMapNums: [],
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
        assert.equal(result.code, "forbidden");
        assert.match(result.reason, /no tiene permisos/);
    }
});

test("grant on map 50 does not allow editing map 1 (protected) or map 2", () => {
    const on2 = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 2,
        isSuperAdmin: false,
        overrideProtected: false,
        grantedMapNums: [50],
    });
    assert.equal(on2.allowed, false);

    const on50 = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 50,
        isSuperAdmin: false,
        overrideProtected: false,
        grantedMapNums: [50],
    });
    assert.equal(on50.allowed, true);

    const on1 = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 1,
        isSuperAdmin: false,
        overrideProtected: true,
        grantedMapNums: [50, 1],
    });
    assert.equal(on1.allowed, false);
    if (!on1.allowed) {
        assert.equal(on1.code, "protected");
    }
});

test("superadmin needs explicit override for protected maps", () => {
    const blocked = evaluateMapEditPermission({
        accountId: "admin",
        mapNum: 1,
        isSuperAdmin: true,
        overrideProtected: false,
        grantedMapNums: [],
    });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
        assert.equal(blocked.code, "protected");
        assert.match(blocked.reason, /x-protected-map-override/);
    }

    const allowed = evaluateMapEditPermission({
        accountId: "admin",
        mapNum: 1,
        isSuperAdmin: true,
        overrideProtected: true,
        grantedMapNums: [],
    });
    assert.equal(allowed.allowed, true);

    const free = evaluateMapEditPermission({
        accountId: "admin",
        mapNum: 50,
        isSuperAdmin: true,
        overrideProtected: false,
        grantedMapNums: [],
    });
    assert.equal(free.allowed, true);
});

test("map_num 0 grant covers all non-protected maps", () => {
    const ok = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 77,
        isSuperAdmin: false,
        overrideProtected: false,
        grantedMapNums: [0],
    });
    assert.equal(ok.allowed, true);

    const protectedStillBlocked = evaluateMapEditPermission({
        accountId: "collab",
        mapNum: 34,
        isSuperAdmin: false,
        overrideProtected: true,
        grantedMapNums: [0],
    });
    assert.equal(protectedStillBlocked.allowed, false);
});

test("parseProtectedOverride only accepts true", () => {
    assert.equal(parseProtectedOverride("true"), true);
    assert.equal(parseProtectedOverride("TRUE"), true);
    assert.equal(parseProtectedOverride("1"), false);
    assert.equal(parseProtectedOverride(undefined), false);
});
