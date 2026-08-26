import { describe, it, expect } from "vitest";
import {
    PROTECTED_MAPS,
    isMapProtected,
    canAccountEditMap,
} from "../worldBuilder";

describe("World Builder Map Permissions and Protections (#4)", () => {
    it("should identify city maps as protected by default", () => {
        expect(isMapProtected(1)).toBe(true); // Ullathorpe
        expect(isMapProtected(34)).toBe(true); // Nix
        expect(isMapProtected(59)).toBe(true); // Banderbill
        expect(isMapProtected(50)).toBe(false); // Regular map
    });

    it("should reject edits to protected maps when override is false", () => {
        const result = canAccountEditMap("admin_123", 1, true, undefined, false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("protegido contra modificaciones");
    });

    it("should allow edits to protected maps when override is true", () => {
        const result = canAccountEditMap("admin_123", 1, true, undefined, true);
        expect(result.allowed).toBe(true);
    });

    it("should allow superadmin to edit non-protected maps", () => {
        const result = canAccountEditMap("admin_123", 50, true, undefined, false);
        expect(result.allowed).toBe(true);
    });

    it("should allow collaborator to edit specifically assigned map", () => {
        const result = canAccountEditMap("collab_456", 50, false, [50, 51], false);
        expect(result.allowed).toBe(true);
    });

    it("should reject collaborator attempting to edit unassigned map", () => {
        const result = canAccountEditMap("collab_456", 100, false, [50, 51], false);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("no tiene permisos");
    });
});
