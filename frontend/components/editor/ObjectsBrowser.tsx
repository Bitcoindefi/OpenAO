"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { getObjectType, OBJECT_TYPES } from "../../data/objectTypes";
import {
    countByObjType,
    filterObjects,
} from "../../lib/editor/catalogFilter";
import type { EditorObject } from "../../lib/editor/editorApi";
import { useEditorStore } from "../../lib/editor/editorStore";
import GraphicPreview from "./GraphicPreview";
import VirtualizedList from "./VirtualizedList";

const ITEM_HEIGHT = 56;

/**
 * Catalogo de objetos del juego con busqueda, filtro por tipo y favoritos.
 *
 * Al seleccionar un objeto se activa la herramienta de colocacion y se suma
 * al historial de recientes.
 */
export default function ObjectsBrowser() {
    const {
        objects,
        tool,
        setTool,
        addRecent,
        toggleFavorite,
        isFavorite,
    } = useEditorStore();
    const [search, setSearch] = useState("");
    const [objTypeFilter, setObjTypeFilter] = useState<number | null>(null);

    const countsByType = useMemo(() => countByObjType(objects), [objects]);

    const filteredObjects = useMemo(
        () =>
            filterObjects(objects, {
                query: search,
                objType: objTypeFilter,
            }),
        [objTypeFilter, objects, search],
    );

    const selectedId = tool?.kind === "object" ? tool.object.id : null;

    const handleSelect = (entry: EditorObject) => {
        setTool({ kind: "object", object: entry });
        addRecent({
            kind: "object",
            id: entry.id,
            grhIndex: entry.grhIndex,
            name: entry.name,
        });
    };

    const handleToggleFavorite = (
        event: MouseEvent,
        entry: EditorObject,
    ) => {
        event.stopPropagation();
        toggleFavorite({
            kind: "object",
            id: entry.id,
            grhIndex: entry.grhIndex,
            name: entry.name,
        });
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar objeto por nombre o id..."
                className="w-full rounded-lg border border-white/10 bg-stone-950/60 px-3 py-2 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-400/50 focus:outline-none"
            />

            {objects.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    <button
                        type="button"
                        onClick={() => setObjTypeFilter(null)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            objTypeFilter === null
                                ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                                : "border-white/10 bg-stone-950/60 text-stone-400 hover:text-stone-200"
                        }`}
                    >
                        Todos ({objects.length})
                    </button>
                    {OBJECT_TYPES.map((entry) => {
                        const count = countsByType.get(entry.id) ?? 0;

                        if (count === 0) {
                            return null;
                        }

                        return (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() =>
                                    setObjTypeFilter(
                                        objTypeFilter === entry.id
                                            ? null
                                            : entry.id,
                                    )
                                }
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                    objTypeFilter === entry.id
                                        ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                                        : "border-white/10 bg-stone-950/60 text-stone-400 hover:text-stone-200"
                                }`}
                                title={entry.label}
                            >
                                {entry.label} ({count})
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {filteredObjects.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-[11px] text-stone-500">
                    Ningun objeto coincide con la busqueda.
                </p>
            ) : (
                <VirtualizedList
                    items={filteredObjects}
                    getItemKey={(entry) => entry.id}
                    renderItem={(entry) => {
                        const type = getObjectType(entry.objType);
                        const isSelected = selectedId === entry.id;
                        const favorited = isFavorite("object", entry.id);

                        return (
                            <div
                                className={`group relative flex h-[52px] w-full items-center gap-2 rounded-lg border px-2 transition ${
                                    isSelected
                                        ? "border-amber-400/70 bg-amber-400/15"
                                        : "border-transparent bg-stone-950/40 hover:border-white/10 hover:bg-stone-900/70"
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelect(entry)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                    <GraphicPreview
                                        grhIndex={entry.grhIndex}
                                        size={44}
                                        scale={1.6}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-stone-200">
                                            {entry.name}
                                        </p>
                                        <p className="flex items-center gap-1.5 text-[10px] text-stone-500">
                                            <span
                                                className="inline-block h-1.5 w-1.5 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        type?.color ?? "#78716c",
                                                }}
                                            />
                                            #{entry.id}
                                            {type ? ` - ${type.label}` : ""}
                                        </p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) =>
                                        handleToggleFavorite(event, entry)
                                    }
                                    title={
                                        favorited
                                            ? "Quitar de favoritos"
                                            : "Agregar a favoritos"
                                    }
                                    className={`shrink-0 px-1 text-sm transition ${
                                        favorited
                                            ? "text-amber-300"
                                            : "text-stone-600 opacity-0 group-hover:opacity-100 hover:text-amber-200"
                                    }`}
                                >
                                    ★
                                </button>
                            </div>
                        );
                    }}
                    itemHeight={ITEM_HEIGHT}
                    className="min-h-0 flex-1 rounded-lg"
                />
            )}
        </div>
    );
}
