import { describe, it, expect } from "vitest";
import {
  evaluateMapEditPermission,
  createAttributionRecord,
  isMapProtected,
  UserContext
} from "../services/map-permissions";

describe("Map Permissions & Attribution Engine (Issue #4)", () => {
  const regularUser: UserContext = {
    accountId: "user-123",
    email: "builder@ao.com",
    isAdmin: false,
    assignedMaps: [50, 51]
  };

  const unauthorizedUser: UserContext = {
    accountId: "user-999",
    email: "random@ao.com",
    isAdmin: false,
    assignedMaps: []
  };

  const adminUser: UserContext = {
    accountId: "admin-001",
    email: "admin@ao.com",
    isAdmin: true,
    assignedMaps: []
  };

  it("Criterion 1: Una cuenta sin permiso recibe 403 al intentar editar un mapa", () => {
    const res = evaluateMapEditPermission(unauthorizedUser, 50);
    expect(res.allowed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.reason).toContain("no tiene permisos");
  });

  it("Criterion 2: Una cuenta con permiso sobre el mapa 50 no puede editar el mapa 10", () => {
    // Allowed on map 50
    const allowedRes = evaluateMapEditPermission(regularUser, 50);
    expect(allowedRes.allowed).toBe(true);
    expect(allowedRes.statusCode).toBe(200);

    // Rejected on map 10
    const rejectedRes = evaluateMapEditPermission(regularUser, 10);
    expect(rejectedRes.allowed).toBe(false);
    expect(rejectedRes.statusCode).toBe(403);
  });

  it("Criterion 3: Los mapas protegidos rechazan escritura incluso para admins, salvo override explícito", () => {
    // Map 1 (Ullathorpe) is protected
    expect(isMapProtected(1)).toBe(true);

    // Admin rejected without override
    const adminNoOverride = evaluateMapEditPermission(adminUser, 1, { allowProtectedOverride: false });
    expect(adminNoOverride.allowed).toBe(false);
    expect(adminNoOverride.statusCode).toBe(403);
    expect(adminNoOverride.reason).toContain("está marcado como protegido");

    // Admin allowed WITH explicit override
    const adminWithOverride = evaluateMapEditPermission(adminUser, 1, { allowProtectedOverride: true });
    expect(adminWithOverride.allowed).toBe(true);
    expect(adminWithOverride.statusCode).toBe(200);
  });

  it("Criterion 4: Toda mutación registra la atribución completa de la cuenta que la hizo", () => {
    const payload = { tileX: 50, tileY: 50, layer1: 1024 };
    const log = createAttributionRecord(regularUser, 50, "SET_TILE", payload);

    expect(log.accountId).toBe("user-123");
    expect(log.mapId).toBe(50);
    expect(log.mutationType).toBe("SET_TILE");
    expect(log.payload).toEqual(payload);
    expect(log.timestamp).toBeInstanceOf(Date);
  });
});
