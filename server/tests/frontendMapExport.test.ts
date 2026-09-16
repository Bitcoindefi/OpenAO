import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

test("canonical frontend exporter rejects missing terrain instead of skipping a map", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "openao-export-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = path.join(root, "source");
    const output = path.join(root, "output");
    const terrain = JSON.stringify({ width: 1, height: 1, palette: {}, rows: [[0]] });
    for (const id of [1, 5]) {
        fs.mkdirSync(path.join(source, `mapa_${id}`), { recursive: true });
        fs.writeFileSync(path.join(source, `mapa_${id}`, "terrain.json"), terrain);
    }
    const run = () => spawnSync(process.execPath, [
        "--import", "tsx", "src/scripts/exportFrontendOptimizedMaps.ts",
        `--source-dir=${source}`, `--output-dir=${output}`,
    ], { cwd: path.resolve(__dirname, ".."), encoding: "utf8" });

    const complete = run();
    assert.equal(complete.status, 0, complete.stderr);
    for (const id of [1, 5]) {
        const map = JSON.parse(fs.readFileSync(path.join(output, `mapa_${id}.json`), "utf8"));
        assert.equal(map.id, id);
        assert.equal(map.d.length, map.w * map.h);
    }

    fs.rmSync(output, { recursive: true });
    fs.unlinkSync(path.join(source, "mapa_5", "terrain.json"));
    const incomplete = run();
    assert.equal(incomplete.status, 1, incomplete.stderr);
    assert.match(incomplete.stderr, /Mapa 5: no existe .*terrain\.json/);
    assert.equal(fs.existsSync(path.join(output, "mapa_5.json")), false);
});
