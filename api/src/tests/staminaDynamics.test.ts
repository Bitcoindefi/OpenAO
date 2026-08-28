import { describe, it, expect } from "vitest";
import { StaminaDynamicsEngine, StaminaCharacterState } from "../lib/staminaDynamics.js";

describe("StaminaDynamicsEngine Exhaustion and Metabolic Costs", () => {
    const createMockCharacter = (): StaminaCharacterState => ({
        currentStamina: 100,
        maxStamina: 100,
        inventoryWeightKg: 20,
        carryingCapacityKg: 50,
        actionState: "IDLE",
        isExhausted: false,
    });

    it("drains stamina while sprinting and triggers exhaustion at 0", () => {
        const char = createMockCharacter();
        char.actionState = "SPRINTING"; // -3 per tick

        StaminaDynamicsEngine.tickStamina(char, 35); // 35 * 3 = 105 drain

        expect(char.currentStamina).toBe(0);
        expect(char.isExhausted).toBe(true);
        expect(char.actionState).toBe("WALKING"); // Forced down to walking
    });

    it("retains exhaustion state until recovering at least 20% stamina", () => {
        const char = createMockCharacter();
        char.currentStamina = 0;
        char.isExhausted = true;
        char.actionState = "RESTING"; // +2.5 per tick

        // Recover 4 ticks = 10 stamina (10% of 100) -> Still exhausted
        StaminaDynamicsEngine.tickStamina(char, 4);
        expect(char.currentStamina).toBe(10);
        expect(char.isExhausted).toBe(true);
        expect(StaminaDynamicsEngine.canPerformAction(char, 5)).toBe(false);

        // Recover another 5 ticks = +12.5 -> Total 22.5 (22.5%) -> Exhaustion clears
        StaminaDynamicsEngine.tickStamina(char, 5);
        expect(char.currentStamina).toBe(22.5);
        expect(char.isExhausted).toBe(false);
        expect(StaminaDynamicsEngine.canPerformAction(char, 5)).toBe(true);
    });

    it("amplifies stamina drain when carrying weight exceeds capacity", () => {
        const penalty = StaminaDynamicsEngine.calculateWeightPenalty(100, 50); // 200% capacity
        expect(penalty).toBeGreaterThan(1.5);
    });
});