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

type ManualConnectionConfig = {
    wsUrl: string;
    ticket: string;
    typeGame?: number;
    idChar?: number;
    sessionKey: string;
};

type UseGameSessionOptions = {
    connection?: ManualConnectionConfig | null;
    isClientReadyForConnection: boolean;
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
            activeSessionKeyRef.current = null;
            disconnectSocket();
            pendingUserSnapshotRef.current = null;
            pendingRemoteSnapshotsRef.current.clear();
            setIsSceneReadyRef.current(false);
            setClientReadySessionKeyRef.current(null);
            emitHudRef.current(null);
            emitStatusRef.current({ connected: false, connecting: false });
            return;
        }

        if (!isClientReadyForConnection) {
            disconnectSocket();
            return;
        }

        let isUnmounted = false;
        let reconnectAttempt = 0;
        const maxReconnectAttempts = 5;
        let reconnectTimer: number | null = null;

        const clearReconnectTimer = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        const connectSocket = () => {
            if (isUnmounted || !connection || !isClientReadyForConnection) {
                return;
            }

            disconnectSocket();
            activeSessionKeyRef.current = connection.sessionKey;

            const socket = new WebSocket(connection.wsUrl);
            socket.binaryType = "arraybuffer";
            websocketRef.current = socket;

            emitStatusRef.current({
                connected: false,
                connecting: true,
                error:
                    reconnectAttempt > 0
                        ? `Reconectando (${reconnectAttempt}/${maxReconnectAttempts})...`
                        : undefined,
            });

            socket.onopen = () => {
                if (
                    isUnmounted ||
                    activeSessionKeyRef.current !== connection.sessionKey ||
                    !isCurrentSocketInstance(socket)
                ) {
                    socket.close();
                    return;
                }

                reconnectAttempt = 0;
                clearReconnectTimer();

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
                        ticket: connection.ticket,
                        typeGame: connection.typeGame,
                        idChar: connection.idChar,
                    }),
                );

                flushPendingChatRequestRef.current();
                sendPing();
                pingIntervalRef.current = window.setInterval(sendPing, 10000);
            };

            const processIncomingPacketQueue = async () => {
                if (isProcessingIncomingPacketsRef.current) {
                    return;
                }

                isProcessingIncomingPacketsRef.current = true;

                try {
                    while (incomingPacketQueueRef.current.length > 0) {
                        if (
                            activeSessionKeyRef.current !==
                            connection.sessionKey
                        ) {
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
                                    disconnectSocket,
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
                emitStatusRef.current({
                    connected: false,
                    connecting: false,
                    error: "No se pudo establecer la conexion websocket.",
                });
            };

            socket.onclose = (event: CloseEvent) => {
                clearPing();
                if (isUnmounted || !isCurrentSocketInstance(socket)) {
                    return;
                }

                if (activeSessionKeyRef.current === connection.sessionKey) {
                    setIsSceneReadyRef.current(false);

                    // Skip auto-reconnect on intentional clean closures (1000 Normal Closure)
                    if (event.code === 1000) {
                        const previousError = latestStatusRef.current.error;
                        emitStatusRef.current({
                            connected: false,
                            connecting: false,
                            error: previousError || "Conexion cerrada.",
                        });
                        return;
                    }

                    if (reconnectAttempt < maxReconnectAttempts) {
                        reconnectAttempt += 1;
                        const backoffMs = Math.min(
                            10000,
                            1000 * Math.pow(2, reconnectAttempt - 1),
                        );
                        emitStatusRef.current({
                            connected: false,
                            connecting: true,
                            error: `Conexion perdida. Reconectando (${reconnectAttempt}/${maxReconnectAttempts})...`,
                        });

                        clearReconnectTimer();
                        reconnectTimer = window.setTimeout(() => {
                            if (
                                !isUnmounted &&
                                activeSessionKeyRef.current ===
                                    connection.sessionKey
                            ) {
                                connectSocket();
                            }
                        }, backoffMs);
                    } else {
                        const previousError = latestStatusRef.current.error;
                        emitStatusRef.current({
                            connected: false,
                            connecting: false,
                            error:
                                previousError ||
                                "Conexion cerrada. No se pudo reconectar automaticamente.",
                        });
                    }
                }
            };
        };

        const handleVisibilityOrOnline = () => {
            if (
                !isUnmounted &&
                document.visibilityState === "visible" &&
                connection &&
                isClientReadyForConnection &&
                (!websocketRef.current ||
                    websocketRef.current.readyState === WebSocket.CLOSED)
            ) {
                clearReconnectTimer();
                reconnectAttempt = 0;
                connectSocket();
            }
        };

        window.addEventListener("online", handleVisibilityOrOnline);
        document.addEventListener("visibilitychange", handleVisibilityOrOnline);

        connectSocket();

        return () => {
            isUnmounted = true;
            clearReconnectTimer();
            window.removeEventListener("online", handleVisibilityOrOnline);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityOrOnline,
            );
            if (
                activeSessionKeyRef.current === connection.sessionKey
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
