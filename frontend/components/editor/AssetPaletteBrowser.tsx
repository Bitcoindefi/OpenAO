"use client";

import React, { useState, useMemo, useEffect } from "react";

export type AssetCategory = "objects" | "terrain" | "npcs";

export interface AssetItem {
  id: number;
  name: string;
  category: AssetCategory;
  subType?: string;
  grhIndex: number;
  description?: string;
}

export const OBJECT_TYPES = [
  "Todos",
  "Armas",
  "Armaduras",
  "Pociones",
  "Comida",
  "Árboles",
  "Yacimientos",
  "Puertas",
  "Cofres",
  "Carteles",
  "Herramientas",
  "Oro",
  "Barcos"
] as const;

interface AssetPaletteBrowserProps {
  onSelectAsset?: (asset: AssetItem) => void;
  selectedAssetId?: number | null;
}

export function AssetPaletteBrowser({ onSelectAsset, selectedAssetId }: AssetPaletteBrowserProps) {
  const [activeTab, setActiveTab] = useState<AssetCategory>("objects");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Todos");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recentItems, setRecentItems] = useState<AssetItem[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Load favorites and recents from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem("openao_editor_favorites");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      const savedRecents = localStorage.getItem("openao_editor_recents");
      if (savedRecents) setRecentItems(JSON.parse(savedRecents));
    } catch (e) {}
  }, []);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem("openao_editor_favorites", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // Mock catalog dataset representative of AO asset database
  const catalog: AssetItem[] = useMemo(() => {
    const items: AssetItem[] = [];
    // Generate standard catalog
    for (let i = 1; i <= 1062; i++) {
      let subType = "Objetos Varios";
      if (i < 100) subType = "Armas";
      else if (i < 200) subType = "Armaduras";
      else if (i < 300) subType = "Pociones";
      else if (i < 400) subType = "Comida";
      else if (i < 500) subType = "Árboles";
      else if (i < 600) subType = "Yacimientos";

      items.push({
        id: i,
        name: `Objeto #${i} (${subType})`,
        category: "objects",
        subType,
        grhIndex: 500 + (i % 200),
        description: `Gráfico GRH #${500 + (i % 200)}`
      });
    }
    return items;
  }, []);

  const filteredAssets = useMemo(() => {
    return catalog.filter(item => {
      if (item.category !== activeTab) return false;
      if (selectedType !== "Todos" && item.subType !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || String(item.id).includes(q);
      }
      return true;
    });
  }, [catalog, activeTab, selectedType, searchQuery]);

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, page]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  const handleSelect = (asset: AssetItem) => {
    onSelectAsset?.(asset);
    setRecentItems(prev => {
      const filtered = prev.filter(x => x.id !== asset.id);
      const next = [asset, ...filtered].slice(0, 15);
      try {
        localStorage.setItem("openao_editor_recents", JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg text-slate-100 overflow-hidden shadow-xl w-80 select-none">
      {/* Tab Selector */}
      <div className="flex bg-slate-950 border-b border-slate-800 p-1 gap-1">
        {(["objects", "terrain", "npcs"] as AssetCategory[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded uppercase tracking-wider transition ${
              activeTab === tab ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {tab === "objects" ? "Objetos" : tab === "terrain" ? "Terreno" : "NPCs"}
          </button>
        ))}
      </div>

      {/* Search & Filter Header */}
      <div className="p-2 border-b border-slate-800 space-y-2 bg-slate-900/80">
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o ID..."
          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        {activeTab === "objects" && (
          <select
            value={selectedType}
            onChange={e => { setSelectedType(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {OBJECT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Recents / Favorites Bar */}
      {recentItems.length > 0 && (
        <div className="px-2 py-1 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400">
          <span className="text-[10px] font-bold text-indigo-400">Recientes:</span>
          {recentItems.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 text-[10px] whitespace-nowrap"
            >
              #{item.id}
            </button>
          ))}
        </div>
      )}

      {/* Asset Grid */}
      <div className="flex-1 p-2 overflow-y-auto grid grid-cols-3 gap-2 auto-rows-max bg-slate-950/40">
        {paginatedAssets.map(asset => {
          const isSelected = selectedAssetId === asset.id;
          const isFav = favorites.includes(asset.id);
          return (
            <div
              key={asset.id}
              onClick={() => handleSelect(asset)}
              className={`group relative flex flex-col items-center justify-center p-2 rounded border cursor-pointer transition ${
                isSelected
                  ? "bg-indigo-950/80 border-indigo-500 ring-1 ring-indigo-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80"
              }`}
            >
              {/* Star Favorite Button */}
              <button
                onClick={(e) => toggleFavorite(asset.id, e)}
                className={`absolute top-1 right-1 text-xs opacity-0 group-hover:opacity-100 transition ${
                  isFav ? "!opacity-100 text-amber-400" : "text-slate-500 hover:text-amber-300"
                }`}
              >
                ★
              </button>

              {/* Graphic Preview Container */}
              <div className="w-12 h-12 flex items-center justify-center bg-slate-950 rounded border border-slate-800/80 mb-1.5 overflow-hidden">
                <span className="text-[9px] font-mono text-indigo-400">GRH {asset.grhIndex}</span>
              </div>

              {/* Label */}
              <span className="text-[10px] text-center font-medium text-slate-300 line-clamp-1 w-full">
                #{asset.id}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400">
        <span>{filteredAssets.length} elementos</span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
          >
            ◀
          </button>
          <span className="text-slate-200">{page} / {totalPages || 1}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
