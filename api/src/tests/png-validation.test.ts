import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import {
    MAX_PNG_BYTES,
    validatePngUpload,
} from "../lib/pngValidation";

function makePng(width = 32, height = 32): Buffer {
    const image = new PNG({ width, height });

    for (let offset = 0; offset < image.data.length; offset += 4) {
        image.data[offset] = 48;
        image.data[offset + 1] = 121;
        image.data[offset + 2] = 201;
        image.data[offset + 3] = 255;
    }

    return PNG.sync.write(image);
}

describe("validatePngUpload", () => {
    it("decodes and re-encodes a complete PNG", () => {
        const result = validatePngUpload(makePng());

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.width).toBe(32);
        expect(result.height).toBe(32);
        expect(result.byteSize).toBe(result.content.length);
        expect(() => PNG.sync.read(result.content)).not.toThrow();
    });

    it("strips bytes appended after IEND and deduplicates by pixels", () => {
        const clean = makePng();
        const tainted = Buffer.concat([
            clean,
            Buffer.from("<script>payload-after-iend</script>"),
        ]);

        const cleanResult = validatePngUpload(clean);
        const taintedResult = validatePngUpload(tainted);

        expect(cleanResult.ok).toBe(true);
        expect(taintedResult.ok).toBe(true);
        if (!cleanResult.ok || !taintedResult.ok) return;

        expect(taintedResult.content).toEqual(cleanResult.content);
        expect(taintedResult.content.includes("payload-after-iend")).toBe(
            false,
        );
    });

    it("rejects a fake file that only carries the PNG signature", () => {
        const fake = Buffer.alloc(32);
        makePng().subarray(0, 24).copy(fake);

        expect(validatePngUpload(fake)).toEqual({
            ok: false,
            reason: "El archivo no contiene un PNG completo y valido.",
        });
    });

    it("rejects truncated and corrupt PNG data", () => {
        const png = makePng();

        expect(validatePngUpload(png.subarray(0, png.length - 20)).ok).toBe(
            false,
        );
    });

    it("enforces tile multiples, dimensions and input size limits", () => {
        expect(validatePngUpload(makePng(33, 32)).ok).toBe(false);
        expect(validatePngUpload(makePng(1056, 32)).ok).toBe(false);
        expect(validatePngUpload(Buffer.alloc(MAX_PNG_BYTES + 1)).ok).toBe(
            false,
        );
    });
});
