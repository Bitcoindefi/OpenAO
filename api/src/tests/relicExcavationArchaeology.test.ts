import { describe, it, expect } from "vitest";
import {
    RelicExcavationArchaeologyEngine,
    ArchaeologyDigSite,
} from "../lib/relicExcavationArchaeology.js";

describe("RelicExcavationArchaeologyEngine Surveying, Brush Excavation & Artifact Assembly", () => {
    it("triangulates survey cues accurately based on distance to target", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_tomb_01",
            theme: "DESERT_TOMB",
            targetRelicLocation: { x: 100, y: 100 },
            totalFragmentsRemaining: 4,
            isFullyExcavated: false,
        };

        const exact = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 100, 100);
        expect(exact.cue).toBe("EXCAVATION_NODE_FOUND");
        expect(exact.distanceTiles).toBe(0);

        const hot = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 110, 100);
        expect(hot.cue).toBe("HOT");

        const warm = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 140, 100);
        expect(warm.cue).toBe("WARM");

        const cold = RelicExcavationArchaeologyEngine.surveyTriangulation(site, 200, 200);
        expect(cold.cue).toBe("COLD");
    });

    it("successfully unearths fragment using DELICATE brush and updates dig site remaining count", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_glacier_01",
            theme: "FROZEN_GLACIER",
            targetRelicLocation: { x: 50, y: 50 },
            totalFragmentsRemaining: 1,
            isFullyExcavated: false,
        };

        const session = RelicExcavationArchaeologyEngine.startExcavationSession(site, 70).session!;

        for (let i = 0; i < 9; i++) {
            RelicExcavationArchaeologyEngine.applyBrushStroke(session, "DELICATE", site);
        }
        const finalStroke = RelicExcavationArchaeologyEngine.applyBrushStroke(session, "DELICATE", site);

        expect(finalStroke.isUnearthed).toBe(true);
        expect(session.isSuccessfullyUnearthed).toBe(true);
        expect(session.isShattered).toBe(false);
        expect(site.totalFragmentsRemaining).toBe(0);
        expect(site.isFullyExcavated).toBe(true);
    });

    it("shatters relic when AGGRESSIVE brush exceeds fragility threshold before completion", () => {
        const site: ArchaeologyDigSite = {
            siteId: "site_volcano_01",
            theme: "VOLCANIC_RUINS",
            targetRelicLocation: { x: 20, y: 20 },
            totalFragmentsRemaining: 2,
            isFullyExcavated: false,
        };

        const session = RelicExcavationArchaeologyEngine.startExcavationSession(site, 50).session!;

        RelicExcavationArchaeologyEngine.applyBrushStroke(session, "AGGRESSIVE", site);
        const res = RelicExcavationArchaeologyEngine.applyBrushStroke(session, "AGGRESSIVE", site);

        expect(res.isShattered).toBe(true);
        expect(session.isShattered).toBe(true);
        expect(res.reason).toContain("shattered into dust");
    });

    it("restores ancient relic artifact with unique ID and awards museum exhibition points", () => {
        const restoreRes = RelicExcavationArchaeologyEngine.restoreArtifact(
            "SUNKEN_ATLANTIS",
            4,
            "Crown of the Abyssal Kings"
        );

        expect(restoreRes.success).toBe(true);
        expect(restoreRes.artifact?.artifactName).toBe("Crown of the Abyssal Kings");
        expect(restoreRes.artifact?.museumExhibitionPoints).toBe(600);
        expect(restoreRes.artifact?.artifactId).toContain("relic_sunken_atlantis_");
    });

    it("rejects artifact restoration with insufficient fragments", () => {
        const failRes = RelicExcavationArchaeologyEngine.restoreArtifact("DESERT_TOMB", 2, "Incomplete Urn");
        expect(failRes.success).toBe(false);
        expect(failRes.reason).toContain("requires at least 4 fragments");
    });
});