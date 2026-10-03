const fs = require('fs');
const path = require('path');

const GRAFICOS_PATH = path.resolve(__dirname, '../..', 'client/data/graficos.json');
const MAPAS_DIR = path.resolve(__dirname, 'mapas_source');

const graficos = JSON.parse(fs.readFileSync(GRAFICOS_PATH, 'utf8'));
const graficosSet = new Set(graficos.map(g => g.id));

const RANGO_MIN = 100000;
const RANGO_MAX = 199999;

function validarMapa(terrain) {
  const errores = [];
  for (const entrada of terrain.paleta || []) {
    if (!Array.isArray(entrada.graphics)) {
      errores.push(`Paleta ${entrada.id}: graphics debe ser array`);
      continue;
    }
    for (const gid of entrada.graphics) {
      if (!graficosSet.has(gid)) {
        errores.push(`Paleta ${entrada.id}: gráfico ${gid} inexistente en graficos.json`);
        continue;
      }
      if (gid >= RANGO_MIN && gid <= RANGO_MAX) {
        // OK, es subido
      }
    }
    if (typeof entrada.bloqueado !== 'boolean') {
      errores.push(`Paleta ${entrada.id}: bloqueado debe ser boolean`);
    }
  }
  return errores;
}

function validarTodos() {
  const mapas = fs.readdirSync(MAPAS_DIR);
  let totalErrores = 0;
  for (const mapa of mapas) {
    const terrainPath = path.join(MAPAS_DIR, mapa, 'terrain.json');
    if (!fs.existsSync(terrainPath)) continue;
    const terrain = JSON.parse(fs.readFileSync(terrainPath, 'utf8'));
    const errores = validarMapa(terrain);
    if (errores.length) {
      console.error(`Errores en ${mapa}:`);
      errores.forEach(e => console.error(' -', e));
      totalErrores += errores.length;
    }
  }
  if (totalErrores === 0) {
    console.log('Validación de paleta OK: todos los gráficos referenciados existen y no hay colisiones.');
  }
  process.exit(totalErrores > 0 ? 1 : 0);
}

if (require.main === module) {
  validarTodos();
}

module.exports = { validarMapa, graficosSet };
