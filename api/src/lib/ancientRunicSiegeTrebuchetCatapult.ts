import crypto from "node:crypto";

/**
 * Ancient Runic Siege Trebuchet & Heavy Artillery Catapult Engine for OpenAO MMORPG.
 * Simulates siege engines (Iron Catapult, Runic Trebuchet, Celestial Gravity Mortar),
 * siege munitions (Incendiary Pitch Orb, Kinetic Stone Boulder, Void Arc Shatter Sphere),
 * structural demolition multiplier scaling (2.5x to 5.0x), ballistic trajectory range checks,
 * area-of-effect splash damage with target armor calculations, structural collapse triggers, and counterweight tension repairs.
 */

export type SiegeArtilleryType = "IRON_SIEGE_CATAPULT" | "RUNIC_HEAVY_TREBUCHET" | "CELESTIAL_GRAVITY_MORTAR";
export type SiegeMunitionType = "INCENDIARY_PITCH_ORB" | "KINETIC_STONE_BOULDER" | "VOID_ARC_SHATTER_SPHERE";
export type FortificationStructureType = "WOODEN_PALISADE" | "STONE_FORTRESS_GATE" | "OBSIDIAN_CITADEL_WALL";

export interface SiegeArtilleryData {
    artilleryType: SiegeArtilleryType;
    maxDurability: number;
    demolitionMultiplier: number;
    maxRangeTiles: number;
    minRangeTiles: number;
}

export interface SiegeMunitionData {
    munitionType: SiegeMunitionType;
    baseKineticDamage: number;
    splashRadiusTiles: number;
    structureBonusMultiplier: number;
}

export interface FortificationStructureData {
    structureType: FortificationStructureType;
    maxStructuralHealth: number;
    armorReductionPercent: number;
}

export interface ActiveSiegeArtillery {
    artilleryId: string;
    operatorPlayerId: string;
    artilleryType: SiegeArtilleryType;
    location: { x: number; y: number };
    currentDurability: number;
    maxDurability: number;
    isOperational: boolean;
}

export interface FortificationTarget {
    targetId: string;
    structureType: FortificationStructureType;
    location: { x: number; y: number };
    currentHealth: number;
    maxHealth: number;
    isCollapsed: boolean;
}

export interface ArtilleryBombardmentResult {
    strikeId: string;
    impactLocation: { x: number; y: number };
    directDamageDealt: number;
    splashDamageDealt: number; // Aggregate total splash damage inflicted across all affected structures
    splashTargetsAffected: number;
    targetRemainingHealth: number;
    isTargetCollapsed: boolean;
    remainingDurability: number;
    flightDurationSeconds: number;
}

export const ARTILLERY_CATALOG: Record<SiegeArtilleryType, SiegeArtilleryData> = {
    IRON_SIEGE_CATAPULT: { artilleryType: "IRON_SIEGE_CATAPULT", maxDurability: 120, demolitionMultiplier: 2.5, maxRangeTiles: 40, minRangeTiles: 5 },
    RUNIC_HEAVY_TREBUCHET: { artilleryType: "RUNIC_HEAVY_TREBUCHET", maxDurability: 200, demolitionMultiplier: 3.8, maxRangeTiles: 65, minRangeTiles: 10 },
    CELESTIAL_GRAVITY_MORTAR: { artilleryType: "CELESTIAL_GRAVITY_MORTAR", maxDurability: 350, demolitionMultiplier: 5.0, maxRangeTiles: 90, minRangeTiles: 15 },
};

export const MUNITION_CATALOG: Record<SiegeMunitionType, SiegeMunitionData> = {
    INCENDIARY_PITCH_ORB: { munitionType: "INCENDIARY_PITCH_ORB", baseKineticDamage: 150, splashRadiusTiles: 5, structureBonusMultiplier: 1.2 },
    KINETIC_STONE_BOULDER: { munitionType: "KINETIC_STONE_BOULDER", baseKineticDamage: 280, splashRadiusTiles: 3, structureBonusMultiplier: 1.5 },
    VOID_ARC_SHATTER_SPHERE: { munitionType: "VOID_ARC_SHATTER_SPHERE", baseKineticDamage: 450, splashRadiusTiles: 8, structureBonusMultiplier: 2.0 },
};

export const STRUCTURE_CATALOG: Record<FortificationStructureType, FortificationStructureData> = {
    WOODEN_PALISADE: { structureType: "WOODEN_PALISADE", maxStructuralHealth: 1000, armorReductionPercent: 10 },
    STONE_FORTRESS_GATE: { structureType: "STONE_FORTRESS_GATE", maxStructuralHealth: 3500, armorReductionPercent: 25 },
    OBSIDIAN_CITADEL_WALL: { structureType: "OBSIDIAN_CITADEL_WALL", maxStructuralHealth: 8000, armorReductionPercent: 40 },
};

export class AncientRunicSiegeTrebuchetCatapultEngine {
    public static readonly DURABILITY_LOSS_PER_BOMBARDMENT = 12;

    /**
     * Constructs and deploys a heavy siege engine.
     */
    public static deployArtillery(
        operatorPlayerId: string,
        artilleryType: SiegeArtilleryType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): ActiveSiegeArtillery {
        const data = ARTILLERY_CATALOG[artilleryType];
        if (!data) {
            throw new Error(`Unsupported siege artillery type: ${String(artilleryType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            artilleryId: `artillery_${artilleryType.toLowerCase()}_${uuid}`,
            operatorPlayerId,
            artilleryType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isOperational: true,
        };
    }

    /**
     * Bombards a fortification structure with ballistic trajectory and per-structure splash calculations.
     */
    public static bombardStructure(
        artillery: ActiveSiegeArtillery,
        target: FortificationTarget,
        munitionType: SiegeMunitionType,
        nearbyStructures: FortificationTarget[] = [],
        currentEpochMs = Date.now()
    ): { success: boolean; result?: ArtilleryBombardmentResult; reason?: string } {
        if (!artillery || !artillery.isOperational || artillery.currentDurability < this.DURABILITY_LOSS_PER_BOMBARDMENT) {
            return { success: false, reason: "Artillery is disabled or lacks durability." };
        }

        if (!target || target.isCollapsed) {
            return { success: false, reason: "Target structure is already destroyed or invalid." };
        }

        const artilleryData = ARTILLERY_CATALOG[artillery.artilleryType];
        if (!artilleryData) {
            return { success: false, reason: `Unknown artillery type: ${String(artillery.artilleryType)}` };
        }

        const munitionData = MUNITION_CATALOG[munitionType];
        if (!munitionData) {
            return { success: false, reason: `Unknown munition type: ${String(munitionType)}` };
        }

        const distTiles = Math.hypot(target.location.x - artillery.location.x, target.location.y - artillery.location.y);

        if (distTiles < artilleryData.minRangeTiles || distTiles > artilleryData.maxRangeTiles) {
            return {
                success: false,
                reason: `Target out of artillery ballistic range: distance ${distTiles.toFixed(1)} tiles (Min ${artilleryData.minRangeTiles}, Max ${artilleryData.maxRangeTiles}).`,
            };
        }

        // Deduct durability
        artillery.currentDurability -= this.DURABILITY_LOSS_PER_BOMBARDMENT;
        if (artillery.currentDurability <= 0) {
            artillery.currentDurability = Math.max(0, artillery.currentDurability);
            artillery.isOperational = false;
        }

        const structData = STRUCTURE_CATALOG[target.structureType];
        const armorReduction = structData ? (structData.armorReductionPercent / 100) : 0;

        // Calculate direct demolition damage
        const rawDemolitionDmg = munitionData.baseKineticDamage * artilleryData.demolitionMultiplier * munitionData.structureBonusMultiplier;
        const finalDemolitionDmg = Math.max(10, Math.round(rawDemolitionDmg * (1 - armorReduction)));

        target.currentHealth = Math.max(0, target.currentHealth - finalDemolitionDmg);
        if (target.currentHealth === 0) {
            target.isCollapsed = true;
        }

        // Calculate area splash damage on nearby structures within splashRadiusTiles evaluated with each target's own armor
        let splashTargetsCount = 0;
        let totalSplashInflicted = 0;
        const rawSplashDmg = rawDemolitionDmg * 0.40; // 40% raw splash damage

        if (Array.isArray(nearbyStructures)) {
            for (const nearby of nearbyStructures) {
                if (nearby && !nearby.isCollapsed && nearby.targetId !== target.targetId) {
                    const splashDist = Math.hypot(nearby.location.x - target.location.x, nearby.location.y - target.location.y);
                    if (splashDist <= munitionData.splashRadiusTiles) {
                        const nearbyData = STRUCTURE_CATALOG[nearby.structureType];
                        const nearbyArmor = nearbyData ? (nearbyData.armorReductionPercent / 100) : 0;
                        const nearbySplashDmg = Math.max(10, Math.round(rawSplashDmg * (1 - nearbyArmor)));

                        nearby.currentHealth = Math.max(0, nearby.currentHealth - nearbySplashDmg);
                        if (nearby.currentHealth === 0) {
                            nearby.isCollapsed = true;
                        }
                        totalSplashInflicted += nearbySplashDmg;
                        splashTargetsCount++;
                    }
                }
            }
        }

        // Flight time: ~0.15s per tile
        const flightTime = Math.max(1.0, Math.round((distTiles * 0.15) * 10) / 10);
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const bombardmentResult: ArtilleryBombardmentResult = {
            strikeId: `strike_${uuid}`,
            impactLocation: { ...target.location },
            directDamageDealt: finalDemolitionDmg,
            splashDamageDealt: totalSplashInflicted,
            splashTargetsAffected: splashTargetsCount,
            targetRemainingHealth: target.currentHealth,
            isTargetCollapsed: target.isCollapsed,
            remainingDurability: artillery.currentDurability,
            flightDurationSeconds: flightTime,
        };

        return {
            success: true,
            result: bombardmentResult,
        };
    }

    /**
     * Repairs artillery counterweight tension and framework.
     */
    public static repairArtillery(
        artillery: ActiveSiegeArtillery,
        repairAmount = 60
    ): { success: boolean; newDurability: number; isOperational: boolean } {
        if (!artillery) return { success: false, newDurability: 0, isOperational: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 60;
        artillery.currentDurability = Math.min(artillery.maxDurability, artillery.currentDurability + amt);
        artillery.isOperational = artillery.currentDurability > 0;

        return {
            success: true,
            newDurability: artillery.currentDurability,
            isOperational: artillery.isOperational,
        };
    }
}