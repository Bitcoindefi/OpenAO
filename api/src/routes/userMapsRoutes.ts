import type { Express, Request, Response } from "express";
import {
    assertCanEditUserMap,
    createUserMap,
    getUserMapById,
    getUserMapQuotas,
    listVisibleUserMaps,
    updateUserMap,
    validateEconomyPlacement,
    USER_MAP_ID_MAX,
    USER_MAP_ID_MIN,
} from "../repositories/userMaps";

type SessionGate = (
    request: Request,
    response: Response,
) => Promise<null | { session: { account: { _id: string } } }>;

function statusFromError(error: unknown): number {
    if (error && typeof error === "object" && "statusCode" in error) {
        const code = Number((error as { statusCode?: number }).statusCode);
        if (Number.isInteger(code) && code >= 400) return code;
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "User map not found") return 404;
    if (message.includes("No autorizado")) return 403;
    return 400;
}

function parseMapNum(request: Request): number {
    const raw = Array.isArray(request.params.mapNum)
        ? request.params.mapNum[0]
        : request.params.mapNum;
    return Number.parseInt(String(raw), 10);
}

export function registerUserMapRoutes(
    app: Express,
    options: { requireSession: SessionGate },
): void {
    const { requireSession } = options;

    app.get("/user-maps/meta", async (_request, response) => {
        try {
            response.json({
                range: { min: USER_MAP_ID_MIN, max: USER_MAP_ID_MAX },
                quotas: await getUserMapQuotas(),
            });
        } catch (error) {
            response.status(500).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get("/user-maps", async (request, response) => {
        try {
            let viewerId: string | null = null;
            if ((request.header("Authorization") || "").startsWith("Bearer ")) {
                const authorized = await requireSession(request, response);
                if (!authorized) return;
                viewerId = authorized.session.account._id;
            }
            response.json(
                await listVisibleUserMaps({ viewerAccountId: viewerId }),
            );
        } catch (error) {
            response.status(500).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps", async (request, response) => {
        try {
            const authorized = await requireSession(request, response);
            if (!authorized) return;
            const map = await createUserMap(
                authorized.session.account._id,
                request.body,
            );
            response.status(201).json({ map });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get("/user-maps/:mapNum", async (request, response) => {
        try {
            const mapNum = parseMapNum(request);
            let viewerId: string | null = null;
            if ((request.header("Authorization") || "").startsWith("Bearer ")) {
                const authorized = await requireSession(request, response);
                if (!authorized) return;
                viewerId = authorized.session.account._id;
            }
            response.json(await getUserMapById(mapNum, viewerId));
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.put("/user-maps/:mapNum", async (request, response) => {
        try {
            const authorized = await requireSession(request, response);
            if (!authorized) return;
            response.json({
                map: await updateUserMap(
                    parseMapNum(request),
                    authorized.session.account._id,
                    request.body,
                ),
            });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/assert-edit", async (request, response) => {
        try {
            const authorized = await requireSession(request, response);
            if (!authorized) return;
            await assertCanEditUserMap(
                parseMapNum(request),
                authorized.session.account._id,
            );
            validateEconomyPlacement(request.body ?? {});
            response.json({ ok: true });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });
}
