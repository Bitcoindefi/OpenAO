import crypto from "node:crypto";

/**
 * Ancient Runic Leather Horse Stirrup Pads Bench, Mithril Cleat Tread Rig & Celestial Valkyrie Stirrup Pads Sanctum Engine for OpenAO MMORPG.
 * Simulates equestrian stirrup pads crafting benches and tread cleat tension rigs (Elder Stirrup Pads Bench, Runic Oak Stirrup Pads Rig, Celestial Void Valkyrie Stirrup Pads Sanctum),
 * raw tanned buffalo stirrup pad treads and tempered mithril stirrup cleat inserts (Tanned Buffalo Stirrup Pad Tread, Tempered Mithril Stirrup Cleat Insert, Celestial Void Astral Stirrup Pad Pelt),
 * novice expedition stirrup pads and sovereign aerial stirrup pads recipes (Novice Expedition Stirrup Pads, Warmaster Mithril Reinforced Stirrup Pads, Celestial Void Valkyrie Sovereign Stirrup Pads),
 * independent steed plantar-shock absorption ratings and boot grip adhesion ratings (scaled across catalog baselines ~16% to 100%), calibrated clamped plantar shock absorption bonus and boot grip adhesion scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and horse stirrup pads bench maintenance.
 */

export type StirrupPadsBenchType = "ELDER_STIRRUP_PADS_BENCH" | "RUNIC_OAK_STIRRUP_PADS_RIG" | "CELESTIAL_VOID_VALKYRIE_STIRRUP_PADS_SANCTUM";
export type RawLeatherStirrupPadsType = "TANNED_BUFFALO_STIRRUP_PAD_TREAD" | "TEMPERED_MITHRIL_STIRRUP_CLEAT_INSERT" | "CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT";
export type StirrupPadsRecipeType = "NOVICE_EXPEDITION_STIRRUP_PADS" | "WARMASTER_MITHRIL_REINFORCED_STIRRUP_PADS" | "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_PADS";

export interface StirrupPadsBenchData {
    benchType: StirrupPadsBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    stirrupPadsStabilityBonusPercent: number;
}

export interface StirrupPadsRecipeData {
    recipeType: StirrupPadsRecipeType;
    requiredLeatherType: RawLeatherStirrupPadsType;
    requiredLeatherCount: number;
    basePlantarShockAbsorptionPercent: number;
    baseBootGripAdhesionPercent: number;
}

export interface ActiveStirrupPadsBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: StirrupPadsBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedHorseStirrupPads {
    stirrupPadsId: string;
    recipeType: StirrupPadsRecipeType;
    finalPlantarShockAbsorptionPercent: number;
    finalBootGripAdhesionPercent: number;
    stirrupPadsAnchorStabilityPercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~16% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherStirrupPadsType;
    remainingProvidedLeathers: RawLeatherStirrupPadsType[];
    craftedEpochMs: number;
}

export const STIRRUP_PADS_BENCH_CATALOG: Record<StirrupPadsBenchType, StirrupPadsBenchData> = {
    ELDER_STIRRUP_PADS_BENCH: { benchType: "ELDER_STIRRUP_PADS_BENCH", maxDurability: 95, leathercraftPower: 30, baseSuccessRatePercent: 87, stirrupPadsStabilityBonusPercent: 14 },
    RUNIC_OAK_STIRRUP_PADS_RIG: { benchType: "RUNIC_OAK_STIRRUP_PADS_RIG", maxDurability: 200, leathercraftPower: 72, baseSuccessRatePercent: 94, stirrupPadsStabilityBonusPercent: 24 },
    CELESTIAL_VOID_VALKYRIE_STIRRUP_PADS_SANCTUM: { benchType: "CELESTIAL_VOID_VALKYRIE_STIRRUP_PADS_SANCTUM", maxDurability: 350, leathercraftPower: 130, baseSuccessRatePercent: 99, stirrupPadsStabilityBonusPercent: 40 },
};

export const STIRRUP_PADS_RECIPE_CATALOG: Record<StirrupPadsRecipeType, StirrupPadsRecipeData> = {
    NOVICE_EXPEDITION_STIRRUP_PADS: { recipeType: "NOVICE_EXPEDITION_STIRRUP_PADS", requiredLeatherType: "TANNED_BUFFALO_STIRRUP_PAD_TREAD", requiredLeatherCount: 2, basePlantarShockAbsorptionPercent: 24, baseBootGripAdhesionPercent: 14 },
    WARMASTER_MITHRIL_REINFORCED_STIRRUP_PADS: { recipeType: "WARMASTER_MITHRIL_REINFORCED_STIRRUP_PADS", requiredLeatherType: "TEMPERED_MITHRIL_STIRRUP_CLEAT_INSERT", requiredLeatherCount: 2, basePlantarShockAbsorptionPercent: 50, baseBootGripAdhesionPercent: 30 },
    CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_PADS: { recipeType: "CELESTIAL_VOID_VALKYRIE_SOVEREIGN_STIRRUP_PADS", requiredLeatherType: "CELESTIAL_VOID_ASTRAL_STIRRUP_PAD_PELT", requiredLeatherCount: 2, basePlantarShockAbsorptionPercent: 84, baseBootGripAdhesionPercent: 64 },
};

export class AncientRunicLeatherHorseStirrupPadsBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(STIRRUP_PADS_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(STIRRUP_PADS_BENCH_CATALOG).map(b => b.stirrupPadsStabilityBonusPercent), 1),
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
     * Generates a cryptographically secure random float strictly in [0, 1).
     */
    public static generateSecureRoll(): number {
        if (typeof crypto.randomInt === "function") {
            return crypto.randomInt(0, 1000000) / 1000000;
        }
        return crypto.randomBytes(4).readUInt32LE(0) / 0x100000000;
    }

    /**
     * Constructs and initializes a horse stirrup pads crafting bench or tread cleat tension rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: StirrupPadsBenchType
    ): ActiveStirrupPadsBench {
        const data = STIRRUP_PADS_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported horse stirrup pads bench type: ${String(benchType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            benchId: `bench_${benchType.toLowerCase()}_${uuid}`,
            leatherworkerPlayerId,
            benchType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isFunctional: true,
        };
    }

    /**
     * Stitches and tensions stirrup pad treads and tempered mithril cleat inserts into horse stirrup pads.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftStirrupPads(
        bench: ActiveStirrupPadsBench,
        recipeType: StirrupPadsRecipeType,
        providedLeathers: RawLeatherStirrupPadsType[],
        craftRoll?: number,
        stabilityRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; stirrupPads?: CraftedHorseStirrupPads; updatedBench?: ActiveStirrupPadsBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherStirrupPadsType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Horse stirrup pads bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = STIRRUP_PADS_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = STIRRUP_PADS_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown horse stirrup pads recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedLeathers)) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: [], reason: "Invalid leathers array." };
        }

        // Count matching leather materials
        const matchingCount = providedLeathers.filter(l => l === recipe.requiredLeatherType).length;
        if (matchingCount < recipe.requiredLeatherCount) {
            return {
                success: false,
                updatedBench: { ...bench },
                remainingDurability: bench.currentDurability,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Insufficient stirrup pad treads/cleat inserts: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
            };
        }

        // Create updated bench clone
        const updatedBench = { ...bench };

        // Deduct durability on clone
        updatedBench.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (updatedBench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            updatedBench.currentDurability = Math.max(0, updatedBench.currentDurability);
            updatedBench.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedLeathers];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredLeatherCount; i--) {
            if (remaining[i] === recipe.requiredLeatherType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = typeof craftRoll === "number" && Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : this.generateSecureRoll();
        const rollPercent = safeRoll * 100;

        if (rollPercent > benchData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedBench,
                remainingDurability: updatedBench.currentDurability,
                remainingProvidedLeathers: remaining,
                reason: `Stirrup pad tread misaligned: mithril cleat insert dislodged under tension rig, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent stirrup pads anchor stability score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeStabilityRoll = typeof stabilityRoll === "number" && Number.isFinite(stabilityRoll) ? Math.max(0, Math.min(1, stabilityRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.stirrupPadsStabilityBonusPercent / maxBonus) * 20;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(
            (safeStabilityRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((stabilityScore / 100) * 0.4); // 0.8 to 1.2x

        const finalShockAbsorption = Math.max(0, Math.min(100, Math.round(recipe.basePlantarShockAbsorptionPercent * qualityMultiplier)));
        const finalBootGrip = Math.max(0, Math.min(100, Math.round(recipe.baseBootGripAdhesionPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const stirrupPads: CraftedHorseStirrupPads = {
            stirrupPadsId: `stirruppads_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalPlantarShockAbsorptionPercent: finalShockAbsorption,
            finalBootGripAdhesionPercent: finalBootGrip,
            stirrupPadsAnchorStabilityPercent: stabilityScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            stirrupPads,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Cleans equestrian trail grime and maintains horse stirrup pads bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveStirrupPadsBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveStirrupPadsBench; newDurability: number; isFunctional: boolean } {
        if (!bench) return { success: false, newDurability: 0, isFunctional: false };

        const updatedBench = { ...bench };
        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        updatedBench.currentDurability = Math.min(updatedBench.maxDurability, updatedBench.currentDurability + amt);
        updatedBench.isFunctional = updatedBench.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            updatedBench,
            newDurability: updatedBench.currentDurability,
            isFunctional: updatedBench.isFunctional,
        };
    }
}
