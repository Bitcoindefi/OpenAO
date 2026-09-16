import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkMaps } from "../scripts/check-maps.mjs";

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "openao-maps-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = path.join(root, "source");
    const output = path.join(root, "output");
    fs.mkdirSync(source);
    fs.mkdirSync(output);
    for (const id of [1, 5, 506]) {
        fs.mkdirSync(path.join(source, `mapa_${id}`));
        fs.writeFileSync(path.join(output, `mapa_${id}.json`), "{}");
    }
    return { source, output };
}

test("accepts all exported maps, including nonconsecutive IDs", (t) => {
    const { source, output } = fixture(t);
    fs.mkdirSync(path.join(source, "notes"));
    assert.equal(checkMaps(source, output), 3);
});

test("rejects a clean checkout with no generated maps and explains recovery", (t) => {
    const { source, output } = fixture(t);
    assert.throws(() => checkMaps(source, path.join(output, "missing")), /Missing.*export-frontend-maps/);
});

test("rejects a partial export even when the starting map exists", (t) => {
    const { source, output } = fixture(t);
    fs.unlinkSync(path.join(output, "mapa_506.json"));
    assert.throws(() => checkMaps(source, output), /mapa_506\.json/);
});

test("rejects empty files and directories masquerading as exported maps", (t) => {
    const { source, output } = fixture(t);
    fs.writeFileSync(path.join(output, "mapa_5.json"), "");
    assert.throws(() => checkMaps(source, output), /mapa_5\.json/);
    fs.unlinkSync(path.join(output, "mapa_5.json"));
    fs.mkdirSync(path.join(output, "mapa_5.json"));
    assert.throws(() => checkMaps(source, output), /mapa_5\.json/);
});

test("rejects missing or empty sources instead of silently validating no maps", (t) => {
    const { source, output } = fixture(t);
    assert.throws(() => checkMaps(path.join(source, "missing"), output), /Map sources are missing/);
    const empty = path.join(source, "empty");
    fs.mkdirSync(empty);
    assert.throws(() => checkMaps(empty, output), /No map sources found/);
});
