import type { Express, Request, Response } from "express";
import {
    addMapModerator,
    approveUserMap,
    claimUserMapForReview,
    getModeratorPreview,
    isMapModerator,
    isPubliclyVisibleStatus,
    listMapModerators,
    listModerationQueue,
    proposeUserMap,
    rejectUserMap,
    reportPublishedUserMap,
    unpublishUserMap,
    USER_MAP_ID_MAX,
    USER_MAP_ID_MIN,
} from "../repositories/mapModeration";

type SessionGate = (
    request: Request,
    response: Response,
) => Promise<null | { session: { account: { _id: string } } }>;

type ModeratorGate = (
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
    if (message.includes("No autorizado") || message.includes("No podes")) {
        return 403;
    }
    return 400;
}

function parseMapNum(request: Request): number {
    const raw = Array.isArray(request.params.mapNum)
        ? request.params.mapNum[0]
        : request.params.mapNum;
    return Number.parseInt(String(raw), 10);
}

export function registerMapModerationRoutes(
    app: Express,
    options: {
        requireSession: SessionGate;
        requireModerator: ModeratorGate;
    },
): void {
    const { requireSession, requireModerator } = options;

    app.get("/user-maps/moderation/meta", (_request, response) => {
        response.json({
            range: { min: USER_MAP_ID_MIN, max: USER_MAP_ID_MAX },
            flow: [
                "draft",
                "proposed",
                "in_review",
                "published|rejected",
            ],
            publicVisibility: "published_only",
            reportThreshold: 3,
        });
    });

    app.get("/user-maps/moderation/queue", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json(await listModerationQueue());
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get("/user-maps/moderation/moderators", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json({ moderators: await listMapModerators() });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/moderation/moderators", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            const accountId = String(request.body?.accountId ?? "").trim();
            if (!accountId) {
                response.status(400).json({ error: "accountId requerido" });
                return;
            }
            await addMapModerator(
                accountId,
                authorized.session.account._id,
                String(request.body?.notes ?? ""),
            );
            response.status(201).json({ ok: true });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/propose", async (request, response) => {
        try {
            const authorized = await requireSession(request, response);
            if (!authorized) return;
            response.json(
                await proposeUserMap(
                    parseMapNum(request),
                    authorized.session.account._id,
                    request.body,
                ),
            );
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.get("/user-maps/:mapNum/moderation-preview", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json(await getModeratorPreview(parseMapNum(request)));
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/claim-review", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json({
                map: await claimUserMapForReview(
                    parseMapNum(request),
                    authorized.session.account._id,
                ),
            });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/approve", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            const map = await approveUserMap(
                parseMapNum(request),
                authorized.session.account._id,
            );
            response.json({
                map,
                publiclyVisible: isPubliclyVisibleStatus(map.status),
            });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/reject", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json({
                map: await rejectUserMap(
                    parseMapNum(request),
                    authorized.session.account._id,
                    request.body?.reason,
                ),
            });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/report", async (request, response) => {
        try {
            const authorized = await requireSession(request, response);
            if (!authorized) return;
            response.json(
                await reportPublishedUserMap(
                    parseMapNum(request),
                    authorized.session.account._id,
                    request.body?.reason,
                ),
            );
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });

    app.post("/user-maps/:mapNum/unpublish", async (request, response) => {
        try {
            const authorized = await requireModerator(request, response);
            if (!authorized) return;
            response.json({
                map: await unpublishUserMap(
                    parseMapNum(request),
                    authorized.session.account._id,
                    request.body?.reason,
                ),
            });
        } catch (error) {
            response.status(statusFromError(error)).json({
                error: error instanceof Error ? error.message : "Unexpected error",
            });
        }
    });
}

// re-export helper for tests / gates
export { isMapModerator };
