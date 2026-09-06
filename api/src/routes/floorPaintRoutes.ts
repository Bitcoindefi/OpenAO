import type { Express, Request, Response } from "express";
import {
    FloorPaintValidationError,
    analyzeMapWalkability,
    paintFloorRectangle,
    paintFloorRectangleSchema,
    paintFloorSelection,
    paintFloorSelectionSchema,
    paintFloorTile,
    paintFloorTileSchema,
    queryFloorRegion,
    queryFloorRegionSchema,
    setBlockedSchema,
    setFloorBlocked,
} from "../repositories/floorPaint";

type AdminGate = (
    request: Request,
    response: Response,
) => Promise<null | { session: { account: { _id: string } } }>;

function statusFromError(error: unknown): number {
    if (error instanceof FloorPaintValidationError) {
        if (error.code === "palette_missing") return 404;
        return 400;
    }
    if (error && typeof error === "object" && "statusCode" in error) {
        const code = Number((error as { statusCode?: number }).statusCode);
        if (Number.isInteger(code) && code >= 400) return code;
    }
    const message = error instanceof Error ? error.message : "";
    if (/no existe|no tiene terrain/i.test(message)) return 404;
    return 400;
}

function parseMapNum(request: Request): number {
    const raw = Array.isArray(request.params.mapNum)
        ? request.params.mapNum[0]
        : request.params.mapNum;
    return Number.parseInt(String(raw), 10);
}

function requireValidMapNum(
    request: Request,
    response: Response,
): number | null {
    const mapNum = parseMapNum(request);
    if (!Number.isInteger(mapNum) || mapNum <= 0) {
        response.status(400).json({ error: "Numero de mapa invalido." });
        return null;
    }
    return mapNum;
}

export function registerFloorPaintRoutes(
    app: Express,
    options: { requireAdmin: AdminGate },
): void {
    const { requireAdmin } = options;

    /** Single tile: (map, x, y) → palette entry (all layers + blocked). */
    app.put(
        "/admin/game-data/maps/:mapNum/floor/paint",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                const parsed = paintFloorTileSchema.safeParse(request.body);
                if (!parsed.success) {
                    response
                        .status(400)
                        .json({ error: JSON.stringify(parsed.error.issues) });
                    return;
                }

                response.json(
                    await paintFloorTile(
                        mapNum,
                        parsed.data,
                        authorized.session.account._id,
                    ),
                );
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    /** Atomic rectangle fill by palette entry (e.g. 20×20 in one TX). */
    app.put(
        "/admin/game-data/maps/:mapNum/floor/paint-rectangle",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                const parsed = paintFloorRectangleSchema.safeParse(
                    request.body,
                );
                if (!parsed.success) {
                    response
                        .status(400)
                        .json({ error: JSON.stringify(parsed.error.issues) });
                    return;
                }

                response.json(
                    await paintFloorRectangle(
                        mapNum,
                        parsed.data,
                        authorized.session.account._id,
                    ),
                );
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    /** Free-form selection paint (lasso / multi-pick), still atomic + capped. */
    app.put(
        "/admin/game-data/maps/:mapNum/floor/paint-selection",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                const parsed = paintFloorSelectionSchema.safeParse(
                    request.body,
                );
                if (!parsed.success) {
                    response
                        .status(400)
                        .json({ error: JSON.stringify(parsed.error.issues) });
                    return;
                }

                response.json(
                    await paintFloorSelection(
                        mapNum,
                        parsed.data,
                        authorized.session.account._id,
                    ),
                );
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    /** Blocked-flag mutation that preserves existing graphics on the tile. */
    app.put(
        "/admin/game-data/maps/:mapNum/floor/blocked",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                const parsed = setBlockedSchema.safeParse(request.body);
                if (!parsed.success) {
                    response
                        .status(400)
                        .json({ error: JSON.stringify(parsed.error.issues) });
                    return;
                }

                response.json(
                    await setFloorBlocked(
                        mapNum,
                        parsed.data,
                        authorized.session.account._id,
                    ),
                );
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    /** Effective region snapshot (base terrain + draft-preferred overrides). */
    app.get(
        "/admin/game-data/maps/:mapNum/floor/region",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                const parsed = queryFloorRegionSchema.safeParse(request.query);
                if (!parsed.success) {
                    response
                        .status(400)
                        .json({ error: JSON.stringify(parsed.error.issues) });
                    return;
                }

                response.json(await queryFloorRegion(mapNum, parsed.data));
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    /** Walkability / isolation check after blocked edits. */
    app.get(
        "/admin/game-data/maps/:mapNum/floor/walkability",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const mapNum = requireValidMapNum(request, response);
                if (mapNum == null) return;

                response.json({
                    mapNum,
                    ...(await analyzeMapWalkability(mapNum)),
                });
            } catch (error) {
                response.status(statusFromError(error)).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );
}
