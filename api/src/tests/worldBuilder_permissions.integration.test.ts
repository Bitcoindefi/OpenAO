import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
    checkMapEditPermission,
    grantMapPermission,
    revokeMapPermission,
    listAccountMapPermissions,
    isProtectedMap,
    PROTECTED_MAPS,
} from "../repositories/worldBuilder";

describe("World Builder Permissions and Protected Maps", () => {
    const superAdminAccountId = "00000000-0000-0000-0000-000000000001";
    const collaboratorAccountId = "00000000-0000-0000-0000-000000000002";
    const unauthorizedAccountId = "00000000-0000-0000-0000-000000000003";

    it("identifies protected capital/city maps", () => {
        assert.equal(isProtectedMap(1), true, "Map 1 (Ullathorpe) must be protected");
        assert.equal(isProtectedMap(34), true, "Map 34 (Nix) must be protected");
        assert.equal(isProtectedMap(59), true, "Map 59 (Banderbill) must be protected");
        assert.equal(isProtectedMap(150), true, "Map 150 (Lindos) must be protected");
        assert.equal(isProtectedMap(50), false, "Map 50 must not be protected");
    });

    it("rejects unauthorized accounts without permissions with 403", async () => {
        const result = await checkMapEditPermission({
            accountId: unauthorizedAccountId,
            isSuperAdmin: false,
            mapNum: 50,
        });

        assert.equal(result.allowed, false);
        assert.match(result.reason ?? "", /no tiene permisos/i);
    });

    it("rejects collaborators from modifying protected maps", async () => {
        const result = await checkMapEditPermission({
            accountId: collaboratorAccountId,
            isSuperAdmin: false,
            mapNum: 1,
        });

        assert.equal(result.allowed, false);
        assert.match(result.reason ?? "", /protegido/i);
    });

    it("rejects superadmins from modifying protected maps without explicit override", async () => {
        const resultWithoutOverride = await checkMapEditPermission({
            accountId: superAdminAccountId,
            isSuperAdmin: true,
            mapNum: 1,
            overrideProtected: false,
        });

        assert.equal(resultWithoutOverride.allowed, false);
        assert.match(resultWithoutOverride.reason ?? "", /overrideProtected/i);

        const resultWithOverride = await checkMapEditPermission({
            accountId: superAdminAccountId,
            isSuperAdmin: true,
            mapNum: 1,
            overrideProtected: true,
        });

        assert.equal(resultWithOverride.allowed, true);
    });

    it("allows superadmins to modify non-protected maps directly", async () => {
        const result = await checkMapEditPermission({
            accountId: superAdminAccountId,
            isSuperAdmin: true,
            mapNum: 75,
        });

        assert.equal(result.allowed, true);
    });
});