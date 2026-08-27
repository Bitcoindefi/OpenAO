"use client";

import { useMemo, useState } from "react";
import { getObjectType, OBJECT_TYPES } from "../../data/objectTypes";
import type { EditorObject } from "../../lib/editor/editorApi";
import { useEditorStore } from "../../lib/editor/editorStore";
import GraphicPreview from "./GraphicPreview";
import VirtualizedList from "./VirtualizedList";

const ITEM_HEIGHT = 56;

/**
 * Catalogo de objetos del juego con busqueda y filtro por tipo.
 *
 * Al seleccionar un objeto se activa la herramienta de colocacion y se suma
 * al historial de recientes.
 */
export default function ObjectsBrowser() {
    const { objects, tool, setTool, addRecent } = useEditorStore();
    const [search, setSearch] = useState("");
    const [objTypeFilter, setObjTypeFilter] = useState<number | null>(null);
    const normalizedSearch = search.trim().toLowerCase();

    // Un recorrido por tipo y no un filter por chip: son 37 chips sobre mil
    // objetos, y se recalculaba entero en cada tecla de la busqueda.
    const countsByType = useMemo(() => {
        const counts = new Map<number, number>();

        for (const entry of objects) {
            counts.set(entry.objType, (counts.get(entry.objType) ?? 0) + 1);
        }

        return counts;
    }, [objects]);

    const filteredObjects = useMemo(() => {
        let result = objects;

        if (objTypeFilter !== null) {
            result = result.filter((entry) => entry.objType === objTypeFilter);
        }

        if (normalizedSearch) {
            result = result.filter(
                (entry) =>
                    entry.name.toLowerCase().includes(normalizedSearch) ||
                    String(entry.id).includes(normalizedSearch),
            );
        }

        return result;
    }, [normalizedSearch, objTypeFilter, objects]);

    const selectedId =
        tool?.kind === "object" ? tool.object.id : null;

    const handleSelect = (entry: EditorObject) => {
        setTool({ kind: "object", object: entry });
        addRecent({
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

                        return (
                            <button
                                type="button"
                                onClick={() => handleSelect(entry)}
                                className={`flex h-[52px] w-full items-center gap-2 rounded-lg border px-2 text-left transition ${
                                    isSelected
                                        ? "border-amber-400/70 bg-amber-400/15"
                                        : "border-transparent bg-stone-950/40 hover:border-white/10 hover:bg-stone-900/70"
                                }`}
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
                        );
                    }}
                    itemHeight={ITEM_HEIGHT}
                    className="min-h-0 flex-1 rounded-lg"
                />
            )}
        </div>
    );
}