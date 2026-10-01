export type ShutdownSignal = "SIGINT" | "SIGTERM";

type GracefulShutdownOptions = {
    timeoutMs: number;
    stopAcceptingConnections: () => void;
    notifyClients: (signal: ShutdownSignal) => void;
    resetConnectedCharacters: () => Promise<number>;
    closeClients: () => void;
    exit: (code: number) => void;
    onInfo: (message: string) => void;
    onError: (step: string, error: unknown) => void;
};

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);

        promise.then(
            (value) => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            (error: unknown) => {
                clearTimeout(timeoutId);
                reject(error);
            },
        );
    });
}

export function createGracefulShutdown(options: GracefulShutdownOptions) {
    let started = false;

    async function run(signal: ShutdownSignal): Promise<void> {
        if (started) {
            return;
        }

        started = true;
        options.onInfo(`[Servidor] Señal ${signal} recibida. Iniciando apagado ordenado...`);

        try {
            options.stopAcceptingConnections();
        } catch (error) {
            options.onError("detener nuevas conexiones", error);
        }

        try {
            options.notifyClients(signal);
        } catch (error) {
            options.onError("notificar a los clientes", error);
        }

        try {
            const updated = await withTimeout(
                options.resetConnectedCharacters(),
                options.timeoutMs,
                `La API no respondió en ${options.timeoutMs}ms durante el apagado.`,
            );

            options.onInfo(`[Servidor] Personajes marcados como desconectados al apagar: ${updated}.`);
        } catch (error) {
            options.onError("desmarcar personajes conectados", error);
        }

        try {
            options.closeClients();
        } catch (error) {
            options.onError("cerrar conexiones de clientes", error);
        } finally {
            options.exit(0);
        }
    }

    return {
        hasStarted: () => started,
        run,
    };
}
