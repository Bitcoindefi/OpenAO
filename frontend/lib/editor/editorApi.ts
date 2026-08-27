/**
 * Cliente del editor visual. Todas las peticiones pasan por el proxy de Next
 * (app/api/editor/[...path]) que agrega la sesion y el token de admin; el
 * navegador nunca ve esos secretos.
 */

export type EditorObject = {
    id: number;
    name: string;
    objType: number;
    grhIndex: number;
    version: number;
    updatedAt: string;
};

export type EditorNpc = {
    id: number;
    name: string;
    npcType: number;
    idHead: number;
    idBody: number;
    movement: number;
    version: number;
    updatedAt: string;
};

export type TerrainPaletteEntry = {
    id: number;
    graphics: Array<number | null>;
    blocked: boolean;
};

export type TerrainPalette = {
    mapNum: number;
    palette: TerrainPaletteEntry[];
    uploadedGraphics: Array<{
        grhIndex: number;
        width: number;
        height: number;
        byteSize: number;
        createdAt: string;
    }>;
};

export type MapTileOverride = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked: boolean | null;
    status: "draft" | "published";
};

export type MapTileEntity = {
    x: number;
    y: number;
    kind: "obj" | "npc";
    entityId: number;
    status: "draft" | "published";
};

export type MapOverridesResponse = {
    mapNum: number;
    includeDrafts: boolean;
    overrides: MapTileOverride[];
    entities: MapTileEntity[];
};

export type MapStatus = {
    mapNum: number;
    draft: number;
    published: number;
    draftEntities: number;
    publishedEntities: number;
};

export type TilePaint = {
    x: number;
    y: number;
    layer: number;
    grhIndex: number | null;
    blocked?: boolean | null;
};

export type EntityPlacement = {
    x: number;
    y: number;
    kind: "obj" | "npc";
    entityId: number;
};

export type UploadedGraphic = {
    grhIndex: number;
    width: number;
    height: number;
    byteSize: number;
    deduped: boolean;
    url: string;
};

export type PaginatedResponse<T> = {
    items: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};

async function requestJson<T>(
    path: string,
    init?: RequestInit,
): Promise<{ status: number; ok: boolean; data: T }> {
    const response = await fetch(path, init);
    // Un cuerpo vacio o no-JSON no debe convertirse en un TypeError al leer
    // `data.error`: todos los llamadores esperan un objeto.
    const data = ((await response.json().catch(() => null)) ?? {}) as T;
    return { status: response.status, ok: response.ok, data };
}

function editorPath(path: string): string {
    return `/api/editor/${path.replace(/^\/+/, "")}`;
}

export async function listEditorObjects(): Promise<EditorObject[]> {
    const response = await requestJson<{
        objects?: EditorObject[];
        error?: string;
    }>(editorPath("objects?all=true"));

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudieron cargar los objetos.");
    }

    return response.data.objects ?? [];
}

export async function listEditorNpcs(): Promise<EditorNpc[]> {
    const response = await requestJson<{ npcs?: EditorNpc[]; error?: string }>(
        editorPath("npcs?all=true"),
    );

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudieron cargar los NPCs.");
    }

    return response.data.npcs ?? [];
}

export async function getMapTerrainPalette(mapNum: number): Promise<TerrainPalette> {
    const response = await requestJson<TerrainPalette | { error: string }>(
        editorPath(`maps/${mapNum}/terrain`),
    );

    if (!response.ok) {
        throw new Error(
            (response.data as { error?: string }).error ??
                "No se pudo cargar la paleta de tiles.",
        );
    }

    return response.data as TerrainPalette;
}

export async function getMapStatus(mapNum: number): Promise<MapStatus> {
    const response = await requestJson<MapStatus | { error: string }>(
        editorPath(`maps/${mapNum}/status`),
    );

    if (!response.ok) {
        throw new Error(
            (response.data as { error?: string }).error ??
                "No se pudo cargar el estado del mapa.",
        );
    }

    return response.data as MapStatus;
}

export async function paintTiles(
    mapNum: number,
    tiles: TilePaint[],
): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/tiles`),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tiles }),
        },
    );

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudieron pintar los tiles.");
    }
}

export async function clearTileOverride(
    mapNum: number,
    x: number,
    y: number,
    layer: number,
): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/tiles/${x}/${y}/${layer}`),
        { method: "DELETE" },
    );

    if (!response.ok) {
        throw new Error(
            response.data.error ?? "No se pudo limpiar el tile.",
        );
    }
}

export async function placeTileEntity(
    mapNum: number,
    placement: EntityPlacement,
): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/entities`),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(placement),
        },
    );

    if (!response.ok) {
        throw new Error(
            response.data.error ?? "No se pudo colocar el objeto o NPC.",
        );
    }
}

export async function removeTileEntity(
    mapNum: number,
    x: number,
    y: number,
    kind: "obj" | "npc",
): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/entities/${x}/${y}/${kind}`),
        { method: "DELETE" },
    );

    if (!response.ok) {
        throw new Error(
            response.data.error ?? "No se pudo quitar el objeto o NPC.",
        );
    }
}

export async function publishMapChanges(mapNum: number): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/publish`),
        { method: "POST" },
    );

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudo publicar el mapa.");
    }
}

export async function discardMapDrafts(mapNum: number): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/discard`),
        { method: "POST" },
    );

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudieron descartar los borradores.");
    }
}

export async function revertMapChanges(mapNum: number): Promise<void> {
    const response = await requestJson<{ error?: string }>(
        editorPath(`maps/${mapNum}/revert`),
        { method: "POST" },
    );

    if (!response.ok) {
        throw new Error(response.data.error ?? "No se pudo revertir el mapa.");
    }
}

export async function uploadGraphicPng(
    pngBytes: ArrayBuffer,
): Promise<UploadedGraphic> {
    const response = await requestJson<UploadedGraphic | { error: string }>(
        editorPath("graphics"),
        {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: pngBytes,
        },
    );

    if (!response.ok) {
        throw new Error(
            (response.data as { error?: string }).error ??
                "No se pudo subir el grafico.",
        );
    }

    return response.data as UploadedGraphic;
}

/**
 * Ediciones del mapa para el editor.
 *
 * Usa la ruta de admin y no la publica a proposito: la publica degrada a lo
 * publicado cuando falta permiso o la API no responde, y el editor abriria un
 * mapa sin borradores como si estuviera todo en orden.
 */
export async function getMapOverrides(mapNum: number): Promise<MapOverridesResponse> {
    const response = await requestJson<MapOverridesResponse | { error: string }>(
        editorPath(`maps/${mapNum}/overrides`),
    );

    if (!response.ok) {
        throw new Error(
            (response.data as { error?: string }).error ??
                "No se pudieron cargar las ediciones del mapa.",
        );
    }

    return response.data as MapOverridesResponse;
}

/**
 * Si la cuenta actual puede usar el modo construccion.
 *
 * La sesion publica no dice si la cuenta es admin de game-data, y compararlo en
 * el cliente exigiria mandarle el email de admin al navegador. Preguntar a la
 * API deja el dato del lado del servidor.
 */
export async function isGameDataAdmin(): Promise<boolean> {
    try {
        const response = await requestJson<{ isGameDataAdmin?: boolean }>(
            editorPath("session"),
        );

        return response.ok && response.data.isGameDataAdmin === true;
    } catch {
        // Sin red se asume que no hay permiso: es el caso seguro.
        return false;
    }
}