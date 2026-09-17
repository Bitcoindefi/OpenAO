import { useEffect } from "react";
import {
    createChangeClanSeguroPacket,
    createChangeSeguroPacket,
    createDialogPacket,
    createPickupItemPacket,
    createResyncPositionPacket,
    createToggleHiddenSkillPacket,
} from "../../../lib/aowProtocol";
import { isHotkeyMatch } from "../../../lib/hotkeys";
import { isAdminInspector } from "../admin/npcInspector";
import type { Engine } from "../engine/Engine";

type UseKeyboardGameplayOptions = {
    isMounted: boolean;
    engineRef: { current: Engine | null };
    websocketRef: { current: WebSocket | null };
    hotkeySettingsRef: { current: any };
    playerHudRef: { current: any };
    movementKeyMapRef: { current: Map<string, number> };
    movementPressCountsRef: { current: Map<number, number> };
    movementKeyPriorityRef: { current: number[] };
    canProcessMovementInput: () => boolean;
    clearMovementInputState: (engine?: Engine | null) => void;
    clearTargetingMode: () => void;
    hasEquippedMeleeWeapon: () => boolean;
    hasEquippedRangedWeapon: () => boolean;
    recordClientGameAction: (
        action: string,
        details?: Record<string, unknown>,
    ) => void;
    resolveBlockedGameplayKeyboardReason: (
        event: KeyboardEvent,
    ) => string | null;
    setTargetingMode: (mode: { type: "range" }) => void;
    syncMovementState: (engine: Engine) => void;
    setIsDebugMode: (updater: (previous: boolean) => boolean) => void;
};

export function useKeyboardGameplay({
    isMounted,
    engineRef,
    websocketRef,
    hotkeySettingsRef,
    playerHudRef,
    movementKeyMapRef,
    movementPressCountsRef,
    movementKeyPriorityRef,
    canProcessMovementInput,
    clearMovementInputState,
    clearTargetingMode,
    hasEquippedMeleeWeapon,
    hasEquippedRangedWeapon,
    recordClientGameAction,
    resolveBlockedGameplayKeyboardReason,
    setTargetingMode,
    syncMovementState,
    setIsDebugMode,
}: UseKeyboardGameplayOptions) {
    useEffect(() => {
        if (!isMounted) {
            return;
        }

        const movementKeyMap = movementKeyMapRef.current;
        const movementPressCounts = movementPressCountsRef.current;

        const resolveMovementKeyCode = (code: string): number | null => {
            const activeEngine = engineRef.current;

            if (!activeEngine) {
                return null;
            }

            const settings = hotkeySettingsRef.current;
            if (settings.moveUp.includes(code)) {
                return activeEngine.KEY_CODES.W;
            }
            if (settings.moveLeft.includes(code)) {
                return activeEngine.KEY_CODES.A;
            }
            if (settings.moveDown.includes(code)) {
                return activeEngine.KEY_CODES.S;
            }
            if (settings.moveRight.includes(code)) {
                return activeEngine.KEY_CODES.D;
            }
            return null;
        };

        const isTypingTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) {
                return false;
            }

            const tagName = target.tagName;
            return (
                target.isContentEditable ||
                tagName === "INPUT" ||
                tagName === "TEXTAREA" ||
                tagName === "SELECT"
            );
        };

        const isArrowMovementCode = (code: string): boolean =>
            code === "ArrowUp" ||
            code === "ArrowLeft" ||
            code === "ArrowDown" ||
            code === "ArrowRight";

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEngine = engineRef.current;
            const movementKeyCode = resolveMovementKeyCode(e.code);
            const isSpellListTarget = e.target instanceof HTMLSelectElement;

            if (
                isTypingTarget(e.target) &&
                !(movementKeyCode !== null && isArrowMovementCode(e.code)) &&
                !isSpellListTarget
            ) {
                return;
            }

            if (e.key === "Escape") {
                clearTargetingMode();
                return;
            }

            if (resolveBlockedGameplayKeyboardReason(e)) {
                e.preventDefault();
                return;
            }

            const settings = hotkeySettingsRef.current;

            if (isHotkeyMatch(e, settings.pickupItem) && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createPickupItemPacket());
                recordClientGameAction("pickup_item", {
                    key: e.key,
                    code: e.code,
                });
                e.preventDefault();
                return;
            }

            if (isHotkeyMatch(e, settings.toggleSeguro) && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createChangeSeguroPacket());
                recordClientGameAction("toggle_seguro", {
                    key: e.key,
                    code: e.code,
                });

                e.preventDefault();
                return;
            }

            if (isHotkeyMatch(e, settings.toggleClanSeguro) && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createChangeClanSeguroPacket());
                recordClientGameAction("toggle_clan_seguro", {
                    key: e.key,
                    code: e.code,
                });

                e.preventDefault();
                return;
            }

            if (isHotkeyMatch(e, settings.toggleHiddenSkill) && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createToggleHiddenSkillPacket());
                recordClientGameAction("toggle_hidden_skill", {
                    key: e.key,
                    code: e.code,
                });
                e.preventDefault();
                return;
            }

            if (isHotkeyMatch(e, settings.attackOrTarget) && !e.repeat) {
                if (hasEquippedMeleeWeapon()) {
                    activeEngine?.sendMeleeAttackPacket?.();
                    e.preventDefault();
                    return;
                }

                if (hasEquippedRangedWeapon()) {
                    setTargetingMode({ type: "range" });
                    e.preventDefault();
                    return;
                }

                return;
            }

            if (isHotkeyMatch(e, settings.meditate) && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createDialogPacket("/meditar"));
                recordClientGameAction("meditate", {
                    key: e.key,
                    code: e.code,
                });
                e.preventDefault();
                return;
            }

            if (e.key.toLowerCase() === "l" && !e.repeat) {
                const socket = websocketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                socket.send(createResyncPositionPacket());
                recordClientGameAction("resync_position", {
                    key: e.key,
                    code: e.code,
                });
                e.preventDefault();
                return;
            }

            if (
                e.key.toLowerCase() === "p" &&
                !e.repeat &&
                isAdminInspector(activeEngine, playerHudRef.current)
            ) {
                setIsDebugMode((prev) => !prev);
                e.preventDefault();
                return;
            }

            if (movementKeyCode !== null) {
                if (!movementKeyMap.has(e.code)) {
                    movementKeyMap.set(e.code, movementKeyCode);
                    movementPressCounts.set(
                        movementKeyCode,
                        (movementPressCounts.get(movementKeyCode) ?? 0) + 1,
                    );
                }

                movementKeyPriorityRef.current =
                    movementKeyPriorityRef.current.filter(
                        (code) => code !== movementKeyCode,
                    );
                movementKeyPriorityRef.current.unshift(movementKeyCode);

                if (!activeEngine || !canProcessMovementInput()) {
                    e.preventDefault();
                    return;
                }

                syncMovementState(activeEngine);
                e.preventDefault();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const activeEngine = engineRef.current;
            const movementKeyCode = movementKeyMap.get(e.code);
            if (movementKeyCode !== undefined) {
                const nextCount = Math.max(
                    0,
                    (movementPressCounts.get(movementKeyCode) ?? 1) - 1,
                );

                if (nextCount === 0) {
                    movementPressCounts.delete(movementKeyCode);
                    movementKeyPriorityRef.current =
                        movementKeyPriorityRef.current.filter(
                            (code) => code !== movementKeyCode,
                        );
                } else {
                    movementPressCounts.set(movementKeyCode, nextCount);
                }

                movementKeyMap.delete(e.code);

                if (activeEngine && canProcessMovementInput()) {
                    syncMovementState(activeEngine);
                }

                e.preventDefault();
                return;
            }

            const isSpellListTarget = e.target instanceof HTMLSelectElement;
            if (isTypingTarget(e.target) && !isSpellListTarget) {
                return;
            }
        };

        const handleBlur = () => {
            clearMovementInputState(engineRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                clearMovementInputState(engineRef.current);
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        document.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handleBlur);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
            document.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            window.removeEventListener("pagehide", handleBlur);
        };
    }, [
        canProcessMovementInput,
        clearMovementInputState,
        clearTargetingMode,
        engineRef,
        hasEquippedMeleeWeapon,
        hasEquippedRangedWeapon,
        hotkeySettingsRef,
        isMounted,
        movementKeyMapRef,
        movementKeyPriorityRef,
        movementPressCountsRef,
        playerHudRef,
        recordClientGameAction,
        resolveBlockedGameplayKeyboardReason,
        setIsDebugMode,
        setTargetingMode,
        syncMovementState,
        websocketRef,
    ]);
}
