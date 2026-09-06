"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
    EditorStoreProvider,
    useEditorStore,
} from "../../lib/editor/editorStore";
import { useGameDataAdmin } from "../../lib/editor/useGameDataAdmin";
import EditorToolbar from "./EditorToolbar";
import RecentsStrip from "./RecentsStrip";
import TerrainPalette from "./TerrainPalette";
import ObjectsBrowser from "./ObjectsBrowser";
import NpcsBrowser from "./NpcsBrowser";

const EditorCanvas = dynamic(() => import("./EditorCanvas"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-stone-950 text-xs text-stone-500">
            Cargando lienzo del editor...
        </div>
    ),
});

type PanelTab = "terrain" | "objects" | "npcs";

type InGameMapEditorProps = {
    mapNum: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playersOnMap: number;
    canvasWidth: number;
    canvasHeight: number;
};

function EditorPanels({ height }: { height: number }) {
    const { isLoading, loadError } = useEditorStore();
    const [activeTab, setActiveTab] = useState<PanelTab>("terrain");

    const tabs: Array<{ key: PanelTab; label: string }> = [
        { key: "terrain", label: "Terreno" },
        { key: "objects", label: "Objetos" },
        { key: "npcs", label: "NPCs" },
    ];

    return (
        <aside
            className="flex w-56 shrink-0 flex-col rounded-2xl border border-white/10 bg-stone-950/80 backdrop-blur-md"
            style={{ height }}
        >
            <div className="flex border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-2 py-2 text-[11px] font-medium transition ${
                            activeTab === tab.key
                                ? "border-b-2 border-amber-400 text-amber-200"
                                : "text-stone-400 hover:text-stone-200"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 p-2">
                {loadError ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">
                        {loadError}
                    </p>
                ) : null}

                {activeTab === "terrain" ? <TerrainPalette /> : null}
                {activeTab === "objects" ? <ObjectsBrowser /> : null}
                {activeTab === "npcs" ? <NpcsBrowser /> : null}

                {isLoading ? (
                    <p className="mt-2 text-center text-[10px] text-stone-500">
                        Actualizando...
                    </p>
                ) : null}
            </div>
        </aside>
    );
}

function InGameEditorBody({
    mapNum,
    playersOnMap,
    canvasWidth,
    canvasHeight,
    onClose,
}: {
    mapNum: number;
    playersOnMap: number;
    canvasWidth: number;
    canvasHeight: number;
    onClose: () => void;
}) {
    const { mapNum: editorMapNum, setMapNum } = useEditorStore();

    useEffect(() => {
        if (editorMapNum !== mapNum) {
            setMapNum(mapNum);
        }
    }, [editorMapNum, mapNum, setMapNum]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-stone-950/92 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                    Modo edicion
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-white/10 bg-stone-950/60 px-2.5 py-1 text-[11px] text-stone-300 transition hover:border-white/25 hover:text-stone-100"
                >
                    Cerrar
                </button>
            </div>

            <EditorToolbar playersOnMap={playersOnMap} showMapInput={false} />

            <div className="flex min-h-0 flex-1 gap-2">
                <EditorPanels height={canvasHeight} />
                <div className="min-w-0 flex-1 overflow-auto">
                    <EditorCanvas width={canvasWidth} height={canvasHeight} />
                </div>
            </div>

            <RecentsStrip />
        </div>
    );
}

/**
 * Overlay del editor visual sobre /play. Solo se monta si la cuenta puede
 * editar mapas; si no, no hay boton ni panel.
 */
export default function InGameMapEditor({
    mapNum,
    open,
    onOpenChange,
    playersOnMap,
    canvasWidth,
    canvasHeight,
}: InGameMapEditorProps) {
    const adminState = useGameDataAdmin();

    if (adminState !== "allowed") {
        return null;
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => onOpenChange(true)}
                className="absolute bottom-3 left-3 z-40 rounded-lg border border-amber-400/50 bg-stone-950/85 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md transition hover:bg-amber-400/15"
            >
                Editar mapa
            </button>
        );
    }

    return (
        <EditorStoreProvider initialMapNum={mapNum}>
            <Suspense fallback={null}>
                <InGameEditorBody
                    mapNum={mapNum}
                    playersOnMap={playersOnMap}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    onClose={() => onOpenChange(false)}
                />
            </Suspense>
        </EditorStoreProvider>
    );
}
