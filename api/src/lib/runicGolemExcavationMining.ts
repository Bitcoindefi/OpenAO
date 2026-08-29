import crypto from "node:crypto";

/**
 * Automated Runic Golem Subterranean Mining & Ore Cart Delivery Engine for OpenAO MMORPG.
 * Simulates deployable autonomous mining golems (Iron, Mithril, Adamantine), deep vein prospecting,
 * bedrock structural stability decay, subterranean cave-in events, and surface depot cart payouts.
 */

export type MiningGolemType = "IRON_ORE_DRILLER" | "MITHRIL_VEIN_CARVER" | "ADAMANTINE_DEEP_MINER";
export type DeepVeinOreType = "IRON_ORE" | "MITHRIL_ORE" | "ADAMANTINE_ORE" | "ANCIENT_ASTRAL_GEODE";

export interface GolemChassisData {
    chassisType: MiningGolemType;
    miningRatePerMinute: number;
    baseDurabilityHp: number;
    stabilityStressPerCycle: number; // Stability points drained per mining cycle
}

export interface ActiveMiningGolem {
    golemId: string;
    ownerPlayerId: string;
    chassisType: MiningGolemType;
    targetOre: DeepVeinOreType;
    currentDurabilityHp: number;
    maxDurabilityHp: number;
    bedrockStabilityPercent: number; // 0 to 100
    accumulatedOreCount: number;
    isCollapsedByCaveIn: boolean;
    lastMiningTickEpochMs: number;
}

export const GOLEM_CHASSIS_CATALOG: Record<MiningGolemType, GolemChassisData> = {
    IRON_ORE_DRILLER: { chassisType: "IRON_ORE_DRILLER", miningRatePerMinute: 5, baseDurabilityHp: 1000, stabilityStressPerCycle: 10 },
    MITHRIL_VEIN_CARVER: { chassisType: "MITHRIL_VEIN_CARVER", miningRatePerMinute: 8, baseDurabilityHp: 2000, stabilityStressPerCycle: 15 },
    ADAMANTINE_DEEP_MINER: { chassisType: "ADAMANTINE_DEEP_MINER", miningRatePerMinute: 12, baseDurabilityHp: 3500, stabilityStressPerCycle: 20 },
};

export const ORE_VALUE_CATALOG: Record<DeepVeinOreType, { valueGold: number }> = {
    IRON_ORE: { valueGold: 10 },
    MITHRIL_ORE: { valueGold: 30 },
    ADAMANTINE_ORE: { valueGold: 75 },
    ANCIENT_ASTRAL_GEODE: { valueGold: 150 },
};

export class RunicGolemExcavationMiningEngine {
    /**
     * Deploys a new autonomous mining golem into a deep ore vein shaft.
     */
    public static deployMiningGolem(
        ownerPlayerId: string,
        chassisType: MiningGolemType,
        targetOre: DeepVeinOreType,
        currentEpochMs = Date.now()
    ): ActiveMiningGolem {
        const chassis = GOLEM_CHASSIS_CATALOG[chassisType];
        if (!chassis) {
            throw new Error(`Unsupported golem chassis type: ${String(chassisType)}`);
        }

        const oreData = ORE_VALUE_CATALOG[targetOre];
        if (!oreData) {
            throw new Error(`Unsupported ore vein type: ${String(targetOre)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            golemId: `golem_miner_${chassisType.toLowerCase()}_${uuid}`,
            ownerPlayerId,
            chassisType,
            targetOre,
            currentDurabilityHp: chassis.baseDurabilityHp,
            maxDurabilityHp: chassis.baseDurabilityHp,
            bedrockStabilityPercent: 100,
            accumulatedOreCount: 0,
            isCollapsedByCaveIn: false,
            lastMiningTickEpochMs: currentEpochMs,
        };
    }

    /**
     * Executes an excavation cycle, extracting ores and reducing bedrock stability.
     */
    public static executeExcavationTick(
        golem: ActiveMiningGolem,
        elapsedMinutes = 1
    ): { success: boolean; oreExtractedCount: number; currentStability: number; isCaveIn: boolean; reason?: string } {
        if (!golem || golem.isCollapsedByCaveIn || golem.currentDurabilityHp <= 0) {
            return { success: false, oreExtractedCount: 0, currentStability: golem?.bedrockStabilityPercent ?? 0, isCaveIn: golem?.isCollapsedByCaveIn ?? true, reason: "Mine shaft is collapsed or golem is broken." };
        }

        const chassis = GOLEM_CHASSIS_CATALOG[golem.chassisType];
        const minutes = Number.isFinite(elapsedMinutes) ? Math.max(0.1, elapsedMinutes) : 1;

        // Drain bedrock stability first
        const stabilityDrain = chassis.stabilityStressPerCycle * minutes;
        golem.bedrockStabilityPercent = Math.max(0, Math.round(golem.bedrockStabilityPercent - stabilityDrain));

        let isCaveIn = false;
        if (golem.bedrockStabilityPercent === 0) {
            golem.isCollapsedByCaveIn = true;
            golem.currentDurabilityHp = Math.max(0, golem.currentDurabilityHp - 500); // Cave-in boulder damage
            isCaveIn = true;
        }

        // Only credit ore if the shaft did not collapse this cycle
        const oreExtracted = isCaveIn ? 0 : Math.max(1, Math.floor(chassis.miningRatePerMinute * minutes));
        golem.accumulatedOreCount += oreExtracted;

        return {
            success: !isCaveIn,
            oreExtractedCount: oreExtracted,
            currentStability: golem.bedrockStabilityPercent,
            isCaveIn,
            reason: isCaveIn ? "Bedrock collapsed in subterranean cave-in; no ore extracted this cycle." : undefined,
        };
    }

    /**
     * Shuts down drilling and dispatches cart delivery to surface bank vault.
     */
    public static dispatchCartDelivery(
        golem: ActiveMiningGolem
    ): { success: boolean; totalGoldPayout: number; oresDeliveredCount: number; reason?: string } {
        if (!golem || golem.accumulatedOreCount <= 0) {
            return { success: false, totalGoldPayout: 0, oresDeliveredCount: 0, reason: "No accumulated ore available in cart." };
        }

        if (golem.isCollapsedByCaveIn || golem.currentDurabilityHp <= 0) {
            return { success: false, totalGoldPayout: 0, oresDeliveredCount: 0, reason: "Shaft collapsed; reinforce pillars before dispatching the cart." };
        }

        const oreData = ORE_VALUE_CATALOG[golem.targetOre];
        const count = golem.accumulatedOreCount;
        const totalPayout = count * oreData.valueGold;

        golem.accumulatedOreCount = 0; // Ores delivered

        return {
            success: true,
            totalGoldPayout: totalPayout,
            oresDeliveredCount: count,
        };
    }

    /**
     * Reinforces mine shaft pillars to restore bedrock structural stability.
     */
    public static reinforceShaftStability(
        golem: ActiveMiningGolem,
        addedStability = 50
    ): { success: boolean; newStability: number } {
        if (!golem) return { success: false, newStability: 0 };

        const added = Number.isFinite(addedStability) ? Math.max(10, addedStability) : 50;
        golem.bedrockStabilityPercent = Math.min(100, golem.bedrockStabilityPercent + added);
        golem.isCollapsedByCaveIn = false;

        return {
            success: true,
            newStability: golem.bedrockStabilityPercent,
        };
    }
}