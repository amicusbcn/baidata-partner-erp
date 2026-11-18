import React from "react";
import { Globe } from "lucide-react";
import { SECTOR_CONFIG } from "../../config/sectorConfig";

export default function TopBar({ lang = "es", onChangeLang }) {
  const sectorBadge =
    SECTOR_CONFIG.sectorBadge[lang] || SECTOR_CONFIG.sectorBadge.es;

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-800">{SECTOR_CONFIG.partnerName}</span>
        <span className="text-slate-300">/</span>
        <span>{sectorBadge}</span>
      </div>

      {/* Selector de idioma ES / EN a la derecha */}
      <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5 text-[11px] font-bold">
        <Globe className="w-3.5 h-3.5 text-slate-400 mx-1.5" />
        {["es", "en"].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onChangeLang(code)}
            className={`px-2.5 py-1 rounded-lg uppercase transition ${
              lang === code
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    </header>
  );
}