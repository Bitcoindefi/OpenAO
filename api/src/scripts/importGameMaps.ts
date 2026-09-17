import { importSourceMaps } from "../repositories/gameMaps";

async function main() {
    const result = await importSourceMaps();
    console.log(`Mapas importados: ${result.imported}. Ausentes detectados: ${result.missing}.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
