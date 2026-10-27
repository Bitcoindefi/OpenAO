/**
 * Player Title & Achievement Badge Engine for OpenAO MMORPG.
 * Tracks unlocked titles based on combat/skill achievements, validates title ownership
 * before applying passive stat perks, sanitizes nameplates against spoofing,
 * and formats player nameplates for in-game chat and HUD rendering.
 */

export type TitleDisplayPosition = "PREFIX" | "SUFFIX";

export interface TitlePassivePerks {
    bonusMaxHp?: number;
    bonusMaxMana?: number;
    criticalStrikeChanceBonusPercent?: number;
    fishingCatchRateBonusPercent?: number;
    goldDropBonusPercent?: number;
}

export interface PlayerTitleDefinition {
    titleId: string;
    titleName: string;
    description: string;
    position: TitleDisplayPosition;
    perks: TitlePassivePerks;
    unlockConditionDescription: string;
}

export interface PlayerAchievementStats {
    dragonsSlain: number;
    pvpRank: number;
    fishingSkill: number;
    dungeonsCompleted: number;
    goldEarnedTotal: number;
}

export const TITLE_CATALOG: Record<string, PlayerTitleDefinition> = {
    dragonbane: {
        titleId: "dragonbane",
        titleName: "Dragonbane",
        description: "Awarded to warriors who have vanquished 10 Ancient Dragons.",
        position: "PREFIX",
        perks: { bonusMaxHp: 50, criticalStrikeChanceBonusPercent: 2.0 },
        unlockConditionDescription: "Slain at least 10 Ancient Dragons",
    },
    master_angler: {
        titleId: "master_angler",
        titleName: "Master Angler",
        description: "Master of the rod and sea.",
        position: "SUFFIX",
        perks: { fishingCatchRateBonusPercent: 10.0, goldDropBonusPercent: 5.0 },
        unlockConditionDescription: "Fishing skill reached level 100",
    },
    grand_inquisitor: {
        titleId: "grand_inquisitor",
        titleName: "Grand Inquisitor",
        description: "Supreme judge of the Imperial Inquisition.",
        position: "PREFIX",
        perks: { bonusMaxMana: 40, criticalStrikeChanceBonusPercent: 3.0 },
        unlockConditionDescription: "Achieved PvP Rank 10 or higher",
    },
    undying_champion: {
        titleId: "undying_champion",
        titleName: "the Undying",
        description: "Conqueror of the deepest subterranean dungeons.",
        position: "SUFFIX",
        perks: { bonusMaxHp: 100 },
        unlockConditionDescription: "Completed 50 Mythic Dungeons",
    },
};

export class PlayerTitleSystemEngine {
    /**
     * Sanitizes raw player names, stripping spoofing delimiters like brackets and outer commas.
     */
    public static sanitizePlayerName(playerName: string): string {
        return (playerName || "")
            .replace(/[\[\]]/g, "") // Strip brackets
            .replace(/^,+|,+$/g, "") // Strip leading/trailing commas
            .trim();
    }

    /**
     * Evaluates player achievements and resolves the set of all unlocked title IDs.
     */
    public static resolveUnlockedTitles(stats: PlayerAchievementStats): string[] {
        const unlocked: string[] = [];

        if (stats.dragonsSlain >= 10) {
            unlocked.push("dragonbane");
        }
        if (stats.fishingSkill >= 100) {
            unlocked.push("master_angler");
        }
        if (stats.pvpRank >= 10) {
            unlocked.push("grand_inquisitor");
        }
        if (stats.dungeonsCompleted >= 50) {
            unlocked.push("undying_champion");
        }

        return unlocked;
    }

    /**
     * Formats a character's display nameplate according to their active title,
     * strictly verifying that the player has unlocked the title and sanitizing inputs.
     */
    public static formatNameplate(
        playerName: string,
        activeTitleId?: string,
        unlockedTitleIds?: Set<string> | string[]
    ): string {
        const cleanName = this.sanitizePlayerName(playerName);
        if (!activeTitleId) return cleanName;

        // Verify title unlock ownership if an unlocked set is provided
        if (unlockedTitleIds) {
            const unlockedSet = unlockedTitleIds instanceof Set ? unlockedTitleIds : new Set(unlockedTitleIds);
            if (!unlockedSet.has(activeTitleId)) {
                return cleanName;
            }
        }

        const title = TITLE_CATALOG[activeTitleId];
        if (!title) return cleanName;

        if (title.position === "PREFIX") {
            return `[${title.titleName}] ${cleanName}`;
        } else {
            return `${cleanName}, ${title.titleName}`;
        }
    }

    /**
     * Computes the aggregated passive perks granted by the active title,
     * verifying ownership against unlocked titles.
     */
    public static getActivePerks(
        activeTitleId?: string,
        unlockedTitleIds?: Set<string> | string[]
    ): TitlePassivePerks {
        if (!activeTitleId) return {};

        if (unlockedTitleIds) {
            const unlockedSet = unlockedTitleIds instanceof Set ? unlockedTitleIds : new Set(unlockedTitleIds);
            if (!unlockedSet.has(activeTitleId)) {
                return {};
            }
        }

        const title = TITLE_CATALOG[activeTitleId];
        return title ? { ...title.perks } : {};
    }
}