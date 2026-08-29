import { describe, it, expect } from "vitest";
import {
    RunicTotemShamanicAttunementEngine,
    PlacedTotem,
    PartyMemberTarget,
} from "../lib/runicTotemShamanicAttunement.js";

describe("RunicTotemShamanicAttunementEngine Totems & Storm Surge", () => {
    it("places Windfury Totem and pulses aura to party members in range", () => {
        const totem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "WINDFURY_TOTEM", 50, 50, 100000);
        expect(totem.totemType).toBe("WINDFURY_TOTEM");
        expect(totem.currentHp).toBe(500);

        const warrior: PartyMemberTarget = { playerId: "w1", location: { x: 55, y: 50 }, activeTotemBuffs: {}, isAlive: true };
        const mageDistant: PartyMemberTarget = { playerId: "m1", location: { x: 90, y: 50 }, activeTotemBuffs: {}, isAlive: true };

        const pulseRes = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [warrior, mageDistant], 100000);
        expect(pulseRes.affectedPartyCount).toBe(1);
        expect(pulseRes.isStormSurgeActive).toBe(false);
        expect(warrior.activeTotemBuffs.ATTACK_SPEED_PERCENT).toBe(35);
        expect(mageDistant.activeTotemBuffs.ATTACK_SPEED_PERCENT).toBeUndefined();
    });

    it("activates Elemental Storm Surge (+50% potency) and stacks same-stat totems when within mutual proximity", () => {
        const earthTotem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "EARTHWARDEN_TOTEM", 0, 0, 100000);
        const windTotem1 = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "WINDFURY_TOTEM", 2, 0, 100000);
        const windTotem2 = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "WINDFURY_TOTEM", 0, 2, 100000);
        const waterTotem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "TIDAL_WAVE_TOTEM", 1, 1, 100000);

        const ally: PartyMemberTarget = { playerId: "ally_01", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: true };

        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([earthTotem, windTotem1, windTotem2, waterTotem], [ally], 100000);
        expect(pulse.isStormSurgeActive).toBe(true);

        // Earth base 40 * 1.5 = 60 Armor Rating
        expect(ally.activeTotemBuffs.ARMOR_RATING).toBe(60);
        // Two Windfury totems stack: (35 * 1.5 = 53) * 2 = 106
        expect(ally.activeTotemBuffs.ATTACK_SPEED_PERCENT).toBe(106);
    });

    it("rejects Elemental Storm Surge when totems are placed by different shamans or far apart", () => {
        // Shaman 1 places Earth, Shaman 2 places Wind & Water
        const earthTotem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "EARTHWARDEN_TOTEM", 0, 0, 100000);
        const windTotem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_02", "WINDFURY_TOTEM", 0, 0, 100000);
        const waterTotem = RunicTotemShamanicAttunementEngine.placeTotem("shaman_02", "TIDAL_WAVE_TOTEM", 0, 0, 100000);

        expect(RunicTotemShamanicAttunementEngine.isElementalStormSurgeActive([earthTotem, windTotem, waterTotem])).toBe(false);

        // Same shaman but distant (> 12 tiles apart)
        const farEarth = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "EARTHWARDEN_TOTEM", 0, 0, 100000);
        const farWind = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "WINDFURY_TOTEM", 50, 50, 100000);
        const farWater = RunicTotemShamanicAttunementEngine.placeTotem("shaman_01", "TIDAL_WAVE_TOTEM", 100, 100, 100000);

        expect(RunicTotemShamanicAttunementEngine.isElementalStormSurgeActive([farEarth, farWind, farWater])).toBe(false);
    });

    it("destroys totem when damage reduces HP to 0 and clears stale buffs on next pulse", () => {
        const totem = RunicTotemShamanicAttunementEngine.placeTotem("s", "EARTHWARDEN_TOTEM", 0, 0, 100000);
        const ally: PartyMemberTarget = { playerId: "a", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: true };

        RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [ally], 100000);
        expect(ally.activeTotemBuffs.ARMOR_RATING).toBe(40);

        // Destroy totem
        RunicTotemShamanicAttunementEngine.damageTotem(totem, 500);
        expect(totem.isDestroyed).toBe(true);

        // Next pulse clears stale buff
        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [ally], 100000);
        expect(pulse.affectedPartyCount).toBe(0);
        expect(ally.activeTotemBuffs.ARMOR_RATING).toBeUndefined();
    });

    it("guards against unsupported totem types and dead party members", () => {
        expect(() => RunicTotemShamanicAttunementEngine.placeTotem("s", "LASER_TOTEM" as any)).toThrow(
            "Unsupported totem type"
        );

        const totem = RunicTotemShamanicAttunementEngine.placeTotem("s", "WINDFURY_TOTEM", 0, 0, 100000);
        const deadAlly: PartyMemberTarget = { playerId: "dead", location: { x: 1, y: 1 }, activeTotemBuffs: {}, isAlive: false };

        const pulse = RunicTotemShamanicAttunementEngine.pulseTotemAuras([totem], [deadAlly], 100000);
        expect(pulse.affectedPartyCount).toBe(0);
    });
});