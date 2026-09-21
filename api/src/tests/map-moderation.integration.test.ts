import assert from "node:assert/strict";
import { beforeAll, test } from "vitest";
import pool from "../db";
import { createAccountFixture, ensureApiReady, requestJson } from "./helpers/api";

beforeAll(async () => {
    await ensureApiReady();
});

type ProposalPayload = {
    id: string;
    mapNum: number;
    status: string;
    rejectionReason: string | null;
    autoCheckReport: {
        ok: boolean;
        issues: Array<{ code: string; message: string }>;
    } | null;
};

function authHeaders(token: string): Record<string, string> {
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

async function createProposal(
    token: string,
    mapNum: number,
    name: string,
): Promise<ProposalPayload> {
    const response = await requestJson<ProposalPayload>("/maps/proposals", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
            mapNum,
            name,
            description: "Propuesta de prueba",
            entryX: 1,
            entryY: 1,
        }),
    });

    assert.equal(response.status, 201, JSON.stringify(response.data));
    return response.data;
}

async function submitProposal(
    token: string,
    proposalId: string,
): Promise<{ status: number; data: ProposalPayload }> {
    const response = await requestJson<ProposalPayload>(
        `/maps/proposals/${proposalId}/submit`,
        { method: "POST", headers: authHeaders(token) },
    );

    return response;
}

test("full map moderation flow: draft, auto-checks, review, rejection, publish and report", async () => {
    const author = await createAccountFixture();
    const moderator = await createAccountFixture();
    const reporter = await createAccountFixture();
    const authorToken = author.session.sessionToken;
    const moderatorToken = moderator.session.sessionToken;
    const reporterToken = reporter.session.sessionToken;

    // El moderador se suma por fuera del admin de game-data para no depender de
    // las variables de entorno del proxy de admin en los tests.
    await pool.query(
        `INSERT INTO game_map_moderators (account_id)
         VALUES ($1)
         ON CONFLICT (account_id) DO NOTHING`,
        [moderator.session.account._id],
    );

    const mapNum = 900000 + Math.floor(Math.random() * 100000);

    // Un mapa propuesto arranca en borrador y no esta en la cola.
    const created = await createProposal(
        authorToken,
        mapNum,
        "Ciudad de prueba",
    );
    assert.equal(created.status, "draft");

    const emptyQueue = await requestJson<{ proposals: ProposalPayload[] }>(
        "/moderation/maps/queue",
        { headers: authHeaders(moderatorToken) },
    );
    assert.equal(emptyQueue.status, 200);
    assert.equal(
        emptyQueue.data.proposals.some((entry) => entry.id === created.id),
        false,
    );

    // Enviar corre los chequeos automaticos y pasa a propuesto.
    const submitted = await submitProposal(authorToken, created.id);
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.status, "proposed");
    assert.equal(submitted.data.autoCheckReport?.ok, true);

    // El autor ve su propuesta.
    const mine = await requestJson<{ proposals: ProposalPayload[] }>(
        "/maps/proposals/mine",
        { headers: authHeaders(authorToken) },
    );
    assert.equal(mine.status, 200);
    assert.equal(
        mine.data.proposals.find((entry) => entry.id === created.id)?.status,
        "proposed",
    );

    // La cola es solo para moderadores.
    const forbidden = await requestJson<{ error?: string }>(
        "/moderation/maps/queue",
        { headers: authHeaders(authorToken) },
    );
    assert.equal(forbidden.status, 403);

    const queue = await requestJson<{ proposals: ProposalPayload[] }>(
        "/moderation/maps/queue",
        { headers: authHeaders(moderatorToken) },
    );
    assert.equal(queue.status, 200);
    assert.equal(
        queue.data.proposals.some((entry) => entry.id === created.id),
        true,
    );

    // Abrir el detalle lo pasa a "en revision" y trae mapa y assets.
    const detail = await requestJson<{
        proposal: ProposalPayload;
        overrides: unknown[];
        entities: unknown[];
        graphics: unknown[];
    }>(`/moderation/maps/${created.id}`, {
        headers: authHeaders(moderatorToken),
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.data.proposal.status, "in_review");
    assert.equal(Array.isArray(detail.data.overrides), true);
    assert.equal(Array.isArray(detail.data.entities), true);
    assert.equal(Array.isArray(detail.data.graphics), true);

    // Rechazar sin motivo falla.
    const noReason = await requestJson<{ error?: string }>(
        `/moderation/maps/${created.id}/reject`,
        {
            method: "POST",
            headers: authHeaders(moderatorToken),
            body: JSON.stringify({}),
        },
    );
    assert.equal(noReason.status, 400);

    const rejected = await requestJson<ProposalPayload>(
        `/moderation/maps/${created.id}/reject`,
        {
            method: "POST",
            headers: authHeaders(moderatorToken),
            body: JSON.stringify({
                reason: "Los graficos no son originales.",
            }),
        },
    );
    assert.equal(rejected.status, 200);
    assert.equal(rejected.data.status, "rejected");

    // El autor recibe el motivo para corregir.
    const mineAfterReject = await requestJson<{ proposals: ProposalPayload[] }>(
        "/maps/proposals/mine",
        { headers: authHeaders(authorToken) },
    );
    assert.equal(
        mineAfterReject.data.proposals.find(
            (entry) => entry.id === created.id,
        )?.rejectionReason,
        "Los graficos no son originales.",
    );

    // Reenviar con una palabra prohibida se rechaza solo, sin llegar a la cola.
    await createProposal(authorToken, mapNum, "Mapa mierda");
    const autoRejected = await submitProposal(authorToken, created.id);
    assert.equal(autoRejected.status, 200);
    assert.equal(autoRejected.data.status, "rejected");
    assert.equal(autoRejected.data.autoCheckReport?.ok, false);
    assert.equal(
        autoRejected.data.autoCheckReport?.issues.some(
            (issue) => issue.code === "forbidden_word",
        ),
        true,
    );

    // Corregir y reenviar.
    await createProposal(authorToken, mapNum, "Ciudad de prueba");
    const resubmitted = await submitProposal(authorToken, created.id);
    assert.equal(resubmitted.status, 200);
    assert.equal(resubmitted.data.status, "proposed");

    const approved = await requestJson<ProposalPayload>(
        `/moderation/maps/${created.id}/approve`,
        { method: "POST", headers: authHeaders(moderatorToken) },
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.data.status, "published");

    // Cualquier jugador reporta y el mapa vuelve a la cola.
    const report = await requestJson<{
        proposal: ProposalPayload;
        reportId: string;
    }>(`/maps/proposals/${created.id}/report`, {
        method: "POST",
        headers: authHeaders(reporterToken),
        body: JSON.stringify({ reason: "Contenido ofensivo." }),
    });
    assert.equal(report.status, 201);
    assert.equal(report.data.proposal.status, "in_review");
    assert.ok(report.data.reportId);

    // Despublicar un mapa que ya estaba vivo.
    const unpublished = await requestJson<ProposalPayload>(
        `/moderation/maps/${created.id}/unpublish`,
        {
            method: "POST",
            headers: authHeaders(moderatorToken),
            body: JSON.stringify({ reason: "Se confirmo el reporte." }),
        },
    );
    assert.equal(unpublished.status, 200);
    assert.equal(unpublished.data.status, "rejected");
    assert.equal(unpublished.data.rejectionReason, "Se confirmo el reporte.");
});
