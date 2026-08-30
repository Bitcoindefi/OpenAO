import { describe, it, expect } from "vitest";
import {
    AncientRunicWeatherElementalControlEngine,
    ActiveWeatherTower,
} from "../lib/ancientRunicWeatherElementalControl.js";

describe("AncientRunicWeatherElementalControlEngine Weather & Elemental Magic", () => {
    it("channels Torrential Storm ritual and amplifies Lightning Bolt spell damage (+40%)", () => {
        const tower = AncientRunicWeatherElementalControlEngine.constructTower("archmage_01", "TEMPEST_SPIRE", 50, 50, 100000);
        expect(tower.towerType).toBe("TEMPEST_SPIRE");
        expect(tower.currentEssence).toBe(200);

        const ritualRes = AncientRunicWeatherElementalControlEngine.channelWeatherRitual(tower, "TORRENTIAL_STORM", 180);
        expect(ritualRes.success).toBe(true);
        expect(ritualRes.activeWeather).toBe("TORRENTIAL_STORM");
        expect(ritualRes.remainingEssence).toBe(160); // 200 - 40

        // Lightning base 150 + 40% = 210 damage
        const spellRes = AncientRunicWeatherElementalControlEngine.calculateModifiedSpellDamage(tower, "LIGHTNING_BOLT", 150);
        expect(spellRes.finalDamage).toBe(210);
        expect(spellRes.appliedModifierPercent).toBe(40);
        expect(spellRes.weatherState).toBe("TORRENTIAL_STORM");
    });

    it("channels Solar Scorch ritual amplifying Fireball (+50%) and dampening Frost Nova (-30%)", () => {
        const tower = AncientRunicWeatherElementalControlEngine.constructTower("mage_02", "STORMCALLER_OBELISK", 0, 0, 100000);

        AncientRunicWeatherElementalControlEngine.channelWeatherRitual(tower, "SOLAR_SCORCH", 120);

        const fire = AncientRunicWeatherElementalControlEngine.calculateModifiedSpellDamage(tower, "FIREBALL", 200);
        expect(fire.finalDamage).toBe(300); // 200 + 50% = 300

        const frost = AncientRunicWeatherElementalControlEngine.calculateModifiedSpellDamage(tower, "FROST_NOVA", 100);
        expect(frost.finalDamage).toBe(70); // 100 - 30% = 70
    });

    it("ticks weather duration and reverts to Clear Sky upon expiration while regenerating essence", () => {
        const tower = AncientRunicWeatherElementalControlEngine.constructTower("mage_03", "STORMCALLER_OBELISK", 0, 0, 100000);
        AncientRunicWeatherElementalControlEngine.channelWeatherRitual(tower, "BLIZZARD_FREEZE", 30);
        expect(tower.activeWeather).toBe("BLIZZARD_FREEZE");
        expect(tower.currentEssence).toBe(60); // 100 - 40

        // Tick 30 seconds -> expires
        const tickRes = AncientRunicWeatherElementalControlEngine.tickWeather(tower, 30);
        expect(tickRes.activeWeather).toBe("CLEAR_SKY");
        expect(tickRes.remainingSeconds).toBe(0);
        expect(tower.activeWeather).toBe("CLEAR_SKY");
        expect(tickRes.currentEssence).toBeGreaterThan(60); // Regenerated
    });

    it("rejects ritual channeling when essence is insufficient", () => {
        const tower = AncientRunicWeatherElementalControlEngine.constructTower("mage_04", "STORMCALLER_OBELISK", 0, 0);
        tower.currentEssence = 20; // Insufficient for 40 cost

        const failRes = AncientRunicWeatherElementalControlEngine.channelWeatherRitual(tower, "TORRENTIAL_STORM");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("Insufficient essence");
        expect(tower.activeWeather).toBe("CLEAR_SKY");
    });

    it("guards against null inputs and unsupported tower models", () => {
        expect(() => AncientRunicWeatherElementalControlEngine.constructTower("m", "KITE_ON_STRING" as any)).toThrow(
            "Unsupported weather tower type"
        );

        expect(AncientRunicWeatherElementalControlEngine.channelWeatherRitual(null as any, "CLEAR_SKY").success).toBe(false);
        expect(AncientRunicWeatherElementalControlEngine.calculateModifiedSpellDamage(null as any, "FIREBALL", 100).finalDamage).toBe(100);
    });
});