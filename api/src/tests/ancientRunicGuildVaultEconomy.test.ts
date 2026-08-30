import { describe, it, expect } from "vitest";
import {
    AncientRunicGuildVaultEconomyEngine,
    ActiveGuildVault,
    WithdrawalProposal,
} from "../lib/ancientRunicGuildVaultEconomy.js";

describe("AncientRunicGuildVaultEconomyEngine Guild Banks & Multi-Sig", () => {
    it("creates Citadel Vault, levies 15% member tax into treasury, and handles multi-sig 3-of-3 withdrawal with officer rank verification", () => {
        const vault = AncientRunicGuildVaultEconomyEngine.createGuildVault("guild_phoenix", "GUILD_CITADEL_VAULT", 15, 100000);
        expect(vault.tier).toBe("GUILD_CITADEL_VAULT");
        expect(vault.maxGoldCapacity).toBe(1000000);
        expect(vault.taxRatePercent).toBe(15);

        // Player earns 1000 gold -> 150 gold tax deposited to vault, 850 net player
        const levyRes = AncientRunicGuildVaultEconomyEngine.levyMemberTax(vault, 1000);
        expect(levyRes.netPlayerGold).toBe(850);
        expect(levyRes.taxCollected).toBe(150);
        expect(vault.currentGoldBalance).toBe(150);

        // Propose withdrawal of 100 gold by GM
        const proposal = AncientRunicGuildVaultEconomyEngine.proposeWithdrawal(vault, "gm_01", "GUILD_MASTER", "member_01", 100, 100000);
        expect(proposal.signatures.size).toBe(1);
        expect(proposal.isExecuted).toBe(false);

        // Regular member cannot sign withdrawal
        const unauthSign = AncientRunicGuildVaultEconomyEngine.signWithdrawalProposal(vault, proposal, "peasant_01", "GUILD_MEMBER");
        expect(unauthSign.success).toBe(false);
        expect(unauthSign.reason).toContain("Unauthorized");

        // Officer 2 signs (total 2/3 signatures)
        const sign2 = AncientRunicGuildVaultEconomyEngine.signWithdrawalProposal(vault, proposal, "officer_02", "GUILD_OFFICER");
        expect(sign2.success).toBe(true);
        expect(sign2.totalSignatures).toBe(2);
        expect(sign2.isExecuted).toBe(false);
        expect(vault.currentGoldBalance).toBe(150);

        // Officer 3 signs (total 3/3 signatures -> executed!)
        const sign3 = AncientRunicGuildVaultEconomyEngine.signWithdrawalProposal(vault, proposal, "officer_03", "GUILD_OFFICER");
        expect(sign3.success).toBe(true);
        expect(sign3.totalSignatures).toBe(3);
        expect(sign3.isExecuted).toBe(true);
        expect(proposal.isExecuted).toBe(true);
        expect(vault.currentGoldBalance).toBe(50);
    });

    it("deposits items into vault and enforces item slot limit", () => {
        const vault = AncientRunicGuildVaultEconomyEngine.createGuildVault("g_hall", "GUILD_HALL_VAULT", 10, 100000);
        vault.maxItemSlots = 2;

        const dep1 = AncientRunicGuildVaultEconomyEngine.depositItem(vault, "p1", "sword_01", "Obsidian Blade", 1);
        expect(dep1.success).toBe(true);
        expect(dep1.remainingSlots).toBe(1);

        const dep2 = AncientRunicGuildVaultEconomyEngine.depositItem(vault, "p2", "shield_01", "Runic Shield", 1);
        expect(dep2.success).toBe(true);
        expect(dep2.remainingSlots).toBe(0);

        const dep3 = AncientRunicGuildVaultEconomyEngine.depositItem(vault, "p3", "potion_01", "Health Potion", 1);
        expect(dep3.success).toBe(false);
        expect(dep3.reason).toContain("capacity reached");
    });

    it("rejects proposal creation when requester is not an officer", () => {
        const vault = AncientRunicGuildVaultEconomyEngine.createGuildVault("g", "GUILD_HALL_VAULT", 10);
        vault.currentGoldBalance = 500;

        expect(() => AncientRunicGuildVaultEconomyEngine.proposeWithdrawal(vault, "p1", "GUILD_MEMBER", "p2", 50)).toThrow(
            "Unauthorized"
        );
    });

    it("rejects proposal creation when amount exceeds vault gold balance", () => {
        const vault = AncientRunicGuildVaultEconomyEngine.createGuildVault("g", "GUILD_HALL_VAULT", 10);
        vault.currentGoldBalance = 50;

        expect(() => AncientRunicGuildVaultEconomyEngine.proposeWithdrawal(vault, "p1", "GUILD_MASTER", "p2", 500)).toThrow(
            "amount exceeds treasury balance"
        );
    });

    it("rejects signing an already executed proposal", () => {
        const vault = AncientRunicGuildVaultEconomyEngine.createGuildVault("g", "GUILD_HALL_VAULT", 10);
        vault.currentGoldBalance = 100;

        const prop = AncientRunicGuildVaultEconomyEngine.proposeWithdrawal(vault, "p1", "GUILD_MASTER", "p2", 50);
        // p1 signs (1/1 for Hall Vault -> executes immediately)
        const s1 = AncientRunicGuildVaultEconomyEngine.signWithdrawalProposal(vault, prop, "p1", "GUILD_MASTER");
        expect(s1.isExecuted).toBe(true);

        const s2 = AncientRunicGuildVaultEconomyEngine.signWithdrawalProposal(vault, prop, "p2", "GUILD_OFFICER");
        expect(s2.success).toBe(false);
        expect(s2.reason).toContain("already executed");
    });

    it("guards against invalid inputs and unsupported vault tiers", () => {
        expect(() => AncientRunicGuildVaultEconomyEngine.createGuildVault("g", "WOODEN_BOX" as any)).toThrow(
            "Unsupported vault tier"
        );

        expect(AncientRunicGuildVaultEconomyEngine.levyMemberTax(null as any, 100).taxCollected).toBe(0);
        expect(AncientRunicGuildVaultEconomyEngine.depositItem(null as any, "p", "i", "n").success).toBe(false);
    });
});