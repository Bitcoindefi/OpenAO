/**
 * Metabolic Stamina & Exhaustion Dynamics Engine for OpenAO MMORPG.
 * Simulates activity costs (sprinting, swinging, dodging), carrying weight overburden penalties,
 * and recovery cooldown thresholds upon reaching zero stamina.
 */

export type CharacterActionState = "IDLE" | "WALKING" | "SPRINTING" | "ATTACKING" | "RESTING" | "MEDITATING";

export interface StaminaCharacterState {
    currentStamina: number;
    maxStamina: number;
    inventoryWeightKg: number;
    carryingCapacityKg: number;
    actionState: CharacterActionState;
    isExhausted: boolean; // True if stamina reached 0, remains true until 20% recovered
}

export class StaminaDynamicsEngine {
    private static readonly EXHAUSTION_RECOVERY_THRESHOLD_PERCENT = 0.20; // Must recover 20% before leaving exhaustion

    /**
     * Calculates the encumbrance weight penalty multiplier.
     */
    public static calculateWeightPenalty(inventoryWeight: number, capacity: number): number {
        if (capacity <= 0) return 3.0;
        const ratio = inventoryWeight / capacity;
        if (ratio <= 1.0) return 1.0;
        // Quadratic penalty above capacity
        return Math.min(3.0, 1.0 + Math.pow(ratio - 1.0, 2) * 2.0);
    }

    /**
     * Calculates net stamina rate per tick (+ for regen, - for drain).
     */
    public static getStaminaRatePerTick(state: StaminaCharacterState): number {
        const weightPenalty = this.calculateWeightPenalty(state.inventoryWeightKg, state.carryingCapacityKg);

        switch (state.actionState) {
            case "SPRINTING":
                return -3.0 * weightPenalty;
            case "ATTACKING":
                return -5.0 * weightPenalty;
            case "RESTING":
                return 2.5; // Sitting down speeds up recovery
            case "MEDITATING":
                return 4.0; // Deep meditation grants rapid recovery
            case "WALKING":
                return 0.5; // Slight passive regen while walking
            case "IDLE":
            default:
                return 1.0; // Baseline passive recovery
        }
    }

    /**
     * Processes server tick updates for stamina state.
     */
    public static tickStamina(state: StaminaCharacterState, elapsedTicks = 1): void {
        const safeTicks = Math.max(0, elapsedTicks);
        const rate = this.getStaminaRatePerTick(state);

        state.currentStamina += rate * safeTicks;

        if (state.currentStamina <= 0) {
            state.currentStamina = 0;
            state.isExhausted = true;
            // Force character out of sprinting/attacking when exhausted
            if (state.actionState === "SPRINTING" || state.actionState === "ATTACKING") {
                state.actionState = "WALKING";
            }
        } else if (state.currentStamina >= state.maxStamina) {
            state.currentStamina = state.maxStamina;
            state.isExhausted = false;
        } else if (state.isExhausted) {
            // Check if recovered past threshold
            const recoveryPercent = state.currentStamina / state.maxStamina;
            if (recoveryPercent >= this.EXHAUSTION_RECOVERY_THRESHOLD_PERCENT) {
                state.isExhausted = false;
            }
        }
    }

    /**
     * Checks if a character is permitted to perform a high-stamina action.
     */
    public static canPerformAction(state: StaminaCharacterState, requiredStamina: number): boolean {
        if (state.isExhausted) return false;
        return state.currentStamina >= requiredStamina;
    }
}