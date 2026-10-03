# Rango reservado para gráficos subidos

## Decisión de diseño Etapa 1

* **Alcance:** Global. Los gráficos subidos son globales y reutilizables entre mapas.
* **Animación:** Solo tiles estáticos en la Etapa 1. `frames = 1`.
* **Tamaño:** 1 tile por archivo, 32x32. No se trocea automáticamente.

## Rango de IDs

Los gráficos originales del juego ocupan IDs < 100000.

Rango reservado para assets subidos:
```
100000 - 199999
```

El asignador nunca reutiliza IDs y siempre incrementa `nextId` desde `registro_subidos.json`.

Colisión imposible con originales por diseño.
