import { describe, it, expect } from "vitest";
import { AoETargetSelector, TargetEntity } from "../lib/aoeTargetSelector.js";

describe("AoETargetSelector Geometry, Friendly Fire & Raycasting", () => {
    const mockEntities: TargetEntity[] = [
        { entityId: "caster", x: 0, y: 0, faction: "ALLIANCE", isAlive: true },
        { entityId: "ally_1", x: 0, y: 3, faction: "ALLIANCE", isAlive: true }, // North ally
        { entityId: "enemy_north", x: 0, y: 4, faction: "HORDE", isAlive: true }, // North enemy
        { entityId: "enemy_east", x: 4, y: 0, faction: "HORDE", isAlive: true },  // East enemy
        { entityId: "enemy_beam", x: 6, y: 0.5, faction: "HORDE", isAlive: true }, // In linear beam
    ];

    it("filters out caster self-harm and friendly allies by default", () => {
        const targets = AoETargetSelector.selectTargets(mockEntities, {
            shapeType: "CIRCLE",
            origin: { x: 0, y: 0 },
            radius: 5,
            casterEntityId: "caster",
            casterFaction: "ALLIANCE",
            allowSelfHarm: false,
            allowFriendlyFire: false,
        });

        // Only enemy_north and enemy_east should be selected
        expect(targets.length).toBe(2);
        expect(targets.some(t => t.entityId === "caster")).toBe(false);
        expect(targets.some(t => t.entityId === "ally_1")).toBe(false);
    });

    it("evaluates CONE_SECTOR facing North", () => {
        const targets = AoETargetSelector.selectTargets(mockEntities, {
            shapeType: "CONE_SECTOR",
            origin: { x: 0, y: 0 },
            radius: 6,
            facingAngleRad: Math.PI / 2, // North
            coneSpreadAngleRad: Math.PI / 3, // 60 deg
            casterEntityId: "caster",
            casterFaction: "ALLIANCE",
        });

        expect(targets.length).toBe(1);
        expect(targets[0].entityId).toBe("enemy_north");
    });

    it("evaluates LINEAR_BEAM directed East", () => {
        const targets = AoETargetSelector.selectTargets(mockEntities, {
            shapeType: "LINEAR_BEAM",
            origin: { x: 0, y: 0 },
            beamLength: 10,
            beamWidth: 2,
            facingAngleRad: 0, // East
            casterEntityId: "caster",
            casterFaction: "ALLIANCE",
        });

        // enemy_east (4,0) and enemy_beam (6,0.5) are inside
        expect(targets.length).toBe(2);
        expect(targets.some(t => t.entityId === "enemy_east")).toBe(true);
        expect(targets.some(t => t.entityId === "enemy_beam")).toBe(true);
    });
});