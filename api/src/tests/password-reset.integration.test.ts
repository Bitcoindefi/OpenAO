import assert from "node:assert/strict";
import { beforeAll, test } from "vitest";
import {
    confirmPasswordReset,
    countAuthSessions,
    countPasswordResetRequests,
    countPasswordResetRequestsByIp,
    createAccountFixture,
    createPasswordResetToken,
    ensureApiReady,
    getAuthSession,
    getPasswordResetStatus,
    loginAccount,
    requestJson,
    requestPasswordReset,
} from "./helpers/api";
import { PASSWORD_RESET_EMAIL_CLIENT_ERROR } from "../lib/sesConfig";

beforeAll(async () => {
    await ensureApiReady();
});

test("password reset request is generic for unknown emails", async () => {
    const email = `missing-${Date.now()}@local.test`;

    const response = await requestPasswordReset(email, "203.0.113.10");

    assert.equal(response.status, 200);
    assert.equal(
        response.data.message,
        "Si existe una cuenta con ese email, te enviamos un link para recuperar la password.",
    );
    assert.equal(await countPasswordResetRequests(email), 1);
});

test("password reset cooldown keeps generic responses and avoids extra rows", async () => {
    const email = `cooldown-${Date.now()}@local.test`;
    const ip = "203.0.113.11";

    const first = await requestPasswordReset(email, ip);
    const second = await requestPasswordReset(email, ip);
    const third = await requestPasswordReset(email, ip);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 200);
    assert.equal(await countPasswordResetRequests(email), 1);
});

test("password reset IP rate limit also degrades gracefully", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 100) + 20}`;

    for (let index = 0; index < 11; index += 1) {
        const response = await requestPasswordReset(
            `ip-limit-${Date.now()}-${index}@local.test`,
            ip,
        );
        assert.equal(response.status, 200);
        assert.equal(
            response.data.message,
            "Si existe una cuenta con ese email, te enviamos un link para recuperar la password.",
        );
    }

    assert.equal(await countPasswordResetRequestsByIp(ip), 10);
});

test("password reset status rejects malformed tokens and reports invalid tokens", async () => {
    const malformed = await requestJson<{ error?: string }>(
        "/auth/password-reset/%20%20",
    );
    const invalid = await getPasswordResetStatus("invalid-token");

    assert.equal(malformed.status, 400);
    assert.equal(
        (malformed.data as { error?: string }).error,
        "Token invalido",
    );
    assert.equal(invalid.status, 200);
    assert.equal((invalid.data as { valid?: boolean }).valid, false);
});

test("password reset confirm rejects invalid tokens", async () => {
    const response = await confirmPasswordReset(
        "x".repeat(43),
        "NuevaPassword123",
    );

    assert.equal(response.status, 400);
    assert.equal(
        response.data.error,
        "El link de recuperacion es invalido o ya vencio",
    );
});

test("password reset confirm updates password and invalidates active sessions", async () => {
    const account = await createAccountFixture({ password: "Inicial123" });
    const secondLogin = await loginAccount(account.email, account.password);
    assert.equal(secondLogin.status, 200);

    const token = await createPasswordResetToken(account.session.account._id);
    const beforeStatus = await getPasswordResetStatus(token);
    assert.equal((beforeStatus.data as { valid?: boolean }).valid, true);
    assert.equal(await countAuthSessions(account.session.account._id), 2);

    const confirm = await confirmPasswordReset(token, "NuevaPassword123");
    assert.equal(confirm.status, 200);

    const afterStatus = await getPasswordResetStatus(token);
    assert.equal((afterStatus.data as { valid?: boolean }).valid, false);
    assert.equal(await countAuthSessions(account.session.account._id), 0);

    const oldPasswordLogin = await loginAccount(
        account.email,
        account.password,
    );
    const newPasswordLogin = await loginAccount(
        account.email,
        "NuevaPassword123",
    );
    const oldSession = await getAuthSession(account.session.sessionToken);
    const secondSession = await getAuthSession(
        (secondLogin.data as { sessionToken: string }).sessionToken,
    );

    assert.equal(oldPasswordLogin.status, 401);
    assert.equal(newPasswordLogin.status, 200);
    assert.equal(oldSession.status, 401);
    assert.equal(secondSession.status, 401);
});

test("password reset tokens are single use", async () => {
    const account = await createAccountFixture({ password: "Token1234" });
    const token = await createPasswordResetToken(account.session.account._id);

    const first = await confirmPasswordReset(token, "NuevaToken123");
    const second = await confirmPasswordReset(token, "OtraToken123");

    assert.equal(first.status, 200);
    assert.equal(second.status, 400);
    assert.equal(
        second.data.error,
        "El link de recuperacion es invalido o ya vencio",
    );
});

test("password reset client error text stays generic (no SES/AWS leak)", () => {
    assert.equal(
        PASSWORD_RESET_EMAIL_CLIENT_ERROR,
        "No se pudo enviar el email de recuperacion. Intenta de nuevo.",
    );
    assert.doesNotMatch(
        PASSWORD_RESET_EMAIL_CLIENT_ERROR,
        /SES_|AWS|sandbox|AccessKey|secret/i,
    );
});
