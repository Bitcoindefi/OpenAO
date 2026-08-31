import crypto from "node:crypto";

/**
 * Ancient Runic Tannery Steeping Vat, Bark Extraction & Acid Tanning Engine for OpenAO MMORPG.
 * Simulates tanning steeping vats and paddle tanks (Oak Bark Steeping Vat, Runic Copper Paddle Tank, Celestial Void Acid Vat Sanctum),
 * extracted vegetable tannins and mordants (Hemlock Tannin Bark, Vitriol Mordant Solution, Celestial Void Alchemical Acid),
 * treated waterproof leather recipes (Waterproof Stalker Leather, Vitriol Hardened Cuirass Leather, Celestial Void Acid-Proof Hide),
 * independent chemical bonding ratings (0% to 100%), clamped corrosion resistance and clamped magic barrier scaling,
 * upfront tannin material deduction on all craft attempts, cached static catalog maxima, authoritative catalog power ratio, and steeping vat maintenance.
 */

export type SteepingVatType = "OAK_BARK_STEEPING_VAT" | "RUNIC_COPPER_PADDLE_TANK" | "CELESTIAL_VOID_ACID_VAT_SANCTUM";
export type TanninBarkType = "HEMLOCK_TANNIN_BARK" | "VITRIOL_MORDANT_SOLUTION" | "CELESTIAL_VOID_ALCHEMICAL_ACID";
export type TreatedLeatherRecipeType = "WATERPROOF_STALKER_LEATHER" | "VITRIOL_HARDENED_CUIRASS_LEATHER" | "CELESTIAL_VOID_ACID_PROOF_HIDE";

export interface SteepingVatData {
    vatType: SteepingVatType;
    maxDurability: number;
    steepingPower: number;
    baseSuccessRatePercent: number; // 0 to 100
    chemicalBondBonusPercent: number;
}

export interface TreatedLeatherRecipeData {
    recipeType: TreatedLeatherRecipeType;
    requiredTanninType: TanninBarkType;
    requiredTanninCount: number;
    baseCorrosionResistancePercent: number;
    baseMagicBarrierPercent: number;
}

export interface ActiveSteepingVat {
    vatId: string;
    tannerPlayerId: string;
    vatType: SteepingVatType;
    currentDurability: number;
    maxDurability: number;
    steepingPower: number;
    isFunctional: boolean;
}

export interface CraftedTreatedLeather {
    leatherId: string;
    recipeType: TreatedLeatherRecipeType;
    finalCorrosionResistancePercent: number;
    finalMagicBarrierPercent: number;
    chemicalBondRatingPercent: number; // 0 to 100
    consumedTanninCount: number;
    consumedTanninType: TanninBarkType;
    remainingProvidedTannins: TanninBarkType[];
    craftedEpochMs: number;
}

export const VAT_CATALOG: Record<SteepingVatType, SteepingVatData> = {
    OAK_BARK_STEEPING_VAT: { vatType: "OAK_BARK_STEEPING_VAT", maxDurability: 75, steepingPower: 25, baseSuccessRatePercent: 85, chemicalBondBonusPercent: 10 },
    RUNIC_COPPER_PADDLE_TANK: { vatType: "RUNIC_COPPER_PADDLE_TANK", maxDurability: 170, steepingPower: 65, baseSuccessRatePercent: 92, chemicalBondBonusPercent: 20 },
    CELESTIAL_VOID_ACID_VAT_SANCTUM: { vatType: "CELESTIAL_VOID_ACID_VAT_SANCTUM", maxDurability: 310, steepingPower: 120, baseSuccessRatePercent: 99, chemicalBondBonusPercent: 35 },
};

export const TREATED_RECIPE_CATALOG: Record<TreatedLeatherRecipeType, TreatedLeatherRecipeData> = {
    WATERPROOF_STALKER_LEATHER: { recipeType: "WATERPROOF_STALKER_LEATHER", requiredTanninType: "HEMLOCK_TANNIN_BARK", requiredTanninCount: 2, baseCorrosionResistancePercent: 15, baseMagicBarrierPercent: 8 },
    VITRIOL_HARDENED_CUIRASS_LEATHER: { recipeType: "VITRIOL_HARDENED_CUIRASS_LEATHER", requiredTanninType: "VITRIOL_MORDANT_SOLUTION", requiredTanninCount: 2, baseCorrosionResistancePercent: 35, baseMagicBarrierPercent: 22 },
    CELESTIAL_VOID_ACID_PROOF_HIDE: { recipeType: "CELESTIAL_VOID_ACID_PROOF_HIDE", requiredTanninType: "CELESTIAL_VOID_ALCHEMICAL_ACID", requiredTanninCount: 2, baseCorrosionResistancePercent: 80, baseMagicBarrierPercent: 55 },
};

export class AncientRunicLeatherTanneryVatEngine {
    public static readonly DURABILITY_COST_PER_CRAFT = 10;

    /**
     * Cached static catalog maxima to prevent runtime array reallocation.
     */
    public static readonly CATALOG_MAXIMA = {
        maxPower: Math.max(...Object.values(VAT_CATALOG).map(v => v.steepingPower), 1),
        maxBonus: Math.max(...Object.values(VAT_CATALOG).map(v => v.chemicalBondBonusPercent), 1),
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
     * Constructs and initializes a steeping vat or acid paddle tank.
     */
    public static constructVat(
        tannerPlayerId: string,
        vatType: SteepingVatType
    ): ActiveSteepingVat {
        const data = VAT_CATALOG[vatType];
        if (!data) {
            throw new Error(`Unsupported steeping vat type: ${String(vatType)}`);
        }

        const uuid = this.generateSecureId();

        return {
            vatId: `vat_${vatType.toLowerCase()}_${uuid}`,
            tannerPlayerId,
            vatType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            steepingPower: data.steepingPower,
            isFunctional: true,
        };
    }

    /**
     * Steeps raw hides in tannin liquors and mordants into acid-proof treated leather.
     * Note: Mutates the passed `vat` in place and returns it as `updatedVat` for caller ergonomics.
     */
    public static steepLeather(
        vat: ActiveSteepingVat,
        recipeType: TreatedLeatherRecipeType,
        providedTannins: TanninBarkType[],
        craftRoll = Math.random(),
        bondRoll = Math.random(),
        currentEpochMs = Date.now()
    ): { success: boolean; leather?: CraftedTreatedLeather; updatedVat?: ActiveSteepingVat; remainingDurability: number; remainingProvidedTannins?: TanninBarkType[]; reason?: string } {
        if (!vat || !vat.isFunctional || vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat?.currentDurability ?? 0,
                reason: `Steeping vat is corroded or lacks durability (requires ${this.DURABILITY_COST_PER_CRAFT}).`,
            };
        }

        const vatData = VAT_CATALOG[vat.vatType];
        if (!vatData) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, reason: `Unknown vat model: ${String(vat.vatType)}` };
        }

        const recipe = TREATED_RECIPE_CATALOG[recipeType];
        if (!recipe) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, reason: `Unknown treated leather recipe: ${String(recipeType)}` };
        }

        if (!Array.isArray(providedTannins)) {
            return { success: false, updatedVat: vat, remainingDurability: vat.currentDurability, reason: "Invalid tannins array." };
        }

        // Count matching tannins
        const matchingCount = providedTannins.filter(t => t === recipe.requiredTanninType).length;
        if (matchingCount < recipe.requiredTanninCount) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat.currentDurability,
                reason: `Insufficient tannin/mordant: requires ${recipe.requiredTanninCount}x ${recipe.requiredTanninType}, provided ${matchingCount}.`,
            };
        }

        // Deduct durability in place
        vat.currentDurability -= this.DURABILITY_COST_PER_CRAFT;
        if (vat.currentDurability < this.DURABILITY_COST_PER_CRAFT) {
            vat.currentDurability = Math.max(0, vat.currentDurability);
            vat.isFunctional = false;
        }

        // Deduct materials upfront on all craft attempts
        const remaining = [...providedTannins];
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < recipe.requiredTanninCount; i--) {
            if (remaining[i] === recipe.requiredTanninType) {
                remaining.splice(i, 1);
                removed++;
            }
        }

        const safeRoll = Number.isFinite(craftRoll) ? Math.max(0, Math.min(1, craftRoll)) : Math.random();
        const rollPercent = safeRoll * 100;

        if (rollPercent > vatData.baseSuccessRatePercent) {
            return {
                success: false,
                updatedVat: vat,
                remainingDurability: vat.currentDurability,
                remainingProvidedTannins: remaining,
                reason: `Acid bath over-fermented: tannin liquor over-acidified and damaged grain layer, rolled ${rollPercent.toFixed(1)}, needed <= ${vatData.baseSuccessRatePercent}.`,
            };
        }

        // Calculate independent chemical bond score (0% to 100%) dynamically using cached catalog maxima & authoritative catalog values
        const { maxPower, maxBonus } = this.CATALOG_MAXIMA;
        const safeBondRoll = Number.isFinite(bondRoll) ? Math.max(0, Math.min(1, bondRoll)) : Math.random();
        const powerRatio = Math.min(1.0, vatData.steepingPower / maxPower);
        const bonusPoints = (vatData.chemicalBondBonusPercent / maxBonus) * 20;
        const bondScore = Math.max(0, Math.min(100, Math.round(
            (safeBondRoll * 40) + (powerRatio * 40) + bonusPoints
        )));
        const qualityMultiplier = 0.8 + ((bondScore / 100) * 0.4); // 0.8 to 1.2x

        const finalCorrosion = Math.max(0, Math.min(100, Math.round(recipe.baseCorrosionResistancePercent * qualityMultiplier)));
        const finalBarrier = Math.max(0, Math.min(100, Math.round(recipe.baseMagicBarrierPercent * qualityMultiplier)));

        const uuid = this.generateSecureId();

        const leather: CraftedTreatedLeather = {
            leatherId: `treated_${recipeType.toLowerCase()}_${uuid}`,
            recipeType,
            finalCorrosionResistancePercent: finalCorrosion,
            finalMagicBarrierPercent: finalBarrier,
            chemicalBondRatingPercent: bondScore,
            consumedTanninCount: recipe.requiredTanninCount,
            consumedTanninType: recipe.requiredTanninType,
            remainingProvidedTannins: remaining,
            craftedEpochMs: currentEpochMs,
        };

        return {
            success: true,
            leather,
            updatedVat: vat,
            remainingDurability: vat.currentDurability,
            remainingProvidedTannins: remaining,
        };
    }

    /**
     * Neutralizes caustic acid scale and maintains steeping vat.
     */
    public static maintainVat(
        vat: ActiveSteepingVat,
        repairAmount = 50
    ): { success: boolean; newDurability: number; isFunctional: boolean } {
        if (!vat) return { success: false, newDurability: 0, isFunctional: false };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 50;
        vat.currentDurability = Math.min(vat.maxDurability, vat.currentDurability + amt);
        vat.isFunctional = vat.currentDurability >= this.DURABILITY_COST_PER_CRAFT;

        return {
            success: true,
            newDurability: vat.currentDurability,
            isFunctional: vat.isFunctional,
        };
    }
}