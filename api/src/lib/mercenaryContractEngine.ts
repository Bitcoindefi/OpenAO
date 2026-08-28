/**
 * NPC Mercenary Companion & Guard Hiring Contract Engine for OpenAO MMORPG.
 * Simulates companion recruitment, periodic wage deductions, loyalty decay/growth,
 * and desertion/mutiny mechanics upon default of payroll.
 */

export type MercenaryClassType = "VANGUARD_WARRIOR" | "SHADOW_SCOUT" | "MYSTIC_HEALER";
export type MercenaryContractStatus = "ACTIVE" | "UNPAID_WARNING" | "DESERTED" | "DISCHARGED";

export interface MercenaryDefinition {
    mercenaryTemplateId: string;
    name: string;
    classType: MercenaryClassType;
    hiringFeeGold: number;
    wagePerTickGold: number;
    baseLoyalty: number; // 0 to 100
    combatPower: number;
}

export interface ActiveMercenaryContract {
    contractId: string;
    playerId: string;
    mercenaryTemplateId: string;
    status: MercenaryContractStatus;
    loyaltyPercent: number; // 0 to 100
    consecutiveMissedWages: number;
    lastPaidEpochMs: number;
}

export interface WageTickResult {
    contractId: string;
    status: MercenaryContractStatus;
    goldDeducted: number;
    remainingPlayerGold: number;
    loyaltyPercent: number;
    hasDeserted: boolean;
    reason?: string;
}

export const MERCENARY_CATALOG: Record<string, MercenaryDefinition> = {
    veteran_swordsman: {
        mercenaryTemplateId: "veteran_swordsman",
        name: "Veteran Swordsman",
        classType: "VANGUARD_WARRIOR",
        hiringFeeGold: 500,
        wagePerTickGold: 25,
        baseLoyalty: 80,
        combatPower: 120,
    },
    elven_ranger: {
        mercenaryTemplateId: "elven_ranger",
        name: "Elven Ranger",
        classType: "SHADOW_SCOUT",
        hiringFeeGold: 750,
        wagePerTickGold: 40,
        baseLoyalty: 75,
        combatPower: 140,
    },
    cleric_acolyte: {
        mercenaryTemplateId: "cleric_acolyte",
        name: "Cleric Acolyte",
        classType: "MYSTIC_HEALER",
        hiringFeeGold: 1000,
        wagePerTickGold: 50,
        baseLoyalty: 90,
        combatPower: 100,
    },
};

export class MercenaryContractEngine {
    /**
     * Hires a mercenary companion, deducting initial hiring fee if player has sufficient gold.
     */
    public static hireMercenary(
        playerId: string,
        mercenaryTemplateId: string,
        playerGold: number,
        currentEpochMs: number,
        randomSuffix: string = Math.random().toString(36).slice(2, 8)
    ): { success: boolean; contract?: ActiveMercenaryContract; remainingGold: number; reason?: string } {
        const def = MERCENARY_CATALOG[mercenaryTemplateId];
        if (!def) {
            return { success: false, remainingGold: playerGold, reason: "Mercenary template does not exist." };
        }

        if (playerGold < def.hiringFeeGold) {
            return {
                success: false,
                remainingGold: playerGold,
                reason: `Insufficient gold for hiring fee. Requires ${def.hiringFeeGold} gold.`,
            };
        }

        const contract: ActiveMercenaryContract = {
            contractId: `merc_${playerId}_${mercenaryTemplateId}_${currentEpochMs}_${randomSuffix}`,
            playerId,
            mercenaryTemplateId,
            status: "ACTIVE",
            loyaltyPercent: def.baseLoyalty,
            consecutiveMissedWages: 0,
            lastPaidEpochMs: currentEpochMs,
        };

        return {
            success: true,
            contract,
            remainingGold: playerGold - def.hiringFeeGold,
        };
    }

    /**
     * Processes recurring wage payroll tick for an active mercenary contract.
     */
    public static processWageTick(
        contract: ActiveMercenaryContract,
        playerGold: number,
        currentEpochMs: number
    ): WageTickResult {
        if (contract.status === "DESERTED" || contract.status === "DISCHARGED") {
            return {
                contractId: contract.contractId,
                status: contract.status,
                goldDeducted: 0,
                remainingPlayerGold: playerGold,
                loyaltyPercent: contract.loyaltyPercent,
                hasDeserted: contract.status === "DESERTED",
                reason: "Contract is no longer active.",
            };
        }

        const def = MERCENARY_CATALOG[contract.mercenaryTemplateId];
        if (!def) {
            return {
                contractId: contract.contractId,
                status: "DISCHARGED",
                goldDeducted: 0,
                remainingPlayerGold: playerGold,
                loyaltyPercent: contract.loyaltyPercent,
                hasDeserted: false,
                reason: "Mercenary template no longer exists in catalog.",
            };
        }

        const wage = def.wagePerTickGold;

        // Player pays wage successfully
        if (playerGold >= wage) {
            contract.consecutiveMissedWages = 0;
            contract.status = "ACTIVE";
            contract.lastPaidEpochMs = currentEpochMs;
            // Small loyalty boost on timely pay (up to 100)
            contract.loyaltyPercent = Math.min(100, contract.loyaltyPercent + 2);

            return {
                contractId: contract.contractId,
                status: "ACTIVE",
                goldDeducted: wage,
                remainingPlayerGold: playerGold - wage,
                loyaltyPercent: contract.loyaltyPercent,
                hasDeserted: false,
            };
        }

        // Missed payroll: Loyalty drops by -25% per missed wage
        contract.consecutiveMissedWages += 1;
        contract.loyaltyPercent = Math.max(0, contract.loyaltyPercent - 25);

        if (contract.loyaltyPercent === 0 || contract.consecutiveMissedWages >= 3) {
            contract.status = "DESERTED";
            return {
                contractId: contract.contractId,
                status: "DESERTED",
                goldDeducted: 0,
                remainingPlayerGold: playerGold,
                loyaltyPercent: contract.loyaltyPercent,
                hasDeserted: true,
                reason: "Mercenary deserted the party due to unpaid wages.",
            };
        }

        contract.status = "UNPAID_WARNING";
        return {
            contractId: contract.contractId,
            status: "UNPAID_WARNING",
            goldDeducted: 0,
            remainingPlayerGold: playerGold,
            loyaltyPercent: contract.loyaltyPercent,
            hasDeserted: false,
            reason: `Payroll missed! Mercenary loyalty dropped to ${contract.loyaltyPercent}%.`,
        };
    }
}