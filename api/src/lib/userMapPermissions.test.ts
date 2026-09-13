import { describe, expect, it } from "vitest";
import {
    MAX_ENTITIES_PER_USER_MAP,
    MAX_MAPS_PER_ACCOUNT,
    assertEntitiesQuotaAvailable,
    assertMapsQuotaAvailable,
    assertUserMapActionAllowed,
    canPerformUserMapAction,
} from "./userMapPermissions";

describe("user map permissions (issue #24 item 2)", () => {
    it("allows the owner to read, edit and delete any map", () => {
        for (const visibility of ["private", "public"] as const) {
            for (const action of ["read", "edit", "delete"] as const) {
                expect(
                    canPerformUserMapAction(action, { isOwner: true, visibility }),
                ).toBe(true);
            }
        }
    });

    it("lets non-owners read public maps but never edit or delete them", () => {
        expect(
            canPerformUserMapAction("read", { isOwner: false, visibility: "public" }),
        ).toBe(true);
        expect(
            canPerformUserMapAction("edit", { isOwner: false, visibility: "public" }),
        ).toBe(false);
        expect(
            canPerformUserMapAction("delete", { isOwner: false, visibility: "public" }),
        ).toBe(false);
    });

    it("blocks non-owners from reading private maps", () => {
        expect(
            canPerformUserMapAction("read", { isOwner: false, visibility: "private" }),
        ).toBe(false);
    });

    it("assert helper throws in the backend error style for denials", () => {
        expect(() =>
            assertUserMapActionAllowed("read", { isOwner: false, visibility: "private" }),
        ).toThrowError(/No tenes acceso/);
        expect(() =>
            assertUserMapActionAllowed("edit", { isOwner: false, visibility: "public" }),
        ).toThrowError(/Solo el dueño puede editar/);
        expect(() =>
            assertUserMapActionAllowed("delete", { isOwner: false, visibility: "public" }),
        ).toThrowError(/Solo el dueño puede borrar/);
        expect(() =>
            assertUserMapActionAllowed("edit", { isOwner: true, visibility: "private" }),
        ).not.toThrow();
    });
});

describe("user map quotas (issue #24 item 3)", () => {
    it("allows map creation while under the per-account cap", () => {
        expect(MAX_MAPS_PER_ACCOUNT).toBe(20);
        expect(() => assertMapsQuotaAvailable(0)).not.toThrow();
        expect(() => assertMapsQuotaAvailable(MAX_MAPS_PER_ACCOUNT - 1)).not.toThrow();
    });

    it("rejects map creation at the per-account cap", () => {
        expect(() => assertMapsQuotaAvailable(MAX_MAPS_PER_ACCOUNT)).toThrowError(
            /Cupo alcanzado/,
        );
        expect(() => assertMapsQuotaAvailable(MAX_MAPS_PER_ACCOUNT + 5)).toThrowError(
            /Cupo alcanzado/,
        );
    });

    it("rejects invalid account map counts", () => {
        expect(() => assertMapsQuotaAvailable(-1)).toThrowError(/invalida/);
        expect(() => assertMapsQuotaAvailable(1.5)).toThrowError(/invalida/);
    });

    it("allows saves under the per-map density cap", () => {
        expect(MAX_ENTITIES_PER_USER_MAP).toBe(2_000);
        expect(() => assertEntitiesQuotaAvailable(0)).not.toThrow();
        expect(() => assertEntitiesQuotaAvailable(MAX_ENTITIES_PER_USER_MAP)).not.toThrow();
    });

    it("rejects saves above the per-map density cap and invalid counts", () => {
        expect(() =>
            assertEntitiesQuotaAvailable(MAX_ENTITIES_PER_USER_MAP + 1),
        ).toThrowError(/Densidad maxima/);
        expect(() => assertEntitiesQuotaAvailable(-3)).toThrowError(/invalida/);
        expect(() => assertEntitiesQuotaAvailable(2.5)).toThrowError(/invalida/);
    });
});
