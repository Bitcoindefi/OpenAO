# Investigación: cómo editan mapas otros proyectos de Argentum Online

> Parte de la issue #2 (modo construcción). Documento de investigación sin dependencias.
>
> Objetivo: documentar cómo edita mapas el resto del ecosistema de Argentum Online para
> no repetir errores ya cometidos y para justificar las decisiones de diseño del modo
> construcción de `openao`.

## Proyectos revisados

| Proyecto | Qué es | Stack | Licencia |
|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial de mapas | VB6, escritorio | AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente web | Vite + TypeScript + React + Pixi.js | — |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de la comunidad | — | — |

> Nota: la información de cada proyecto se basa en su documentación pública, su
> estructura de código y sus issues. Donde no hay certeza se marca explícitamente.

---

## 1. Formato de mapa

### Nuestro formato (`openao`)

Nuestro formato de mapa es JSON estructurado con cuatro secciones principales:

