/**
 * Issue #24 area 1: user map ID range reservation (600-1999).
 * Official maps live below 600; the frontend loader must enforce the
 * reserved range for user-created maps.
 */
import { describe, expect, it } from "vitest";
import {
    USER_MAP_ID_RANGE,
    assertUserMapId,
    isUserMapId,
} from "./gameLoader";

describe("user map ID range reservation (issue #24 item 1)", () => {
    it("reserves exactly 600-1999 for user-created maps", () => {
        expect(USER_MAP_ID_RANGE.min).toBe(600);
        expect(USER_MAP_ID_RANGE.max).toBe(1999);
    });

    it("accepts user map IDs inside the reserved range", () => {
        expect(isUserMapId(600)).toBe(true);
        expect(isUserMapId(1234)).toBe(true);
        expect(isUserMapId(1999)).toBe(true);
    });

    it("rejects official map IDs below the reserved range", () => {
        expect(isUserMapId(599)).toBe(false);
        expect(isUserMapId(0)).toBe(false);
        expect(isUserMapId(-1)).toBe(false);
    });

    it("rejects IDs above the reserved range", () => {
        expect(isUserMapId(2000)).toBe(false);
        expect(isUserMapId(99999)).toBe(false);
    });

    it("rejects non-integer and NaN inputs", () => {
        expect(isUserMapId(600.5)).toBe(false);
        expect(isUserMapId(Number.NaN)).toBe(false);
    });

    it("assertUserMapId throws a descriptive error out of range, passes in range", () => {
        expect(() => assertUserMapId(599)).toThrowError(/between 600 and 1999/);
        expect(() => assertUserMapId(2000)).toThrowError(/between 600 and 1999/);
        expect(() => assertUserMapId(600)).not.toThrow();
    });
});
