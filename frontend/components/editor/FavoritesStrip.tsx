"use client";

import { findTerrainBrush, useEditorStore } from "../../lib/editor/editorStore";
import GraphicPreview from "./GraphicPreview";

const KIND_LABELS: Record<string, string> = {
    terrain: "Terreno",
    object: "Objeto",
    npc: "NPC",
};

/**
 * Tira de favoritos del editor (#29). Persiste en localStorage y permite
 * re-seleccionar herramientas sin buscar de nuevo en el catalogo.
 */
export default function FavoritesStrip() {
    const {
        favorites,
        objects,
        npcs,
        terrain,
        setTool,
        toggleFavorite,
    } = useEditorStore();

    if (favorites.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-2.5 text-[11px] text-stone-500">
                Marca con ★ los objetos, NPCs o tiles que uses seguido; quedan
                aca como favoritos entre sesiones.
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 backdrop-blur-md">
            <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
                Favoritos
            </span>
            {favorites.map((entry) => {
                const matchedObject =
                    entry.kind === "object"
                        ? objects.find((object) => object.id === entry.id)
                        : undefined;
                const matchedNpc =
                    entry.kind === "npc"
                        ? npcs.find((npc) => npc.id === entry.id)
                        : undefined;
                const matchedBrush =
                    entry.kind === "terrain"
                        ? findTerrainBrush(terrain, entry.id)
                        : null;
                const isAvailable =
                    entry.kind === "terrain"
                        ? matchedBrush !== null
                        : entry.kind === "object"
                          ? matchedObject !== undefined
                          : matchedNpc !== undefined;

                return (
                    <div
                        key={`${entry.kind}:${entry.id}`}
                        className="flex shrink-0 items-center gap-0.5 rounded-lg border border-amber-400/30 bg-stone-950/60"
                    >
                        <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                                if (matchedBrush) {
                                    setTool({ kind: "terrain", ...matchedBrush });
                                } else if (matchedObject) {
                                    setTool({
                                        kind: "object",
                                        object: matchedObject,
                                    });
                                } else if (matchedNpc) {
                                    setTool({ kind: "npc", npc: matchedNpc });
                                }
                            }}
                            title={
                                isAvailable
                                    ? `${KIND_LABELS[entry.kind] ?? entry.kind} ${entry.name} (#${entry.id})`
                                    : `${entry.name} no esta disponible en este mapa`
                            }
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-stone-200 transition hover:text-amber-200 disabled:opacity-40"
                        >
                            <GraphicPreview
                                grhIndex={entry.grhIndex}
                                size={28}
                                scale={1}
                            />
                            <span className="max-w-24 truncate">{entry.name}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleFavorite(entry)}
                            title="Quitar de favoritos"
                            className="px-1.5 py-1 text-xs text-amber-300/80 transition hover:text-amber-200"
                        >
                            ★
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
