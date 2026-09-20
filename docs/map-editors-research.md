# Investigación: cómo editan mapas los otros proyectos de Argentum Online

> Parte de #2 (modo construcción). Documento de investigación sin dependencias.
>
> **Objetivo:** documentar cómo edita mapas el resto del ecosistema de Argentum
> Online para (a) no repetir errores que otros ya cometieron y (b) justificar las
> decisiones de diseño del modo construcción de `openao`.

---

## 1. Proyectos revisados

| Proyecto | Qué es | Stack | Licencia |
|---|---|---|---|
| [ao-org/argentum-online-worldeditor](https://github.com/ao-org/argentum-online-worldeditor) | Editor oficial de mapas | VB6, escritorio | AGPL-3.0 |
| [lambdaclass/argentum](https://github.com/lambdaclass/argentum) | Cliente web | Vite + TypeScript + React + Pixi.js | Ver sección 5 |
| [ao-libre/ao-cliente](https://github.com/ao-libre/ao-cliente) | Cliente de la comunidad | (cliente de juego) | Ver sección 5 |

> **Nota de alcance:** este documento se centra en la *edición de mapas*.
> `lambdaclass/argentum` y `ao-libre/ao-cliente` son principalmente *clientes*
> (renderizan mapas, no los editan). Se documenta su formato de mapa y su
> relación con el editor oficial, pero no tienen un editor de mapas propio.
> El único editor real del ecosistema es el **World Editor oficial (VB6)**.

---

## 2. Formato de mapa: tabla comparativa

### 2.1 Nuestro formato (`openao`)

El modo construcción de `openao` modela un mapa como un objeto JSON con cuatro
secciones de primer nivel:

