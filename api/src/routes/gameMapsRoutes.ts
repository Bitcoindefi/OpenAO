import type { Express, Request, Response, NextFunction } from "express";
import {
    getCurrentGameMapVersion,
    getGameMapById,
    listGameMapChangesSince,
    listGameMaps,
    upsertGameMap,
} from "../repositories/gameMaps";

type AuthMiddleware = (
    request: Request,
    response: Response,
    next: NextFunction,
) => unknown;

type AdminGate = (
    request: Request,
    response: Response,
) => Promise<null | {
    session: { account: { _id: string; [key: string]: unknown } };
    [key: string]: unknown;
}>;

/**
 * Admin + internal map persistence endpoints for OpenAO #3.
 * Kept in a dedicated module so server.ts only wires the registrar.
 */
export function registerGameMapRoutes(
    app: Express,
    options: {
        requireAuth: AuthMiddleware;
        requireAdminEmailSession: AdminGate;
    },
): void {
    const { requireAuth, requireAdminEmailSession } = options;

    app.get("/admin/game-data/maps", async (request, response) => {
        try {
            const authorized = await requireAdminEmailSession(request, response);
            if (!authorized) return;
            response.json(await listGameMaps(request.query));
        } catch (error) {
            response.status(500).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get("/admin/game-data/maps/:id", async (request, response) => {
        try {
            const authorized = await requireAdminEmailSession(request, response);
            if (!authorized) return;
            const rawId = Array.isArray(request.params.id)
                ? request.params.id[0]
                : request.params.id;
            const id = Number.parseInt(rawId, 10);
            if (!Number.isInteger(id) || id <= 0) {
                response.status(400).json({ error: "id invalido" });
                return;
            }
            response.json(await getGameMapById(id));
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unexpected error";
            response
                .status(message === "Game map not found" ? 404 : 500)
                .json({ error: message });
        }
    });

    app.put("/admin/game-data/maps/:id", async (request, response) => {
        try {
            const authorized = await requireAdminEmailSession(request, response);
            if (!authorized) return;
            const rawId = Array.isArray(request.params.id)
                ? request.params.id[0]
                : request.params.id;
            const id = Number.parseInt(rawId, 10);
            if (!Number.isInteger(id) || id <= 0) {
                response.status(400).json({ error: "id invalido" });
                return;
            }
            response.json(
                await upsertGameMap(
                    id,
                    request.body,
                    authorized.session.account._id,
                ),
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unexpected error";
            response.status(400).json({ error: message });
        }
    });

    app.get("/internal/game-data/maps", requireAuth, async (request, response) => {
        try {
            response.json(await listGameMaps(request.query));
        } catch (error) {
            response.status(500).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get(
        "/internal/game-data/maps/changes",
        requireAuth,
        async (request, response) => {
            try {
                const sinceValue = Array.isArray(request.query.sinceVersion)
                    ? request.query.sinceVersion[0]
                    : request.query.sinceVersion;
                const sinceVersion =
                    typeof sinceValue === "string"
                        ? Number.parseInt(sinceValue, 10)
                        : 0;
                response.json(
                    await listGameMapChangesSince(
                        Number.isFinite(sinceVersion)
                            ? Math.max(0, sinceVersion)
                            : 0,
                    ),
                );
            } catch (error) {
                response.status(500).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    app.get(
        "/internal/game-data/maps/version",
        requireAuth,
        async (_request, response) => {
            try {
                response.json({
                    currentVersion: await getCurrentGameMapVersion(),
                });
            } catch (error) {
                response.status(500).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unexpected error",
                });
            }
        },
    );

    app.get(
        "/internal/game-data/maps/:id",
        requireAuth,
        async (request, response) => {
            try {
                const rawId = Array.isArray(request.params.id)
                    ? request.params.id[0]
                    : request.params.id;
                const id = Number.parseInt(rawId, 10);
                if (!Number.isInteger(id) || id <= 0) {
                    response.status(400).json({ error: "id invalido" });
                    return;
                }
                response.json(await getGameMapById(id));
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Unexpected error";
                response
                    .status(message === "Game map not found" ? 404 : 500)
                    .json({ error: message });
            }
        },
    );

    app.put(
        "/internal/game-data/maps/:id",
        requireAuth,
        async (request, response) => {
            try {
                const rawId = Array.isArray(request.params.id)
                    ? request.params.id[0]
                    : request.params.id;
                const id = Number.parseInt(rawId, 10);
                if (!Number.isInteger(id) || id <= 0) {
                    response.status(400).json({ error: "id invalido" });
                    return;
                }
                response.json(await upsertGameMap(id, request.body));
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Unexpected error";
                response.status(400).json({ error: message });
            }
        },
    );
}
