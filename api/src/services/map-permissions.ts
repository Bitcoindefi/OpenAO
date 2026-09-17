/**
 * Map Editing Permissions & Attribution Engine (Modo Construcción - Etapa 0)
 * Resolves Issue #4: Permisos y atribución para edición de mapas
 */

export interface UserContext {
  accountId: string;
  email: string;
  isAdmin?: boolean;
  assignedMaps?: number[];
}

export interface MapMutationLog {
  id?: string;
  accountId: string;
  mapId: number;
  mutationType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// Protected central city maps that reject writes by default unless explicit override is provided
export const PROTECTED_MAPS = new Set<number>([
  1,   // Ullathorpe
  34,  // Nix
  59,  // Lindos
  60   // Banderbill
]);

/**
 * Checks if a map is marked as protected against accidental mutations.
 */
export function isMapProtected(mapId: number): boolean {
  return PROTECTED_MAPS.has(mapId);
}

/**
 * Evaluates whether a given user has permission to modify a specific map.
 * 
 * Rules:
 * 1. Protected maps reject writes even for admins, unless explicit override flag is true.
 * 2. Admins can edit any non-protected map.
 * 3. Regular users/collaborators can only edit maps explicitly listed in their assignedMaps array.
 * 4. Unassigned or unauthorized users receive 403.
 */
export function evaluateMapEditPermission(
  user: UserContext | null | undefined,
  mapId: number,
  options: { allowProtectedOverride?: boolean } = {}
): { allowed: boolean; statusCode: number; reason?: string } {
  if (!user || !user.accountId) {
    return {
      allowed: false,
      statusCode: 401,
      reason: "No autenticado. Se requiere una cuenta válida para editar mapas."
    };
  }

  // Check protected map rule
  if (isMapProtected(mapId) && !options.allowProtectedOverride) {
    return {
      allowed: false,
      statusCode: 403,
      reason: `El mapa ${mapId} está marcado como protegido (ciudad principal). Se requiere un override explícito de administrador.`
    };
  }

  // Admin access
  if (user.isAdmin) {
    return { allowed: true, statusCode: 200 };
  }

  // Collaborator per-map access check
  const assigned = user.assignedMaps || [];
  if (assigned.includes(mapId)) {
    return { allowed: true, statusCode: 200 };
  }

  return {
    allowed: false,
    statusCode: 403,
    reason: `La cuenta ${user.accountId} no tiene permisos asignados para modificar el mapa ${mapId}.`
  };
}

/**
 * Creates an immutable attribution audit record for any map mutation.
 */
export function createAttributionRecord(
  user: UserContext,
  mapId: number,
  mutationType: string,
  payload: Record<string, unknown>
): MapMutationLog {
  return {
    accountId: user.accountId,
    mapId,
    mutationType,
    payload,
    timestamp: new Date()
  };
}
