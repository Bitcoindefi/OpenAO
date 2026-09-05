import { useEffect, useRef, type RefObject } from "react";
import {
    CLIENT_PACKET_ID,
    createConnectCharacterPacket,
    createPingPacket,
    normalizeSocketMessageData,
    parseServerPacket,
} from "../../../lib/aowProtocol";
import { setTextIfChanged } from "../rendering/textStyles";
import { getSmoothedPingDisplay } from "../network/ping";
import { parseQueuedSocketMessage } from "../network/packetQueue";

export type GameSessionCredentials = {
    wsUrl: string;
    ticket: string;
    typeGame?: number;
    idChar?: number;
};

type ManualConnectionConfig = GameSessionCredentials & {
    sessionKey: string;
};

export type ReconnectPhase =
    | "idle"
    | "scheduled"
    | "connecting"
    | "exhausted"
    | "cancelled";

export type ReconnectCommand = {
    type: "cancel" | "retry";
    nonce: number;
};

type UseGameSessionOptions = {
    connection?: ManualConnectionConfig | null;
    isClientReadyForConnection: boolean;
    refreshConnectionCredentials?: () => Promise<GameSessionCredentials | null>;
    reconnectCommand?: ReconnectCommand | null;
    activeSocketInstanceRef: RefObject<number>;
    websocketRef: RefObject<WebSocket | null>;
    activeSessionKeyRef: RefObject<string | null>;
    pingIntervalRef: RefObject<number | null>;
    pendingPingRef: RefObject<{ token: number; sentAt: number } | null>;
    recentPingSamplesRef: RefObject<number[]>;
    nextPingTokenRef: RefObject<number>;
    pingTextRef: RefObject<any>;
    pingDisplayTextRef: RefObject<string>;
    fpsDisplayTextRef: RefObject<string>;
    onPingSample?: (pingMs: number | null) => void;
    clearUseItemQueues: () => void;
    clearTargetingMode: () => void;
    resetMovementSyncState: () => void;
    lastServerConfirmedSelfPositionRef: RefObject<any>;
    clearMovementInputState: (engine?: any) => void;
    clearTtEntities: (engine?: any) => void;
    incomingPacketQueueRef: RefObject<
        Array<Blob | ArrayBuffer | ArrayBufferView>
    >;
    isProcessingIncomingPacketsRef: RefObject<boolean>;
    lastSentChatTokenRef: RefObject<number | null>;
    pendingUserSnapshotRef: RefObject<any>;
    pendingRemoteSnapshotsRef: RefObject<Map<number, any>>;
    setIsSceneReady: (value: boolean) => void;
    setClientReadySessionKey: (value: string | null) => void;
    emitHud: (value: any) => void;
    emitStatus: (value: any) => void;
    flushPendingChatRequest: () => void;
    currentMapRef: RefObject<number>;
    engineRef: RefObject<any>;
    latestStatusRef: RefObject<any>;
    clearAllDialogMessages: () => void;
    clearAllCastBars: () => void;
    emitTradeState: (value: any) => void;
    emitMarketState: (value: any) => void;
    emitRetosState: (value: any) => void;
    emitBailState: (value: any) => void;
    emitCraftingState: (value: any) => void;
    panelSnapshotChunkBufferRef: RefObject<string>;
    panelSnapshotChunkExpectedIndexRef: RefObject<number>;
    panelSnapshotChunkTotalRef: RefObject<number>;
    characterStatsChunkBufferRef: RefObject<string>;
    characterStatsChunkExpectedIndexRef: RefObject<number>;
    characterStatsChunkTotalRef: RefObject<number>;
    onPacket: (args: {
        packet: any;
        engine: any;
        renderedMapNumber: number;
        disconnectSocket: () => void;
    }) => Promise<void>;
};

export function useGameSession({
    connection,
    isClientReadyForConnection,
    refreshConnectionCredentials,
    reconnectCommand,
    activeSocketInstanceRef,
    websocketRef,
    activeSessionKeyRef,
    pingIntervalRef,
    pendingPingRef,
    recentPingSamplesRef,
    nextPingTokenRef,
    pingTextRef,
    pingDisplayTextRef,
    fpsDisplayTextRef,
    onPingSample,
    clearUseItemQueues,
    clearTargetingMode,
    resetMovementSyncState,
    lastServerConfirmedSelfPositionRef,
    clearMovementInputState,
    clearTtEntities,
    incomingPacketQueueRef,
    isProcessingIncomingPacketsRef,
    lastSentChatTokenRef,
    pendingUserSnapshotRef,
    pendingRemoteSnapshotsRef,
    setIsSceneReady,
    setClientReadySessionKey,
    emitHud,
    emitStatus,
    flushPendingChatRequest,
    currentMapRef,
    engineRef,
    latestStatusRef,
    clearAllDialogMessages,
    clearAllCastBars,
    emitTradeState,
    emitMarketState,
    emitRetosState,
    emitBailState,
    emitCraftingState,
    panelSnapshotChunkBufferRef,
    panelSnapshotChunkExpectedIndexRef,
    panelSnapshotChunkTotalRef,
    characterStatsChunkBufferRef,
    characterStatsChunkExpectedIndexRef,
    characterStatsChunkTotalRef,
    onPacket,
}: UseGameSessionOptions) {
    const emitHudRef = useRef(emitHud);
    const emitStatusRef = useRef(emitStatus);
    const emitTradeStateRef = useRef(emitTradeState);
    const emitMarketStateRef = useRef(emitMarketState);
    const emitRetosStateRef = useRef(emitRetosState);
    const emitBailStateRef = useRef(emitBailState);
    const emitCraftingStateRef = useRef(emitCraftingState);
    const clearUseItemQueuesRef = useRef(clearUseItemQueues);
    const clearTargetingModeRef = useRef(clearTargetingMode);
    const resetMovementSyncStateRef = useRef(resetMovementSyncState);
    const clearMovementInputStateRef = useRef(clearMovementInputState);
    const clearTtEntitiesRef = useRef(clearTtEntities);
    const setIsSceneReadyRef = useRef(setIsSceneReady);
    const setClientReadySessionKeyRef = useRef(setClientReadySessionKey);
    const flushPendingChatRequestRef = useRef(flushPendingChatRequest);
    const clearAllDialogMessagesRef = useRef(clearAllDialogMessages);
    const clearAllCastBarsRef = useRef(clearAllCastBars);
    const onPacketRef = useRef(onPacket);
    const onPingSampleRef = useRef(onPingSample);
    const refreshConnectionCredentialsRef = useRef(refreshConnectionCredentials);
    const reconnectControllerRef = useRef<{
        cancel: () => void;
        retry: () => void;
    } | null>(null);
    const lastReconnectCommandNonceRef = useRef<number | null>(null);

    useEffect(() => {
        refreshConnectionCredentialsRef.current = refreshConnectionCredentials;
    }, [refreshConnectionCredentials]);

    useEffect(() => {
        emitHudRef.current = emitHud;
    }, [emitHud]);

    useEffect(() => {
        emitStatusRef.current = emitStatus;
    }, [emitStatus]);

    useEffect(() => {
        emitTradeStateRef.current = emitTradeState;
    }, [emitTradeState]);

    useEffect(() => {
        emitMarketStateRef.current = emitMarketState;
    }, [emitMarketState]);

    useEffect(() => {
        emitRetosStateRef.current = emitRetosState;
    }, [emitRetosState]);

    useEffect(() => {
        emitBailStateRef.current = emitBailState;
    }, [emitBailState]);

    useEffect(() => {
        emitCraftingStateRef.current = emitCraftingState;
    }, [emitCraftingState]);

    useEffect(() => {
        clearUseItemQueuesRef.current = clearUseItemQueues;
    }, [clearUseItemQueues]);

    useEffect(() => {
        clearTargetingModeRef.current = clearTargetingMode;
    }, [clearTargetingMode]);

    useEffect(() => {
        resetMovementSyncStateRef.current = resetMovementSyncState;
    }, [resetMovementSyncState]);

    useEffect(() => {
        clearMovementInputStateRef.current = clearMovementInputState;
    }, [clearMovementInputState]);

    useEffect(() => {
        clearTtEntitiesRef.current = clearTtEntities;
    }, [clearTtEntities]);

    useEffect(() => {
        setIsSceneReadyRef.current = setIsSceneReady;
    }, [setIsSceneReady]);

    useEffect(() => {
        setClientReadySessionKeyRef.current = setClientReadySessionKey;
    }, [setClientReadySessionKey]);

    useEffect(() => {
        flushPendingChatRequestRef.current = flushPendingChatRequest;
    }, [flushPendingChatRequest]);

    useEffect(() => {
        clearAllDialogMessagesRef.current = clearAllDialogMessages;
    }, [clearAllDialogMessages]);

    useEffect(() => {
        clearAllCastBarsRef.current = clearAllCastBars;
    }, [clearAllCastBars]);

    useEffect(() => {
        onPacketRef.current = onPacket;
    }, [onPacket]);

    useEffect(() => {
        onPingSampleRef.current = onPingSample;
    }, [onPingSample]);


    useEffect(() => {
        if (!reconnectCommand) {
            return;
        }
        if (lastReconnectCommandNonceRef.current === reconnectCommand.nonce) {
            return;
        }
        lastReconnectCommandNonceRef.current = reconnectCommand.nonce;
        const controller = reconnectControllerRef.current;
        if (!controller) {
            return;
        }
        if (reconnectCommand.type === "cancel") {
            controller.cancel();
            return;
        }
        controller.retry();
    }, [reconnectCommand]);

    useEffect(() => {
        const socketInstanceId = activeSocketInstanceRef.current + 1;
        activeSocketInstanceRef.current = socketInstanceId;

        const isCurrentSocketInstance = (socket?: WebSocket | null) =>
            Boolean(
                socket &&
                websocketRef.current === socket &&
                activeSocketInstanceRef.current === socketInstanceId,
            );

        const clearPing = () => {
            if (pingIntervalRef.current) {
                window.clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            pendingPingRef.current = null;
            recentPingSamplesRef.current = [];
            pingDisplayTextRef.current = "Ping: -- ms";
            onPingSampleRef.current?.(null);

            if (pingTextRef.current) {
                setTextIfChanged(
                    pingTextRef.current,
                    pingDisplayTextRef.current,
                );
            }
        };

        const disconnectSocket = () => {
            clearPing();
            fpsDisplayTextRef.current = "FPS: 0";
            clearUseItemQueuesRef.current();
            clearTargetingModeRef.current();
            resetMovementSyncStateRef.current();
            lastServerConfirmedSelfPositionRef.current = null;
            clearMovementInputStateRef.current(engineRef.current);
            clearTtEntitiesRef.current(engineRef.current);
            incomingPacketQueueRef.current = [];
            isProcessingIncomingPacketsRef.current = false;
            lastSentChatTokenRef.current = null;
            const socket = websocketRef.current;
            websocketRef.current = null;
            if (socket) {
                socket.close();
            }
        };

        if (!connection) {
            reconnectControllerRef.current = null;
            activeSessionKeyRef.current = null;
            disconnectSocket();
            pendingUserSnapshotRef.current = null;
            pendingRemoteSnapshotsRef.current.clear();
            setIsSceneReadyRef.current(false);
            setClientReadySessionKeyRef.current(null);
            emitHudRef.current(null);
            emitStatusRef.current({
                connected: false,
                connecting: false,
                reconnectPhase: "idle",
            });
            return;
        }

        if (!isClientReadyForConnection) {
            disconnectSocket();
            return;
        }

        const MAX_RECONNECT_ATTEMPTS = 6;
        const RECONNECT_BASE_DELAY_MS = 1000;
        const RECONNECT_MAX_DELAY_MS = 30000;

        let disposed = false;
        let allowReconnect = true;
        let reconnectAttempt = 0;
        let reconnectTimer: number | null = null;
        let reconnectCountdownTimer: number | null = null;
        let openingSocket = false;
        let activeCredentials: ManualConnectionConfig = { ...connection };

        const clearReconnectTimers = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (reconnectCountdownTimer !== null) {
                window.clearInterval(reconnectCountdownTimer);
                reconnectCountdownTimer = null;
            }
        };

        const getReconnectDelayMs = (attempt: number) =>
            Math.min(
                RECONNECT_MAX_DELAY_MS,
                RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
            );

        const intentionalDisconnectSocket = () => {
            allowReconnect = false;
            clearReconnectTimers();
            disconnectSocket();
        };

        const emitDisconnectedStatus = ({
            error,
            connecting = false,
            reconnectPhase = "idle",
            attempt = reconnectAttempt,
        }: {
            error?: string;
            connecting?: boolean;
            reconnectPhase?:
                | "idle"
                | "scheduled"
                | "connecting"
                | "exhausted"
                | "cancelled";
            attempt?: number;
        }) => {
            emitStatusRef.current({
                connected: false,
                connecting,
                error,
                reconnectPhase,
                reconnectAttempt: attempt,
                reconnectMaxAttempts: MAX_RECONNECT_ATTEMPTS,
            });
        };

        const processIncomingPacketQueue = async () => {
            if (isProcessingIncomingPacketsRef.current) {
                return;
            }

            isProcessingIncomingPacketsRef.current = true;

            try {
                while (incomingPacketQueueRef.current.length > 0) {
                    if (activeSessionKeyRef.current !== connection.sessionKey) {
                        incomingPacketQueueRef.current = [];
                        return;
                    }

                    const queuedMessage =
                        incomingPacketQueueRef.current.shift();
                    if (!queuedMessage) {
                        continue;
                    }

                    try {
                        const { packets } =
                            await parseQueuedSocketMessage(queuedMessage);

                        if (
                            activeSessionKeyRef.current !==
                            connection.sessionKey
                        ) {
                            incomingPacketQueueRef.current = [];
                            return;
                        }

                        for (const packet of packets) {
                            const engine = engineRef.current;
                            const renderedMapNumber =
                                engine?.mapNumber ?? currentMapRef.current;

                            await onPacketRef.current({
                                packet,
                                engine,
                                renderedMapNumber,
                                disconnectSocket: intentionalDisconnectSocket,
                            });
                        }
                    } catch (packetError) {
                        console.error(
                            "Error parsing server packet",
                            packetError,
                        );
                    }
                }
            } finally {
                isProcessingIncomingPacketsRef.current = false;
            }
        };

        const tryHandlePongMessage = async (
            rawMessage: Blob | ArrayBuffer | ArrayBufferView,
        ): Promise<boolean> => {
            if (rawMessage instanceof ArrayBuffer) {
                if (
                    new DataView(rawMessage).getUint8(0) !==
                    CLIENT_PACKET_ID.pong
                ) {
                    return false;
                }
            } else if (ArrayBuffer.isView(rawMessage)) {
                if (
                    new DataView(
                        rawMessage.buffer,
                        rawMessage.byteOffset,
                        rawMessage.byteLength,
                    ).getUint8(0) !== CLIENT_PACKET_ID.pong
                ) {
                    return false;
                }
            }

            const messageData = await normalizeSocketMessageData(rawMessage);
            const packet = parseServerPacket(messageData);

            if (packet.type !== "pong") {
                return false;
            }

            const pendingPing = pendingPingRef.current;
            if (
                pendingPing &&
                (packet.payload.token === 0 ||
                    packet.payload.token === pendingPing.token)
            ) {
                updatePingDisplay(
                    Math.max(
                        0,
                        Math.round(performance.now() - pendingPing.sentAt),
                    ),
                );

                pendingPingRef.current = null;
            }

            return true;
        };

        const updatePingDisplay = (sampleMs: number) => {
            const nextPing = getSmoothedPingDisplay(
                recentPingSamplesRef.current,
                sampleMs,
            );
            recentPingSamplesRef.current = nextPing.samples;
            pingDisplayTextRef.current = nextPing.text;
            onPingSampleRef.current?.(sampleMs);

            if (pingTextRef.current) {
                setTextIfChanged(
                    pingTextRef.current,
                    pingDisplayTextRef.current,
                );
            }
        };

        const refreshCredentialsIfNeeded = async (): Promise<boolean> => {
            const refresh = refreshConnectionCredentialsRef.current;
            if (!refresh) {
                return true;
            }

            emitDisconnectedStatus({
                connecting: true,
                reconnectPhase: "connecting",
                error: `Renovando ticket… (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`,
                attempt: reconnectAttempt,
            });

            try {
                const fresh = await refresh();
                if (disposed || !allowReconnect) {
                    return false;
                }
                if (!fresh?.ticket) {
                    return false;
                }
                activeCredentials = {
                    ...activeCredentials,
                    ...fresh,
                    sessionKey: connection.sessionKey,
                };
                return true;
            } catch (error) {
                console.error("Failed to refresh game ticket for reconnect", error);
                return false;
            }
        };

        const connectSocket = () => {
            if (disposed || openingSocket) {
                return;
            }

            openingSocket = true;
            clearReconnectTimers();
            disconnectSocket();
            activeSessionKeyRef.current = connection.sessionKey;

            const socket = new WebSocket(activeCredentials.wsUrl);
            socket.binaryType = "arraybuffer";
            websocketRef.current = socket;

            emitDisconnectedStatus({
                connecting: true,
                reconnectPhase: reconnectAttempt > 0 ? "connecting" : "idle",
                error:
                    reconnectAttempt > 0
                        ? `Reconectando… (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`
                        : undefined,
                attempt: reconnectAttempt,
            });

            socket.onopen = () => {
                openingSocket = false;
                if (
                    activeSessionKeyRef.current !== connection.sessionKey ||
                    !isCurrentSocketInstance(socket)
                ) {
                    socket.close();
                    return;
                }

                reconnectAttempt = 0;
                allowReconnect = true;

                const sendPing = () => {
                    if (socket.readyState !== WebSocket.OPEN) {
                        return;
                    }

                    const token = nextPingTokenRef.current++;
                    pendingPingRef.current = {
                        token,
                        sentAt: performance.now(),
                    };
                    socket.send(createPingPacket(token));
                };

                socket.send(
                    createConnectCharacterPacket({
                        ticket: activeCredentials.ticket,
                        typeGame: activeCredentials.typeGame,
                        idChar: activeCredentials.idChar,
                    }),
                );

                flushPendingChatRequestRef.current();
                sendPing();
                pingIntervalRef.current = window.setInterval(sendPing, 10000);
            };

            socket.onmessage = (event) => {
                if (!isCurrentSocketInstance(socket)) {
                    return;
                }

                const rawMessage = event.data as
                    | Blob
                    | ArrayBuffer
                    | ArrayBufferView;

                void tryHandlePongMessage(rawMessage)
                    .then((wasPong) => {
                        if (wasPong) {
                            return;
                        }

                        incomingPacketQueueRef.current.push(rawMessage);
                        void processIncomingPacketQueue();
                    })
                    .catch(() => {
                        incomingPacketQueueRef.current.push(rawMessage);
                        void processIncomingPacketQueue();
                    });
            };

            socket.onerror = () => {
                if (!isCurrentSocketInstance(socket)) {
                    return;
                }

                setIsSceneReadyRef.current(false);
                // onclose handles reconnect scheduling; keep a visible interim error.
                if (!allowReconnect) {
                    emitDisconnectedStatus({
                        error: "No se pudo establecer la conexion websocket.",
                        reconnectPhase: "cancelled",
                    });
                }
            };

            socket.onclose = (event) => {
                openingSocket = false;
                clearPing();
                if (
                    activeSessionKeyRef.current !== connection.sessionKey ||
                    !isCurrentSocketInstance(socket)
                ) {
                    return;
                }

                setIsSceneReadyRef.current(false);
                const previousError = latestStatusRef.current.error;
                const closeReason = event.reason.trim();
                const fallbackError =
                    closeReason || previousError || "Conexion cerrada.";

                if (disposed || !allowReconnect) {
                    emitDisconnectedStatus({
                        error: fallbackError,
                        reconnectPhase: allowReconnect ? "idle" : "cancelled",
                    });
                    return;
                }

                void scheduleReconnect(fallbackError);
            };
        };

        const runReconnectAttempt = async () => {
            if (disposed || !allowReconnect) {
                return;
            }

            const refreshed = await refreshCredentialsIfNeeded();
            if (disposed || !allowReconnect) {
                return;
            }

            if (!refreshed) {
                emitDisconnectedStatus({
                    error: `No se pudo renovar el ticket. Reintentando… (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`,
                    reconnectPhase: "scheduled",
                    attempt: reconnectAttempt,
                });
                // Retry later with backoff without consuming an extra attempt label jump.
                const delayMs = getReconnectDelayMs(reconnectAttempt);
                reconnectTimer = window.setTimeout(() => {
                    reconnectTimer = null;
                    void runReconnectAttempt();
                }, delayMs);
                return;
            }

            connectSocket();
        };

        const scheduleReconnect = (reason?: string) => {
            if (disposed || !allowReconnect) {
                return;
            }

            clearReconnectTimers();

            if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
                emitDisconnectedStatus({
                    error:
                        reason ||
                        `No se pudo reconectar tras ${MAX_RECONNECT_ATTEMPTS} intentos.`,
                    reconnectPhase: "exhausted",
                    attempt: reconnectAttempt,
                });
                return;
            }

            reconnectAttempt += 1;
            const delayMs = getReconnectDelayMs(reconnectAttempt);
            const dueAt = Date.now() + delayMs;

            const publishCountdown = () => {
                const remainingSec = Math.max(
                    1,
                    Math.ceil((dueAt - Date.now()) / 1000),
                );
                emitDisconnectedStatus({
                    connecting: false,
                    reconnectPhase: "scheduled",
                    attempt: reconnectAttempt,
                    error: `Conexion perdida. Reconectando en ${remainingSec}s (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})…`,
                });
            };

            publishCountdown();
            reconnectCountdownTimer = window.setInterval(publishCountdown, 500);
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null;
                if (reconnectCountdownTimer !== null) {
                    window.clearInterval(reconnectCountdownTimer);
                    reconnectCountdownTimer = null;
                }
                void runReconnectAttempt();
            }, delayMs);
        };

        const cancelReconnect = () => {
            allowReconnect = false;
            clearReconnectTimers();
            openingSocket = false;
            const socket = websocketRef.current;
            if (
                socket &&
                (socket.readyState === WebSocket.CONNECTING ||
                    socket.readyState === WebSocket.OPEN)
            ) {
                // Keep an intentional close from scheduling again.
                disconnectSocket();
            }
            emitDisconnectedStatus({
                error: "Reconexion cancelada.",
                reconnectPhase: "cancelled",
                attempt: reconnectAttempt,
            });
        };

        const retryReconnect = () => {
            if (disposed) {
                return;
            }
            allowReconnect = true;
            clearReconnectTimers();
            reconnectAttempt = 0;
            void (async () => {
                reconnectAttempt = 1;
                emitDisconnectedStatus({
                    connecting: true,
                    reconnectPhase: "connecting",
                    attempt: reconnectAttempt,
                    error: `Reconectando… (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`,
                });
                const refreshed = await refreshCredentialsIfNeeded();
                if (disposed || !allowReconnect) {
                    return;
                }
                if (!refreshed) {
                    scheduleReconnect("No se pudo renovar el ticket.");
                    return;
                }
                connectSocket();
            })();
        };

        reconnectControllerRef.current = {
            cancel: cancelReconnect,
            retry: retryReconnect,
        };

        let needsWakeReconnect = false;

        const maybeWakeReconnect = () => {
            if (disposed || !allowReconnect) {
                return;
            }
            if (
                typeof document !== "undefined" &&
                document.visibilityState &&
                document.visibilityState !== "visible"
            ) {
                return;
            }

            const socket = websocketRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) {
                needsWakeReconnect = false;
                return;
            }

            if (
                !needsWakeReconnect &&
                socket &&
                socket.readyState === WebSocket.CONNECTING
            ) {
                return;
            }

            // Resume from background / network restore: restart attempts instead of staying exhausted.
            needsWakeReconnect = false;
            clearReconnectTimers();
            if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS || reconnectAttempt === 0) {
                reconnectAttempt = 1;
            }

            if (socket && socket.readyState === WebSocket.CLOSING) {
                needsWakeReconnect = true;
                return;
            }

            void runReconnectAttempt();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                maybeWakeReconnect();
            }
        };

        const handlePageShow = () => {
            maybeWakeReconnect();
        };

        const handlePageHide = () => {
            needsWakeReconnect = true;
        };

        window.addEventListener("online", maybeWakeReconnect);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("pagehide", handlePageHide);

        connectSocket();

        return () => {
            disposed = true;
            allowReconnect = false;
            reconnectControllerRef.current = null;
            clearReconnectTimers();
            window.removeEventListener("online", maybeWakeReconnect);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("pagehide", handlePageHide);
            if (
                activeSessionKeyRef.current === connection.sessionKey &&
                activeSocketInstanceRef.current === socketInstanceId
            ) {
                activeSessionKeyRef.current = null;
            }
            clearAllDialogMessagesRef.current();
            clearAllCastBarsRef.current();
            emitTradeStateRef.current(null);
            emitMarketStateRef.current(null);
            emitRetosStateRef.current(null);
            emitBailStateRef.current(null);
            emitCraftingStateRef.current(null);
            panelSnapshotChunkBufferRef.current = "";
            panelSnapshotChunkExpectedIndexRef.current = 0;
            panelSnapshotChunkTotalRef.current = 0;
            characterStatsChunkBufferRef.current = "";
            characterStatsChunkExpectedIndexRef.current = 0;
            characterStatsChunkTotalRef.current = 0;
            disconnectSocket();
        };
    }, [
        connection,
        isClientReadyForConnection,
        activeSessionKeyRef,
        activeSocketInstanceRef,
        characterStatsChunkBufferRef,
        characterStatsChunkExpectedIndexRef,
        characterStatsChunkTotalRef,
        currentMapRef,
        engineRef,
        fpsDisplayTextRef,
        incomingPacketQueueRef,
        isProcessingIncomingPacketsRef,
        lastSentChatTokenRef,
        lastServerConfirmedSelfPositionRef,
        latestStatusRef,
        nextPingTokenRef,
        panelSnapshotChunkBufferRef,
        panelSnapshotChunkExpectedIndexRef,
        panelSnapshotChunkTotalRef,
        pendingPingRef,
        pendingRemoteSnapshotsRef,
        pendingUserSnapshotRef,
        pingDisplayTextRef,
        pingIntervalRef,
        pingTextRef,
        recentPingSamplesRef,
        websocketRef,
    ]);
}
