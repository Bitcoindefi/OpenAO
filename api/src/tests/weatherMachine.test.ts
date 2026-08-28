import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WeatherStateMachine, BIOME_WEATHER_TABLES } from "../lib/weatherMachine.js";

describe("WeatherStateMachine Environmental Climate", () => {
    it("initializes with default weather state and modifiers", () => {
        const machine = new WeatherStateMachine("TEMPERATE_FOREST", "SUNNY", 100, 200);
        const state = machine.getState();

        assert.equal(state.current, "SUNNY");
        assert.equal(state.visibilityFactor, 1.0);
        assert.equal(state.movementSpeedMultiplier, 1.0);
        assert.equal(state.elementalSpellModifiers.fireDamageMult, 1.1);
    });

    it("applies storm penalties to speed, visibility, and boosts water magic", () => {
        const machine = new WeatherStateMachine("OCEAN", "HEAVY_STORM", 100, 200);
        const state = machine.getState();

        assert.equal(state.current, "HEAVY_STORM");
        assert.equal(state.visibilityFactor, 0.5);
        assert.equal(state.movementSpeedMultiplier, 0.9);
        assert.equal(state.lightningChancePerTick, 0.05);
        assert.equal(state.elementalSpellModifiers.waterDamageMult, 1.3);
    });

    it("ticks down remaining duration and transitions to valid biome weather", () => {
        const machine = new WeatherStateMachine("DESERT", "SUNNY", 5, 10);
        assert.equal(machine.getState().ticksRemainingInState, 5);

        for (let i = 0; i < 5; i++) {
            machine.tick();
        }

        const nextState = machine.getState();
        assert.ok(nextState.ticksRemainingInState >= 5);
        // Desert never snows
        assert.notEqual(nextState.current, "SNOWING");
    });
});