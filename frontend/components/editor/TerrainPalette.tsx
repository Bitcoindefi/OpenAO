"use client";

import { useMemo, useRef, useState } from "react";
import {
    createTerrainBrush,
    createUploadedGraphicBrush,
    useEditorStore,
    type TerrainBrush,
} from "../../lib/editor/editorStore";
import { uploadGraphicPng } from "../../lib/editor/editorApi";
import { invalidateSharedGraphicsDB } from "../../lib/graphicTextures";
import GraphicPreview from "./GraphicPreview";
import VirtualizedList from "./VirtualizedList";

/** Alto de una celda: miniatura de 56px mas la etiqueta y el borde. */
const CELL_HEIGHT = 84;
const COLUMNS = 3;

type PaletteTab = "terrain" | "uploaded";

/**
 * Paleta de terreno del mapa: entradas de terrain.json mas los graficos
 * subidos por administradores. Permite subir PNGs nuevos al modo construccion.
 *
 * Las dos fuentes van en pestañas y no una debajo de la otra: la paleta de un
 * mapa pasa las ochocientas entradas y hacen falta dos grillas virtualizadas
 * independientes, no una sola con dos encabezados pegajosos.
 */
export default function TerrainPalette() {
    const { terrain, tool, setTool, addRecent, refreshMapData } =
        useEditorStore();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [tab, setTab] = useState<PaletteTab>("terrain");

    const selectedPaletteId = tool?.kind === "terrain" ? tool.paletteId : null;

    const terrainBrushes = useMemo(
        () => (terrain?.palette ?? []).map(createTerrainBrush),
        [terrain],
    );

    const uploadedBrushes = useMemo(
        () =>
            (terrain?.uploadedGraphics ?? []).map((graphic) =>
                createUploadedGraphicBrush(graphic.grhIndex),
            ),
        [terrain],
    );

    const handleSelect = (brush: TerrainBrush) => {
        setTool({ kind: "terrain", ...brush });
        addRecent({
            kind: "terrain",
            id: brush.paletteId,
            grhIndex: brush.grhIndex,
            name: `Tile ${brush.paletteId}`,
        });
    };

    const handleFile = async (file: File) => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const bytes = await file.arrayBuffer();
            const uploaded = await uploadGraphicPng(bytes);
            // El catalogo de graficos mezcla los indices subidos al construirse,
            // asi que sin descartarlo la miniatura del PNG nuevo saldria vacia
            // hasta recargar la pagina.
            invalidateSharedGraphicsDB();
            await refreshMapData();
            setTab("uploaded");
            handleSelect(createUploadedGraphicBrush(uploaded.grhIndex));
        } catch (error) {
            setUploadError(
                error instanceof Error
                    ? error.message
                    : "No se pudo subir el grafico.",
            );
        } finally {
            setIsUploading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (!terrain) {
        return (
            <div className="flex h-full items-center justify-center text-xs text-stone-500">
                Sin paleta de terreno para este mapa.
            </div>
        );
    }

    const brushes = tab === "terrain" ? terrainBrushes : uploadedBrushes;

    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                            void handleFile(file);
                        }
                    }}
                />
                <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-lg border border-white/10 bg-stone-950/60 px-3 py-2 text-xs text-stone-300 transition hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50"
                >
                    {isUploading ? "Subiendo..." : "Subir PNG nuevo"}
                </button>
            </div>

            {uploadError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
                    {uploadError}
                </p>
            ) : null}

            <div className="flex gap-1 rounded-lg border border-white/10 bg-stone-950/40 p-1">
                <TabButton
                    isActive={tab === "terrain"}
                    onClick={() => setTab("terrain")}
                    label={`Terreno (${terrainBrushes.length})`}
                />
                <TabButton
                    isActive={tab === "uploaded"}
                    onClick={() => setTab("uploaded")}
                    label={`Subidos (${uploadedBrushes.length})`}
                />
            </div>

            {brushes.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-center text-[11px] text-stone-500">
                    {tab === "uploaded"
                        ? "Todavia no hay graficos subidos."
                        : "Este mapa no tiene tiles en su paleta."}
                </p>
            ) : (
                <VirtualizedList
                    items={brushes}
                    columns={COLUMNS}
                    itemHeight={CELL_HEIGHT}
                    className="min-h-0 flex-1 pr-1"
                    getItemKey={(brush) => brush.paletteId}
                    renderItem={(brush) => (
                        <div className="p-[3px]">
                            <button
                                type="button"
                                disabled={brush.grhIndex <= 0}
                                onClick={() => handleSelect(brush)}
                                title={
                                    tab === "uploaded"
                                        ? `Grafico subido ${brush.paletteId}`
                                        : `Tile ${brush.paletteId}${brush.blocked ? " (bloqueado)" : ""}`
                                }
                                className={`flex w-full flex-col items-center gap-1 rounded-lg border p-1 transition disabled:opacity-40 ${
                                    selectedPaletteId === brush.paletteId
                                        ? "border-amber-400/70 bg-amber-400/15"
                                        : "border-white/10 bg-stone-950/50 hover:border-white/25"
                                } ${brush.blocked ? "ring-1 ring-red-500/40" : ""}`}
                            >
                                <GraphicPreview
                                    grhIndex={brush.grhIndex}
                                    size={56}
                                    scale={1.4}
                                />
                                <span
                                    className={`w-full truncate text-center text-[9px] ${
                                        tab === "uploaded"
                                            ? "text-cyan-300/70"
                                            : "text-stone-500"
                                    }`}
                                >
                                    #{brush.paletteId}
                                    {brush.blocked ? " ●" : ""}
                                </span>
                            </button>
                        </div>
                    )}
                />
            )}
        </div>
    );
}

function TabButton({
    isActive,
    onClick,
    label,
}: {
    isActive: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.15em] transition ${
                isActive
                    ? "bg-amber-400/15 text-amber-200"
                    : "text-stone-500 hover:text-stone-300"
            }`}
        >
            {label}
        </button>
    );
}
