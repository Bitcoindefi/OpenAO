import { describe, it, expect } from "vitest";
import {
  proposeMap,
  approveMap,
  rejectMap,
  reportMap,
  unpublishMap,
  runAutomatedMapPreChecks,
  UserMapProposal,
  MapContentData
} from "../services/map-moderation";

describe("User Map Moderation & Proposal Workflow (Issue #25)", () => {
  const initialDraft: UserMapProposal = {
    id: "prop-001",
    authorAccountId: "acc-user-1",
    mapNumber: 150,
    name: "Bosque Encantado",
    status: "DRAFT",
    reportCount: 0,
    automatedChecksPassed: false,
    validationFlags: []
  };

  const validContent: MapContentData = {
    name: "Bosque Encantado",
    signsText: ["Bienvenido a la aventura"],
    npcNames: ["Guardia de la entrada"],
    tiles: [
      { x: 50, y: 50, blocked: false },
      { x: 50, y: 51, blocked: false }
    ],
    spawnPoint: { x: 50, y: 50 }
  };

  const invalidContent: MapContentData = {
    name: "Free Gold Cheat Map",
    signsText: ["hack here"],
    tiles: [
      { x: 50, y: 50, blocked: true }
    ],
    spawnPoint: { x: 50, y: 50 }
  };

  it("Criterion 1: Automated pre-checks intercept forbidden content and blocked spawns", () => {
    const check = runAutomatedMapPreChecks(invalidContent);
    expect(check.passed).toBe(false);
    expect(check.flags.length).toBeGreaterThanOrEqual(2);
  });

  it("Criterion 2: Proposing valid content passes automated checks and enters PROPOSED state", () => {
    const proposed = proposeMap(initialDraft, validContent);
    expect(proposed.status).toBe("PROPOSED");
    expect(proposed.automatedChecksPassed).toBe(true);
    expect(proposed.proposedAt).toBeInstanceOf(Date);
  });

  it("Criterion 3: Moderator approval transitions map to APPROVED", () => {
    const proposed = proposeMap(initialDraft, validContent);
    const approved = approveMap(proposed, "mod-admin-1");
    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewerAccountId).toBe("mod-admin-1");
  });

  it("Criterion 4: Moderator rejection requires a mandatory detailed reason", () => {
    const proposed = proposeMap(initialDraft, validContent);
    expect(() => rejectMap(proposed, "mod-admin-1", "")).toThrow(/obligatorio especificar un motivo/);

    const rejected = rejectMap(proposed, "mod-admin-1", "El mapa carece de salida señalizada.");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("El mapa carece de salida señalizada.");
  });

  it("Criterion 5: User reports on published map return it to review queue upon threshold", () => {
    const proposed = proposeMap(initialDraft, validContent);
    let map = approveMap(proposed, "mod-admin-1");
    expect(map.status).toBe("APPROVED");

    map = reportMap(map, "Contenido inapropiado");
    expect(map.status).toBe("APPROVED");

    map = reportMap(map, "Gráficos plagiados");
    map = reportMap(map, "Trampa mortal sin salida");
    expect(map.status).toBe("IN_REVIEW");
    expect(map.reportCount).toBe(3);
  });

  it("Criterion 6: Moderator can unpublish a live map", () => {
    const proposed = proposeMap(initialDraft, validContent);
    const approved = approveMap(proposed, "mod-admin-1");
    const unpublished = unpublishMap(approved, "mod-admin-1", "Violación de normas.");
    expect(unpublished.status).toBe("UNPUBLISHED");
  });
});
