import assert from "node:assert/strict";
import { test } from "node:test";
import {
    gracefulShutdown,
    type GracefulShutdownDependencies,
    type ShutdownClient,
} from "./gracefulShutdown";

test("gracefulShutdown closes clients and resets connected characters", async () => {
    const closedClients: string[] = [];
    const requests: Array<{ url: string; options: RequestInit }> = [];
    const output: string[] = [];
    const errors: string[] = [];
    let exitCode: number | undefined;
    let clearedTimer = false;

    const clients: Record<string, ShutdownClient> = {
        open: {
            readyState: 1,
            OPEN: 1,
            close: () => closedClients.push("open"),
        },
        closed: {
            readyState: 3,
            OPEN: 1,
            close: () => closedClients.push("closed"),
        },
    };

    const dependencies: GracefulShutdownDependencies = {
        clients,
        tokenAuth: "test-token",
        fetchUrl: async (url, options) => {
            requests.push({ url, options });
            return { updated: 4 };
        },
        exit: (code) => {
            exitCode = code;
        },
        setTimeout: (callback) => {
            void callback;
            return setTimeout(() => undefined, 60_000);
        },
        clearTimeout: (timer) => {
            clearedTimer = true;
            clearTimeout(timer);
        },
        writeOut: (message) => output.push(message),
        writeErr: (message) => errors.push(message),
    };

    await gracefulShutdown("SIGTERM", dependencies);

    assert.deepEqual(closedClients, ["open"]);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, "/internal/characters/reset-connected");
    assert.equal(requests[0]?.options.method, "POST");
    assert.equal(
        (requests[0]?.options.headers as Record<string, string>).Authorization,
        "test-token",
    );
    assert.equal(exitCode, 0);
    assert.equal(clearedTimer, true);
    assert.equal(errors.length, 0);
    assert.equal(output.some((message) => message.includes("4 personajes")), true);
});
