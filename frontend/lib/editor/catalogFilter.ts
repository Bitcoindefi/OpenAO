/**
 * Pure helpers for the construction-mode content browsers (#29).
 *
 * Kept free of React / localStorage so the filter + favorites math can be
 * unit-tested without mounting the editor.
 */

export type CatalogKind = "terrain" | "object" | "npc";

export type CatalogFavorite = {
    kind: CatalogKind;
    id: number;
    grhIndex: number;
    name: string;
};

export type NamedCatalogEntry = {
    id: number;
    name: string;
};

export type TypedCatalogEntry = NamedCatalogEntry & {
    objType: number;
};

/**
 * Filter a named catalog by free-text query (name substring or exact id).
 */
export function filterByNameOrId<T extends NamedCatalogEntry>(
    entries: readonly T[],
    query: string,
): T[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return [...entries];
    }

    return entries.filter(
        (entry) =>
            entry.name.toLowerCase().includes(normalized) ||
            String(entry.id).includes(normalized),
    );
}

/**
 * Filter objects by optional type chip + free-text query.
 * Generic so callers keep fields like `grhIndex` from `EditorObject`.
 */
export function filterObjects<T extends TypedCatalogEntry>(
    entries: readonly T[],
    opts: { query?: string; objType?: number | null } = {},
): T[] {
    const objType = opts.objType ?? null;
    const typed =
        objType === null
            ? [...entries]
            : entries.filter((entry) => entry.objType === objType);

    return filterByNameOrId(typed, opts.query ?? "");
}

/**
 * Count how many objects fall under each objType (for chip badges).
 */
export function countByObjType(
    entries: readonly TypedCatalogEntry[],
): Map<number, number> {
    const counts = new Map<number, number>();
    for (const entry of entries) {
        counts.set(entry.objType, (counts.get(entry.objType) ?? 0) + 1);
    }
    return counts;
}

export function favoriteKey(kind: CatalogKind, id: number): string {
    return `${kind}:${id}`;
}

/**
 * Toggle a favorite entry. Newest favorite is prepended; capped at `limit`.
 */
export function toggleFavoriteEntry(
    current: readonly CatalogFavorite[],
    entry: CatalogFavorite,
    limit = 24,
): CatalogFavorite[] {
    const exists = current.some(
        (fav) => fav.kind === entry.kind && fav.id === entry.id,
    );

    if (exists) {
        return current.filter(
            (fav) => fav.kind !== entry.kind || fav.id !== entry.id,
        );
    }

    const withoutDuplicate = current.filter(
        (fav) => fav.kind !== entry.kind || fav.id !== entry.id,
    );
    return [entry, ...withoutDuplicate].slice(0, limit);
}

export function isFavorite(
    favorites: readonly CatalogFavorite[],
    kind: CatalogKind,
    id: number,
): boolean {
    return favorites.some((fav) => fav.kind === kind && fav.id === id);
}

/**
 * Parse favorites from raw localStorage JSON. Invalid shapes return [].
 */
export function parseFavorites(raw: unknown): CatalogFavorite[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.filter((entry): entry is CatalogFavorite => {
        if (typeof entry !== "object" || entry === null) {
            return false;
        }
        const candidate = entry as CatalogFavorite;
        return (
            ["terrain", "object", "npc"].includes(candidate.kind) &&
            typeof candidate.id === "number" &&
            Number.isFinite(candidate.id) &&
            typeof candidate.grhIndex === "number" &&
            Number.isFinite(candidate.grhIndex) &&
            typeof candidate.name === "string"
        );
    });
}
