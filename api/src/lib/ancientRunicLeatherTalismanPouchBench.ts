import crypto from "node:crypto";

/**
 * Ancient Runic Leather Talisman Pouch Bench, Moonstone Clasp & Amulet Satchel Engine for OpenAO MMORPG.
 * Simulates talisman pouch stitching benches and moonstone clasp riveting frames (Oak Talisman Pouch Bench, Runic Ironwood Amulet Rig, Celestial Void Seraphic Talisman Sanctum),
 * raw tanned basilisk hide pouch blanks and polished moonstone clasps (Tanned Basilisk Hide Pouch Blank, Polished Moonstone Clasp, Celestial Void Starlight Talisman Leather),
 * apprentice ward pouches and seraphic talisman haversack recipes (Apprentice Ward Pouch, Shaman Spirit Satchel, Celestial Void Seraphic Bottomless Talisman Haversack),
 * independent warding resonance & spell ward fluidity ratings (scaled across catalog baselines ~14% to 100%), calibrated clamped magic defense warding bonus and clamped curse damage mitigation scaling,
 * upfront leather material deduction on all craft attempts, consistent remainingProvidedLeathers return shapes across all paths, immutable bench cloning for safe rollbacks on both craft and maintain operations, cached static catalog maxima, crypto-secure default gameplay rolls strictly in [0, 1), authoritative catalog power ratio without dead instance fields, and talisman bench maintenance.
 */

export type TalismanBenchType = "OAK_TALISMAN_POUCH_BENCH" | "RUNIC_IRONWOOD_AMULET_RIG" | "CELESTIAL_VOID_SERAPHIC_TALISMAN_SANCTUM";
export type RawLeatherTalismanType = "TANNED_BASILISK_HIDE_POUCH_BLANK" | "POLISHED_MOONSTONE_CLASP" | "CELESTIAL_VOID_STARLIGHT_TALISMAN_LEATHER";
export type TalismanPouchRecipeType = "APPRENTICE_WARD_POUCH" | "SHAMAN_SPIRIT_SATCHEL" | "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_TALISMAN_HAVERSACK";

export interface TalismanBenchData {
    benchType: TalismanBenchType;
    maxDurability: number;
    leathercraftPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    wardingBonusPercent: number;
}

export interface TalismanPouchRecipeData {
    recipeType: TalismanPouchRecipeType;
    requiredLeatherType: RawLeatherTalismanType;
    requiredLeatherCount: number;
    baseMagicDefenseWardingBonusPercent: number;
    baseCurseDamageMitigationPercent: number;
}

export interface ActiveTalismanBench {
    benchId: string;
    leatherworkerPlayerId: string;
    benchType: TalismanBenchType;
    currentDurability: number;
    maxDurability: number;
    isFunctional: boolean;
}

export interface CraftedTalismanPouch {
    pouchId: string;
    recipeType: TalismanPouchRecipeType;
    finalMagicDefenseWardingBonusPercent: number;
    finalCurseDamageMitigationPercent: number;
    wardingResonancePercent: number; // Scaled rating (clamped 0 to 100%, with catalog bench baselines ~14% to 100%)
    consumedLeatherCount: number;
    consumedLeatherType: RawLeatherTalismanType;
    remainingProvidedLeathers: RawLeatherTalismanType[];
    craftedEpochMs: number;
}

export const TALISMAN_BENCH_CATALOG: Record<TalismanBenchType, TalismanBenchData> = {
    OAK_TALISMAN_POUCH_BENCH: { benchType: "OAK_TALISMAN_POUCH_BENCH", maxDurability: 75, leathercraftPower: 25, baseSuccessRatePercent: 85, wardingBonusPercent: 10 },
    RUNIC_IRONWOOD_AMULET_RIG: { benchType: "RUNIC_IRONWOOD_AMULET_RIG", maxDurability: 170, leathercraftPower: 65, baseSuccessRatePercent: 92, wardingBonusPercent: 20 },
    CELESTIAL_VOID_SERAPHIC_TALISMAN_SANCTUM: { benchType: "CELESTIAL_VOID_SERAPHIC_TALISMAN_SANCTUM", maxDurability: 310, leathercraftPower: 120, baseSuccessRatePercent: 99, wardingBonusPercent: 35 },
};

export const TALISMAN_RECIPE_CATALOG: Record<TalismanPouchRecipeType, TalismanPouchRecipeData> = {
    APPRENTICE_WARD_POUCH: { recipeType: "APPRENTICE_WARD_POUCH", requiredLeatherType: "TANNED_BASILISK_HIDE_POUCH_BLANK", requiredLeatherCount: 2, baseMagicDefenseWardingBonusPercent: 20, baseCurseDamageMitigationPercent: 10 },
    SHAMAN_SPIRIT_SATCHEL: { recipeType: "SHAMAN_SPIRIT_SATCHEL", requiredLeatherType: "POLISHED_MOONSTONE_CLASP", requiredLeatherCount: 2, baseMagicDefenseWardingBonusPercent: 45, baseCurseDamageMitigationPercent: 25 },
    CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_TALISMAN_HAVERSACK: { recipeType: "CELESTIAL_VOID_SERAPHIC_BOTTOMLESS_TALISMAN_HAVERSACK", requiredLeatherType: "CELESTIAL_VOID_STARLIGHT_TALISMAN_LEATHER", requiredLeatherCount: 2, baseMagicDefenseWardingBonusPercent: 80, baseCurseDamageMitigationPercent: 60 },
};

export class AncientRunicLeatherTalismanPouchBenchEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(TALISMAN_BENCH_CATALOG).map(b => b.leathercraftPower), 1),
        maxBonus: Math.max(...Object.values(TALISMAN_BENCH_CATALOG).map(b => b.wardingBonusPercent), 1),
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
     * Constructs and initializes a talisman pouch stitching bench or amulet rig.
     */
    public static constructBench(
        leatherworkerPlayerId: string,
        benchType: TalismanBenchType
    ): ActiveTalismanBench {
        const data = TALISMAN_BENCH_CATALOG[benchType];
        if (!data) {
            throw new Error(`Unsupported talisman bench type: ${String(benchType)}`);
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
     * Stitches and rivets basilisk hide blanks and moonstone clasps into warding talisman pouches.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static craftPouch(
        bench: ActiveTalismanBench,
        recipeType: TalismanPouchRecipeType,
        providedLeathers: RawLeatherTalismanType[],
        craftRoll?: number,
        resonanceRoll?: number,
        currentEpochMs = Date.now()
    ): { success: boolean; pouch?: CraftedTalismanPouch; updatedBench?: ActiveTalismanBench; remainingDurability: number; remainingProvidedLeathers: RawLeatherTalismanType[]; reason?: string } {
        const fallbackLeathers = Array.isArray(providedLeathers) ? [...providedLeathers] : [];

        if (!bench || !bench.isFunctional || bench.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedBench: bench ? { ...bench } : undefined,
                remainingDurability: bench?.currentDurability ?? 0,
                remainingProvidedLeathers: fallbackLeathers,
                reason: `Talisman pouch bench is warped or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const benchData = TALISMAN_BENCH_CATALOG[bench.benchType];
        if (!benchData) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown bench model: ${String(bench.benchType)}` };
        }

        const recipe = TALISMAN_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedBench: { ...bench }, remainingDurability: bench.currentDurability, remainingProvidedLeathers: fallbackLeathers, reason: `Unknown talisman recipe: ${String(recipeType)}` };
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
                reason: `Insufficient talisman leather/clasps: requires ${recipe.requiredLeatherCount}x ${recipe.requiredLeatherType}, provided ${matchingCount}.`,
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
                reason: `Clasp fractured: moonstone rivet sheared basilisk hide pocket seam, rolled ${rollPercent.toFixed(1)}, needed <= ${benchData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent warding resonance score dynamically using cached catalog maxima & authoritative catalog values (clamped 0% to 100%, scaling across catalog baselines)
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeResonanceRoll = typeof resonanceRoll === "number" && Number.isFinite(resonanceRoll) ? Math.max(0, Math.min(1, resonanceRoll)) : this.generateSecureRoll();
        const powerRatio = Math.min(1.0, benchData.leathercraftPower / maxPower);
        const bonusPoints = (benchData.wardingBonusPercent / maxBonus) * 20;
        const resonanceScore = Math.max(0, Math.min(100, Math.round(
            (safeResonanceRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((resonanceScore / 100) * 0.4); // 0.8 to 1.2x

        const finalWardingBonus = Math.max(0, Math.min(100, Math.round(recipe.baseMagicDefenseWardingBonusPercent * qualityMultiplier)));
        const finalCurseMitigate = Math.max(0, Math.min(100, Math.round(recipe.baseCurseDamageMitigationPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const pouch: CraftedTalismanPouch = {
            pouchId: `pouch_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalMagicDefenseWardingBonusPercent: finalWardingBonus,
            finalCurseDamageMitigationPercent: finalCurseMitigate,
            wardingResonancePercent: resonanceScore,
            consumedLeatherCount: recipe.requiredLeatherCount,
            consumedLeatherType: recipe.requiredLeatherType,
            remainingProvidedLeathers: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            pouch,
            updatedBench,
            remainingDurability: updatedBench.currentDurability,
            remainingProvidedLeathers: remaining,
        };
    }

    /**
     * Re-aligns moonstone clasp setting vises and maintains talisman pouch bench.
     * Returns an updated clone of `bench` leaving the input instance immutable.
     */
    public static maintainBench(
        bench: ActiveTalismanBench,
        repairAmount = 50
    ): { success: boolean; updatedBench?: ActiveTalismanBench; newDurability: number; isFunctional: boolean } {
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