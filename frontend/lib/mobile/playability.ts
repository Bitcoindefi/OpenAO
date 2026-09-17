export const MOBILE_LAYOUT_MAX_WIDTH_PX = 900;
export const TOUCH_STICK_SOURCE_CODE = "__touch_stick__";
export const TOUCH_STICK_DEAD_ZONE = 0.28;
export const TOUCH_LONG_PRESS_MS = 480;
export const TOUCH_LONG_PRESS_MOVE_TOLERANCE_PX = 14;
export const MAX_COMPACT_CANVAS_SCALE = 1.35;

export type CardinalHeading = "up" | "down" | "left" | "right";

export type MovementKeyCodes = {
    W: number;
    A: number;
    S: number;
    D: number;
};

export type CompactLayoutHints = {
    pointerCoarse: boolean;
    maxTouchPoints: number;
    viewportWidth: number;
};

/**
 * Compact play layout: coarse pointer, or a narrow touch viewport.
 * Desktop fine-pointer stays on the classic side-by-side HUD.
 */
export function shouldUseCompactPlayLayout(hints: CompactLayoutHints): boolean {
    if (hints.pointerCoarse) {
        return true;
    }

    return (
        hints.maxTouchPoints > 0 &&
        hints.viewportWidth > 0 &&
        hints.viewportWidth <= MOBILE_LAYOUT_MAX_WIDTH_PX
    );
}

export function shouldRequireLandscape(
    width: number,
    height: number,
): boolean {
    return width > 0 && height > 0 && height > width;
}

/**
 * Map a normalized stick vector to a cardinal heading.
 * Returns null inside the dead zone so the stick can idle without walking.
 */
export function vectorToCardinalHeading(
    x: number,
    y: number,
    deadZone: number = TOUCH_STICK_DEAD_ZONE,
): CardinalHeading | null {
    const magnitude = Math.hypot(x, y);
    if (!Number.isFinite(magnitude) || magnitude < deadZone) {
        return null;
    }

    if (Math.abs(x) >= Math.abs(y)) {
        return x >= 0 ? "right" : "left";
    }

    return y >= 0 ? "down" : "up";
}

export function headingToMovementKeyCode(
    heading: CardinalHeading,
    keyCodes: MovementKeyCodes,
): number {
    switch (heading) {
        case "up":
            return keyCodes.W;
        case "down":
            return keyCodes.S;
        case "left":
            return keyCodes.A;
        case "right":
            return keyCodes.D;
    }
}

/**
 * Fit the fixed 21x21 canvas into the available viewport.
 * Does not enlarge the server-visible field — CSS/container scale only.
 */
export function computeCompactCanvasScale(options: {
    viewportWidth: number;
    viewportHeight: number;
    canvasBaseWidth: number;
    canvasBaseHeight: number;
    horizontalPadding: number;
    verticalPadding: number;
    reservedBottomPx?: number;
    maxScale?: number;
}): number {
    const {
        viewportWidth,
        viewportHeight,
        canvasBaseWidth,
        canvasBaseHeight,
        horizontalPadding,
        verticalPadding,
        reservedBottomPx = 0,
        maxScale = MAX_COMPACT_CANVAS_SCALE,
    } = options;

    if (
        viewportWidth <= 0 ||
        viewportHeight <= 0 ||
        canvasBaseWidth <= 0 ||
        canvasBaseHeight <= 0
    ) {
        return 1;
    }

    const availableWidth = Math.max(1, viewportWidth - horizontalPadding * 2);
    const availableHeight = Math.max(
        1,
        viewportHeight - verticalPadding * 2 - reservedBottomPx,
    );
    const widthScale = availableWidth / canvasBaseWidth;
    const heightScale = availableHeight / canvasBaseHeight;
    const nextScale = Math.min(widthScale, heightScale, maxScale);

    if (!Number.isFinite(nextScale) || nextScale <= 0) {
        return 1;
    }

    return nextScale;
}

export function shouldTreatPointerAsTouch(pointerType: string | undefined): boolean {
    return pointerType === "touch" || pointerType === "pen";
}
