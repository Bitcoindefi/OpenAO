import crypto from "node:crypto";

/**
 * Ancient Runic Pelt Stretching Frame, Rawhide Tensioner & Fur Glossing Engine for OpenAO MMORPG.
 * Simulates wooden pelt stretchers and steel stretching frames (Ashwood Pelt Stretcher, Runic Steel Stretching Frame, Celestial Void Glossing Sanctum),
 * raw beast furs and winter pelts (Tundra Wolf Pelt, Shadow Panther Pelt, Celestial Void Behemoth Fur),
 * glossy fur mantle and stealth lining recipes (Winterguard Warmth Mantle, Shadowstalker Stealth Lining, Celestial Void Sovereign Cape),
 * independent thermal insulation ratings (0% to 100%), clamped cold resistance and clamped stealth concealment scaling,
 * upfront pelt material deduction on all craft attempts, cached static catalog maxima, authoritative catalog power ratio, and stretching frame maintenance.
 */

export type StretchingFrameType = "ASHWOOD_PELT_STRETCHER" | "RUNIC_STEEL_STRETCHING_FRAME" | "CELESTIAL_VOID_GLOSSING_SANCTUM";
export type RawFurPeltType = "TUNDRA_WOLF_PELT" | "SHADOW_PANTHER_PELT" | "CELESTIAL_VOID_BEHEMOTH_FUR";
export type GlossedFurRecipeType = "WINTERGUARD_WARMTH_MANTLE" | "SHADOWSTALKER_STEALTH_LINING" | "CELESTIAL_VOID_SOVEREIGN_CAPE";

export interface StretchingFrameData {
    frameType: StretchingFrameType;
    maxDurability: number;
    stretchingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    glossingBonusPercent: number;
}

export interface GlossedFurRecipeData {
    recipeType: GlossedFurRecipeType;
    requiredPeltType: RawFurPeltType;
    requiredPeltCount: number;
    baseColdResistancePercent: number;
    baseStealthConcealmentPercent: number;
}

export interface ActiveStretchingFrame {
    frameId: string;
    furrierPlayerId: string;
    frameType: StretchingFrameType;
    currentDurability: number;
    maxDurability: number;
    stretchingPower: number;
    isFunctional: boolean;
}

export interface CraftedGlossedFur {
    furId: string;
    recipeType: GlossedFurRecipeType;
    finalColdResistancePercent: number;
    finalStealthConcealmentPercent: number;
    glossingRatingPercent: number; // 0 to 100
    consumedPeltCount: number;
    consumedPeltType: RawFurPeltType;
    remainingProvidedPelts: RawFurPeltType[];
    craftedEpochMs: number;
}

export const STRETCHER_CATALOG: Record<StretchingFrameType, StretchingFrameData> = {
    ASHWOOD_PELT_STRETCHER: { frameType: "ASHWOOD_PELT_STRETCHER", maxDurability: 75, stretchingPower: 25, baseSuccessRatePercent: 85, glossingBonusPercent: 10 },
    RUNIC_STEEL_STRETCHING_FRAME: { frameType: "RUNIC_STEEL_STRETCHING_FRAME", maxDurability: 170, stretchingPower: 65, baseSuccessRatePercent: 92, glossingBonusPercent: 20 },
    CELESTIAL_VOID_GLOSSING_SANCTUM: { frameType: "CELESTIAL_VOID_GLOSSING_SANCTUM", maxDurability: 310, stretchingPower: 120, baseSuccessRatePercent: 99, glossingBonusPercent: 35 },
};

export const GLOSSED_RECIPE_CATALOG: Record<GlossedFurRecipeType, GlossedFurRecipeData> = {
    WINTERGUARD_WARMTH_MANTLE: { recipeType: "WINTERGUARD_WARMTH_MANTLE", requiredPeltType: "TUNDRA_WOLF_PELT", requiredPeltCount: 2, baseColdResistancePercent: 20, baseStealthConcealmentPercent: 10 },
    SHADOWSTALKER_STEALTH_LINING: { recipeType: "SHADOWSTALKER_STEALTH_LINING", requiredPeltType: "SHADOW_PANTHER_PELT", requiredPeltCount: 2, baseColdResistancePercent: 45, baseStealthConcealmentPercent: 25 },
    CELESTIAL_VOID_SOVEREIGN_CAPE: { recipeType: "CELESTIAL_VOID_SOVEREIGN_CAPE", requiredPeltType: "CELESTIAL_VOID_BEHEMOTH_FUR", requiredPeltCount: 2, baseColdResistancePercent: 85, baseStealthConcealmentPercent: 60 },
};

export class AncientRunicLeatherPeltStretchingFrameEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STRETCHER_CATALOG).map(s => s.stretchingPower), 1),
        maxBonus: Math.max(...Object.values(STRETCHER_CATALOG).map(s => s.glossingBonusPercent), 1),
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
     * Constructs and initializes a pelt stretching frame or glossing sanctum.
     */
    public static constructFrame(
        furrierPlayerId: string,
        frameType: StretchingFrameType
    ): ActiveStretchingFrame {
        const data = STRETCHER_CATALOG[frameType];
        if (!data) {
            throw new Error(`Unsupported stretching frame type: ${String(frameType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            frameId: `frame_${frameType.toLowerCase()}_${uuid}`,
            furrierPlayerId,
            frameType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            stretchingPower: data.stretchingPower,
            isFunctional: true,
        };
    }

    /**
     * Stretches and glosses raw beast pelts into winterguard mantles, stealth linings, and sovereign capes.
     * Note: Mutates the passed `frame` in place and returns it as `updatedFrame` for caller ergonomics.
     */
    public static stretchPelt(
        frame: ActiveStretchingFrame,
        recipeType: GlossedFurRecipeType,
        providedPelts: RawFurPeltType[],
        craftRoll = Math.random(),
        glossingRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; fur?: CraftedGlossedFur; updatedFrame?: ActiveStretchingFrame; remainingDurability: number; remainingProvidedPelts?: RawFurPeltType[]; reason?: string } {
        if (!frame || !frame.isFunctional || frame.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedFrame: frame,
                remainingDurability: frame?.currentDurability ?? 0,
                reason: `Stretching frame is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const frameData = STRETCHER_CATALOG[frame.frameType];
        if (!frameData) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: `Unknown frame model: ${String(frame.frameType)}` };
        }

        const recipe = GLOSSED_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: `Unknown fur recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedPelts)) {
            return { success: false, updatedFrame: frame, remainingDurability: frame.currentDurability, reason: "Invalid pelts array." };
        }

        // Count matching pelts
        const matchingCount = providedPelts.filter(p => p === recipe.requiredPeltType).length;
        if (matchingCount < recipe.requiredPeltCount) {
            return {
                success: false,
                updatedFrame: frame,
                remainingDurability: frame.currentDurability,
                reason: `Insufficient pelt: requires ${recipe.requiredPeltCount}x ${recipe.requiredPeltType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        frame.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (frame.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            frame.currentDurability = Math.max(0, frame.currentDurability);
            frame.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedPelts];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredPeltCount; i--) {
            if (remaining[i] === recipe.requiredPeltType) {
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
                remainingProvidedPelts: remaining,
                reason: `Pelt overstretched: excessive tension tore grain along spine seam, rolled ${rollPercent.toFixed(1)}, needed <= ${frameData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent glossing score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeGlossingRoll = Number.isFinite(glossingRoll) ? Math.max(0, Math.min(1, glossingRoll)) : Math.random();
        const powerRatio = Math.min(1.0, frameData.stretchingPower / maxPower);
        const bonusPoints = (frameData.glossingBonusPercent / maxBonus) * 20;
        const glossingScore = Math.max(0, Math.min(100, Math.round(
            (safeGlossingRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((glossingScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCold = Math.max(0, Math.min(100, Math.round(recipe.baseColdResistancePercent * qualityMultiplier)));
        const finalStealth = Math.max(0, Math.min(100, Math.round(recipe.baseStealthConcealmentPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const fur: CraftedGlossedFur = {
            furId: `fur_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalColdResistancePercent: finalCold,
            finalStealthConcealmentPercent: finalStealth,
            glossingRatingPercent: glossingScore,
            consumedPeltCount: recipe.requiredPeltCount,
            consumedPeltType: recipe.requiredPeltType,
            remainingProvidedPelts: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            fur,
            updatedFrame: frame,
            remainingDurability: frame.currentDurability,
            remainingProvidedPelts: remaining,
        };
    }

    /**
     * Re-pegs frame tensioning dowels and maintains stretching frame.
     */
    public static maintainFrame(
        frame: ActiveStretchingFrame,
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