import crypto from "node:crypto";

/**
 * Siege Weaponry, Catapult Trajectory & Castle Fortification Breaching Engine for OpenAO MMORPG.
 * Simulates siege engines (Trebuchet, Manganel Catapult, Ballista), ammunition types (Battering Boulder, Burning Pitch, Corrosive Flask),
 * trajectory accuracy calculations, and catastrophic wall breaching mechanics.
 */

export type SiegeEngineType = "HEAVY_TREBUCHET" | "MANGANEL_CATAPULT" | "BALLISTA_SIEGE_BOW";
export type SiegeMunitionType = "BATTERING_BOULDER" | "BURNING_PITCH_CASK" | "CORROSIVE_ALCHEMICAL_FLASK";
export type CastleStructureType = "OUTER_GATE" | "MAIN_KEEP_GATE" | "FORTIFIED_RAMPART";

export interface SiegeEngineData {
    engineType: SiegeEngineType;
    maxRangeTiles: number;
    baseSiegeDamage: number;
    reloadTimeSeconds: number;
}

export interface ActiveSiegeEngine {
    engineId: string;
    operatorPlayerId: string;
    engineType: SiegeEngineType;
    location: { x: number; y: number };
    currentDurabilityHp: number;
    maxDurabilityHp: number;
    lastFiredEpochMs: number;
}

export interface CastleFortification {
    structureId: string;
    structureType: CastleStructureType;
    location: { x: number; y: number };
    currentHp: number;
    maxHp: number;
    armorRating: number;
    isBreached: boolean;
}

export const SIEGE_ENGINE_CATALOG: Record<SiegeEngineType, SiegeEngineData> = {
    HEAVY_TREBUCHET: { engineType: "HEAVY_TREBUCHET", maxRangeTiles: 60, baseSiegeDamage: 600, reloadTimeSeconds: 8 },
    MANGANEL_CATAPULT: { engineType: "MANGANEL_CATAPULT", maxRangeTiles: 45, baseSiegeDamage: 450, reloadTimeSeconds: 6 },
    BALLISTA_SIEGE_BOW: { engineType: "BALLISTA_SIEGE_BOW", maxRangeTiles: 40, baseSiegeDamage: 300, reloadTimeSeconds: 4 },
};

export const MUNITION_MULTIPLIERS: Record<SiegeMunitionType, { damageMultiplier: number; isFlaming: boolean }> = {
    BATTERING_BOULDER: { damageMultiplier: 1.0, isFlaming: false },
    BURNING_PITCH_CASK: { damageMultiplier: 1.25, isFlaming: true },
    CORROSIVE_ALCHEMICAL_FLASK: { damageMultiplier: 1.50, isFlaming: false },
};

export class SiegeCatapultBombardmentEngine {
    /**
     * Deploys a new siege engine at coordinate location.
     */
    public static deploySiegeEngine(
        operatorPlayerId: string,
        engineType: SiegeEngineType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): ActiveSiegeEngine {
        const data = SIEGE_ENGINE_CATALOG[engineType];
        if (!data) {
            throw new Error(`Unsupported siege engine type: ${String(engineType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            engineId: `siege_${engineType.toLowerCase()}_${uuid}`,
            operatorPlayerId,
            engineType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            currentDurabilityHp: 1500,
            maxDurabilityHp: 1500,
            lastFiredEpochMs: 0,
        };
    }

    /**
     * Calculates distance between siege engine and target fortification.
     */
    public static calculateDistance(
        engineLoc: { x: number; y: number },
        targetLoc: { x: number; y: number }
    ): number {
        const dx = engineLoc.x - targetLoc.x;
        const dy = engineLoc.y - targetLoc.y;
        return Math.hypot(dx, dy);
    }

    /**
     * Fires siege projectile at target castle structure.
     */
    public static fireBombardment(
        engine: ActiveSiegeEngine,
        target: CastleFortification,
        munition: SiegeMunitionType,
        currentEpochMs = Date.now()
    ): { success: boolean; damageDealt: number; remainingTargetHp: number; isBreached: boolean; reason?: string } {
        if (!engine || engine.currentDurabilityHp <= 0) {
            return { success: false, damageDealt: 0, remainingTargetHp: target?.currentHp ?? 0, isBreached: target?.isBreached ?? false, reason: "Siege engine is broken or invalid." };
        }

        if (!target) {
            return { success: false, damageDealt: 0, remainingTargetHp: 0, isBreached: false, reason: "Target fortification is invalid." };
        }

        if (target.isBreached) {
            return { success: false, damageDealt: 0, remainingTargetHp: target.currentHp, isBreached: true, reason: "Target fortification is already breached." };
        }

        const engineData = SIEGE_ENGINE_CATALOG[engine.engineType];
        const munitionData = MUNITION_MULTIPLIERS[munition];
        if (!munitionData) {
            return { success: false, damageDealt: 0, remainingTargetHp: target.currentHp, isBreached: false, reason: `Unknown munition type: ${String(munition)}` };
        }

        // Check reload cooldown
        const elapsed = (currentEpochMs - engine.lastFiredEpochMs) / 1000;
        if (elapsed < engineData.reloadTimeSeconds) {
            return { success: false, damageDealt: 0, remainingTargetHp: target.currentHp, isBreached: false, reason: `Siege engine reloading. Cooldown remaining: ${Math.ceil(engineData.reloadTimeSeconds - elapsed)}s.` };
        }

        // Check range
        const dist = this.calculateDistance(engine.location, target.location);
        if (dist > engineData.maxRangeTiles) {
            return { success: false, damageDealt: 0, remainingTargetHp: target.currentHp, isBreached: false, reason: `Target out of range (${Math.round(dist)} > ${engineData.maxRangeTiles} tiles).` };
        }

        engine.lastFiredEpochMs = currentEpochMs;

        const armor = Number.isFinite(target.armorRating) ? Math.max(0, target.armorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(25, Math.floor(engineData.baseSiegeDamage * munitionData.damageMultiplier * armorMitigation));
        target.currentHp = Math.max(0, target.currentHp - damageDealt);

        if (target.currentHp === 0) {
            target.isBreached = true;
        }

        return {
            success: true,
            damageDealt,
            remainingTargetHp: target.currentHp,
            isBreached: target.isBreached,
        };
    }
}