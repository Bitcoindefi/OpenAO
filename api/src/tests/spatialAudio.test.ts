import { describe, it, expect } from "vitest";
import { SpatialAudioEngine } from "../lib/spatialAudio.js";

describe("SpatialAudioEngine Refined Listener Orientation and Near-Field Occlusion", () => {
    it("keeps front and rear sounds centered in stereo panning", () => {
        const listener = { x: 0, y: 0, facingAngleRad: 0 };
        const frontEmitter = { x: 0, y: 5, maxDistance: 20 };
        const rearEmitter = { x: 0, y: -5, maxDistance: 20 };

        const frontPan = SpatialAudioEngine.calculateStereoPan(listener, frontEmitter);
        expect(frontPan.left).toBeCloseTo(frontPan.right, 2);

        const rearPan = SpatialAudioEngine.calculateStereoPan(listener, rearEmitter);
        expect(rearPan.left).toBeCloseTo(rearPan.right, 2);
    });

    it("applies occlusion attenuation even when within minDistance", () => {
        const listener = { x: 0, y: 0 };
        const nearOccludedEmitter = { x: 0, y: 0.5, maxDistance: 20, minDistance: 1, isOccludedByWall: true };

        const att = SpatialAudioEngine.calculateAttenuation(0.5, nearOccludedEmitter);
        expect(att).toBe(0.50); // Occlusion applied near-field
    });
});