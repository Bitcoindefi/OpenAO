import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BankInterestEngine, BankAccountState } from "../lib/bankInterestEngine.js";

describe("BankInterestEngine Refined Compound Caps", () => {
    const epochNow = 1787740800000;
    const msPerDay = 24 * 60 * 60 * 1000;

    it("counts contiguous bracket gold perfectly in progressive APY", () => {
        // 50,000 gold = 10,000 in Tier 1 + 40,000 in Tier 2
        // (10,000 * 0.015 + 40,000 * 0.025) / 50,000 = (150 + 1000) / 50000 = 1150 / 50000 = 2.30%
        const apy = BankInterestEngine.getEffectiveApy(50000);
        assert.equal(Math.round(apy * 100) / 100, 2.30);
    });

    it("enforces cumulative 30-day uncollected interest ceiling across multiple accruals", () => {
        const account: BankAccountState = {
            accountId: "bank_01",
            characterId: "char_55",
            principalGold: 100000,
            uncollectedInterestGold: 0,
            lastInterestAccrualEpochMs: epochNow - (10 * msPerDay),
            depositTimestampEpochMs: epochNow - (60 * msPerDay),
        };

        const ceiling = BankInterestEngine.getMaxUncollectedCeiling(100000);
        
        // Accrue multiple times
        BankInterestEngine.applyAccrual(account, epochNow);
        account.lastInterestAccrualEpochMs = epochNow;
        
        // Simulate another 40 days passing without claiming
        const res = BankInterestEngine.computeAccruedInterest(account, epochNow + (40 * msPerDay));
        account.uncollectedInterestGold += res.accruedGold;

        assert.ok(account.uncollectedInterestGold <= ceiling);
    });

    it("returns zero and no-ops on non-positive withdrawal requests", () => {
        const account: BankAccountState = {
            accountId: "bank_02",
            characterId: "char_99",
            principalGold: 10000,
            uncollectedInterestGold: 0,
            lastInterestAccrualEpochMs: epochNow,
            depositTimestampEpochMs: epochNow,
        };

        const resZero = BankInterestEngine.processWithdrawal(account, 0, epochNow);
        assert.equal(resZero.netGoldReceived, 0);
        assert.equal(account.principalGold, 10000);

        const resNeg = BankInterestEngine.processWithdrawal(account, -500, epochNow);
        assert.equal(resNeg.netGoldReceived, 0);
        assert.equal(account.principalGold, 10000);
    });
});