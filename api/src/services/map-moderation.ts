/**
 * User-Generated Map Moderation & Proposal Workflow Engine (Modo Construcción - Etapa 5)
 * Resolves Issue #25: Flujo de propuesta y moderación de mapas de usuario ($100 USD)
 */

export type MapPublicationStatus =
  | "DRAFT"
  | "PROPOSED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "UNPUBLISHED";

export interface UserMapProposal {
  id: string;
  authorAccountId: string;
  mapNumber: number;
  name: string;
  status: MapPublicationStatus;
  rejectionReason?: string;
  reportCount: number;
  proposedAt?: Date;
  reviewedAt?: Date;
  reviewerAccountId?: string;
  automatedChecksPassed: boolean;
  validationFlags: string[];
}

export interface MapContentData {
  name: string;
  signsText?: string[];
  npcNames?: string[];
  tiles: { blocked: boolean; x: number; y: number }[];
  spawnPoint?: { x: number; y: number };
}

const PROHIBITED_WORDS = [
  "scam",
  "cheat",
  "hack",
  "bot",
  "exploit",
  "phishing"
];

/**
 * Runs automated heuristic checks before passing a proposal to human moderators.
 */
export function runAutomatedMapPreChecks(content: MapContentData): {
  passed: boolean;
  flags: string[];
} {
  const flags: string[] = [];

  // 1. Text & profanity check
  const allTexts = [
    content.name,
    ...(content.signsText || []),
    ...(content.npcNames || [])
  ];

  for (const text of allTexts) {
    const lower = (text || "").toLowerCase();
    for (const forbidden of PROHIBITED_WORDS) {
      if (lower.includes(forbidden)) {
        flags.push(`Contenido no permitido detectado: palabra sospechosa "${forbidden}"`);
      }
    }
  }

  // 2. Playability check: Spawn point accessibility
  if (content.spawnPoint) {
    const isSpawnBlocked = content.tiles.some(
      t => t.x === content.spawnPoint?.x && t.y === content.spawnPoint?.y && t.blocked
    );
    if (isSpawnBlocked) {
      flags.push("El punto de aparición (spawn) está ubicado sobre un tile bloqueado");
    }
  }

  // 3. Grid bounds check
  if (!content.tiles || content.tiles.length === 0) {
    flags.push("El mapa no contiene información de terreno o está vacío");
  }

  return {
    passed: flags.length === 0,
    flags
  };
}

/**
 * Transition: Propose a draft map for moderation.
 */
export function proposeMap(
  proposal: UserMapProposal,
  content: MapContentData
): UserMapProposal {
  const autoCheck = runAutomatedMapPreChecks(content);

  return {
    ...proposal,
    status: autoCheck.passed ? "PROPOSED" : "REJECTED",
    rejectionReason: autoCheck.passed
      ? undefined
      : `Rechazado automáticamente por validación de seguridad: ${autoCheck.flags.join("; ")}`,
    automatedChecksPassed: autoCheck.passed,
    validationFlags: autoCheck.flags,
    proposedAt: new Date()
  };
}

/**
 * Transition: Approve a proposed map by a moderator.
 */
export function approveMap(
  proposal: UserMapProposal,
  reviewerAccountId: string
): UserMapProposal {
  if (proposal.status !== "PROPOSED" && proposal.status !== "IN_REVIEW") {
    throw new Error(`No se puede aprobar un mapa en estado ${proposal.status}`);
  }

  return {
    ...proposal,
    status: "APPROVED",
    reviewerAccountId,
    reviewedAt: new Date(),
    rejectionReason: undefined
  };
}

/**
 * Transition: Reject a proposed map with a mandatory reason.
 */
export function rejectMap(
  proposal: UserMapProposal,
  reviewerAccountId: string,
  reason: string
): UserMapProposal {
  if (!reason || !reason.trim()) {
    throw new Error("Es obligatorio especificar un motivo detallado al rechazar un mapa.");
  }

  return {
    ...proposal,
    status: "REJECTED",
    reviewerAccountId,
    reviewedAt: new Date(),
    rejectionReason: reason.trim()
  };
}

/**
 * Transition: Report an approved published map, returning it to review queue if threshold reached.
 */
export function reportMap(
  proposal: UserMapProposal,
  reportReason: string
): UserMapProposal {
  const nextReportCount = proposal.reportCount + 1;
  const shouldReturnToQueue = nextReportCount >= 3;

  return {
    ...proposal,
    reportCount: nextReportCount,
    status: shouldReturnToQueue ? "IN_REVIEW" : proposal.status,
    validationFlags: [...proposal.validationFlags, `Reportado: ${reportReason}`]
  };
}

/**
 * Transition: Unpublish a live map.
 */
export function unpublishMap(
  proposal: UserMapProposal,
  reviewerAccountId: string,
  reason: string
): UserMapProposal {
  return {
    ...proposal,
    status: "UNPUBLISHED",
    reviewerAccountId,
    reviewedAt: new Date(),
    rejectionReason: reason
  };
}
