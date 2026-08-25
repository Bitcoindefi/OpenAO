import fs from "fs";
import path from "path";

const MAPS_SOURCE_DIR = path.resolve(__dirname, "../../mapas_source");
const OUTPUT_DIR = path.resolve(__dirname, "../../../frontend/public/maps_optimized");

if (!fs.existsSync(MAPS_SOURCE_DIR)) {
  console.error(`❌ Map source directory not found: ${MAPS_SOURCE_DIR}`);
  console.error("   Make sure you're running this from the correct location.");
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const mapDirs = fs.readdirSync(MAPS_SOURCE_DIR).filter((d) => {
  const fullPath = path.join(MAPS_SOURCE_DIR, d);
  return fs.statSync(fullPath).isDirectory() && d.startsWith("mapa_");
});

console.log(`📦 Found ${mapDirs.length} maps to export...`);

let successCount = 0;
let errorCount = 0;

for (const mapDir of mapDirs) {
  const mapPath = path.join(MAPS_SOURCE_DIR, mapDir);
  const mapNumber = mapDir.replace("mapa_", "");
  
  try {
    const terrainPath = path.join(mapPath, "terrain.json");
    const specialsPath = path.join(mapPath, "specials.json");
    const npcsPath = path.join(mapPath, "npcs.json");
    const metaPath = path.join(mapPath, "meta.json");

    if (!fs.existsSync(terrainPath)) {
      console.warn(`⚠️  Skipping ${mapDir}: terrain.json not found`);
      errorCount++;
      continue;
    }

    const terrain = JSON.parse(fs.readFileSync(terrainPath, "utf-8"));
    const specials = fs.existsSync(specialsPath) ? JSON.parse(fs.readFileSync(specialsPath, "utf-8")) : [];
    const npcs = fs.existsSync(npcsPath) ? JSON.parse(fs.readFileSync(npcsPath, "utf-8")) : [];
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf-8")) : {};

    const optimized = {
      terrain,
      specials,
      npcs,
      meta: {
        ...meta,
        id: Number(mapNumber),
      },
    };

    const outputPath = path.join(OUTPUT_DIR, `mapa_${mapNumber}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(optimized));
    successCount++;
  } catch (error) {
    console.error(`❌ Error processing ${mapDir}:`, error);
    errorCount++;
  }
}

console.log(`\n✅ Exported ${successCount} maps to ${OUTPUT_DIR}`);
if (errorCount > 0) {
  console.log(`⚠️  ${errorCount} maps had errors`);
}

if (successCount === 0) {
  console.error("\n❌ No maps were exported. Build will fail.");
  process.exit(1);
}
