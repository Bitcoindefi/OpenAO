import assert from "node:assert/strict";
import { test } from "vitest";
import {
    PASSWORD_RESET_EMAIL_CLIENT_ERROR,
    assertSesConfigured,
    formatSesSendError,
    getMissingSesEnvNames,
} from "../lib/sesConfig";

test("missing SES configuration lists every required variable", () => {
    const missing = getMissingSesEnvNames({
        sesRegion: null,
        sesAccessKeyId: null,
        sesSecretAccessKey: null,
        sesFromEmail: null,
    });

    assert.deepEqual(missing, [
        "SES_REGION",
        "SES_ACCESS_KEY_ID",
        "SES_SECRET_ACCESS_KEY",
        "SES_FROM_EMAIL",
    ]);
    assert.throws(
        () =>
            assertSesConfigured({
                sesRegion: null,
                sesAccessKeyId: "x",
                sesSecretAccessKey: "y",
                sesFromEmail: null,
            }),
        (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /SES_REGION/);
            assert.match(error.message, /SES_FROM_EMAIL/);
            assert.match(error.message, /Amazon SES no esta configurado/);
            return true;
        },
    );
});

test("complete SES configuration passes startup assert", () => {
    assert.doesNotThrow(() =>
        assertSesConfigured({
            sesRegion: "us-east-1",
            sesAccessKeyId: "AKIAEXAMPLE",
            sesSecretAccessKey: "secret",
            sesFromEmail: "noreply@example.com",
        }),
    );
});

test("provider failure formatter distinguishes sandbox from missing config", () => {
    const missing = formatSesSendError(
        new Error("Amazon SES no esta configurado. Faltan variables: SES_REGION"),
    );
    assert.match(missing, /hint=sin_configurar/);

    const sandbox = formatSesSendError(
        Object.assign(new Error("Email address is not verified."), {
            name: "MessageRejected",
            $metadata: { httpStatusCode: 400, requestId: "req-1" },
        }),
    );
    assert.match(sandbox, /hint=posible_sandbox_o_identidad_sin_verificar/);
    assert.match(sandbox, /httpStatus=400/);
    assert.match(sandbox, /requestId=req-1/);
});

test("client-facing password reset email error stays generic", () => {
    assert.equal(
        PASSWORD_RESET_EMAIL_CLIENT_ERROR,
        "No se pudo enviar el email de recuperacion. Intenta de nuevo.",
    );
    assert.doesNotMatch(
        PASSWORD_RESET_EMAIL_CLIENT_ERROR,
        /SES|AWS|sandbox|AKIA/i,
    );
});
