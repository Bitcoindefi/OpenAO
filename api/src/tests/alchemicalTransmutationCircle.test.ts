import { describe, it, expect } from "vitest";
import {
    AlchemicalTransmutationCircleEngine,
    TransmutationCircleState,
} from "../lib/alchemicalTransmutationCircle.js";

describe("AlchemicalTransmutationCircleEngine Matter Conversion & Catalysts", () => {
    it("inscribes circle and transmutes Lead to Pure Gold Ingots with Quintessence bonus", () => {
        const circle = AlchemicalTransmutationCircleEngine.inscribeCircle("alchemist_01", "LEAD_TO_GOLD", 100000);
        expect(circle.recipe).toBe("LEAD_TO_GOLD");
        expect(circle.requiredReagentQuantity).toBe(20);
        expect(circle.baseOutputQuantity).toBe(5);

        const result = AlchemicalTransmutationCircleEngine.executeTransmutation(circle, 20, "QUINTESSENCE", 100, () => 0.99);
        expect(result.success).toBe(true);
        expect(result.outputQuantity).toBe(8);
        expect(result.outputItemName).toBe("Pure Gold Ingot");
        expect(result.backlashDamageTaken).toBe(0);
        expect(circle.isActivated).toBe(true);
    });

    it("rejects zero or negative catalyst purity explicitly", () => {
        const circle = AlchemicalTransmutationCircleEngine.inscribeCircle("a", "LEAD_TO_GOLD", 100000);
        const resZero = AlchemicalTransmutationCircleEngine.executeTransmutation(circle, 20, "PHILOSOPHERS_MERCURY", 0);
        expect(resZero.success).toBe(false);
        expect(resZero.reason).toContain("Catalyst purity must be greater than 0%");

        const resNeg = AlchemicalTransmutationCircleEngine.executeTransmutation(circle, 20, "PHILOSOPHERS_MERCURY", -10);
        expect(resNeg.success).toBe(false);
        expect(resNeg.reason).toContain("Catalyst purity must be greater than 0%");
    });

    it("triggers arcane backlash explosion when impure catalyst fails roll", () => {
        const circle = AlchemicalTransmutationCircleEngine.inscribeCircle("alchemist_02", "IRON_TO_MITHRIL", 100000);

        const failResult = AlchemicalTransmutationCircleEngine.executeTransmutation(circle, 30, "PHILOSOPHERS_MERCURY", 30, () => 0.01);
        expect(failResult.success).toBe(false);
        expect(failResult.outputQuantity).toBe(0);
        expect(failResult.backlashDamageTaken).toBe(250);
        expect(failResult.reason).toContain("Arcane Transmutation Backlash");
        expect(circle.isActivated).toBe(true);
    });

    it("rejects transmutation with insufficient reagents", () => {
        const circle = AlchemicalTransmutationCircleEngine.inscribeCircle("a", "ASH_TO_PHOENIX_FEATHER", 100000);
        const res = AlchemicalTransmutationCircleEngine.executeTransmutation(circle, 10);

        expect(res.success).toBe(false);
        expect(res.reason).toContain("Insufficient Sacred Ash");
        expect(circle.isActivated).toBe(false);
    });

    it("guards against unsupported recipes", () => {
        expect(() => AlchemicalTransmutationCircleEngine.inscribeCircle("a", "WATER_TO_WINE" as any)).toThrow(
            "Unsupported transmutation recipe"
        );
    });
});