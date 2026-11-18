import React, { useState } from "react";
import { Cpu, Wrench, CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

const INITIAL_CELL_MATRIX = [
  { group: "S1", voltageMv: 3692, irMohm: 14.1, tempC: 23.4 },
  { group: "S2", voltageMv: 3689, irMohm: 14.3, tempC: 23.5 },
  { group: "S3", voltageMv: 3691, irMohm: 14.0, tempC: 23.6 },
  { group: "S4", voltageMv: 3642, irMohm: 19.8, tempC: 25.1 },
  { group: "S5", voltageMv: 3688, irMohm: 14.2, tempC: 23.7 },
  { group: "S6", voltageMv: 3690, irMohm: 14.1, tempC: 23.5 },
  { group: "S7", voltageMv: 3693, irMohm: 13.9, tempC: 23.4 },
  { group: "S8", voltageMv: 3687, irMohm: 14.4, tempC: 23.5 },
  { group: "S9", voltageMv: 3690, irMohm: 14.2, tempC: 23.3 },
  { group: "S10", voltageMv: 3691, irMohm: 14.1, tempC: 23.2 },
];

export default function DiagnosticsView({ aasAsset, onNavigate, lang = "es" }) {
  const { t } = useTranslation(lang);
  const [matrix, setMatrix] = useState(INITIAL_CELL_MATRIX);
  const [balanced, setBalanced] = useState(false);

  const voltages = matrix.map((c) => c.voltageMv);
  const deltaV = Math.max(...voltages) - Math.min(...voltages);

  const handleSimulateBalance = () => {
    setMatrix((prev) =>
      prev.map((c) =>
        c.group === "S4"
          ? { ...c, voltageMv: 3689, irMohm: 14.2, tempC: 23.5 }
          : c
      )
    );
    setBalanced(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{t("diagnostics.title")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("diagnostics.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("testbench")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
        >
          <span>{t("diagnostics.goBenchBtn")}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Identificación y Telemetría BMS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t("diagnostics.idAasLabel")}
          </span>
          <p className="font-bold text-sm text-slate-900">
            {aasAsset?.productName || "Modular Battery e-Bike E-625"}
          </p>
          <p className="font-mono text-slate-500">
            {aasAsset?.serial || "BAT-2026-8841"} · {aasAsset?.manufacturer || "IberiaVolt"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t("diagnostics.archLabel")}
          </span>
          <p className="font-bold text-sm text-slate-900">
            {aasAsset?.architecture || "10S4P (21700 NMC 811)"}
          </p>
          <p className="font-mono text-indigo-600">
            {t("diagnostics.manualLabel")}: {aasAsset?.dismantling || "DOC-DIS-E625"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t("diagnostics.sohLabel")}
          </span>
          <p className="text-2xl font-extrabold text-emerald-600">{aasAsset?.soh ?? 91.5}%</p>
          <p className="text-slate-500">
            {aasAsset?.cycles ?? 145} {t("diagnostics.cycles")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {t("diagnostics.imbalanceLabel")}
          </span>
          <p
            className={`text-2xl font-extrabold ${
              deltaV > 20 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {deltaV} mV
          </p>
          <p className="text-slate-500">
            {deltaV > 20 ? t("diagnostics.imbalanceHigh") : t("diagnostics.imbalanceOk")}
          </p>
        </div>
      </div>

      {/* Matriz de Voltaje por Grupo (Cell Matrix S1 - S10) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("diagnostics.matrixTitle")}</h2>
              <p className="text-xs text-slate-500">{t("diagnostics.matrixSubtitle")}</p>
            </div>
          </div>

          {!balanced ? (
            <button
              type="button"
              onClick={handleSimulateBalance}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{t("diagnostics.balanceBtn")}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> {t("diagnostics.balancedBadge")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {matrix.map((cell) => {
            const isDegraded = cell.voltageMv < 3660;
            return (
              <div
                key={cell.group}
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isDegraded
                    ? "bg-amber-50 border-amber-300"
                    : "bg-slate-50 border-slate-200/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">{cell.group}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isDegraded
                        ? "bg-amber-200 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isDegraded ? t("diagnostics.highDeltaBadge") : "OK"}
                  </span>
                </div>
                <p className="text-base font-mono font-extrabold text-slate-900">
                  {(cell.voltageMv / 1000).toFixed(3)} V
                </p>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>IR: {cell.irMohm} mΩ</span>
                  <span>{cell.tempC}°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}