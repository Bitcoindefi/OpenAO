/**
 * Ancient Runic Golem Workshop, Core Infusion & Guardian Patrol Engine for OpenAO MMORPG.
 * Simulates assembling golem chassis materials, infusing elemental cores,
 * patrolling designated territory radii, computing defensive guardian damage, and self-repairs.
 */

export type GolemChassisMaterial = "GRANITE" | "OBSIDIAN" | "MITHRIL" | "AETHER_CRYSTAL";
export type ElementalCoreType = "FIRE_CORE" | "LIGHTNING_CORE" | "VOID_CORE" | "EARTH_CORE";

export interface GolemChassisData {
    material: GolemChassisMaterial;
    baseHp: number;
    baseArmor: number;
    baseSlamDamage: number;
}

export interface ElementalCoreData {
    coreType: ElementalCoreType;
    bonusDamage: number;
    bonusHp: number;
    repairRatePerSecond: number;
}

export interface ConstructedRunicGolem {
    golemId: string;
    ownerPlayerId: string;
    material: GolemChassisMaterial;
    coreType: ElementalCoreType;
    currentHp: number;
    maxHp: number;
    armorRating: number;
    patrolAnchorLocation: { x: number; y: number };
    patrolRadiusTiles: number;
    lastSelfRepairEpochMs: number;
    isDestroyed: boolean;
}

export const GOLEM_CHASSIS_CATALOG: Record<GolemChassisMaterial, GolemChassisData> = {
    GRANITE: { material: "GRANITE", baseHp: 1500, baseArmor: 20, baseSlamDamage: 120 },
    OBSIDIAN: { material: "OBSIDIAN", baseHp: 3000, baseArmor: 45, baseSlamDamage: 220 },
    MITHRIL: { material: "MITHRIL", baseHp: 4500, baseArmor: 60, baseSlamDamage: 320 },
    AETHER_CRYSTAL: { material: "AETHER_CRYSTAL", baseHp: 6000, baseArmor: 75, baseSlamDamage: 450 },
};

export const ELEMENTAL_CORE_CATALOG: Record<ElementalCoreType, ElementalCoreData> = {
    FIRE_CORE: { coreType: "FIRE_CORE", bonusDamage: 50, bonusHp: 0, repairRatePerSecond: 5 },
    LIGHTNING_CORE: { coreType: "LIGHTNING_CORE", bonusDamage: 60, bonusHp: 0, repairRatePerSecond: 4 },
    VOID_CORE: { coreType: "VOID_CORE", bonusDamage: 80, bonusHp: 0, repairRatePerSecond: 2 },
    EARTH_CORE: { coreType: "EARTH_CORE", bonusDamage: 20, bonusHp: 500, repairRatePerSecond: 10 },
};

export class RunicGolemCraftingEngine {
    /**
     * Constructs and awakens a new runic golem guardian.
     */
    public static constructGolem(
        ownerPlayerId: string,
        material: GolemChassisMaterial,
        coreType: ElementalCoreType,
        anchorX = 0,
        anchorY = 0,
        patrolRadiusTiles = 30,
        currentEpochMs = Date.now()
    ): ConstructedRunicGolem {
        const chassis = GOLEM_CHASSIS_CATALOG[material];
        if (!chassis) {
            throw new Error(`Unsupported chassis material: ${String(material)}`);
        }

        const core = ELEMENTAL_CORE_CATALOG[coreType];
        if (!core) {
            throw new Error(`Unsupported elemental core: ${String(coreType)}`);
        }

        const totalMaxHp = chassis.baseHp + core.bonusHp;
        const radius = Number.isFinite(patrolRadiusTiles) ? Math.max(5, Math.min(100, patrolRadiusTiles)) : 30;

        return {
            golemId: `golem_${material.toLowerCase()}_${currentEpochMs}_${Math.random().toString(36).substring(2, 7)}`,
            ownerPlayerId,
            material,
            coreType,
            currentHp: totalMaxHp,
            maxHp: totalMaxHp,
            armorRating: chassis.baseArmor,
            patrolAnchorLocation: {
                x: Number.isFinite(anchorX) ? anchorX : 0,
                y: Number.isFinite(anchorY) ? anchorY : 0,
            },
            patrolRadiusTiles: radius,
            lastSelfRepairEpochMs: currentEpochMs,
            isDestroyed: false,
        };
    }

    /**
     * Verifies if a coordinate falls within the golem's patrol territory.
     */
    public static isTargetInPatrolZone(
        golem: ConstructedRunicGolem,
        targetX: number,
        targetY: number
    ): boolean {
        if (!golem || golem.isDestroyed) return false;

        const tx = Number.isFinite(targetX) ? targetX : 0;
        const ty = Number.isFinite(targetY) ? targetY : 0;

        const dx = golem.patrolAnchorLocation.x - tx;
        const dy = golem.patrolAnchorLocation.y - ty;
        const distance = Math.hypot(dx, dy);

        return distance <= golem.patrolRadiusTiles;
    }

    /**
     * Executes guardian slam attack on an intruder, checking patrol range.
     */
    public static guardianSlamAttack(
        golem: ConstructedRunicGolem,
        targetX: number,
        targetY: number,
        targetArmor = 0
    ): { success: boolean; damageDealt: number; inPatrolZone: boolean; reason?: string } {
        if (!golem || golem.isDestroyed) {
            return { success: false, damageDealt: 0, inPatrolZone: false, reason: "Golem is destroyed or invalid." };
        }

        const inZone = this.isTargetInPatrolZone(golem, targetX, targetY);
        if (!inZone) {
            return { success: false, damageDealt: 0, inPatrolZone: false, reason: "Target is outside golem patrol perimeter." };
        }

        const chassis = GOLEM_CHASSIS_CATALOG[golem.material];
        const core = ELEMENTAL_CORE_CATALOG[golem.coreType];

        const rawDamage = chassis.baseSlamDamage + core.bonusDamage;
        const armor = Number.isFinite(targetArmor) ? Math.max(0, targetArmor) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(15, Math.floor(rawDamage * armorMitigation));

        return {
            success: true,
            damageDealt,
            inPatrolZone: true,
        };
    }

    /**
     * Self-repairs the golem based on elapsed time, accurately carrying fractional seconds across ticks.
     */
    public static performSelfRepair(
        golem: ConstructedRunicGolem,
        currentEpochMs = Date.now()
    ): { repairedHp: number; currentHp: number } {
        if (!golem || golem.isDestroyed || golem.currentHp >= golem.maxHp) {
            return { repairedHp: 0, currentHp: golem?.currentHp ?? 0 };
        }

        const core = ELEMENTAL_CORE_CATALOG[golem.coreType];
        const elapsedSeconds = Math.max(0, (currentEpochMs - golem.lastSelfRepairEpochMs) / 1000);

        const maxRepair = Math.floor(elapsedSeconds * core.repairRatePerSecond);
        const missingHp = golem.maxHp - golem.currentHp;
        const actualRepair = Math.min(missingHp, maxRepair);

        if (actualRepair > 0) {
            const secondsConsumed = actualRepair / core.repairRatePerSecond;
            golem.lastSelfRepairEpochMs += Math.round(secondsConsumed * 1000);
            golem.currentHp += actualRepair;
        }

        return {
            repairedHp: actualRepair,
            currentHp: golem.currentHp,
        };
    }
}