import type { Express, Request, Response } from "express";
import {
    analyzeMapReachability,
    createBidirectionalExits,
    deleteMapExit,
    findOrphanExits,
    listMapExits,
    upsertMapExit,
} from "../repositories/mapExits";

type AdminGate = (
    request: Request,
    response: Response,
) => Promise<null | { session: { account: { _id: string } } }>;

function statusFromError(error: unknown): number {
    if (error && typeof error === "object" && "statusCode" in error) {
        const code = Number((error as { statusCode?: number }).statusCode);
        if (Number.isInteger(code) && code >= 400) return code;
    }
    const message = error instanceof Error ? error.message : "";
    if (/no existe/i.test(message)) return 404;
    return 400;
}

function parseMapNum(request: Request): number {
    const raw = Array.isArray(request.params.mapNum)
        ? request.params.mapNum[0]
        : request.params.mapNum;
    return Number.parseInt(String(raw), 10);
}

export function registerMapExitRoutes(
    app: Express,
    options: { requireAdmin: AdminGate },
): void {
    const { requireAdmin } = options;

    // Static /maps/exits/* routes MUST be registered before /maps/:mapNum/exits.
    app.post(
        "/admin/game-data/maps/exits/bidirectional",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                response.status(201).json(
                    await createBidirectionalExits(request.body),
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

    app.get(
        "/admin/game-data/maps/exits/orphans",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                response.json(await findOrphanExits());
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

    app.get(
        "/admin/game-data/maps/exits/reachability",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const entry = Number.parseInt(
                    String(request.query.entryMapId ?? "1"),
                    10,
                );
                response.json(
                    await analyzeMapReachability({
                        entryMapId: Number.isInteger(entry) ? entry : 1,
                    }),
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

    app.get("/admin/game-data/maps/:mapNum/exits", async (request, response) => {
        try {
            const authorized = await requireAdmin(request, response);
            if (!authorized) return;
            response.json(await listMapExits(parseMapNum(request)));
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.put("/admin/game-data/maps/:mapNum/exits", async (request, response) => {
        try {
            const authorized = await requireAdmin(request, response);
            if (!authorized) return;
            response.json(
                await upsertMapExit(parseMapNum(request), request.body),
            );
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.delete(
        "/admin/game-data/maps/:mapNum/exits/:x/:y",
        async (request, response) => {
            try {
                const authorized = await requireAdmin(request, response);
                if (!authorized) return;
                const x = Number.parseInt(String(request.params.x), 10);
                const y = Number.parseInt(String(request.params.y), 10);
                response.json(await deleteMapExit(parseMapNum(request), x, y));
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
