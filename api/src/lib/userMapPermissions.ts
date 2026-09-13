/**
 * Reglas de permiso y cupo para mapas de usuario (issue #24, items 2 y 3).
 *
 * Todo se aplica SIEMPRE del lado del servidor. El cliente puede esconder
 * botones, pero la unica fuente de verdad es aca: el servidor rechaza con
 * error cualquier accion que viole estas reglas.
 */

/** Item 3: maximo de mapas que una cuenta puede crear. */
export const MAX_MAPS_PER_ACCOUNT = 20;

/** Item 3: maximo de objetos/NPCs que un mapa de usuario puede tener. */
export const MAX_ENTITIES_PER_USER_MAP = 2_000;

export type UserMapVisibility = "private" | "public";

export type UserMapAction = "read" | "edit" | "delete";

export type UserMapAccess = {
    isOwner: boolean;
    visibility: UserMapVisibility;
};

/**
 * Item 2: puede `access` hacer `action` sobre el mapa?
 *
 * - read: el dueño siempre; el resto solo si el mapa es publico.
 * - edit / delete: solo el dueño. Nadie mas, ni aunque el mapa sea publico.
 */
export function canPerformUserMapAction(
    action: UserMapAction,
    access: UserMapAccess,
): boolean {
    if (access.isOwner) {
        return true;
    }
    if (action === "read") {
        return access.visibility === "public";
    }
    return false;
}

/** Rechaza con el estilo de error del backend si la accion no esta permitida. */
export function assertUserMapActionAllowed(
    action: UserMapAction,
    access: UserMapAccess,
): void {
    if (canPerformUserMapAction(action, access)) {
        return;
    }
    if (action === "read") {
        throw new Error("No tenes acceso a este mapa.");
    }
    throw new Error(
        action === "edit"
            ? "Solo el dueño puede editar este mapa."
            : "Solo el dueño puede borrar este mapa.",
    );
}

/**
 * Item 3: rechaza si crear otro mapa supera el cupo por cuenta.
 * `currentCount` es la cantidad de mapas que la cuenta ya tiene.
 */
export function assertMapsQuotaAvailable(currentCount: number): void {
    if (!Number.isInteger(currentCount) || currentCount < 0) {
        throw new Error(`Cantidad de mapas invalida: ${currentCount}.`);
    }
    if (currentCount >= MAX_MAPS_PER_ACCOUNT) {
        throw new Error(
            `Cupo alcanzado: una cuenta puede tener hasta ${MAX_MAPS_PER_ACCOUNT} mapas.`,
        );
    }
}

/**
 * Item 3: rechaza si guardar un mapa con `newEntityCount` objetos/NPCs
 * supera el cupo de densidad por mapa.
 */
export function assertEntitiesQuotaAvailable(newEntityCount: number): void {
    if (!Number.isInteger(newEntityCount) || newEntityCount < 0) {
        throw new Error(`Cantidad de entidades invalida: ${newEntityCount}.`);
    }
    if (newEntityCount > MAX_ENTITIES_PER_USER_MAP) {
        throw new Error(
            `Densidad maxima alcanzada: un mapa puede tener hasta ${MAX_ENTITIES_PER_USER_MAP} objetos/NPCs.`,
        );
    }
}
