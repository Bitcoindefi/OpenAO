import { canEmitRewards, assertNoUserMapRewards, USER_MAP_LIFECYCLE_STATES } from "./userMapLifecycle";
import { describe, expect, it } from "vitest";
import {
  assertNoUserMapRewards,
  assertUserMapEditable,
  assertUserMapTransition,
  canEditUserMapContent,
  canEmitRewards,
  canTransitionUserMap,
  isUserMapId,
  isValidLifecycleState,
  USER_MAP_MAX_ID,
  USER_MAP_MIN_ID,
  type UserMapLifecycleState,
} from "./userMapLifecycle";

const ALL: UserMapLifecycleState[] = ["draft", "proposed", "published", "archived"];

describe("user map lifecycle", () => {
  describe("valid transitions", () => {
    it("draft -> proposed succeeds", () => {
      expect(canTransitionUserMap({ from: "draft", to: "proposed" })).toEqual({ ok: true });
    });

    it("proposed -> published succeeds via the explicit publish action", () => {
      expect(
        canTransitionUserMap({ from: "proposed", to: "published", viaPublishAction: true }),
      ).toEqual({ ok: true });
    });

    it("archive is allowed from every non-terminal state", () => {
      for (const from of ["draft", "proposed", "published"] as UserMapLifecycleState[]) {
        expect(canTransitionUserMap({ from, to: "archived" })).toEqual({ ok: true });
      }
    });

    it("assert does not throw for every valid transition", () => {
      expect(() => assertUserMapTransition({ from: "draft", to: "proposed" })).not.toThrow();
      expect(() =>
        assertUserMapTransition({ from: "proposed", to: "published", viaPublishAction: true }),
      ).not.toThrow();
      expect(() => assertUserMapTransition({ from: "published", to: "archived" })).not.toThrow();
    });
  });

  describe("invalid transitions", () => {
    it("draft -> published is rejected even with the publish action", () => {
      const d = canTransitionUserMap({ from: "draft", to: "published", viaPublishAction: true });
      expect(d.ok).toBe(false);
      expect(() =>
        assertUserMapTransition({ from: "draft", to: "published", viaPublishAction: true }),
      ).toThrow();
    });

    it("proposed -> published without the explicit publish action is rejected", () => {
      expect(canTransitionUserMap({ from: "proposed", to: "published" }).ok).toBe(false);
      expect(
        canTransitionUserMap({ from: "proposed", to: "published", viaPublishAction: false }).ok,
      ).toBe(false);
    });

    it("backwards transitions are rejected", () => {
      expect(canTransitionUserMap({ from: "proposed", to: "draft" }).ok).toBe(false);
      expect(canTransitionUserMap({ from: "published", to: "proposed" }).ok).toBe(false);
      expect(canTransitionUserMap({ from: "published", to: "draft" }).ok).toBe(false);
    });

    it("archived is terminal — no transitions out", () => {
      for (const to of ALL) {
        if (to === "archived") continue;
        expect(canTransitionUserMap({ from: "archived", to }).ok).toBe(false);
      }
      expect(() => assertUserMapTransition({ from: "archived", to: "draft" })).toThrow(
        /read-only/,
      );
    });

    it("same-state no-ops and unknown states are rejected", () => {
      for (const s of ALL) {
        expect(canTransitionUserMap({ from: s, to: s }).ok).toBe(false);
      }
      expect(canTransitionUserMap({ from: "bogus" as never, to: "draft" }).ok).toBe(false);
      expect(canTransitionUserMap({ from: "draft", to: "bogus" as never }).ok).toBe(false);
      expect(isValidLifecycleState("bogus")).toBe(false);
    });
  });

  describe("archived maps are read-only", () => {
    it("content edits blocked when archived, allowed otherwise", () => {
      expect(canEditUserMapContent("archived")).toBe(false);
      expect(() => assertUserMapEditable("archived")).toThrow(/read-only/);
      for (const s of ["draft", "proposed", "published"] as UserMapLifecycleState[]) {
        expect(canEditUserMapContent(s)).toBe(true);
        expect(() => assertUserMapEditable(s)).not.toThrow();
      }
    });
  });
});

describe("user map reward enforcement (zero gold / zero XP)", () => {
  it("classifies only the reserved 600-1999 range as user maps", () => {
    expect(isUserMapId(USER_MAP_MIN_ID)).toBe(true);
    expect(isUserMapId(USER_MAP_MAX_ID)).toBe(true);
    expect(isUserMapId(599)).toBe(false);
    expect(isUserMapId(2000)).toBe(false);
    expect(isUserMapId(1234)).toBe(true);
    expect(isUserMapId(-1)).toBe(false);
    expect(isUserMapId(1.5)).toBe(false);
  });

  it("canEmitRewards is false for user maps in ANY state", () => {
    for (const state of ALL) {
      // state is irrelevant: the map ID alone blocks emissions
      expect(canEmitRewards(700)).toBe(false);
      expect(state).toBeDefined();
    }
    expect(canEmitRewards(599)).toBe(true);
    expect(canEmitRewards(2000)).toBe(true);
  });

  it("a published user map emits zero gold and zero XP", () => {
    // Publishing succeeds via the explicit action...
    expect(
      canTransitionUserMap({ from: "proposed", to: "published", viaPublishAction: true }).ok,
    ).toBe(true);

    // ...but any reward emission from the published user map is blocked.
    expect(() => assertNoUserMapRewards({ sourceMapId: 700, gold: 50 })).toThrow(/gold/);
    expect(() => assertNoUserMapRewards({ sourceMapId: 700, exp: 120 })).toThrow(/xp/);
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 700, gold: 50, exp: 120 }),
    ).toThrow(/gold and xp/);

    // Zero-value emissions and no-op emissions are permitted (nothing granted).
    expect(() => assertNoUserMapRewards({ sourceMapId: 700, gold: 0, exp: 0 })).not.toThrow();
    expect(() => assertNoUserMapRewards({ sourceMapId: 700 })).not.toThrow();
  });

  it("non-user-map sources can still emit rewards (guard only targets user maps)", () => {
    expect(() => assertNoUserMapRewards({ sourceMapId: 42, gold: 50, exp: 10 })).not.toThrow();
    expect(() => assertNoUserMapRewards({ sourceMapId: 2000, gold: 1 })).not.toThrow();
  });
});

describe("user map reward emissions (issue #24 item 4)", () => {
  it("refuses emission for EVERY user map ID in 600-1999", () => {
    for (let id = 600; id <= 1999; id++) {
      expect(canEmitRewards(id)).toBe(false);
    }
  });

  it("non-user maps remain unrestricted", () => {
    expect(canEmitRewards(0)).toBe(true);
    expect(canEmitRewards(599)).toBe(true);
    expect(canEmitRewards(2000)).toBe(true);
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 42, gold: 100, exp: 50 }),
    ).not.toThrow();
  });

  it("a published user map emits zero gold and zero XP", () => {
    // zero emission is permitted (nothing granted)
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 700, gold: 0, exp: 0 }),
    ).not.toThrow();
    // any non-zero grant from a user map is blocked server-side
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 700, gold: 1 }),
    ).toThrow(/user map 700/);
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 700, exp: 1 }),
    ).toThrow(/user map 700/);
  });

  it("guard is independent of lifecycle state or caller", () => {
    for (const _state of USER_MAP_LIFECYCLE_STATES) {
      // draft/proposed/published/archived all behave identically: no rewards
      expect(canEmitRewards(600)).toBe(false);
    }
    expect(() =>
      assertNoUserMapRewards({ sourceMapId: 1999, gold: 25, exp: 120 }),
    ).toThrow(/gold and xp/);
  });
});
