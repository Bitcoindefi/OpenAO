import crypto from "node:crypto";

/**
 * Ancient Runic Glyph Decryption, Cipher Wheel Alignment & Lore Inscription Engine for OpenAO MMORPG.
 * Simulates ancient dungeon glyph stones (Sun, Moon, Void, Eclipse), concentric cipher wheel rotational alignments,
 * scholar chisel durability, and hidden ancient lore discovery payouts.
 */

export type AncientGlyphType = "GLYPH_OF_THE_SUN" | "GLYPH_OF_THE_MOON" | "GLYPH_OF_THE_VOID" | "GLYPH_OF_THE_ECLIPSE";

export interface GlyphData {
    glyphType: AncientGlyphType;
    elementalAffinity: string;
    targetAlignmentDegrees: number; // 0 to 359
    discoveryXpReward: number;
    goldPayout: number;
    loreCodexFragment: string;
}

export interface DungeonPuzzleStone {
    stoneId: string;
    glyphType: AncientGlyphType;
    currentWheelRotationDegrees: number; // 0 to 359
    isDecrypted: boolean;
    discoveredByPlayerId?: string;
}

export interface ScholarChiselTool {
    toolId: string;
    currentDurability: number;
    maxDurability: number;
    isBroken: boolean;
}

export const GLYPH_CATALOG: Record<AncientGlyphType, GlyphData> = {
    GLYPH_OF_THE_SUN: { glyphType: "GLYPH_OF_THE_SUN", elementalAffinity: "SOLAR", targetAlignmentDegrees: 90, discoveryXpReward: 500, goldPayout: 250, loreCodexFragment: "The First Sun blazed across the Primordial Aether." },
    GLYPH_OF_THE_MOON: { glyphType: "GLYPH_OF_THE_MOON", elementalAffinity: "LUNAR", targetAlignmentDegrees: 180, discoveryXpReward: 750, goldPayout: 400, loreCodexFragment: "The Silver Moon mirrored the tears of the Astral Goddess." },
    GLYPH_OF_THE_VOID: { glyphType: "GLYPH_OF_THE_VOID", elementalAffinity: "VOID", targetAlignmentDegrees: 270, discoveryXpReward: 1200, goldPayout: 800, loreCodexFragment: "Before creation existed, the Silent Void swallowed eternity." },
    GLYPH_OF_THE_ECLIPSE: { glyphType: "GLYPH_OF_THE_ECLIPSE", elementalAffinity: "COSMIC", targetAlignmentDegrees: 0, discoveryXpReward: 2000, goldPayout: 1500, loreCodexFragment: "When Sun and Moon align, the Cosmic Gate shall reopen." },
};

export class AncientRunicGlyphDecryptionEngine {
    public static readonly ALIGNMENT_TOLERANCE_DEGREES = 5;

    /**
     * Initializes a new dungeon puzzle runestone.
     */
    public static createPuzzleStone(
        glyphType: AncientGlyphType,
        initialRotationDegrees = 0,
        currentEpochMs = Date.now()
    ): DungeonPuzzleStone {
        const data = GLYPH_CATALOG[glyphType];
        if (!data) {
            throw new Error(`Unsupported glyph type: ${String(glyphType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        const normRotation = ((Number.isFinite(initialRotationDegrees) ? initialRotationDegrees : 0) % 360 + 360) % 360;

        return {
            stoneId: `glyph_stone_${glyphType.toLowerCase()}_${uuid}`,
            glyphType,
            currentWheelRotationDegrees: normRotation,
            isDecrypted: false,
        };
    }

    /**
     * Rotates the concentric cipher wheel on the puzzle stone by a given delta angle.
     */
    public static rotateCipherWheel(
        stone: DungeonPuzzleStone,
        deltaDegrees: number
    ): { success: boolean; newRotationDegrees: number } {
        if (!stone || stone.isDecrypted) {
            return { success: false, newRotationDegrees: stone?.currentWheelRotationDegrees ?? 0 };
        }

        const delta = Number.isFinite(deltaDegrees) ? deltaDegrees : 0;
        stone.currentWheelRotationDegrees = ((stone.currentWheelRotationDegrees + delta) % 360 + 360) % 360;

        return {
            success: true,
            newRotationDegrees: stone.currentWheelRotationDegrees,
        };
    }

    /**
     * Attempts to etch and decipher the glyph using a scholar chisel tool.
     */
    public static attemptDecryption(
        stone: DungeonPuzzleStone,
        chisel: ScholarChiselTool,
        scholarPlayerId: string
    ): { success: boolean; xpAwarded: number; goldAwarded: number; loreText: string; reason?: string } {
        if (!stone || stone.isDecrypted) {
            return { success: false, xpAwarded: 0, goldAwarded: 0, loreText: "", reason: "Stone is already decrypted or invalid." };
        }

        if (!chisel || chisel.isBroken || chisel.currentDurability <= 0) {
            return { success: false, xpAwarded: 0, goldAwarded: 0, loreText: "", reason: "Scholar chisel is broken." };
        }

        const glyphData = GLYPH_CATALOG[stone.glyphType];
        if (!glyphData) {
            return { success: false, xpAwarded: 0, goldAwarded: 0, loreText: "", reason: `Unsupported glyph type: ${String(stone.glyphType)}` };
        }

        chisel.currentDurability = Math.max(0, chisel.currentDurability - 5);
        if (chisel.currentDurability === 0) {
            chisel.isBroken = true;
        }

        // Calculate angular difference mod 360
        const diff = Math.abs(stone.currentWheelRotationDegrees - glyphData.targetAlignmentDegrees);
        const shortestDiff = Math.min(diff, 360 - diff);

        if (shortestDiff > this.ALIGNMENT_TOLERANCE_DEGREES) {
            return {
                success: false,
                xpAwarded: 0,
                goldAwarded: 0,
                loreText: "",
                reason: `Cipher wheel misaligned by ${shortestDiff} degrees. Requires precise alignment to ${glyphData.targetAlignmentDegrees} deg.`,
            };
        }

        stone.isDecrypted = true;
        stone.discoveredByPlayerId = scholarPlayerId;

        return {
            success: true,
            xpAwarded: glyphData.discoveryXpReward,
            goldAwarded: glyphData.goldPayout,
            loreText: glyphData.loreCodexFragment,
        };
    }
}