import assert from "node:assert/strict";
import test from "node:test";

import { createGracefulShutdown, type ShutdownSignal } from "../src/gracefulShutdown";

type TestOptions = Parameters<typeof createGracefulShutdown>[0];

function createOptions(overrides: Partial<TestOptions> = {}): TestOptions {
    return {
        timeoutMs: 50,
        stopAcceptingConnections() {},
        notifyClients(_signal: ShutdownSignal) {},
        async resetConnectedCharacters() {
            return 0;
        },
        closeClients() {},
        exit(_code: number) {},
        onInfo(_message: string) {},
        onError(_step: string, _error: unknown) {},
        ...overrides,
    };
}

test("resets characters before closing clients and exiting", async () => {
    const events: string[] = [];
    const shutdown = createGracefulShutdown(
        createOptions({
            stopAcceptingConnections() {
                events.push("stop");
            },
            notifyClients(signal) {
                events.push(`notify:${signal}`);
            },
            async resetConnectedCharacters() {
                events.push("reset");
                return 3;
            },
            closeClients() {
                events.push("close");
            },
            exit(code) {
                events.push(`exit:${code}`);
            },
        }),
    );

    await shutdown.run("SIGTERM");

    assert.deepEqual(events, ["stop", "notify:SIGTERM", "reset", "close", "exit:0"]);
});

test("exits when the reset API does not respond", async () => {
    const errors: string[] = [];
    let closeCalls = 0;
    let exitCalls = 0;
    const shutdown = createGracefulShutdown(
        createOptions({
            timeoutMs: 10,
            resetConnectedCharacters() {
                return new Promise<number>(() => {});
            },
            closeClients() {
                closeCalls += 1;
            },
            exit() {
                exitCalls += 1;
            },
            onError(step) {
                errors.push(step);
            },
        }),
    );

    await shutdown.run("SIGINT");

    assert.deepEqual(errors, ["desmarcar personajes conectados"]);
    assert.equal(closeCalls, 1);
    assert.equal(exitCalls, 1);
});

test("handles repeated signals only once", async () => {
    let resolveReset!: (updated: number) => void;
    const resetFinished = new Promise<number>((resolve) => {
        resolveReset = resolve;
    });
    let resetCalls = 0;
    let exitCalls = 0;
    const shutdown = createGracefulShutdown(
        createOptions({
            resetConnectedCharacters() {
                resetCalls += 1;
                return resetFinished;
            },
            exit() {
                exitCalls += 1;
            },
        }),
    );

    const firstSignal = shutdown.run("SIGTERM");
    const secondSignal = shutdown.run("SIGINT");

    resolveReset(1);
    await Promise.all([firstSignal, secondSignal]);

    assert.equal(shutdown.hasStarted(), true);
    assert.equal(resetCalls, 1);
    assert.equal(exitCalls, 1);
});
