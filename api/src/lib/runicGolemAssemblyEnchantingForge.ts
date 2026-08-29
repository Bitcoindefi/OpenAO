import crypto from "node:crypto";

/**
 * Ancient Golem Assembly, Soul Core Imbuing & Overdrive Tuning Engine for OpenAO MMORPG.
 * Simulates assembling chassis frames (Titanium Exoskeleton, Hydraulic Servo, Arcane Conduit),
 * imbuing elemental soul cores (Earth, Flame, Chrono), overdrive turbine boosts, and thermal coolant flushes.
 */

export type GolemChassisFrame = "TITANIUM_EXOSKELETON" | "HYDRAULIC_ARTICULATION_SERVO" | "ARCANE_POWER_CONDUIT";
export type ElementalSoulCore = "EARTH_SOUL_CORE" | "FLAME_SOUL_CORE" | "CHRONO_SOUL_CORE";

export interface SoulCoreData {
    coreType: ElementalSoulCore;
    hpBonus: number;
    armorBonus: number;
    attackBonus: number;
    speedBonus: number;
}

export interface AssembledCombatGolem {
    golemId: string;
    engineerPlayerId: string;
    installedCore: ElementalSoulCore;
    currentHp: number;
    maxHp: number;
    baseAttackPower: number;
    attackPower: number;
    armorRating: number;
    baseMoveSpeed: number;
    moveSpeed: number;
    coreTemperatureCelsius: number; // 0 to 100
    isOverdriveActive: boolean;
    isOverheatedInStasis: boolean;
    isDestroyed: boolean;
}

export const SOUL_CORE_CATALOG: Record<ElementalSoulCore, SoulCoreData> = {
    EARTH_SOUL_CORE: { coreType: "EARTH_SOUL_CORE", hpBonus: 500, armorBonus: 40, attackBonus: 30, speedBonus: 0 },
    FLAME_SOUL_CORE: { coreType: "FLAME_SOUL_CORE", hpBonus: 200, armorBonus: 15, attackBonus: 80, speedBonus: 10 },
    CHRONO_SOUL_CORE: { coreType: "CHRONO_SOUL_CORE", hpBonus: 300, armorBonus: 20, attackBonus: 45, speedBonus: 50 },
};

export class RunicGolemAssemblyEnchantingForgeEngine {
    public static readonly MAX_CORE_TEMPERATURE = 100;

    /**
     * Assembles and imbues a combat golem with elemental soul core at the runic forge.
     */
    public static assembleGolem(
        engineerPlayerId: string,
        frameComponents: GolemChassisFrame[],
        soulCore: ElementalSoulCore,
        currentEpochMs = Date.now()
    ): { success: boolean; golem?: AssembledCombatGolem; reason?: string } {
        if (!engineerPlayerId || typeof engineerPlayerId !== "string") {
            return { success: false, reason: "Invalid engineer player." };
        }

        if (!Array.isArray(frameComponents)) {
            return { success: false, reason: "Incomplete chassis parts. Requires Exoskeleton, Servo, and Conduit." };
        }

        const partSet = new Set(frameComponents);
        if (!partSet.has("TITANIUM_EXOSKELETON") || !partSet.has("HYDRAULIC_ARTICULATION_SERVO") || !partSet.has("ARCANE_POWER_CONDUIT")) {
            return { success: false, reason: "Incomplete chassis parts. Requires Exoskeleton, Servo, and Conduit." };
        }

        const coreData = SOUL_CORE_CATALOG[soulCore];
        if (!coreData) {
            return { success: false, reason: `Unknown elemental soul core: ${String(soulCore)}` };
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const baseHp = 1000 + coreData.hpBonus;
        const baseAttack = 60 + coreData.attackBonus;
        const baseSpeed = 100 + coreData.speedBonus;

        const golem: AssembledCombatGolem = {
            golemId: `golem_combat_${soulCore.toLowerCase()}_${uuid}`,
            engineerPlayerId,
            installedCore: soulCore,
            currentHp: baseHp,
            maxHp: baseHp,
            baseAttackPower: baseAttack,
            attackPower: baseAttack,
            armorRating: 25 + coreData.armorBonus,
            baseMoveSpeed: baseSpeed,
            moveSpeed: baseSpeed,
            coreTemperatureCelsius: 20, // Ambient room temperature
            isOverdriveActive: false,
            isOverheatedInStasis: false,
            isDestroyed: false,
        };

        return {
            success: true,
            golem,
        };
    }

    /**
     * Engages the overdrive turbine boost (+50% attack power & speed), generating rapid core heat.
     */
    public static activateOverdriveTurbine(
        golem: AssembledCombatGolem
    ): { success: boolean; newTemperature: number; isOverheated: boolean; reason?: string } {
        if (!golem || golem.isDestroyed || golem.isOverheatedInStasis) {
            return { success: false, newTemperature: golem?.coreTemperatureCelsius ?? 0, isOverheated: true, reason: "Golem is destroyed or currently in thermal stasis." };
        }

        if (golem.isOverdriveActive) {
            return { success: false, newTemperature: golem.coreTemperatureCelsius, isOverheated: false, reason: "Overdrive turbine is already engaged." };
        }

        golem.isOverdriveActive = true;
        golem.attackPower = Math.round(golem.baseAttackPower * 1.50);
        golem.moveSpeed = Math.round(golem.baseMoveSpeed * 1.50);
        golem.coreTemperatureCelsius = Math.min(this.MAX_CORE_TEMPERATURE, golem.coreTemperatureCelsius + 45);

        let isOverheated = false;
        if (golem.coreTemperatureCelsius >= this.MAX_CORE_TEMPERATURE) {
            golem.isOverheatedInStasis = true;
            golem.isOverdriveActive = false;
            golem.attackPower = golem.baseAttackPower;
            golem.moveSpeed = golem.baseMoveSpeed;
            isOverheated = true;
        }

        return {
            success: true,
            newTemperature: golem.coreTemperatureCelsius,
            isOverheated,
        };
    }

    /**
     * Flushes cryo-coolant to rapidly decrease core temperature and clear thermal stasis.
     */
    public static flushCoolant(
        golem: AssembledCombatGolem,
        coolantPurity = 50
    ): { success: boolean; newTemperature: number; isStasisCleared: boolean } {
        if (!golem || golem.isDestroyed) {
            return { success: false, newTemperature: 0, isStasisCleared: false };
        }

        const wasOverheated = golem.isOverheatedInStasis;
        const reduction = Number.isFinite(coolantPurity) ? Math.max(10, coolantPurity) : 50;
        golem.coreTemperatureCelsius = Math.max(20, golem.coreTemperatureCelsius - reduction);

        if (golem.coreTemperatureCelsius < this.MAX_CORE_TEMPERATURE) {
            golem.isOverheatedInStasis = false;
        }

        return {
            success: true,
            newTemperature: golem.coreTemperatureCelsius,
            isStasisCleared: wasOverheated && !golem.isOverheatedInStasis,
        };
    }
}