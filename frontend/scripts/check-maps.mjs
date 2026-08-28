import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapsDir = path.resolve(__dirname, '..', 'public', 'maps_optimized');
const sampleMap = path.join(mapsDir, 'mapa_1.json');

if (!fs.existsSync(mapsDir) || !fs.existsSync(sampleMap)) {
  console.error('\n======================================================================');
  console.error('❌ ERROR EN EL BUILD DE FRONTEND: FALTAN MAPAS OPTIMIZADOS');
  console.error('======================================================================');
  console.error('La carpeta public/maps_optimized/ está vacía o no contiene mapa_1.json.');
  console.error('El mundo no se podrá renderizar en el cliente sin estos archivos.');
  console.error('\n👉 SOLUCIÓN:');
  console.error('Ejecuta el siguiente comando antes de compilar el frontend o Docker:');
  console.error('   cd server && pnpm export-frontend-maps');
  console.error('======================================================================\n');
  
  process.exit(1);
}

console.log('✅ Verificación de mapas optimizados: mapas detectados correctamente en public/maps_optimized.');
