export type ShutdownClient = {
    readyState: number;
    OPEN: number;
    close: (code: number, reason: string) => void;
};

export type GracefulShutdownDependencies = {
    clients: Record<string, ShutdownClient | undefined>;
    tokenAuth: string;
    fetchUrl: (
        url: string,
        options: RequestInit,
    ) => Promise<{ updated?: number } | undefined>;
    exit: (code: number) => void;
    setTimeout: (
        callback: () => void,
        delayMs: number,
    ) => ReturnType<typeof setTimeout>;
    clearTimeout: (timeout: ReturnType<typeof setTimeout>) => void;
    writeOut: (message: string) => void;
    writeErr: (message: string) => void;
};

const SHUTDOWN_TIMEOUT_MS = 8000;
const SHUTDOWN_MESSAGE = "[Servidor] El servidor se está reiniciando.";

let isShuttingDown = false;

export async function gracefulShutdown(
    signal: string,
    dependencies: GracefulShutdownDependencies,
): Promise<void> {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    dependencies.writeOut(
        `[Servidor] Recibida señal ${signal}. Iniciando apagado seguro...\n`,
    );

    const shutdownTimeout = dependencies.setTimeout(() => {
        dependencies.writeErr(
            "[Servidor] Tiempo de apagado agotado. Forzando salida.\n",
        );
        dependencies.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
        for (const client of Object.values(dependencies.clients)) {
            if (!client || client.readyState !== client.OPEN) {
                continue;
            }

            try {
                client.close(1001, SHUTDOWN_MESSAGE);
            } catch {
                // A client that is already closing must not block shutdown.
            }
        }

        const resetCharactersResponse = await dependencies.fetchUrl(
            "/internal/characters/reset-connected",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: dependencies.tokenAuth,
                },
            },
        );

        dependencies.writeOut(
            `[Servidor] Apagado seguro: ${resetCharactersResponse?.updated ?? 0} personajes marcados como desconectados.\n`,
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        dependencies.writeErr(
            `[Servidor] Error durante el apagado seguro: ${message}\n`,
        );
    } finally {
        dependencies.clearTimeout(shutdownTimeout);
        dependencies.exit(0);
    }
}
