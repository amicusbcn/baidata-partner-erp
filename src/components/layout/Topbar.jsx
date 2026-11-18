import React from "react";
import { QrCode, ExternalLink, RefreshCw, UserPlus, BatteryCharging, Globe } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { localizeDppUrl } from "../../services/aasBridge";

export default function TopBar({
  assetsList,
  selectedAsset,
  onSelectAsset,
  aasAsset,
  aasLoading,
  onSyncAas,
  onOpenNewModal,
  lang = "es",
  onChangeLang,
}) {
  const { t } = useTranslation(lang);
  const localizedDppHref = localizeDppUrl(selectedAsset?.dpp_uri, lang);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
            {t("topbar.activeAsset")}:
          </span>
          <select
            value={selectedAsset?.id || ""}
            onChange={(e) => onSelectAsset(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {assetsList.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.internal_ref} — {asset.customers?.full_name || "Client"} ({asset.asset_label})
              </option>
            ))}
          </select>
        </div>

        {aasAsset && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <BatteryCharging className="w-4 h-4 text-emerald-600" />
            <span className="font-mono font-bold text-slate-800">{aasAsset.serial}</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-emerald-700">SoH {aasAsset.soh}%</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">
              {aasAsset.cycles} {t("topbar.cycles")}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Selector de idioma ES / EN */}
        <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5 text-[11px] font-bold">
          <Globe className="w-3.5 h-3.5 text-slate-400 mx-1.5" />
          {["es", "en"].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onChangeLang(code)}
              className={`px-2 py-1 rounded-lg uppercase transition ${
                lang === code
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          <UserPlus className="w-3.5 h-3.5 text-amber-600" />
          <span>{t("topbar.newClientBtn")}</span>
        </button>

        {selectedAsset?.dpp_uri && (
          <>
            <button
              type="button"
              onClick={() => onSyncAas(selectedAsset.dpp_uri)}
              title={t("topbar.syncTooltip")}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aasLoading ? "animate-spin" : ""}`} />
            </button>

            <a
              href={localizedDppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{t("topbar.openDpp")}</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </>
        )}
      </div>
    </header>
  );
}