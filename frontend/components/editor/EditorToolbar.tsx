"use client";

import { useEffect, useState } from "react";
import {
    createTerrainBrush,
    useEditorStore,
} from "../../lib/editor/editorStore";
import {
    discardMapDrafts,
    publishMapChanges,
    revertMapChanges,
} from "../../lib/editor/editorApi";

type EditorAction = "publish" | "discard" | "revert";

/**
 * Barra de herramientas del editor: seleccion de herramienta, accion de
 * borrado y acciones de publicar / descartar / revertir cambios.
 */
export default function EditorToolbar() {
    const {
        mapNum,
        setMapNum,
        tool,
        setTool,
        refreshMapData,
        refreshStatus,
        status,
        terrain,
        objects,
        npcs,
    } = useEditorStore();
    const [isBusy, setIsBusy] = useState<EditorAction | null>(null);
    const [pendingAction, setPendingAction] = useState<EditorAction | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);

    const draftTiles = status?.draft ?? 0;
    const draftEntities = status?.draftEntities ?? 0;
    const publishedTiles = status?.published ?? 0;
    const publishedEntities = status?.publishedEntities ?? 0;
    // Las entidades cuentan igual que los tiles: un mapa cuyo unico cambio es un
    // NPC colocado sigue teniendo trabajo sin publicar.
    const draftTotal = draftTiles + draftEntities;
    const hasAnything =
        draftTotal + publishedTiles + publishedEntities > 0;

    const runAction = async (action: EditorAction) => {
        setIsBusy(action);
        setError(null);

        try {
            if (action === "publish") {
                await publishMapChanges(mapNum);
            } else if (action === "discard") {
                await discardMapDrafts(mapNum);
            } else {
                await revertMapChanges(mapNum);
            }

            await refreshMapData();
            await refreshStatus();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : "Ocurrio un error.",
            );
        } finally {
            setIsBusy(null);
        }
    };

    const toolButtons: Array<{
        key: string;
        label: string;
        icon: string;
        isActive: boolean;
        onClick: () => void;
    }> = [
        {
            key: "terrain",
            label: "Terreno",
            icon: "◫",
            isActive: tool?.kind === "terrain",
            onClick: () => {
                const firstEntry = terrain?.palette.find((entry) =>
                    entry.graphics.some(
                        (graphic) =>
                            typeof graphic === "number" && graphic > 0,
                    ),
                );

                if (firstEntry) {
                    setTool({
                        kind: "terrain",
                        ...createTerrainBrush(firstEntry),
                    });
                }
            },
        },
        {
            key: "object",
            label: "Objeto",
            icon: "▦",
            isActive: tool?.kind === "object",
            onClick: () => {
                const firstObject = objects[0];

                if (firstObject) {
                    setTool({ kind: "object", object: firstObject });
                }
            },
        },
        {
            key: "npc",
            label: "NPC",
            icon: "◉",
            isActive: tool?.kind === "npc",
            onClick: () => {
                const firstNpc = npcs[0];

                if (firstNpc) {
                    setTool({ kind: "npc", npc: firstNpc });
                }
            },
        },
        {
            key: "erase",
            label: "Borrar",
            icon: "⌫",
            isActive: tool?.kind === "erase",
            onClick: () => setTool({ kind: "erase" }),
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-stone-950/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
                <label
                    htmlFor="editor-map-input"
                    className="text-[11px] text-stone-400"
                >
                    Mapa
                </label>
                <input
                    id="editor-map-input"
                    type="number"
                    min={1}
                    value={mapNum}
                    onChange={(event) => {
                        const nextValue = Number(event.target.value);

                        if (Number.isInteger(nextValue) && nextValue > 0) {
                            setMapNum(nextValue);
                        }
                    }}
                    className="w-20 rounded-lg border border-white/10 bg-stone-950/60 px-2 py-1 text-xs text-stone-200 focus:border-amber-400/50 focus:outline-none"
                />
            </div>

            <div className="mx-2 h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1">
                {toolButtons.map((button) => (
                    <button
                        key={button.key}
                        type="button"
                        onClick={button.onClick}
                        title={button.label}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition ${
                            button.isActive
                                ? "border-amber-400/70 bg-amber-400/20 text-amber-200"
                                : "border-white/10 bg-stone-950/60 text-stone-400 hover:border-white/25 hover:text-stone-200"
                        }`}
                    >
                        {button.icon}
                    </button>
                ))}
            </div>

            <div className="mx-2 h-6 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => setPendingAction("publish")}
                    disabled={isBusy !== null || draftTotal === 0}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-40"
                >
                    {isBusy === "publish" ? "Publicando..." : "Publicar"}
                </button>
                <button
                    type="button"
                    onClick={() => setPendingAction("discard")}
                    disabled={isBusy !== null || draftTotal === 0}
                    className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/20 disabled:opacity-40"
                >
                    {isBusy === "discard" ? "Descartando..." : "Descartar borradores"}
                </button>
                <button
                    type="button"
                    onClick={() => setPendingAction("revert")}
                    disabled={isBusy !== null || !hasAnything}
                    className="rounded-lg border border-white/10 bg-stone-950/60 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:border-white/25 hover:text-stone-100 disabled:opacity-40"
                >
                    {isBusy === "revert" ? "Revirtiendo..." : "Revertir"}
                </button>
            </div>

            <div className="ml-auto flex items-center gap-3 text-[11px] text-stone-400">
                <span>
                    Publicados:{" "}
                    <span className="font-medium text-emerald-300">
                        {publishedTiles}
                    </span>
                </span>
                <span>
                    Borradores:{" "}
                    <span className="font-medium text-amber-300">
                        {draftTiles}
                    </span>
                </span>
                <span>
                    Entidades:{" "}
                    <span className="font-medium text-stone-200">
                        {publishedEntities}
                    </span>
                    {draftEntities > 0 ? (
                        <span className="font-medium text-amber-300">
                            {" "}
                            (+{draftEntities})
                        </span>
                    ) : null}
                </span>
            </div>

            {error ? (
                <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300">
                    {error}
                </p>
            ) : null}

            {pendingAction ? (
                <ConfirmDialog
                    action={pendingAction}
                    mapNum={mapNum}
                    draftTiles={draftTiles}
                    draftEntities={draftEntities}
                    publishedTiles={publishedTiles}
                    publishedEntities={publishedEntities}
                    onCancel={() => setPendingAction(null)}
                    onConfirm={() => {
                        const action = pendingAction;
                        setPendingAction(null);
                        void runAction(action);
                    }}
                />
            ) : null}
        </div>
    );
}

/**
 * Confirmacion de las tres acciones que no se pueden deshacer.
 *
 * Publicar cambia lo que ven los jugadores y revertir borra tambien lo ya
 * publicado, asi que ninguna de las dos deberia depender de no errarle al boton.
 */
function ConfirmDialog({
    action,
    mapNum,
    draftTiles,
    draftEntities,
    publishedTiles,
    publishedEntities,
    onCancel,
    onConfirm,
}: {
    action: EditorAction;
    mapNum: number;
    draftTiles: number;
    draftEntities: number;
    publishedTiles: number;
    publishedEntities: number;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onCancel();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    const copy = {
        publish: {
            title: `Publicar los cambios del mapa ${mapNum}`,
            body: `Los jugadores van a ver ${draftTiles} tiles y ${draftEntities} entidades en cuanto entren al mapa. Publicar no se puede deshacer desde aca: para volver atras hay que revertir el mapa entero.`,
            confirmLabel: "Publicar",
            confirmClass:
                "border-emerald-400/50 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25",
        },
        discard: {
            title: "Descartar los borradores",
            body: `Se van a borrar ${draftTiles} tiles y ${draftEntities} entidades sin publicar. Lo ya publicado no se toca.`,
            confirmLabel: "Descartar",
            confirmClass:
                "border-red-400/50 bg-red-400/15 text-red-200 hover:bg-red-400/25",
        },
        revert: {
            title: `Revertir el mapa ${mapNum} a su estado original`,
            body: `Se borra todo lo pintado en este mapa: ${publishedTiles} tiles y ${publishedEntities} entidades publicadas, mas ${draftTiles} tiles y ${draftEntities} entidades en borrador. No se puede deshacer.`,
            confirmLabel: "Revertir todo",
            confirmClass:
                "border-red-400/50 bg-red-400/15 text-red-200 hover:bg-red-400/25",
        },
    }[action];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-confirm-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-950 p-5 shadow-2xl">
                <h2
                    id="editor-confirm-title"
                    className="text-sm font-semibold text-stone-100"
                >
                    {copy.title}
                </h2>
                <p className="mt-2 text-[12px] leading-relaxed text-stone-400">
                    {copy.body}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-white/10 bg-stone-950/60 px-3 py-1.5 text-xs text-stone-300 transition hover:border-white/25 hover:text-stone-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={onConfirm}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${copy.confirmClass}`}
                    >
                        {copy.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
