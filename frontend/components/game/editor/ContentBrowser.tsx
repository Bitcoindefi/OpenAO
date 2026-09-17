"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import {
    buildNpcEntries,
    buildObjectEntries,
    buildTerrainEntries,
    filterCatalogEntries,
    getGraphicPreviewUrl,
    updateRecentIds,
    type CatalogEntry,
    type CatalogKind,
} from "@/lib/content-browser";
import {
    getTexturePath,
    loadBodiesDB,
    loadGraphicsDB,
    loadHeadsDB,
    loadMapData,
    loadNPCsDB,
    loadObjectsDB,
} from "@/utils/gameLoader";
import type { GraphicData, GraphicsDB } from "@/types/game";

const STORAGE_KEY = "openao-content-browser-v1";
const ROW_HEIGHT = 54;
const VIEWPORT_HEIGHT = 378;
const OVERSCAN = 5;

export type EditorSelection = CatalogEntry & { layer: number };

const OBJECT_TYPES: Record<number, string> = {
    1: "Comida", 2: "Arma", 3: "Armadura", 4: "Árbol", 5: "Dinero",
    6: "Puerta", 7: "Contenedor", 8: "Cartel", 9: "Llave", 10: "Foro",
    11: "Poción", 12: "Libro", 13: "Bebida", 14: "Leña", 15: "Fogata",
    16: "Escudo", 17: "Casco", 18: "Anillo", 19: "Teleport", 20: "Mueble",
    21: "Joyas", 22: "Yacimiento", 23: "Pergamino", 24: "Aura", 25: "Instrumento",
    26: "Yunque", 27: "Fragua", 28: "Barco", 29: "Flecha", 30: "Botella vacía",
    31: "Botella llena", 32: "Mancha", 33: "Pasaje", 34: "Mapa", 35: "Montura",
    36: "Runa", 37: "Especial",
};

const typeLabel = (kind: CatalogKind, type: number | null) => {
    if (type == null) return kind === "terrain" ? "Terreno" : "Sin tipo";
    return kind === "object" ? (OBJECT_TYPES[type] ?? `Tipo ${type}`) : `Tipo ${type}`;
};

function GraphicPreview({ data, head, graphicId, headGraphicId }: { data?: GraphicData; head?: GraphicData; graphicId?: number | null; headGraphicId?: number | null }) {
    const render = (graphic?: GraphicData, grhIndex?: number | null, zIndex = 1) => {
        if (!graphic?.numFile) return null;
        const scale = Math.min(1, 40 / Math.max(graphic.width, graphic.height, 1));
        return <span aria-hidden style={{
            position: "absolute", left: "50%", bottom: 2, zIndex,
            width: graphic.width, height: graphic.height,
            backgroundImage: `url(${grhIndex ? getGraphicPreviewUrl(grhIndex, graphic.numFile) : getTexturePath(graphic)})`,
            backgroundPosition: grhIndex && getGraphicPreviewUrl(grhIndex, graphic.numFile).startsWith("/api/") ? "0 0" : `-${graphic.sX}px -${graphic.sY}px`,
            backgroundRepeat: "no-repeat", imageRendering: "pixelated",
            transform: `translateX(-50%) scale(${scale})`, transformOrigin: "bottom center",
        }} />;
    };
    return <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/35">
        {render(data, graphicId)}{render(head, headGraphicId, 2)}
        {!data ? <span className="grid h-full place-items-center text-[9px] text-slate-500">sin GRH</span> : null}
    </span>;
}

export default function ContentBrowser({ mapNumber, onSelect }: {
    mapNumber: number;
    onSelect: (selection: EditorSelection | null) => void;
}) {
    const [tab, setTab] = useState<CatalogKind>("object");
    const [entries, setEntries] = useState<Record<CatalogKind, CatalogEntry[]>>({ object: [], terrain: [], npc: [] });
    const [graphics, setGraphics] = useState<GraphicsDB>({});
    const [query, setQuery] = useState("");
    const [type, setType] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Record<CatalogKind, string[]>>({ object: [], terrain: [], npc: [] });
    const [recent, setRecent] = useState<Record<CatalogKind, string[]>>({ object: [], terrain: [], npc: [] });
    const [scope, setScope] = useState<"all" | "favorites" | "recent">("all");
    const [layer, setLayer] = useState(1);
    const [scrollTop, setScrollTop] = useState(0);
    const [loading, setLoading] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (stored?.favorites) setFavorites(stored.favorites);
            if (stored?.recent) setRecent(stored.recent);
        } catch { /* ignore restricted storage */ }
    }, []);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites, recent })); } catch { /* ignore */ }
    }, [favorites, recent]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([loadGraphicsDB(), loadObjectsDB(), loadNPCsDB(), loadBodiesDB(), loadHeadsDB(), loadMapData(mapNumber)])
            .then(([graphicsDb, objects, npcs, bodies, heads, map]) => {
                if (cancelled) return;
                setGraphics(graphicsDb);
                setEntries({
                    object: buildObjectEntries(objects),
                    terrain: buildTerrainEntries(map, mapNumber, graphicsDb),
                    npc: buildNpcEntries(npcs, bodies, heads),
                });
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [mapNumber]);

    const filtered = useMemo(() => {
        let result = filterCatalogEntries(entries[tab], query, type);
        const ids = scope === "favorites" ? favorites[tab] : scope === "recent" ? recent[tab] : null;
        if (ids) {
            const rank = new Map(ids.map((id, index) => [id, index]));
            result = result.filter((entry) => rank.has(entry.id)).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
        }
        return result;
    }, [entries, favorites, query, recent, scope, tab, type]);

    const types = useMemo(() => [...new Set(entries[tab].map((entry) => entry.type).filter((value): value is number => value != null))].sort((a, b) => a - b), [entries, tab]);
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(filtered.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN);
    const visible = filtered.slice(start, end);

    const select = (entry: CatalogEntry) => {
        setSelectedId(entry.id);
        setRecent((current) => ({ ...current, [tab]: updateRecentIds(current[tab], entry.id) }));
        onSelect({ ...entry, layer });
    };

    return <aside className="flex h-[672px] w-[310px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl" aria-label="Navegador de contenido del editor">
        <header className="border-b border-slate-800 px-3 py-3">
            <div className="flex items-center justify-between"><strong className="text-sm">Contenido del mapa</strong><span className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">MAPA {mapNumber}</span></div>
            <div className="mt-3 grid grid-cols-3 gap-1" role="tablist">
                {([['object','Objetos'],['terrain','Terreno'],['npc','NPCs']] as const).map(([id,label]) => (
    <button
        key={id}
        role="tab"
        aria-selected={tab === id}
        onClick={() => {
            setTab(id);
            setType("all");
            setSelectedId(null);
            setScrollTop(0);
            onSelect(null);
        }}
        className={
            tab === id
                ? "rounded-md bg-emerald-500 px-2 py-2 text-xs font-semibold text-slate-950"
                : "rounded-md bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
        }
    >
        {label}
    </button>
))}
            </div>
        </header>
        <div className="space-y-2 border-b border-slate-800 p-3">
            <input value={query} onChange={(event) => { setQuery(event.target.value); setScrollTop(0); }} placeholder={`Buscar ${tab === 'npc' ? 'NPC' : tab === 'object' ? 'objeto' : 'GRH'}…`} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-emerald-400" aria-label="Buscar contenido" />
            <div className="flex gap-2">
                {tab !== 'terrain' ? <select value={type} onChange={(event) => setType(event.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs"><option value="all">Todos los tipos</option>{types.map((value) => <option key={value} value={value}>{typeLabel(tab,value)}</option>)}</select> : <select value={layer} onChange={(event) => { const next=Number(event.target.value); setLayer(next); const selected = entries[tab].find((entry) => entry.id === selectedId); if(selected) onSelect({...selected,layer:next}); }} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs" aria-label="Capa"><option value={1}>Capa 1</option><option value={2}>Capa 2</option><option value={3}>Capa 3</option><option value={4}>Capa 4</option></select>}
                <span className="rounded-md bg-slate-800 px-2 py-2 text-[10px] text-slate-400">{filtered.length}</span>
            </div>
            <div className="flex gap-1">{([['all','Todos'],['favorites','Favoritos'],['recent','Recientes']] as const).map(([id,label]) => (
    <button
        key={id}
        type="button"
        onClick={() => setScope(id)}
        className={
            scope === id
                ? "rounded px-2 py-1 text-[10px] text-amber-200 bg-amber-400/20"
                : "rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800"
        }
    >
        {label}
    </button>
))}</div>
        </div>
        <div ref={listRef} className="relative flex-1 overflow-y-auto" style={{ height: VIEWPORT_HEIGHT }} onScroll={(event)=>setScrollTop(event.currentTarget.scrollTop)}>
            {loading ? <div className="p-6 text-center text-xs text-slate-400">Cargando catálogo…</div> : filtered.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">Sin resultados</div> : <div style={{ height: filtered.length * ROW_HEIGHT, position:'relative' }}>
                {visible.map((entry,index) => { const y=(start+index)*ROW_HEIGHT; const fav=favorites[tab].includes(entry.id); return <button key={entry.id} onClick={()=>select(entry)} className={`absolute left-0 flex w-full items-center gap-2 border-b border-slate-800/70 px-2 text-left hover:bg-slate-800 ${selectedId===entry.id?'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/50':''}`} style={{top:y,height:ROW_HEIGHT}}>
                    <GraphicPreview data={entry.graphicId ? graphics[String(entry.graphicId)] : undefined} head={entry.headGraphicId ? graphics[String(entry.headGraphicId)] : undefined} graphicId={entry.graphicId} headGraphicId={entry.headGraphicId}/>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{entry.name}</span><span className="block truncate text-[10px] text-slate-500">#{entry.id} · {typeLabel(tab,entry.type)}{entry.uploaded?' · subido':''}</span></span>
                    <span role="button" tabIndex={0} aria-label={fav?'Quitar de favoritos':'Añadir a favoritos'} onClick={(event)=>{event.stopPropagation();setFavorites(current=>({...current,[tab]:fav?current[tab].filter(id=>id!==entry.id):[entry.id,...current[tab]]}))}} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.currentTarget.click();}}} className={`rounded p-2 ${fav?'text-amber-300':'text-slate-600 hover:text-amber-300'}`}><Star size={14} fill={fav?'currentColor':'none'}/></span>
                </button>; })}
            </div>}
        </div>
        <footer className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-400">Seleccioná y hacé clic en el mapa para colocar. Lista virtualizada.</footer>
    </aside>;
}
