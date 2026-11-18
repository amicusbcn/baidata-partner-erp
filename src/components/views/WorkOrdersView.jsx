import React from "react";
import {
  BatteryCharging,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export default function DashboardView({
  assetsList,
  workOrders,
  aasAsset,
  onNavigate,
  lang = "es",
}) {
  const { t } = useTranslation(lang);

  const kpis = [
    {
      label: t("dashboard.kpi1Label"),
      value: Math.max(assetsList.length, 4),
      sub: t("dashboard.kpi1Sub"),
      icon: BatteryCharging,
      color: "text-slate-900 bg-slate-100",
    },
    {
      label: t("dashboard.kpi2Label"),
      value: 1,
      sub: t("dashboard.kpi2Sub"),
      icon: Clock,
      color: "text-amber-700 bg-amber-50",
    },
    {
      label: t("dashboard.kpi3Label"),
      value: 2,
      sub: t("dashboard.kpi3Sub"),
      icon: Activity,
      color: "text-indigo-700 bg-indigo-50",
    },
    {
      label: t("dashboard.kpi4Label"),
      value: workOrders.length + 1,
      sub: t("dashboard.kpi4Sub"),
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50",
    },
  ];

  const channels = [
    {
      id: "Canal 1 · Chroma 17011",
      battery: aasAsset?.serial || "BAT-2026-8841",
      task: t("dashboard.ch1Task"),
      progress: 68,
      temp: "24.2 °C",
      status: t("dashboard.statusRunning"),
    },
    {
      id: "Canal 2 · Balanceador Activo",
      battery: "BAT-2026-7719",
      task: t("dashboard.ch2Task"),
      progress: 91,
      temp: "22.8 °C",
      status: t("dashboard.statusFinishing"),
    },
    {
      id: "Canal 3 · Carga Supervisada",
      battery: t("dashboard.ch3Battery"),
      task: t("dashboard.ch3Task"),
      progress: 0,
      temp: "20.1 °C",
      status: t("dashboard.statusFree"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.subtitle")}</p>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-start justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertas de Seguridad Críticas en Litio */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{t("dashboard.alertsTitle")}</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            {t("dashboard.alertsBadge")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-start gap-3">
            <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950">{t("dashboard.alert1Title")}</p>
              <p className="text-rose-800 leading-relaxed">{t("dashboard.alert1Desc")}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  {t("dashboard.alert2TitlePrefix")} {aasAsset?.serial || "BAT-2026-8841"} (ΔV = 48 mV)
                </p>
                <p className="text-amber-800 leading-relaxed">{t("dashboard.alert2Desc")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("diagnostics")}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 inline-flex items-center gap-1"
            >
              <span>{t("dashboard.diagnoseBtn")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Ocupación del Banco de Pruebas */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t("dashboard.benchTitle")}</h2>
            <p className="text-xs text-slate-500">{t("dashboard.benchSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("testbench")}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            {t("dashboard.goBenchLink")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{ch.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ch.progress > 0
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {ch.status}
                </span>
              </div>
              <p className="font-mono font-bold text-slate-900">{ch.battery}</p>
              <p className="text-slate-600">{ch.task}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>
                    {t("dashboard.progress")}: {ch.progress}%
                  </span>
                  <span>Temp: {ch.temp}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${ch.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}