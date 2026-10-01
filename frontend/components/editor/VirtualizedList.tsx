"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type VirtualizedListProps<T> = {
    items: T[];
    getItemKey: (item: T, index: number) => string | number;
    renderItem: (item: T, index: number) => ReactNode;
    itemHeight?: number;
    /** Items por fila. Con 1 es una lista; con mas, una grilla virtualizada. */
    columns?: number;
    overscan?: number;
    className?: string;
};

/**
 * Lista (o grilla) virtualizada sin dependencias: solo renderiza las filas
 * visibles. Los catalogos del editor superan los mil elementos y la paleta de
 * un mapa las ochocientas entradas, y el navegador no debe crear un nodo DOM
 * -ni una miniatura- por cada uno.
 */
export default function VirtualizedList<T>({
    items,
    getItemKey,
    renderItem,
    itemHeight = 72,
    columns = 1,
    overscan = 6,
    className = "",
}: VirtualizedListProps<T>) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    useEffect(() => {
        const viewport = viewportRef.current;

        if (!viewport) {
            return;
        }

        const updateHeight = () => {
            setViewportHeight(viewport.clientHeight);
        };

        updateHeight();

        // El alto no depende solo de la ventana: filtrar reacomoda los chips de
        // arriba y el viewport cambia de alto sin ningun resize del navegador.
        const observer = new ResizeObserver(updateHeight);
        observer.observe(viewport);

        return () => {
            observer.disconnect();
        };
    }, []);

    const columnCount = Math.max(1, Math.floor(columns));
    const rowCount = Math.ceil(items.length / columnCount);
    const totalHeight = rowCount * itemHeight;
    const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleRowCount =
        Math.ceil(Math.max(viewportHeight, itemHeight) / itemHeight) +
        overscan * 2;
    const endRow = Math.min(rowCount, startRow + visibleRowCount);
    const visibleRows: Array<{ row: number; startIndex: number }> = [];

    for (let row = startRow; row < endRow; row += 1) {
        visibleRows.push({ row, startIndex: row * columnCount });
    }

    return (
        <div
            ref={viewportRef}
            className={`overflow-y-auto ${className}`}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
            <div style={{ height: totalHeight, position: "relative" }}>
                {visibleRows.map(({ row, startIndex }) => (
                    <div
                        key={row}
                        style={{
                            position: "absolute",
                            top: row * itemHeight,
                            left: 0,
                            right: 0,
                            height: itemHeight,
                            display: "grid",
                            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                        }}
                    >
                        {Array.from(
                            { length: columnCount },
                            (_, column) => startIndex + column,
                        )
                            .filter((index) => index < items.length)
                            .map((index) => (
                                <div key={getItemKey(items[index], index)}>
                                    {renderItem(items[index], index)}
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
