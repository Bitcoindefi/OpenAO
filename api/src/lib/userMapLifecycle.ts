/**
 * User-map lifecycle state machine and economic-safety reward guard.
 *
 * Issue #24 item 4: user maps move through a server-enforced lifecycle
 * (draft -> proposed -> published -> archived) and NEVER emit gold or XP
 * rewards, regardless of lifecycle state or caller.
 */

export type UserMapLifecycleState = "draft" | "proposed" | "published" | "archived";

export const USER_MAP_LIFECYCLE_STATES: readonly UserMapLifecycleState[] = [
  "draft",
  "proposed",
  "published",
  "archived",
] as const;

/** ID range reserved for user-created maps (matches frontend gameLoader reservation). */
export const USER_MAP_MIN_ID = 600;
export const USER_MAP_MAX_ID = 1999;

export function isUserMapId(mapId: number): boolean {
  return Number.isInteger(mapId) && mapId >= USER_MAP_MIN_ID && mapId <= USER_MAP_MAX_ID;
}

export function isValidLifecycleState(state: unknown): state is UserMapLifecycleState {
  return (
    typeof state === "string" &&
    (USER_MAP_LIFECYCLE_STATES as readonly string[]).includes(state)
  );
}

export type TransitionContext = {
  from: UserMapLifecycleState;
  to: UserMapLifecycleState;
  /**
   * True only when the caller performs the explicit server-side publish
   * action (e.g. POST /user-maps/:id/publish). Required for proposed -> published.
   */
  viaPublishAction?: boolean;
};

export type TransitionDecision =
  | { ok: true }
  | { ok: false; reason: string };

const TERMINAL_STATE: UserMapLifecycleState = "archived";

/**
 * Pure transition rule set:
 *  - owner may move draft -> proposed
 *  - proposed -> published requires the explicit server-side publish action
 *  - archive is allowed from any state
 *  - archived is terminal and read-only
 *  - every other transition is rejected
 */
export function canTransitionUserMap(ctx: TransitionContext): TransitionDecision {
  const { from, to, viaPublishAction } = ctx;

  if (!isValidLifecycleState(from)) {
    return { ok: false, reason: `invalid current lifecycle state: ${String(from)}` };
  }
  if (!isValidLifecycleState(to)) {
    return { ok: false, reason: `invalid target lifecycle state: ${String(to)}` };
  }
  if (from === to) {
    return { ok: false, reason: `map is already in state '${from}'` };
  }
  if (from === TERMINAL_STATE) {
    return { ok: false, reason: "archived maps are read-only and cannot change state" };
  }

  // Archive from any non-terminal state is allowed.
  if (to === TERMINAL_STATE) {
    return { ok: true };
  }

  if (from === "draft" && to === "proposed") {
    return { ok: true };
  }

  if (from === "proposed" && to === "published") {
    if (viaPublishAction !== true) {
      return {
        ok: false,
        reason: "publishing requires the explicit server-side publish action",
      };
    }
    return { ok: true };
  }

  return { ok: false, reason: `transition '${from}' -> '${to}' is not allowed` };
}

export function assertUserMapTransition(ctx: TransitionContext): void {
  const decision = canTransitionUserMap(ctx);
  if (!decision.ok) {
    throw new Error(`user map lifecycle transition rejected: ${decision.reason}`);
  }
}

/** Archived maps are read-only for content edits. */
export function canEditUserMapContent(state: UserMapLifecycleState): boolean {
  return state !== TERMINAL_STATE;
}

export function assertUserMapEditable(state: UserMapLifecycleState): void {
  if (!canEditUserMapContent(state)) {
    throw new Error("user map is archived and read-only");
  }
}

//
// Economic-safety: zero gold / zero XP emissions from user maps.
//

export type RewardEmission = {
  /** Source map the event originated from. */
  sourceMapId: number;
  gold?: number;
  exp?: number;
};

/**
 * Returns false for ANY user map in ANY lifecycle state — user maps can
 * never be a legitimate source of gold or XP rewards.
 */
export function canEmitRewards(sourceMapId: number): boolean {
  return !isUserMapId(sourceMapId);
}

/**
 * Hook for the reward/emission point: call before granting any gold or XP.
 * Throws if the event is sourced from a user map, regardless of state or caller,
 * guaranteeing zero gold and zero XP emissions from user maps.
 */
export function assertNoUserMapRewards(emission: RewardEmission): void {
  if (isUserMapId(emission.sourceMapId)) {
    const granted: string[] = [];
    if (emission.gold !== undefined && emission.gold !== 0) granted.push("gold");
    if (emission.exp !== undefined && emission.exp !== 0) granted.push("xp");
    if (granted.length > 0) {
      throw new Error(
        `blocked reward emission from user map ${emission.sourceMapId}: ` +
          `${granted.join(" and ")} can never be granted from user maps`,
      );
    }
  }
}
