import crypto from "node:crypto";

/**
 * Ancient Runic Cobbler Bootcrafting, Agility Soles & Greaves Engine for OpenAO MMORPG.
 * Simulates cobbler lasts and awl stations (Hardened Birch Cobbler Last, Runic Mithril Awl Station, Celestial Void Cobbler Anvil),
 * cured beast pelts (Silken Swift Fox Pelt, Armored Wyvern Wing Leather, Celestial Phantom Stalker Hide),
 * agility footwear recipes (Swiftstride Windrunner Boots, Shadowdancer Stalker Greaves, Celestial Voidwalker Treads),
 * independent cobbler precision ratings (0% to 100%), movement speed and dodge chance scaling,
 * pelt inventory deduction, cached static catalog maxima, and cobbler tool maintenance.
 */

export type CobblerToolType = "HARDENED_BIRCH_COBBLER_LAST" | "RUNIC_MITHRIL_AWL_STATION" | "CELESTIAL_VOID_COBBLER_ANVIL";
export type CuredBeastPeltType = "SILKEN_SWIFT_FOX_PELT" | "ARMORED_WYVERN_WING_LEATHER" | "CELESTIAL_PHANTOM_STALKER_HIDE";
export type AgilityFootwearRecipeType = "SWIFTSTRIDE_WINDRUNNER_BOOTS" | "SHADOWDANCER_STALKER_GREAVES" | "CELESTIAL_VOIDWALKER_TREADS";

export interface CobblerToolData {
    toolType: CobblerToolType;
    maxDurability: number;
    cobblerPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    agilityBonusPercent: number;
}

export interface AgilityFootwearRecipeData {
    recipeType: AgilityFootwearRecipeType;
    requiredPeltType: CuredBeastPeltType;
    requiredPeltCount: number;
    baseMovementSpeedPercent: number;
    baseDodgeChancePercent: number;
}

export interface ActiveCobblerTool {
    toolId: string;
    cobblerPlayerId: string;
    toolType: CobblerToolType;
    currentDurability: number;
    maxDurability: number;
    cobblerPower: number;
    isFunctional: boolean;
}

export interface CraftedAgilityFootwear {
    footwearId: string;
    recipeType: AgilityFootwearRecipeType;
    finalMovementSpeedPercent: number;
    finalDodgeChancePercent: number;
    craftingPrecisionPercent: number; // 0 to 100
    consumedPeltCount: number;
    consumedPeltType: CuredBeastPeltType;
    remainingProvidedPelts: CuredBeastPeltType[];
    craftedEpochMs: number;
}

export const COBBLER_TOOL_CATALOG: Record<CobblerToolType, CobblerToolData> = {
    HARDENED_BIRCH_COBBLER_LAST: { toolType: "HARDENED_BIRCH_COBBLER_LAST", maxDurability: 75, cobblerPower: 25, baseSuccessRatePercent: 85, agilityBonusPercent: 10 },
    RUNIC_MITHRIL_AWL_STATION: { toolType: "RUNIC_MITHRIL_AWL_STATION", maxDurability: 170, cobblerPower: 65, baseSuccessRatePercent: 92, agilityBonusPercent: 20 },
    CELESTIAL_VOID_COBBLER_ANVIL: { toolType: "CELESTIAL_VOID_COBBLER_ANVIL", maxDurability: 310, cobblerPower: 120, baseSuccessRatePercent: 99, agilityBonusPercent: 35 },
};

export const FOOTWEAR_RECIPE_CATALOG: Record<AgilityFootwearRecipeType, AgilityFootwearRecipeData> = {
    SWIFTSTRIDE_WINDRUNNER_BOOTS: { recipeType: "SWIFTSTRIDE_WINDRUNNER_BOOTS", requiredPeltType: "SILKEN_SWIFT_FOX_PELT", requiredPeltCount: 2, baseMovementSpeedPercent: 20, baseDodgeChancePercent: 5 },
    SHADOWDANCER_STALKER_GREAVES: { recipeType: "SHADOWDANCER_STALKER_GREAVES", requiredPeltType: "ARMORED_WYVERN_WING_LEATHER", requiredPeltCount: 2, baseMovementSpeedPercent: 40, baseDodgeChancePercent: 12 },
    CELESTIAL_VOIDWALKER_TREADS: { recipeType: "CELESTIAL_VOIDWALKER_TREADS", requiredPeltType: "CELESTIAL_PHANTOM_STALKER_HIDE", requiredPeltCount: 2, baseMovementSpeedPercent: 80, baseDodgeChancePercent: 25 },
};

export class AncientRunicLeatherCobblerBootsEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(COBBLER_TOOL_CATALOG).map(c => c.cobblerPower), 1),
        maxBonus: Math.max(...Object.values(COBBLER_TOOL_CATALOG).map(c => c.agilityBonusPercent), 1),
    };

    /**
     * Constructs and initializes a cobbler last or awl station.
     */
    public static forgeTool(
        cobblerPlayerId: string,
        toolType: CobblerToolType,
        currentEpochMs = Date.now()
    ): ActiveCobblerTool {
        const data = COBBLER_TOOL_CATALOG[toolType];
        if (!data) {
            throw new Error(`Unsupported cobbler tool type: ${String(toolType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            toolId: `cobbler_${toolType.toLowerCase()}_${uuid}`,
            cobblerPlayerId,
            toolType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            cobblerPower: data.cobblerPower,
            isFunctional: true,
        };
    }

    /**
     * Shapes cured pelts into agility boots, stalker greaves, and voidwalker treads.
     */
    public static craftFootwear(
        tool: ActiveCobblerTool,
        recipeType: AgilityFootwearRecipeType,
        providedPelts: CuredBeastPeltType[],
        craftRoll = Math.random(),
        precisionRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; footwear?: CraftedAgilityFootwear; remainingDurability: number; reason?: string } {
        if (!tool || !tool.isFunctional || tool.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                remainingDurability: tool?.currentDurability ?? 0,
                reason: `Cobbler tool is blunted or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const toolData = COBBLER_TOOL_CATALOG[tool.toolType];
        if (!toolData) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown tool model: ${String(tool.toolType)}` };
        }

        const recipe = FOOTWEAR_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, remainingDurability: tool.currentDurability, reason: `Unknown footwear recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedPelts)) {
            return { success: false, remainingDurability: tool.currentDurability, reason: "Invalid pelts array." };
        }

        // Count matching pelts
        const matchingCount = providedPelts.filter(p => p === recipe.requiredPeltType).length;
        if (matchingCount < recipe.requiredPeltCount) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Insufficient pelts: requires ${recipe.requiredPeltCount}x ${recipe.requiredPeltType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability
        tool.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (tool.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            tool.currentDurability = Math.max(0, tool.currentDurability);
            tool.isFunctional = false;
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > toolData.baseSuccessRatePercent) {
            return {
                success: false,
                remainingDurability: tool.currentDurability,
                reason: `Sole stitching tore: awl pierced uneven leather grain, rolled ${rollPercent.toFixed(1)}, needed <= ${toolData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent precision score (0% to 100%) dynamically using cached catalog maxima
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safePrecisionRoll = Number.isFinite(precisionRoll) ? Math.max(0, Math.min(1, precisionRoll)) : Math.random();
        const powerRatio = Math.min(1.0, tool.cobblerPower / maxPower);
        const bonusPoints = (toolData.agilityBonusPercent / maxBonus) * 20;
        const precisionScore = Math.max(0, Math.min(100, Math.round(
            (safePrecisionRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((precisionScore / 100) * 0.4); // 0.8 to 1.2x

        const finalSpeed = Math.round(recipe.baseMovementSpeedPercent * qualityMultiplier);
        const finalDodge = Math.round(recipe.baseDodgeChancePercent * qualityMultiplier);

        // Splice consumed pelts out of cloned array
        const remaining = [...providedPelts];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredPeltCount; i--) {
            if (remaining[i] === recipe.requiredPeltType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const footwear: CraftedAgilityFootwear = {
            footwearId: `boot_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMovementSpeedPercent: finalSpeed,
            finalDodgeChancePercent: finalDodge,
            craftingPrecisionPercent: precisionScore,
            consumedPeltCount: recipe.requiredPeltCount,
            consumedPeltType: recipe.requiredPeltType,
            remainingProvidedPelts: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            footwear,
            remainingDurability: tool.currentDurability,
        };
    }

    /**
     * Hones awl needle and repairs cobbler last.
     */
    public static maintainTool(
        tool: ActiveCobblerTool,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!tool) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        tool.currentDurability = Math.min(tool.maxDurability, tool.currentDurability + amt);
        tool.isFunctional = tool.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: tool.currentDurability,
            isFunctional: tool.isFunctional,
        };
    }
}