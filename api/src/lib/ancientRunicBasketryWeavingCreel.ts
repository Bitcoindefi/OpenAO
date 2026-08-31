import crypto from "node:crypto";

/**
 * Ancient Runic Basketry Weaving, Reed Creel & Foraging Pannier Engine for OpenAO MMORPG.
 * Simulates weaving frames and reed looms (Willow Weaving Frame, Runic Reed Loom, Celestial Void Loom Sanctum),
 * harvested fiber reeds and osiers (Marsh Willow Osier, Silver River Reed, Celestial Void Silk Rush),
 * woven creel and foraging pannier recipes (Angler Catch Creel, Herbalist Foraging Pannier, Celestial Void Bounty Pack),
 * independent craftsmanship ratings (0% to 100%), harvest slot capacity and clamped bonus gather yield scaling,
 * upfront reed material deduction on all craft attempts, cached static catalog maxima, and weaving frame maintenance.
 */

export type WeavingFrameType = "WILLOW_WEAVING_FRAME" | "RUNIC_REED_LOOM" | "CELESTIAL_VOID_LOOM_SANCTUM";
export type FiberReedType = "MARSH_WILLOW_OSIER" | "SILVER_RIVER_REED" | "CELESTIAL_VOID_SILK_RUSH";
export type WovenContainerRecipeType = "ANGLER_CATCH_CREEL" | "HERBALIST_FORAGING_PANNIER" | "CELESTIAL_VOID_BOUNTY_PACK";

export interface WeavingFrameData {
    frameType: WeavingFrameType;
    maxDurability: number;
    weavingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    harvestCapacityBonusPercent: number;
}

export interface WovenContainerRecipeData {
    recipeType: WovenContainerRecipeType;
    requiredReedType: FiberReedType;
    requiredReedCount: number;
    baseGatherSlots: number;
    baseBonusGatherYieldPercent: number;
}

export interface ActiveWeavingFrame {
    frameId: string;
    weaverPlayerId: string;
    frameType: WeavingFrameType;
    currentDurability: number;
    maxDurability: number;
    weavingPower: number;
    isFunctional: boolean;
}

export interface CraftedWovenContainer {
    containerId: string;
    recipeType: WovenContainerRecipeType;
    finalGatherSlots: number;
    finalBonusGatherYieldPercent: number;
    craftsmanshipPercent: number; // 0 to 100
    consumedReedCount: number;
    consumedReedType: FiberReedType;
    remainingProvidedReeds: FiberReedType[];
    craftedEpochMs: number;
}

export const WEAVING_CATALOG: Record<WeavingFrameType, WeavingFrameData> = {
    WILLOW_WEAVING_FRAME: { frameType: "WILLOW_WEAVING_FRAME", maxDurability: 75, weavingPower: 25, baseSuccessRatePercent: 85, harvestCapacityBonusPercent: 10 },
    RUNIC_REED_LOOM: { frameType: "RUNIC_REED_LOOM", maxDurability: 170, weavingPower: 65, baseSuccessRatePercent: 92, harvestCapacityBonusPercent: 20 },
    CELESTIAL_VOID_LOOM_SANCTUM: { frameType: "CELESTIAL_VOID_LOOM_SANCTUM", maxDurability: 310, weavingPower: 120, baseSuccessRatePercent: 99, harvestCapacityBonusPercent: 35 },
};

export const CONTAINER_RECIPE_CATALOG: Record<WovenContainerRecipeType, WovenContainerRecipeData> = {
    ANGLER_CATCH_CREEL: { recipeType: "ANGLER_CATCH_CREEL", requiredReedType: "MARSH_WILLOW_OSIER", requiredReedCount: 2, baseGatherSlots: 40, baseBonusGatherYieldPercent: 10 },
    HERBALIST_FORAGING_PANNIER: { recipeType: "HERBALIST_FORAGING_PANNIER", requiredReedType: "SILVER_RIVER_REED", requiredReedCount: 2, baseGatherSlots: 100, baseBonusGatherYieldPercent: 25 },
    CELESTIAL_VOID_BOUNTY_PACK: { recipeType: "CELESTIAL_VOID_BOUNTY_PACK", requiredReedType: "CELESTIAL_VOID_SILK_RUSH", requiredReedCount: 2, baseGatherSlots: 250, baseBonusGatherYieldPercent: 60 },
};

export class AncientRunicBasketryWeavingCreelEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(WEAVING_CATALOG).map(w => w.weavingPower), 1),
        maxBonus: Math.max(...Object.values(WEAVING_CATALOG).map(w => w.harvestCapacityBonusPercent), 1),
    };

    /**
     * Generates a crypto-secure UUID or 128-bit hex string using node:crypto.
     */
    private static generateSecureId(): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return crypto.randomBytes(16).toString("hex");
    }

    /**
     * Constructs and initializes a weaving frame or reed loom.
     */
    public static constructFrame(
        weaverPlayerId: string,
        frameType: WeavingFrameType
    ): ActiveWeavingFrame {
        const data = WEAVING_CATALOG[frameType];
        if (!data) {
            throw new Error(`Unsupported weaving frame type: ${String(frameType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            frameId: `frame_${frameType.toLowerCase()}_${uuid}`,
            weaverPlayerId,
            frameType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            weavingPower: data.weavingPower,
            isFunctional: true,
        };
    }

    /**
     * Interlaces fiber reeds into angler creels, foraging panniers, and celestial bounty packs.
     * Note: Mutates the passed `frame` in place and returns it as `updatedFrame` for caller ergonomics.
     */
    public static craftContainer(
        frame: ActiveWeavingFrame,
        recipeType: WovenContainerRecipeType,
        providedReeds: FiberReedType[],
        craftRoll = Math.random(),
        craftsmanshipRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; container?: CraftedWovenContainer; updatedFrame?: ActiveWeavingFrame; remainingDurability: number; remainingProvidedReeds?: FiberReedType[]; reason?: string } {
        if (!frame || !frame.isFunctional || frame.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedFrame: frame,
                remainingDurability: frame?.currentDurability ?? 0,
                reason: `Weaving frame is splintered or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const frameData = WEAVING_CATALOG[frame.frameType];
        if (!frameData) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: `Unknown frame model: ${String(frame.frameType)}` };
        }

        const recipe = CONTAINER_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: `Unknown container recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedReeds)) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: "Invalid reeds array." };
        }

        // Count matching reeds
        const matchingCount = providedReeds.filter(r => r === recipe.requiredReedType).length;
        if (matchingCount < recipe.requiredReedCount) {
            return {
                success: false,
                updatedFrame: frame,
                remainingDurability: frame.currentDurability,
                reason: `Insufficient reeds: requires ${recipe.requiredReedCount}x ${recipe.requiredReedType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        frame.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (frame.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            frame.currentDurability = Math.max(0, frame.currentDurability);
            frame.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedReeds];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredReedCount; i--) {
            if (remaining[i] === recipe.requiredReedType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > frameData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedFrame: frame,
                remainingDurability: frame.currentDurability,
                remainingProvidedReeds: remaining,
                reason: `Woven warp frayed: brittle willow reeds snapped during tight tensioning, rolled ${rollPercent.toFixed(1)}, needed <= ${frameData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent craftsmanship score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeCraftsmanshipRoll = Number.isFinite(craftsmanshipRoll) ? Math.max(0, Math.min(1, craftsmanshipRoll)) : Math.random();
        const powerRatio = Math.min(1.0, frame.weavingPower / maxPower);
        const bonusPoints = (frameData.harvestCapacityBonusPercent / maxBonus) * 20;
        const craftsmanshipScore = Math.max(0, Math.min(100, Math.round(
            (safeCraftsmanshipRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((craftsmanshipScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSlots = Math.round(recipe.baseGatherSlots * qualityMultiplier);
        const finalYield = Math.max(0, Math.min(100, Math.round(recipe.baseBonusGatherYieldPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const container: CraftedWovenContainer = {
            containerId: `container_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalGatherSlots: finalSlots,
            finalBonusGatherYieldPercent: finalYield,
            craftsmanshipPercent: craftsmanshipScore,
            consumedReedCount: recipe.requiredReedCount,
            consumedReedType: recipe.requiredReedType,
            remainingProvidedReeds: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            container,
            updatedFrame: frame,
            remainingDurability: frame.currentDurability,
            remainingProvidedReeds: remaining,
        };
    }

    /**
     * Tightens reed warp cords and maintains weaving frame.
     */
    public static maintainFrame(
        frame: ActiveWeavingFrame,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!frame) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        frame.currentDurability = Math.min(frame.maxDurability, frame.currentDurability + amt);
        frame.isFunctional = frame.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: frame.currentDurability,
            isFunctional: frame.isFunctional,
        };
    }
}