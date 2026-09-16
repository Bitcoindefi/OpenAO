"use client";

import { useEffect, useMemo, useState } from "react";
import type { BodiesDB, HeadsDB } from "../../types/game";
import type { EditorNpc } from "../../lib/editor/editorApi";
import { useEditorStore } from "../../lib/editor/editorStore";
import {
    getSharedBodiesDB,
    getSharedHeadsDB,
    resolveCharacterThumbnailGrh,
} from "../../lib/graphicTextures";
import GraphicPreview from "./GraphicPreview";
import VirtualizedList from "./VirtualizedList";

const ITEM_HEIGHT = 76;

/**
 * Catalogo de NPCs del juego.
 *
 * Las miniaturas resuelven el grafico del NPC contra los catalogos de cuerpos y
 * cabezas y lo dibujan en un canvas 2D. No usan el renderizador de personajes
 * del cliente a proposito: crea una `Application` de PixiJS -y con ella un
 * contexto WebGL- por fila, y el navegador mantiene vivos apenas unos quince.
 */
export default function NpcsBrowser() {
    const { npcs, tool, setTool, addRecent } = useEditorStore();
    const [search, setSearch] = useState("");
    const [bodiesDB, setBodiesDB] = useState<BodiesDB | null>(null);
    const [headsDB, setHeadsDB] = useState<HeadsDB | null>(null);
    const normalizedSearch = search.trim().toLowerCase();

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSharedBodiesDB(), getSharedHeadsDB()])
            .then(([bodies, heads]) => {
                if (!cancelled) {
                    setBodiesDB(bodies);
                    setHeadsDB(heads);
                }
            })
            .catch(() => {
                // Sin catalogos las miniaturas quedan vacias, la lista sirve igual.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredNpcs = useMemo(() => {
        if (!normalizedSearch) {
            return npcs;
        }

        return npcs.filter(
            (entry) =>
                entry.name.toLowerCase().includes(normalizedSearch) ||
                String(entry.id).includes(normalizedSearch),
        );
    }, [normalizedSearch, npcs]);

    const selectedId = tool?.kind === "npc" ? tool.npc.id : null;

    const handleSelect = async (entry: EditorNpc) => {
        // La herramienta se activa ya: pintar no tiene por que esperar a que
        // carguen los catalogos.
        setTool({ kind: "npc", npc: entry });

        try {
            // Los catalogos se piden aca en vez de leerse del estado. Un click
            // antes de que terminen de cargar resolveria el grafico en 0, y ese
            // 0 queda guardado en los recientes: la miniatura quedaria vacia
            // para siempre, incluso despues de que los catalogos lleguen.
            const [bodies, heads] = await Promise.all([
                getSharedBodiesDB(),
                getSharedHeadsDB(),
            ]);

            addRecent({
                kind: "npc",
                id: entry.id,
                // El grafico, no `idHead`: son numeraciones distintas y los
                // recientes dibujan la miniatura con este valor.
                grhIndex: resolveCharacterThumbnailGrh(
                    bodies,
                    heads,
                    entry.idBody,
                    entry.idHead,
                ),
                name: entry.name,
            });
        } catch {
            // Sin catalogos no hay grafico que guardar, y un reciente que se ve
            // vacio es peor que no tenerlo.
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar NPC por nombre o id..."
                className="w-full rounded-lg border border-white/10 bg-stone-950/60 px-3 py-2 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-400/50 focus:outline-none"
            />

            {filteredNpcs.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-[11px] text-stone-500">
                    Ningun NPC coincide con la busqueda.
                </p>
            ) : (
                <VirtualizedList
                    items={filteredNpcs}
                    getItemKey={(entry) => entry.id}
                    renderItem={(entry) => {
                        const isSelected = selectedId === entry.id;

                        return (
                            <button
                                type="button"
                                onClick={() => void handleSelect(entry)}
                                className={`flex h-[72px] w-full items-center gap-2 rounded-lg border px-2 text-left transition ${
                                    isSelected
                                        ? "border-amber-400/70 bg-amber-400/15"
                                        : "border-transparent bg-stone-950/40 hover:border-white/10 hover:bg-stone-900/70"
                                }`}
                            >
                                <GraphicPreview
                                    grhIndex={resolveCharacterThumbnailGrh(
                                        bodiesDB,
                                        headsDB,
                                        entry.idBody,
                                        entry.idHead,
                                    )}
                                    size={56}
                                    scale={1.8}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-stone-200">
                                        {entry.name}
                                    </p>
                                    <p className="text-[10px] text-stone-500">
                                        #{entry.id} - Cuerpo {entry.idBody} / Cabeza{" "}
                                        {entry.idHead}
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
