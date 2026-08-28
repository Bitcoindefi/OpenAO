import { describe, it, expect } from "vitest";
import { MercenaryContractEngine } from "../lib/mercenaryContractEngine.js";

describe("MercenaryContractEngine Recruitment, Wages & Loyalty Dynamics", () => {
    it("hires mercenary with deterministic contractId containing epoch and template", () => {
        const hireRes = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 1000, 100000, "abc123");
        expect(hireRes.success).toBe(true);
        expect(hireRes.contract?.contractId).toBe("merc_p1_veteran_swordsman_100000_abc123");
        expect(hireRes.remainingGold).toBe(500);
        expect(hireRes.contract?.loyaltyPercent).toBe(80);
    });

    it("handles missing catalog entry gracefully without defaulting wage", () => {
        const contract = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 500, 100000).contract!;
        contract.mercenaryTemplateId = "deleted_template";

        const wageRes = MercenaryContractEngine.processWageTick(contract, 1000, 103600);
        expect(wageRes.status).toBe("DISCHARGED");
        expect(wageRes.reason).toContain("no longer exists in catalog");
    });

    it("reports accurate loyaltyPercent on desertion", () => {
        const contract = MercenaryContractEngine.hireMercenary("p1", "veteran_swordsman", 500, 100000).contract!;

        // 1st missed wage (80 -> 55)
        MercenaryContractEngine.processWageTick(contract, 0, 103600);
        // 2nd missed wage (55 -> 30)
        MercenaryContractEngine.processWageTick(contract, 0, 107200);
        // 3rd missed wage (30 -> 5)
        const w3 = MercenaryContractEngine.processWageTick(contract, 0, 110800);

        expect(w3.status).toBe("DESERTED");
        expect(w3.hasDeserted).toBe(true);
        expect(w3.loyaltyPercent).toBe(5); // Accurate persisted loyalty rather than hardcoded 0
        expect(contract.loyaltyPercent).toBe(5);
    });
});