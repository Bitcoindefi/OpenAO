# Análisis de Licencia y Especificación de Formato: WorldEditor de Argentum Online

> Documentación de compatibilidad legal y cleanroom implementation según los criterios de aceptación del Issue #23.

---

## 1. Contexto Legal y Licencia AGPL-3.0

El editor de mapas original de Argentum Online ([ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor)) está publicado bajo la licencia **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### Implicaciones para este Módulo:
1. **Interoperabilidad de Formatos de Datos**:
   - Bajo la jurisprudencia internacional de derechos de autor y estándares de software libre (e.g., *Oracle v. Google*, Directiva de la UE sobre Programas de Ordenador), **las especificaciones de formatos de archivo binarios y de texto no son protegibles por copyright**.
   - Leer, parsear, serializar y generar archivos en formatos `.map`, `.inf` y `.dat` para lograr interoperabilidad es legalmente permisible y estándar en la industria de emuladores y motores recreados.

2. **Cleanroom Implementation**:
   - Este módulo (`frontend/utils/mapConverter.ts`) es una **implementación original desde cero (cleanroom)** en TypeScript moderna.
   - **No se reutilizó, copió ni adaptó código fuente en Visual Basic 6** del repositorio de WorldEditor.
   - La estructura de tipos y arrays se ajusta a la arquitectura interna del cliente web Next.js/Pixi.js de OpenAO.

---

## 2. Especificación Técnica del Formato Clásico de Mapas

### A. Archivo Binario `.map`
- **Header**: 2 bytes (`Int16LE`) indicando la versión del mapa (típicamente `1`).
- **Tiles**: Matriz de $100 \times 100$ tiles recorridos secuencialmente por fila ($Y=1..100$) y columna ($X=1..100$):
  - `flags` (`Uint8`):
    - `Bit 0 (1)`: Bloqueo de paso (`blocked = 1`).
    - `Bit 1 (2)`: Presencia de capa gráfica 2 (`layer2`).
    - `Bit 2 (4)`: Presencia de capa gráfica 3 (`layer3`).
    - `Bit 3 (8)`: Presencia de capa gráfica 4 (`layer4`).
    - `Bit 4 (16)`: Presencia de trigger (`trigger`).
  - `GrhIndex Capa 1` (`Int16LE`): Siempre presente (2 bytes).
  - `GrhIndex Capa 2` (`Int16LE`): Presente si `flags & 2 != 0`.
  - `GrhIndex Capa 3` (`Int16LE`): Presente si `flags & 4 != 0`.
  - `GrhIndex Capa 4` (`Int16LE`): Presente si `flags & 8 != 0`.
  - `Trigger` (`Int16LE`): Presente si `flags & 16 != 0`.

### B. Archivo de Información `.inf` (Formato INI)
- **Teleports / Salidas**:
  ```ini
  [X-Y]
  Map=N
  X=TX
  Y=TY
  ```
- **Spawns de NPCs**:
  ```ini
  [NPCN]
  NPCIndex=ID
  X=X
  Y=Y
  ```
- **Objetos en el Suelo**:
  ```ini
  [OBJN]
  ObjIndex=ID
  Amount=CANT
  X=X
  Y=Y
  ```

### C. Archivo de Metadatos `.dat` (Formato INI)
- **Propiedades del Mapa**:
  ```ini
  [MAPA1]
  Name=Ciudad de Ullathorpe
  Music=1.mid
  Seguro=1
  Pk=0
  MagiaSinEfecto=0
  InviSinEfecto=0
  ResuSinEfecto=0
  ```
