import { useCallback, useEffect, useRef } from "react";
import type { Engine } from "../engine/Engine";

type UseTouchGameplayOptions = {
  isMounted: boolean;
  engineRef: { current: Engine | null };
  movementKeyPriorityRef: { current: number[] };
  movementPressCountsRef: { current: Map<number, number> };
  syncMovementState: (engine: Engine) => void;
  canProcessMovementInput: () => boolean;
};

/**
 * Touch gameplay hook that bridges the virtual joystick to the engine's
 * movement system, bypassing the keyboard event path (which rejects
 * synthetic events via isTrusted).
 *
 * Instead of dispatching KeyboardEvent, it directly manipulates
 * movementPressCountsRef and movementKeyPriorityRef — the same
 * refs the keyboard hook uses, so syncMovementState works correctly.
 */
export function useTouchGameplay({
  isMounted,
  engineRef,
  movementKeyPriorityRef,
  movementPressCountsRef,
  syncMovementState,
  canProcessMovementInput,
}: UseTouchGameplayOptions) {
  const isMoving = useRef(false);
  const currentDirection = useRef<number | null>(null);

  /**
   * Engine KEY_CODES: W=87, A=65, S=83, D=68
   * The movementKeyPriorityRef stores KEY_CODES values (87, 65, 83, 68),
   * and the engine's update loop maps them to DIRECTIONS via moveTo().
   *
   * Angles: 0 = right, PI/2 = down, PI = left, -PI/2 = up
   */
  const KEY_W = 87; // UP
  const KEY_A = 65; // LEFT
  const KEY_S = 83; // DOWN
  const KEY_D = 68; // RIGHT

  const angleToKeyCode = useCallback((angle: number): number => {
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sector = Math.round(normalized / (Math.PI / 2)) % 4;
    // 0=right(D), 1=down(S), 2=left(A), 3=up(W)
    const keyCodes: Record<number, number> = {
      0: KEY_D,
      1: KEY_S,
      2: KEY_A,
      3: KEY_W,
    };
    return keyCodes[sector];
  }, []);

  const handleMove = useCallback(
    (angle: number, _force: number) => {
      if (!isMounted) return;
      const keyCode = angleToKeyCode(angle);

      // Only update if direction changed
      if (keyCode !== currentDirection.current) {
        currentDirection.current = keyCode;

        // Clear all previous touch directions
        movementPressCountsRef.current.clear();

        // Set the new direction with count 1
        movementPressCountsRef.current.set(keyCode, 1);

        // Push to front of priority (same as keyboard handleKeyDown)
        movementKeyPriorityRef.current =
          movementKeyPriorityRef.current.filter(
            (code) => code !== keyCode,
          );
        movementKeyPriorityRef.current.unshift(keyCode);

        if (!isMoving.current) {
          isMoving.current = true;
        }

        const activeEngine = engineRef.current;
        if (activeEngine && canProcessMovementInput()) {
          syncMovementState(activeEngine);
        }
      }
    },
    [
      isMounted,
      angleToKeyCode,
      movementKeyPriorityRef,
      movementPressCountsRef,
      engineRef,
      canProcessMovementInput,
      syncMovementState,
    ],
  );

  const handleMoveEnd = useCallback(() => {
    if (!isMounted) return;

    isMoving.current = false;
    currentDirection.current = null;

    // Clear touch movement (same as keyboard keyup path)
    movementPressCountsRef.current.clear();
    movementKeyPriorityRef.current =
      movementKeyPriorityRef.current.filter(
        (code) =>
          code !== KEY_W &&
          code !== KEY_A &&
          code !== KEY_S &&
          code !== KEY_D,
      );

    const activeEngine = engineRef.current;
    if (activeEngine && canProcessMovementInput()) {
      syncMovementState(activeEngine);
    }
  }, [
    isMounted,
    movementKeyPriorityRef,
    movementPressCountsRef,
    engineRef,
    canProcessMovementInput,
    syncMovementState,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMoving.current) {
        handleMoveEnd();
      }
    };
  }, [isMoving, handleMoveEnd]);

  return {
    onJoystickMove: handleMove,
    onJoystickMoveEnd: handleMoveEnd,
  };
}