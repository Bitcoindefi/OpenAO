import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    computeCompactCanvasScale,
    headingToMovementKeyCode,
    shouldRequireLandscape,
    shouldTreatPointerAsTouch,
    shouldUseCompactPlayLayout,
    vectorToCardinalHeading,
} from "./playability.ts";

const KEY_CODES = { W: 87, A: 65, S: 83, D: 68 };

describe("shouldUseCompactPlayLayout", () => {
    it("enables for coarse pointers regardless of width", () => {
        assert.equal(
            shouldUseCompactPlayLayout({
                pointerCoarse: true,
                maxTouchPoints: 0,
                viewportWidth: 1400,
            }),
            true,
        );
    });

    it("enables for narrow touch viewports", () => {
        assert.equal(
            shouldUseCompactPlayLayout({
                pointerCoarse: false,
                maxTouchPoints: 5,
                viewportWidth: 390,
            }),
            true,
        );
    });

    it("keeps desktop fine-pointer unchanged", () => {
        assert.equal(
            shouldUseCompactPlayLayout({
                pointerCoarse: false,
                maxTouchPoints: 0,
                viewportWidth: 1440,
            }),
            false,
        );
    });
});

describe("vectorToCardinalHeading", () => {
    it("returns null inside the dead zone", () => {
        assert.equal(vectorToCardinalHeading(0.1, 0.1), null);
    });

    it("maps dominant axes to WASD headings", () => {
        assert.equal(vectorToCardinalHeading(1, 0), "right");
        assert.equal(vectorToCardinalHeading(-1, 0.2), "left");
        assert.equal(vectorToCardinalHeading(0.1, -1), "up");
        assert.equal(vectorToCardinalHeading(0.2, 1), "down");
    });
});

describe("headingToMovementKeyCode", () => {
    it("uses engine KEY_CODES, not hardcoded assumptions beyond the fixture", () => {
        assert.equal(headingToMovementKeyCode("up", KEY_CODES), 87);
        assert.equal(headingToMovementKeyCode("left", KEY_CODES), 65);
        assert.equal(headingToMovementKeyCode("down", KEY_CODES), 83);
        assert.equal(headingToMovementKeyCode("right", KEY_CODES), 68);
    });
});

describe("computeCompactCanvasScale", () => {
    it("scales a phone landscape box to fit the 672 canvas", () => {
        const scale = computeCompactCanvasScale({
            viewportWidth: 844,
            viewportHeight: 390,
            canvasBaseWidth: 672,
            canvasBaseHeight: 672,
            horizontalPadding: 8,
            verticalPadding: 8,
            reservedBottomPx: 0,
        });
        assert.ok(scale < 1);
        assert.ok(scale > 0.4);
    });

    it("does not exceed max scale on large screens", () => {
        const scale = computeCompactCanvasScale({
            viewportWidth: 2000,
            viewportHeight: 1200,
            canvasBaseWidth: 672,
            canvasBaseHeight: 672,
            horizontalPadding: 24,
            verticalPadding: 24,
            maxScale: 1.35,
        });
        assert.equal(scale, 1.35);
    });
});

describe("orientation and pointer helpers", () => {
    it("requires landscape in portrait", () => {
        assert.equal(shouldRequireLandscape(390, 844), true);
        assert.equal(shouldRequireLandscape(844, 390), false);
    });

    it("treats touch/pen as touch pointers", () => {
        assert.equal(shouldTreatPointerAsTouch("touch"), true);
        assert.equal(shouldTreatPointerAsTouch("pen"), true);
        assert.equal(shouldTreatPointerAsTouch("mouse"), false);
    });
});
