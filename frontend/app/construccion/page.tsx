"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EditorStoreProvider, useEditorStore } from "../../lib/editor/editorStore";
import { useGameDataAdmin } from "../../lib/editor/useGameDataAdmin";
import EditorToolbar from "../../components/editor/EditorToolbar";
import RecentsStrip from "../../components/editor/RecentsStrip";
import TerrainPalette from "../../components/editor/TerrainPalette";
import ObjectsBrowser from "../../components/editor/ObjectsBrowser";
import NpcsBrowser from "../../components/editor/NpcsBrowser";

const EditorCanvas = dynamic(
    () => import("../../components/editor/EditorCanvas"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[640px] w-[960px] items-center justify-center rounded-2xl border border-white/10 bg-stone-950 text-xs text-stone-500">
                Cargando lienzo del editor...
            </div>
        ),
    },
);

type PanelTab = "terrain" | "objects" | "npcs";

function EditorPanels() {
    const { isLoading, loadError } = useEditorStore();
    const [activeTab, setActiveTab] = useState<PanelTab>("terrain");

    const tabs: Array<{ key: PanelTab; label: string }> = [
        { key: "terrain", label: "Terreno" },
        { key: "objects", label: "Objetos" },
        { key: "npcs", label: "NPCs" },
    ];

    return (
        <aside className="flex h-[640px] w-64 shrink-0 flex-col rounded-2xl border border-white/10 bg-stone-950/70 backdrop-blur-md">
            <div className="flex border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-2 py-2.5 text-[11px] font-medium transition ${
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

function ConstruccionEditor() {
    return (
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-stone-100">
                        Modo construccion
                    </h1>
                    <p className="text-[11px] text-stone-500">
                        Pinta terreno, coloca objetos y NPCs, y publica los
                        cambios del mapa.
                    </p>
                </div>
            </div>

            <EditorToolbar />

            <div className="flex gap-3">
                <EditorPanels />
                <main className="min-w-0 flex-1">
                    <EditorCanvas />
                </main>
            </div>

            <RecentsStrip />
        </div>
    );
}

export default function ConstruccionPage() {
    const adminState = useGameDataAdmin();

    if (adminState === "loading") {
        return (
            <div className="mx-auto max-w-[1400px] px-4 py-10 text-xs text-stone-500">
                Verificando permisos...
            </div>
        );
    }

    // El editor no se monta sin permiso: si lo hiciera, cada panel pediria su
    // catalogo para recibir un 403 y la pantalla quedaria vacia sin explicar
    // por que.
    if (adminState === "denied") {
        return (
            <div className="mx-auto max-w-md px-4 py-16 text-center">
                <h1 className="text-lg font-semibold text-stone-100">
                    Modo construccion
                </h1>
                <p className="mt-2 text-[12px] leading-relaxed text-stone-400">
                    Esta seccion es solo para las cuentas con permiso de
                    edicion de mapas. Si deberias tenerlo, pedile a un
                    administrador que agregue tu correo a la lista.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                    <Link
                        href="/login"
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs text-stone-200 transition hover:bg-white/5"
                    >
                        Ingresar con otra cuenta
                    </Link>
                    <Link
                        href="/"
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs text-stone-200 transition hover:bg-white/5"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <EditorStoreProvider>
            <Suspense fallback={null}>
                <ConstruccionEditor />
            </Suspense>
        </EditorStoreProvider>
    );
}