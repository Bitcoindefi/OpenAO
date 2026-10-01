/**
 * Catalogo de tipos de objeto del juego.
 *
 * Los tipos se derivan del propio objs.json del juego (ver public/init/objs.json),
 * no de una convencion externa: cada tipo enumera los ids que le pertenecen y la
 * etiqueta se deduce del nombre mas repetido de sus objetos.
 */
export type ObjectTypeId =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 37;

export type ObjectType = {
    id: number;
    label: string;
    color: string;
};

const OBJECT_TYPE_COLORS: Record<string, string> = {
    "1": "#fbbf24", // Comida
    "2": "#ef4444", // Armas
    "3": "#3b82f6", // Armaduras
    "4": "#22c55e", // Arboles
    "5": "#eab308", // Dinero
    "6": "#a16207", // Puertas
    "7": "#f97316", // Cofres
    "8": "#94a3b8", // Carteles
    "9": "#facc15", // Llaves
    "10": "#d946ef", // Foros
    "11": "#a855f7", // Pociones
    "12": "#8b5cf6", // Libros
    "13": "#14b8a6", // Bebidas
    "14": "#b45309", // Lena
    "15": "#f97316", // Fogata
    "16": "#6366f1", // Escudos
    "17": "#06b6d4", // Cascos
    "18": "#ec4899", // Instrumentos
    "19": "#0ea5e9", // Teleports
    "20": "#d97706", // Muebles
    "21": "#78716c", // Decoracion
    "22": "#84cc16", // Yacimientos
    "23": "#10b981", // Minerales
    "24": "#c026d3", // Magia
    "26": "#f59e0b", // Cuerno de clan
    "27": "#64748b", // Yunque
    "28": "#ef4444", // Fragua
    "29": "#22d3ee", // Lingotes y gemas
    "30": "#a3e635", // Pieles y flores
    "31": "#38bdf8", // Barcos
    "32": "#fb923c", // Flechas
    "33": "#fcd34d", // Odre vacia
    "34": "#fde68a", // Odre
    "35": "#e7e5e4", // Misc
    "37": "#fbbf24", // Mochilas
};

const OBJECT_TYPE_LABELS: Record<string, string> = {
    "1": "Comida",
    "2": "Armas",
    "3": "Armaduras",
    "4": "Arboles",
    "5": "Dinero",
    "6": "Puertas",
    "7": "Cofres",
    "8": "Carteles",
    "9": "Llaves",
    "10": "Foros",
    "11": "Pociones",
    "12": "Libros",
    "13": "Bebidas",
    "14": "Lena",
    "15": "Fogatas",
    "16": "Escudos",
    "17": "Cascos",
    "18": "Instrumentos",
    "19": "Teleports",
    "20": "Muebles",
    "21": "Decoracion",
    "22": "Yacimientos",
    "23": "Minerales",
    "24": "Magia",
    "26": "Cuerno de clan",
    "27": "Yunques",
    "28": "Fraguas",
    "29": "Lingotes y gemas",
    "30": "Pieles y flores",
    "31": "Barcos",
    "32": "Flechas",
    "33": "Odres vacias",
    "34": "Odres",
    "35": "Misc",
    "37": "Mochilas",
};

export const OBJECT_TYPES: ObjectType[] = Object.keys(OBJECT_TYPE_LABELS).map(
    (key) => ({
        id: Number(key),
        label: OBJECT_TYPE_LABELS[key],
        color: OBJECT_TYPE_COLORS[key] ?? "#78716c",
    }),
);

export function getObjectType(id: number): ObjectType | null {
    return OBJECT_TYPES.find((entry) => entry.id === id) ?? null;
}