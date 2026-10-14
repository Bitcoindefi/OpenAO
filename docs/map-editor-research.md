# Research: Análisis de editores de mapas en el ecosistema de Argentum Online

Este documento recopila la investigación sobre cómo otros proyectos del ecosistema de Argentum Online gestionan, editan y almacenan sus mapas, con el objetivo de justificar las decisiones de diseño del modo construcción de OpenAO (#2 / #14).

## 1. Tabla comparativa de formatos de mapa

| Proyecto | Formato de mapa | Compatibilidad con OpenAO (`meta` / `terrain` / `npcs` / `specials`) | Notas de almacenamiento |
|---|---|---|---|
| **ao-org/argentum-online-worldeditor** | Archivos binarios propietarios / Indexados (formato clásico `.map` con capas, triggers y bloqueos) | Parcial (requiere transformadores o parsers dedicados) | Formato tradicional de VB6 basado en índices fijos y bloques binarios. |
| **lambdaclass/argentum** | JSON / Estructuras Web optimizadas (Vite + TS + React + Pixi.js) | Alta (esquema web moderno similar a JSON/Tilemaps) | Diseñado específicamente para ejecución en navegador web moderno. |
| **ao-libre/ao-cliente** | Formatos adaptados de la comunidad basados en estándares clásicos y extensiones JSON | Media-Alta | Mantiene compatibilidad con estructuras tradicionales adaptadas a pipelines modernos. |

## 2. Modelado de capas, bloqueos y triggers

- **Editor oficial (VB6):** Utiliza múltiples capas discretas (capas de gráficos 1 a 4), una capa separada de flags de bloqueo (`blocked`) y triggers lógicos para eventos de mapa (áreas seguras, zonas de combate, teleports). 
- **Decisión a adoptar:** Adoptar un modelo desacoplado basado en JSON/Overrides (`meta`, `terrain`, `npcs`, `specials`) que permita una representación flexible y actualizaciones atómicas en la base de datos sin depender de archivos binarios rígidos.

## 3. Edición en vivo y colaborativa

Ninguno de los proyectos tradicionales de escritorio (VB6) implementó edición nativa colaborativa o *in-game* en el navegador. Los intentos previos de herramientas web se limitaron a visualizadores estáticos de mapas debido a la complejidad de sincronizar el estado gráfico y la persistencia en tiempo real.

## 4. Herramientas de Import / Export

- **Viabilidad:** Poder importar mapas creados con el editor oficial (`argentum-online-worldeditor`) representa una ventaja táctica significativa para acelerar la migración del contenido clásico.
- **Recomendación:** Implementar un script de migración o parser auxiliar en la API que lea los archivos `.map` clásicos y los convierta al formato de overrides soportado por OpenAO.

## 5. Análisis de licencias

- **argentum-online-worldeditor (`ao-org`):** Licencia **AGPL-3.0**. Esto implica que cualquier uso de código derivado directamente de este repositorio exige la publicación bajo la misma licencia AGPL-3.0. Por esta razón, **ningún código de dicho editor ha sido ni será copiado**, manteniéndose una implementación 100% original e independiente basada únicamente en conceptos públicos de diseño.
- **lambdaclass/argentum y ao-libre:** Sujetas a sus respectivas licencias de código abierto de comunidad, sirviendo de referencia de arquitectura web.

## 6. Errores conocidos y limitaciones de otros proyectos

1. **Rigidez de los formatos binarios:** Dificultan el versionado en Git y la colaboración en equipo.
2. **Falta de soporte web nativo:** Los editores clásicos dependen de entornos de escritorio obsoletos (Visual Basic 6).
3. **Cuellos de botella en renderizado:** La falta de aceleración por hardware en editores antiguos limitaba fluidez con mapas masivos.
