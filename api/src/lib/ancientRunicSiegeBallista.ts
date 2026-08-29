import crypto from "node:crypto";

/**
 * Ancient Runic Siege Ballista, Heavy Kinetic Bolt Piercing & Structural Fortification Demolition Engine for OpenAO MMORPG.
 * Simulates deployable heavy siege ballistas (Ironclad Ballista, Runic Arbalest, Doom Titan Ballista),
 * kinetic bolt munitions (Titan Piercer, Incendiary Flame Bolt, Void Shatter Bolt), minimum/maximum range checks,
 * structural demolition damage multipliers (2.5x against stone fortress walls), and field repair kits.
 */

export type SiegeBallistaType = "IRONCLAD_SIEGE_BALLISTA" | "RUNIC_ARBALEST" | "DOOM_TITAN_BALLISTA";
export type KineticBoltType = "TITAN_PIERCER_BOLT" | "INCENDIARY_FLAME_BOLT" | "VOID_SHATTER_BOLT";
export type SiegeTargetType = "FORTRESS_STONE_WALL" | "CASTLE_REINFORCED_GATE" | "ENEMY_COMBAT_UNIT";

export interface BallistaModelData {
    ballistaType: SiegeBallistaType;
    maxDurabilityHp: number;
    minRangeTiles: number;
    maxRangeTiles: number;
}

export interface BoltMunitionData {
    boltType: KineticBoltType;
    baseKineticDamage: number;
    structureDamageMultiplier: number;
    specialEffect?: string;
}

export interface DeployedSiegeBallista {
    ballistaId: string;
    engineerPlayerId: string;
    ballistaType: SiegeBallistaType;
    location: { x: number; y: number };
    currentDurabilityHp: number;
    maxDurabilityHp: number;
    isDestroyed: boolean;
}

export interface BallistaBombardmentTarget {
    targetId: string;
    targetType: SiegeTargetType;
    location: { x: number; y: number };
    currentHp: number;
    armorRating: number;
    isDestroyed: boolean;
    appliedEffects: string[];
}

export const BALLISTA_CATALOG: Record<SiegeBallistaType, BallistaModelData> = {
    IRONCLAD_SIEGE_BALLISTA: { ballistaType: "IRONCLAD_SIEGE_BALLISTA", maxDurabilityHp: 600, minRangeTiles: 5, maxRangeTiles: 45 },
    RUNIC_ARBALEST: { ballistaType: "RUNIC_ARBALEST", maxDurabilityHp: 450, minRangeTiles: 5, maxRangeTiles: 35 },
    DOOM_TITAN_BALLISTA: { ballistaType: "DOOM_TITAN_BALLISTA", maxDurabilityHp: 1000, minRangeTiles: 8, maxRangeTiles: 60 },
};

export const BOLT_CATALOG: Record<KineticBoltType, BoltMunitionData> = {
    TITAN_PIERCER_BOLT: { boltType: "TITAN_PIERCER_BOLT", baseKineticDamage: 150, structureDamageMultiplier: 2.5 },
    INCENDIARY_FLAME_BOLT: { boltType: "INCENDIARY_FLAME_BOLT", baseKineticDamage: 120, structureDamageMultiplier: 1.5, specialEffect: "BURNING_STRUCTURE" },
    VOID_SHATTER_BOLT: { boltType: "VOID_SHATTER_BOLT", baseKineticDamage: 200, structureDamageMultiplier: 2.0, specialEffect: "ARMOR_PIERCING_50" },
};

export class AncientRunicSiegeBallistaEngine {
    /**
     * Deploys a new siege ballista at specified world coordinates.
     */
    public static deployBallista(
        engineerPlayerId: string,
        ballistaType: SiegeBallistaType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): DeployedSiegeBallista {
        const data = BALLISTA_CATALOG[ballistaType];
        if (!data) {
            throw new Error(`Unsupported ballista type: ${String(ballistaType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            ballistaId: `ballista_${ballistaType.toLowerCase()}_${uuid}`,
            engineerPlayerId,
            ballistaType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            currentDurabilityHp: data.maxDurabilityHp,
            maxDurabilityHp: data.maxDurabilityHp,
            isDestroyed: false,
        };
    }

    /**
     * Fires a heavy kinetic bolt from the ballista toward a target.
     */
    public static fireKineticBolt(
        ballista: DeployedSiegeBallista,
        bolt: KineticBoltType,
        target: BallistaBombardmentTarget
    ): { success: boolean; damageDealt: number; isStructureDemolished: boolean; appliedEffect?: string; remainingTargetHp: number; reason?: string } {
        if (!ballista || ballista.isDestroyed || ballista.currentDurabilityHp <= 0) {
            return { success: false, damageDealt: 0, isStructureDemolished: false, remainingTargetHp: target?.currentHp ?? 0, reason: "Ballista is destroyed or invalid." };
        }

        if (!target || target.isDestroyed || target.currentHp <= 0) {
            return { success: false, damageDealt: 0, isStructureDemolished: false, remainingTargetHp: 0, reason: "Target is already destroyed or invalid." };
        }

        const boltData = BOLT_CATALOG[bolt];
        if (!boltData) {
            return { success: false, damageDealt: 0, isStructureDemolished: false, remainingTargetHp: target.currentHp, reason: `Unknown kinetic bolt: ${String(bolt)}` };
        }

        const ballistaData = BALLISTA_CATALOG[ballista.ballistaType];
        const dist = Math.hypot(ballista.location.x - target.location.x, ballista.location.y - target.location.y);

        if (dist < ballistaData.minRangeTiles || dist > ballistaData.maxRangeTiles) {
            return {
                success: false,
                damageDealt: 0,
                isStructureDemolished: false,
                remainingTargetHp: target.currentHp,
                reason: `Target out of range (${dist.toFixed(1)} tiles). Ballista range is [${ballistaData.minRangeTiles}, ${ballistaData.maxRangeTiles}] tiles.`,
            };
        }

        // Calculate damage
        const isStructure = target.targetType === "FORTRESS_STONE_WALL" || target.targetType === "CASTLE_REINFORCED_GATE";
        let multiplier = isStructure ? boltData.structureDamageMultiplier : 1.0;

        let effectiveArmor = target.armorRating;
        if (boltData.specialEffect === "ARMOR_PIERCING_50") {
            effectiveArmor = Math.round(effectiveArmor * 0.50);
        }

        const rawDmg = boltData.baseKineticDamage * multiplier;
        const mitigatedDmg = Math.max(10, Math.round(rawDmg - effectiveArmor * 0.3));
        const actualDmg = Math.min(target.currentHp, mitigatedDmg);

        target.currentHp -= actualDmg;
        if (target.currentHp === 0) {
            target.isDestroyed = true;
        }

        if (boltData.specialEffect) {
            if (!target.appliedEffects) target.appliedEffects = [];
            if (!target.appliedEffects.includes(boltData.specialEffect)) {
                target.appliedEffects.push(boltData.specialEffect);
            }
        }

        return {
            success: true,
            damageDealt: actualDmg,
            isStructureDemolished: target.isDestroyed && isStructure,
            appliedEffect: boltData.specialEffect,
            remainingTargetHp: target.currentHp,
        };
    }

    /**
     * Repairs ballista durability using a siege repair kit.
     */
    public static repairBallista(
        ballista: DeployedSiegeBallista,
        repairAmount = 150
    ): { success: boolean; newDurability: number; isDestroyed: boolean } {
        if (!ballista || ballista.isDestroyed) return { success: false, newDurability: 0, isDestroyed: true };

        const rep = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 150;
        ballista.currentDurabilityHp = Math.min(ballista.maxDurabilityHp, ballista.currentDurabilityHp + rep);

        return {
            success: true,
            newDurability: ballista.currentDurabilityHp,
            isDestroyed: false,
        };
    }
}