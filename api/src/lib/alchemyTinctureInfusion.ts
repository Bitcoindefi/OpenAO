/**
 * Alchemical Herb Infusion, Solvent Bases & Toxicity Meter Engine for OpenAO MMORPG.
 * Simulates steeping rare botanical reagents in solvent bases, computing tincture potencies,
 * tracking player bloodstream toxicity buildup, and administering herbal antidotes.
 */

export type HerbReagent = "MANDRAKE_ROOT" | "STARLIGHT_LOTUS" | "NIGHTSHADE_PETAL" | "DRAGON_FIRE_LEAF";
export type SolventBase = "SPRING_WATER" | "MOONWELL_DEW" | "VOLATILE_SPIRITS";

export interface TinctureRecipe {
    recipeId: string;
    tinctureName: string;
    primaryHerb: HerbReagent;
    optimalSteepSeconds: number;
    basePotency: number;
    baseToxicityPoints: number;
}

export interface InfusionFlaskSession {
    sessionId: string;
    recipeId: string;
    solvent: SolventBase;
    herb: HerbReagent;
    steepDurationSeconds: number;
    alchemistSkill: number;
    isBrewed: boolean;
}

export interface BrewedTincture {
    tinctureId: string;
    recipeId: string;
    potencyPercent: number; // 0 to 100+
    toxicityPoints: number;
    isBurned: boolean;
}

export interface PlayerToxicityState {
    playerId: string;
    currentToxicity: number; // 0 to 100
    isToxicShock: boolean;
}

export const TINCTURE_RECIPES: Record<string, TinctureRecipe> = {
    tincture_of_clarity: {
        recipeId: "tincture_of_clarity",
        tinctureName: "Tincture of Clarity",
        primaryHerb: "STARLIGHT_LOTUS",
        optimalSteepSeconds: 15,
        basePotency: 50,
        baseToxicityPoints: 10,
    },
    tincture_of_berserk: {
        recipeId: "tincture_of_berserk",
        tinctureName: "Tincture of Berserker Might",
        primaryHerb: "DRAGON_FIRE_LEAF",
        optimalSteepSeconds: 20,
        basePotency: 80,
        baseToxicityPoints: 25,
    },
};

export const SOLVENT_MODIFIERS: Record<SolventBase, { potencyMultiplier: number; addedToxicity: number }> = {
    SPRING_WATER: { potencyMultiplier: 1.0, addedToxicity: 0 },
    MOONWELL_DEW: { potencyMultiplier: 1.4, addedToxicity: 5 },
    VOLATILE_SPIRITS: { potencyMultiplier: 1.8, addedToxicity: 20 },
};

export class AlchemyTinctureInfusionEngine {
    public static readonly MAX_TOXICITY_THRESHOLD = 100;

    /**
     * Brews a tincture flask session into a final potency tincture with unique IDs.
     */
    public static brewTincture(
        session: InfusionFlaskSession
    ): { success: boolean; tincture?: BrewedTincture; reason?: string } {
        if (!session || !session.recipeId) {
            return { success: false, reason: "Invalid brewing session." };
        }

        const recipe = TINCTURE_RECIPES[session.recipeId];
        if (!recipe) {
            return { success: false, reason: `Unknown recipe: ${session.recipeId}` };
        }

        if (session.herb !== recipe.primaryHerb) {
            return { success: false, reason: `Mismatch herb! ${recipe.tinctureName} requires ${recipe.primaryHerb}.` };
        }

        const solventMod = SOLVENT_MODIFIERS[session.solvent];
        if (!solventMod) {
            return { success: false, reason: `Unsupported solvent: ${String(session.solvent)}` };
        }

        const steepTime = Number.isFinite(session.steepDurationSeconds) ? Math.max(0, session.steepDurationSeconds) : 0;
        const optimalTime = recipe.optimalSteepSeconds;
        const timeDiff = Math.abs(steepTime - optimalTime);

        // If steeped more than 2x optimal time, tincture burns
        const isBurned = steepTime > optimalTime * 2;

        let timeFactor = 1.0;
        if (isBurned) {
            timeFactor = 0.20; // Burned ruins potency
        } else if (timeDiff > 0) {
            timeFactor = Math.max(0.30, 1.0 - (timeDiff / optimalTime) * 0.50);
        }

        const skill = Math.min(100, Math.max(1, Number.isFinite(session.alchemistSkill) ? session.alchemistSkill : 1));
        const skillFactor = 1.0 + (skill / 100) * 0.30;

        const finalPotency = Math.floor(recipe.basePotency * solventMod.potencyMultiplier * timeFactor * skillFactor);
        const finalToxicity = recipe.baseToxicityPoints + solventMod.addedToxicity;

        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        const tincture: BrewedTincture = {
            tinctureId: `tincture_${session.recipeId}_${Date.now()}_${uniqueSuffix}`,
            recipeId: recipe.recipeId,
            potencyPercent: finalPotency,
            toxicityPoints: finalToxicity,
            isBurned,
        };

        session.isBrewed = true;

        return {
            success: true,
            tincture,
        };
    }

    /**
     * Simulates a player consuming a tincture, accumulating toxicity up to max 100.
     */
    public static consumeTincture(
        player: PlayerToxicityState,
        tincture: BrewedTincture
    ): { success: boolean; toxicityAdded: number; newToxicity: number; isToxicShock: boolean } {
        if (!player || !tincture) {
            return { success: false, toxicityAdded: 0, newToxicity: player?.currentToxicity ?? 0, isToxicShock: player?.isToxicShock ?? false };
        }

        const toxicityIncrease = Number.isFinite(tincture.toxicityPoints) ? Math.max(0, tincture.toxicityPoints) : 0;
        player.currentToxicity = Math.min(this.MAX_TOXICITY_THRESHOLD, player.currentToxicity + toxicityIncrease);

        if (player.currentToxicity >= this.MAX_TOXICITY_THRESHOLD) {
            player.isToxicShock = true;
        }

        return {
            success: true,
            toxicityAdded: toxicityIncrease,
            newToxicity: player.currentToxicity,
            isToxicShock: player.isToxicShock,
        };
    }

    /**
     * Administers an herbal antidote, purging bloodstream toxicity and tracking state transition.
     */
    public static applyAntidote(
        player: PlayerToxicityState,
        cleanseAmount = 40
    ): { success: boolean; toxicityPurged: number; remainingToxicity: number; shockCleared: boolean } {
        if (!player) {
            return { success: false, toxicityPurged: 0, remainingToxicity: 0, shockCleared: false };
        }

        const hadShock = player.isToxicShock;
        const cleanse = Number.isFinite(cleanseAmount) ? Math.max(0, Math.floor(cleanseAmount)) : 0;
        const actualPurged = Math.min(player.currentToxicity, cleanse);

        player.currentToxicity = Math.max(0, player.currentToxicity - actualPurged);
        if (player.currentToxicity < this.MAX_TOXICITY_THRESHOLD) {
            player.isToxicShock = false;
        }

        const shockCleared = hadShock && !player.isToxicShock;

        return {
            success: true,
            toxicityPurged: actualPurged,
            remainingToxicity: player.currentToxicity,
            shockCleared,
        };
    }
}