/**
 * Isolated User Map Space, Ownership & Quota Management Engine (Modo Construcción - Etapa 5)
 * Resolves Issue #24: Espacio aislado de mapas de usuario con propiedad y cuotas ($100 USD)
 */

export const USER_MAP_RANGE = {
  MIN_ID: 1000,
  MAX_ID: 1999
} as const;

export const USER_MAP_QUOTAS = {
  MAX_MAPS_PER_ACCOUNT: 5,
  MAX_NPCS_PER_MAP: 50,
  MAX_OBJECTS_PER_MAP: 200,
  MAX_UPLOAD_SIZE_MB: 10
} as const;

export type UserMapState = "DRAFT" | "PROPOSED" | "PUBLISHED" | "ARCHIVED";

export interface UserMapRecord {
  mapId: number;
  ownerAccountId: string;
  name: string;
  state: UserMapState;
  npcCount: number;
  objectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checks if a map ID belongs to the isolated user-generated map range (1000-1999).
 */
export function isUserMap(mapId: number): boolean {
  return mapId >= USER_MAP_RANGE.MIN_ID && mapId <= USER_MAP_RANGE.MAX_ID;
}

/**
 * Validates whether an account has quota to create another user map.
 */
export function validateAccountMapQuota(
  existingMapsCount: number
): { allowed: boolean; reason?: string } {
  if (existingMapsCount >= USER_MAP_QUOTAS.MAX_MAPS_PER_ACCOUNT) {
    return {
      allowed: false,
      reason: `Has alcanzado la cuota máxima permitida de ${USER_MAP_QUOTAS.MAX_MAPS_PER_ACCOUNT} mapas por cuenta.`
    };
  }
  return { allowed: true };
}

/**
 * Validates map density quotas (NPCs, Objects).
 */
export function validateMapDensity(
  npcCount: number,
  objectCount: number
): { allowed: boolean; reason?: string } {
  if (npcCount > USER_MAP_QUOTAS.MAX_NPCS_PER_MAP) {
    return {
      allowed: false,
      reason: `El mapa supera el límite de ${USER_MAP_QUOTAS.MAX_NPCS_PER_MAP} NPCs permitidos por mapa (actual: ${npcCount}).`
    };
  }
  if (objectCount > USER_MAP_QUOTAS.MAX_OBJECTS_PER_MAP) {
    return {
      allowed: false,
      reason: `El mapa supera el límite de ${USER_MAP_QUOTAS.MAX_OBJECTS_PER_MAP} objetos permitidos por mapa (actual: ${objectCount}).`
    };
  }
  return { allowed: true };
}

/**
 * Evaluates edit permissions on a user map.
 */
export function canEditUserMap(
  accountId: string,
  map: UserMapRecord
): { allowed: boolean; statusCode: number; reason?: string } {
  if (map.ownerAccountId !== accountId) {
    return {
      allowed: false,
      statusCode: 403,
      reason: "No tienes permiso para editar este mapa porque pertenece a otro usuario."
    };
  }
  return { allowed: true, statusCode: 200 };
}

/**
 * Evaluates read/join visibility for a user map.
 * Draft maps are strictly visible only to their owner.
 */
export function canViewUserMap(
  accountId: string | null | undefined,
  map: UserMapRecord
): boolean {
  if (map.state === "PUBLISHED") {
    return true;
  }
  if (map.state === "DRAFT" || map.state === "PROPOSED") {
    return map.ownerAccountId === accountId;
  }
  return false;
}
