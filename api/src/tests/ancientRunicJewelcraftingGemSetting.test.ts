import { describe, it, expect } from "vitest";
import {
    AncientRunicJewelcraftingGemSettingEngine,
    ActiveJewelcraftingWorkbench,
    SocketableEquipmentItem,
} from "../lib/ancientRunicJewelcraftingGemSetting.js";

describe("AncientRunicJewelcraftingGemSettingEngine Gem Socketing & Resonance", () => {
    it("sockets Ruby of Carnage into Red Socket on Prismatic Astral Font yielding +55% resonance match bonus", () => {
        const font = AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("jeweler_01", "PRISMATIC_ASTRAL_FONT", 100000);
        expect(font.workbenchType).toBe("PRISMATIC_ASTRAL_FONT");
        expect(font.currentDurability).toBe(250);

        const sword: SocketableEquipmentItem = {
            itemId: "sword_01",
            itemName: "Dragon Slayer Blade",
            sockets: [
                { slotId: "s0", socketColor: "RED" },
                { slotId: "s1", socketColor: "BLUE" },
            ],
        };

        const socketRes = AncientRunicJewelcraftingGemSettingEngine.socketGemstone(
            font,
            sword,
            0,
            "RUBY_OF_CARNAGE",
            () => 0.1
        );

        expect(socketRes.success).toBe(true);
        expect(socketRes.socketedSlot?.socketedGem?.gemType).toBe("RUBY_OF_CARNAGE");
        expect(socketRes.socketedSlot?.socketedGem?.appliedStatValue).toBe(62);
        expect(socketRes.socketedSlot?.socketedGem?.hasResonanceMatchBonus).toBe(true);
        expect(font.currentDurability).toBe(240);
    });

    it("handles shattered gem setting failure path consuming durability and destroying gem", () => {
        const bench = AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("j_fail", "OBSIDIAN_FACETING_WORKBENCH", 100000); // 85% success
        const helm: SocketableEquipmentItem = {
            itemId: "helm_fail",
            itemName: "Iron Helm",
            sockets: [{ slotId: "s0", socketColor: "RED" }],
        };

        // Roll 0.95 (95 > 85% success) -> Shattered failure
        const failRes = AncientRunicJewelcraftingGemSettingEngine.socketGemstone(bench, helm, 0, "RUBY_OF_CARNAGE", () => 0.95);
        expect(failRes.success).toBe(false);
        expect(failRes.isGemDestroyed).toBe(true);
        expect(failRes.reason).toContain("shattered");
        expect(failRes.remainingDurability).toBe(90); // 100 - 10
        expect(helm.sockets[0].socketedGem).toBeUndefined();
    });

    it("sockets Diamond of Invulnerability into non-prismatic slot with universal match", () => {
        const bench = AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("jeweler_02", "CELESTIAL_LAPIDARY_BENCH", 100000);
        const helm: SocketableEquipmentItem = {
            itemId: "helm_01",
            itemName: "Obsidian Greathelm",
            sockets: [{ slotId: "s0", socketColor: "GREEN" }],
        };

        const res = AncientRunicJewelcraftingGemSettingEngine.socketGemstone(bench, helm, 0, "DIAMOND_OF_INVULNERABILITY", () => 0.1);
        expect(res.success).toBe(true);
        expect(res.socketedSlot?.socketedGem?.appliedStatValue).toBe(35);
        expect(res.socketedSlot?.socketedGem?.hasResonanceMatchBonus).toBe(true);
    });

    it("unsockets gemstone cleanly clearing the slot", () => {
        const font = AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("jeweler_03", "PRISMATIC_ASTRAL_FONT", 100000);
        const ring: SocketableEquipmentItem = {
            itemId: "ring_01",
            itemName: "Runic Band",
            sockets: [{ slotId: "s0", socketColor: "BLUE" }],
        };

        AncientRunicJewelcraftingGemSettingEngine.socketGemstone(font, ring, 0, "SAPPHIRE_OF_INTELLECT", () => 0.1);
        expect(ring.sockets[0].socketedGem).toBeDefined();

        const unsocketRes = AncientRunicJewelcraftingGemSettingEngine.unsocketGemstone(font, ring, 0);
        expect(unsocketRes.success).toBe(true);
        expect(unsocketRes.extractedGemType).toBe("SAPPHIRE_OF_INTELLECT");
        expect(ring.sockets[0].socketedGem).toBeUndefined();
    });

    it("rejects socketing when slot is already occupied", () => {
        const font = AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("jeweler_04", "PRISMATIC_ASTRAL_FONT", 100000);
        const ring: SocketableEquipmentItem = {
            itemId: "ring_02",
            itemName: "Runic Ring",
            sockets: [{ slotId: "s0", socketColor: "RED" }],
        };

        AncientRunicJewelcraftingGemSettingEngine.socketGemstone(font, ring, 0, "RUBY_OF_CARNAGE", () => 0.1);
        const failRes = AncientRunicJewelcraftingGemSettingEngine.socketGemstone(font, ring, 0, "RUBY_OF_CARNAGE", () => 0.1);

        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("already occupied");
    });

    it("guards against null inputs and unsupported workbench types", () => {
        expect(() => AncientRunicJewelcraftingGemSettingEngine.constructWorkbench("j", "WOODEN_STOOL" as any)).toThrow(
            "Unsupported workbench type"
        );

        expect(AncientRunicJewelcraftingGemSettingEngine.socketGemstone(null as any, null as any, 0, "RUBY_OF_CARNAGE").success).toBe(false);
        expect(AncientRunicJewelcraftingGemSettingEngine.unsocketGemstone(null as any, null as any, 0).success).toBe(false);
    });
});