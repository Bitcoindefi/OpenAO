import { useCallback, useEffect, useRef } from "react";
import type { Engine } from "../engine/Engine";
import {
    TOUCH_STICK_SOURCE_CODE,
    headingToMovementKeyCode,
    vectorToCardinalHeading,
    type CardinalHeading,
} from "../../../lib/mobile/playability";

type UseTouchStickMovementOptions = {
    isMounted: boolean;
    enabled: boolean;
    engineRef: { current: Engine | null };
    movementKeyMapRef: { current: Map<string, number> };
    movementPressCountsRef: { current: Map<number, number> };
    movementKeyPriorityRef: { current: number[] };
    canProcessMovementInput: () => boolean;
    clearMovementInputState: (engine?: Engine | null) => void;
    syncMovementState: (engine: Engine) => void;
};

/**
 * Bridges a virtual stick into the same movement refs the keyboard hook uses.
 * Uses a dedicated source code so keyboard presses are not wiped on direction changes.
 * Never synthesizes KeyboardEvents (rejected via isTrusted).
 */
export function useTouchStickMovement({
    isMounted,
    enabled,
    engineRef,
    movementKeyMapRef,
    movementPressCountsRef,
    movementKeyPriorityRef,
    canProcessMovementInput,
    clearMovementInputState,
    syncMovementState,
}: UseTouchStickMovementOptions) {
    const activeHeadingRef = useRef<CardinalHeading | null>(null);

    const releaseStick = useCallback(() => {
        const previousKey = movementKeyMapRef.current.get(
            TOUCH_STICK_SOURCE_CODE,
        );
        if (previousKey === undefined) {
            activeHeadingRef.current = null;
            return;
        }

        movementKeyMapRef.current.delete(TOUCH_STICK_SOURCE_CODE);

        const nextCount = Math.max(
            0,
            (movementPressCountsRef.current.get(previousKey) ?? 1) - 1,
        );
        if (nextCount === 0) {
            movementPressCountsRef.current.delete(previousKey);
            movementKeyPriorityRef.current =
                movementKeyPriorityRef.current.filter(
                    (code) => code !== previousKey,
                );
        } else {
            movementPressCountsRef.current.set(previousKey, nextCount);
        }

        activeHeadingRef.current = null;

        const activeEngine = engineRef.current;
        if (activeEngine && canProcessMovementInput()) {
            syncMovementState(activeEngine);
        }
    }, [
        canProcessMovementInput,
        engineRef,
        movementKeyMapRef,
        movementKeyPriorityRef,
        movementPressCountsRef,
        syncMovementState,
    ]);

    const applyStickVector = useCallback(
        (x: number, y: number) => {
            if (!isMounted || !enabled) {
                return;
            }

            const activeEngine = engineRef.current;
            if (!activeEngine) {
                return;
            }

            const heading = vectorToCardinalHeading(x, y);
            if (!heading) {
                releaseStick();
                return;
            }

            if (heading === activeHeadingRef.current) {
                return;
            }

            const nextKey = headingToMovementKeyCode(
                heading,
                activeEngine.KEY_CODES,
            );
            const previousKey = movementKeyMapRef.current.get(
                TOUCH_STICK_SOURCE_CODE,
            );

            if (previousKey !== undefined && previousKey !== nextKey) {
                const nextCount = Math.max(
                    0,
                    (movementPressCountsRef.current.get(previousKey) ?? 1) - 1,
                );
                if (nextCount === 0) {
                    movementPressCountsRef.current.delete(previousKey);
                    movementKeyPriorityRef.current =
                        movementKeyPriorityRef.current.filter(
                            (code) => code !== previousKey,
                        );
                } else {
                    movementPressCountsRef.current.set(previousKey, nextCount);
                }
            }

            if (previousKey !== nextKey) {
                movementKeyMapRef.current.set(
                    TOUCH_STICK_SOURCE_CODE,
                    nextKey,
                );
                movementPressCountsRef.current.set(
                    nextKey,
                    (movementPressCountsRef.current.get(nextKey) ?? 0) + 1,
                );
            }

            movementKeyPriorityRef.current =
                movementKeyPriorityRef.current.filter(
                    (code) => code !== nextKey,
                );
            movementKeyPriorityRef.current.unshift(nextKey);
            activeHeadingRef.current = heading;

            if (canProcessMovementInput()) {
                syncMovementState(activeEngine);
            }
        },
        [
            canProcessMovementInput,
            enabled,
            engineRef,
            isMounted,
            movementKeyMapRef,
            movementKeyPriorityRef,
            movementPressCountsRef,
            releaseStick,
            syncMovementState,
        ],
    );

    useEffect(() => {
        if (!isMounted || !enabled) {
            releaseStick();
            return;
        }

        const handleHidden = () => {
            clearMovementInputState(engineRef.current);
            activeHeadingRef.current = null;
        };

        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                handleHidden();
            }
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", handleHidden);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", handleHidden);
            releaseStick();
        };
    }, [
        clearMovementInputState,
        enabled,
        engineRef,
        isMounted,
        releaseStick,
    ]);

    return {
        applyStickVector,
        releaseStick,
    };
}
