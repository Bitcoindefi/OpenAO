"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphicsDB } from "../../types/game";
import {
    getSharedGraphicsDB,
    loadGraphicImage,
    resolveGraphicFrame,
} from "../../lib/graphicTextures";

type GraphicPreviewProps = {
    grhIndex: number;
    size?: number;
    scale?: number;
    className?: string;
};

/**
 * Miniatura de un grafico del motor: resuelve el frame en el catalogo y recorta
 * el sprite del PNG fuente sobre un canvas 2D.
 *
 * Deliberadamente no usa PixiJS. Una `Application` por miniatura significa un
 * contexto WebGL por miniatura, y el navegador mantiene vivos apenas unos
 * quince: la paleta de un mapa tiene cientos de entradas y las ultimas
 * quedarian en blanco.
 */
export default function GraphicPreview({
    grhIndex,
    size = 48,
    scale = 2,
    className = "",
}: GraphicPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [graphicsDB, setGraphicsDB] = useState<GraphicsDB | null>(null);

    useEffect(() => {
        let cancelled = false;

        getSharedGraphicsDB()
            .then((db) => {
                if (!cancelled) {
                    setGraphicsDB(db);
                }
            })
            .catch(() => {
                // Sin catalogo de graficos la miniatura queda vacia.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(size * ratio);
        canvas.height = Math.round(size * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, size, size);

        if (!graphicsDB || grhIndex <= 0) {
            return;
        }

        const graphic = resolveGraphicFrame(graphicsDB, grhIndex, "2");

        if (!graphic) {
            return;
        }

        let cancelled = false;

        void loadGraphicImage(graphic.numFile)
            .then((image) => {
                if (cancelled) {
                    return;
                }

                const frameWidth = Math.max(1, graphic.width);
                const frameHeight = Math.max(1, graphic.height);
                // El sprite se agranda hasta `scale` pero nunca desborda el
                // recuadro: los graficos del juego van de 32x32 a varios tiles.
                const drawScale = Math.min(
                    scale,
                    size / frameWidth,
                    size / frameHeight,
                );
                const drawWidth = Math.max(1, Math.round(frameWidth * drawScale));
                const drawHeight = Math.max(
                    1,
                    Math.round(frameHeight * drawScale),
                );

                context.imageSmoothingEnabled = false;
                context.drawImage(
                    image,
                    graphic.sX,
                    graphic.sY,
                    frameWidth,
                    frameHeight,
                    Math.round((size - drawWidth) / 2),
                    Math.round((size - drawHeight) / 2),
                    drawWidth,
                    drawHeight,
                );
            })
            .catch(() => {
                // Un grafico que no resuelve deja el recuadro vacio.
            });

        return () => {
            cancelled = true;
        };
    }, [graphicsDB, grhIndex, scale, size]);

    return (
        <canvas
            ref={canvasRef}
            className={`shrink-0 ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
