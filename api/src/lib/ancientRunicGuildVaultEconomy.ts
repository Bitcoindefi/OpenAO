import crypto from "node:crypto";

/**
 * Ancient Runic Guild Vault, Treasury Tax Distribution & Multi-Sig Guild Bank Engine for OpenAO MMORPG.
 * Simulates guild vault tiers (Hall Vault, Fortress Vault, Citadel Vault), automated member tax levies (5% to 20%),
 * multi-sig withdrawal authorizations (M-of-N officer signatures), item depository storage, and capacity checks.
 */

export type GuildVaultTier = "GUILD_HALL_VAULT" | "GUILD_FORTRESS_VAULT" | "GUILD_CITADEL_VAULT";
export type GuildMemberRank = "GUILD_MASTER" | "GUILD_OFFICER" | "GUILD_VETERAN" | "GUILD_MEMBER";

export interface VaultTierData {
    tier: GuildVaultTier;
    maxGoldCapacity: number;
    maxItemSlots: number;
    requiredSignaturesForWithdrawal: number;
}

export interface StoredVaultItem {
    slotId: string;
    itemId: string;
    itemName: string;
    quantity: number;
    depositedByPlayerId: string;
}

export interface ActiveGuildVault {
    vaultId: string;
    guildId: string;
    tier: GuildVaultTier;
    currentGoldBalance: number;
    maxGoldCapacity: number;
    taxRatePercent: number; // 5 to 20%
    storedItems: StoredVaultItem[];
    maxItemSlots: number;
}

export interface WithdrawalProposal {
    proposalId: string;
    requesterPlayerId: string;
    targetPlayerId: string;
    amountGold: number;
    signatures: Set<string>;
    isExecuted: boolean;
    createdEpochMs: number;
}

export const VAULT_TIER_CATALOG: Record<GuildVaultTier, VaultTierData> = {
    GUILD_HALL_VAULT: { tier: "GUILD_HALL_VAULT", maxGoldCapacity: 50000, maxItemSlots: 20, requiredSignaturesForWithdrawal: 1 },
    GUILD_FORTRESS_VAULT: { tier: "GUILD_FORTRESS_VAULT", maxGoldCapacity: 200000, maxItemSlots: 50, requiredSignaturesForWithdrawal: 2 },
    GUILD_CITADEL_VAULT: { tier: "GUILD_CITADEL_VAULT", maxGoldCapacity: 1000000, maxItemSlots: 100, requiredSignaturesForWithdrawal: 3 },
};

export class AncientRunicGuildVaultEconomyEngine {
    /**
     * Initializes a new guild vault for a guild.
     */
    public static createGuildVault(
        guildId: string,
        tier: GuildVaultTier,
        initialTaxPercent = 10,
        currentEpochMs = Date.now()
    ): ActiveGuildVault {
        const tierData = VAULT_TIER_CATALOG[tier];
        if (!tierData) {
            throw new Error(`Unsupported vault tier: ${String(tier)}`);
        }

        const tax = Math.max(5, Math.min(20, Number.isFinite(initialTaxPercent) ? initialTaxPercent : 10));
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            vaultId: `vault_${guildId}_${uuid}`,
            guildId,
            tier,
            currentGoldBalance: 0,
            maxGoldCapacity: tierData.maxGoldCapacity,
            taxRatePercent: tax,
            storedItems: [],
            maxItemSlots: tierData.maxItemSlots,
        };
    }

    /**
     * Collects automated tax from player earnings and deposits into guild treasury.
     */
    public static levyMemberTax(
        vault: ActiveGuildVault,
        grossGoldEarned: number
    ): { netPlayerGold: number; taxCollected: number; newVaultBalance: number } {
        if (!vault || !Number.isFinite(grossGoldEarned) || grossGoldEarned <= 0) {
            return { netPlayerGold: grossGoldEarned || 0, taxCollected: 0, newVaultBalance: vault?.currentGoldBalance ?? 0 };
        }

        const tax = Math.floor(grossGoldEarned * (vault.taxRatePercent / 100));
        const capacityHeadroom = Math.max(0, vault.maxGoldCapacity - vault.currentGoldBalance);
        const actualTaxDeposited = Math.min(tax, capacityHeadroom);
        const netPlayer = grossGoldEarned - tax;

        vault.currentGoldBalance += actualTaxDeposited;

        return {
            netPlayerGold: netPlayer,
            taxCollected: actualTaxDeposited,
            newVaultBalance: vault.currentGoldBalance,
        };
    }

    /**
     * Proposes a multi-sig gold withdrawal (requires GUILD_MASTER or GUILD_OFFICER rank).
     */
    public static proposeWithdrawal(
        vault: ActiveGuildVault,
        requesterPlayerId: string,
        requesterRank: GuildMemberRank,
        targetPlayerId: string,
        amountGold: number,
        currentEpochMs = Date.now()
    ): WithdrawalProposal {
        if (requesterRank !== "GUILD_MASTER" && requesterRank !== "GUILD_OFFICER") {
            throw new Error("Unauthorized: Only Guild Master or Guild Officers can propose withdrawals.");
        }

        if (!vault || !Number.isFinite(amountGold) || amountGold <= 0 || amountGold > vault.currentGoldBalance) {
            throw new Error("Invalid withdrawal proposal: amount exceeds treasury balance.");
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            proposalId: `prop_${uuid}`,
            requesterPlayerId,
            targetPlayerId,
            amountGold,
            signatures: new Set([requesterPlayerId]),
            isExecuted: false,
            createdEpochMs: currentEpochMs,
        };
    }

    /**
     * Signs and potentially executes a multi-sig withdrawal proposal.
     */
    public static signWithdrawalProposal(
        vault: ActiveGuildVault,
        proposal: WithdrawalProposal,
        officerPlayerId: string,
        officerRank: GuildMemberRank
    ): { success: boolean; totalSignatures: number; requiredSignatures: number; isExecuted: boolean; reason?: string } {
        if (!vault || !proposal) {
            return { success: false, totalSignatures: 0, requiredSignatures: 0, isExecuted: false, reason: "Invalid vault or proposal." };
        }

        if (officerRank !== "GUILD_MASTER" && officerRank !== "GUILD_OFFICER") {
            return { success: false, totalSignatures: proposal.signatures.size, requiredSignatures: 0, isExecuted: false, reason: "Unauthorized: Signer must be a Guild Officer or Guild Master." };
        }

        if (proposal.isExecuted) {
            return { success: false, totalSignatures: proposal.signatures.size, requiredSignatures: 0, isExecuted: true, reason: "Proposal is already executed." };
        }

        proposal.signatures.add(officerPlayerId);

        const tierData = VAULT_TIER_CATALOG[vault.tier];
        const req = tierData.requiredSignaturesForWithdrawal;

        if (proposal.signatures.size >= req) {
            if (vault.currentGoldBalance < proposal.amountGold) {
                return { success: false, totalSignatures: proposal.signatures.size, requiredSignatures: req, isExecuted: false, reason: "Insufficient vault gold balance." };
            }

            vault.currentGoldBalance -= proposal.amountGold;
            proposal.isExecuted = true;

            return {
                success: true,
                totalSignatures: proposal.signatures.size,
                requiredSignatures: req,
                isExecuted: true,
            };
        }

        return {
            success: true,
            totalSignatures: proposal.signatures.size,
            requiredSignatures: req,
            isExecuted: false,
        };
    }

    /**
     * Deposits an item into the guild vault storage.
     */
    public static depositItem(
        vault: ActiveGuildVault,
        depositedByPlayerId: string,
        itemId: string,
        itemName: string,
        quantity = 1,
        currentEpochMs = Date.now()
    ): { success: boolean; remainingSlots: number; reason?: string } {
        if (!vault) return { success: false, remainingSlots: 0, reason: "Invalid vault." };

        if (vault.storedItems.length >= vault.maxItemSlots) {
            return { success: false, remainingSlots: 0, reason: "Guild vault item capacity reached." };
        }

        const qty = Number.isFinite(quantity) ? Math.max(1, quantity) : 1;
        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        vault.storedItems.push({
            slotId: `slot_${uuid}`,
            itemId,
            itemName,
            quantity: qty,
            depositedByPlayerId,
        });

        return {
            success: true,
            remainingSlots: vault.maxItemSlots - vault.storedItems.length,
        };
    }
}