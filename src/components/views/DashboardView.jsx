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
  Plus,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

const BENCH_CHANNELS = [
  "Canal 1 · Chroma 17011",
  "Canal 2 · Balanceador Activo",
  "Canal 3 · Carga Supervisada",
];

export default function DashboardView({
  workOrders = [],
  onSelectAsset,
  onNavigate,
  onOpenNewModal,
  lang = "es",
}) {
  const { t } = useTranslation(lang);

  // KPIs calculados dinámicamente desde Supabase
  const activeOrders = workOrders.filter((w) => w.status !== "closed");
  const pendingApproval = workOrders.filter((w) => w.status === "approval");
  const inBench = workOrders.filter((w) => Boolean(w.sector_metadata?.bench_channel));
  const readyOrders = workOrders.filter((w) => w.status === "ready" || w.edc_synced);
  const quarantineOrders = workOrders.filter((w) => Boolean(w.sector_metadata?.quarantine_alert));

  const kpis = [
    {
      label: t("dashboard.kpi1Label"),
      value: activeOrders.length,
      sub: `${quarantineOrders.length} ${lang === "en" ? "in thermal quarantine" : "en cuarentena térmica"}`,
      icon: BatteryCharging,
      color: "text-slate-900 bg-slate-100",
    },
    {
      label: t("dashboard.kpi2Label"),
      value: pendingApproval.length,
      sub: t("dashboard.kpi2Sub"),
      icon: Clock,
      color: "text-amber-700 bg-amber-50",
    },
    {
      label: t("dashboard.kpi3Label"),
      value: inBench.length,
      sub: `${inBench.length} / ${BENCH_CHANNELS.length} ${lang === "en" ? "channels active" : "canales activos"}`,
      icon: Activity,
      color: "text-indigo-700 bg-indigo-50",
    },
    {
      label: t("dashboard.kpi4Label"),
      value: readyOrders.length,
      sub: t("dashboard.kpi4Sub"),
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50",
    },
  ];

  // Alertas dinámicas extraídas de work_orders (cuarentena o ΔV alto)
  const imbalanceOrders = workOrders.filter((w) => Number(w.sector_metadata?.delta_v_mv || 0) > 20);
  const totalAlerts = quarantineOrders.length + imbalanceOrders.length;

  const handleOpenOrderIn = (assetId, targetTab) => {
    if (assetId && onSelectAsset) onSelectAsset(assetId);
    onNavigate(targetTab);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera con el botón de Nueva Orden a la derecha del título */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{t("dashboard.title")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>{lang === "en" ? "New Work Order / Client" : "Nueva Orden de Trabajo"}</span>
        </button>
      </div>

      {/* KPIs Rápidos (100% Supabase) */}
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

      {/* Alertas de Seguridad Críticas en Litio (desde Supabase) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{t("dashboard.alertsTitle")}</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            {totalAlerts} {lang === "en" ? "active alerts" : "avisos activos"}
          </span>
        </div>

        {totalAlerts === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            {lang === "en"
              ? "No thermal or cell imbalance alerts in the workshop."
              : "Sin alertas térmicas ni de desbalanceo activas en el taller."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {quarantineOrders.map((wo) => (
              <div
                key={wo.id}
                className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-950">
                      {lang === "en" ? "Thermal Quarantine" : "Cuarentena Térmica"} ·{" "}
                      {wo.assets?.internal_ref} ({wo.assets?.customers?.full_name})
                    </p>
                    <p className="text-rose-800 leading-relaxed">
                      {wo.sector_metadata?.quarantine_alert}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenOrderIn(wo.asset_id, "workorders")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0"
                >
                  {lang === "en" ? "Inspect" : "Revisar"}
                </button>
              </div>
            ))}

            {imbalanceOrders.map((wo) => (
              <div
                key={wo.id}
                className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">
                      {t("dashboard.alert2TitlePrefix")} {wo.assets?.internal_ref} (ΔV ={" "}
                      {wo.sector_metadata?.delta_v_mv} mV)
                    </p>
                    <p className="text-amber-800 leading-relaxed">{wo.issue_description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenOrderIn(wo.asset_id, "diagnostics")}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 inline-flex items-center gap-1"
                >
                  <span>{t("dashboard.diagnoseBtn")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ocupación del Banco de Pruebas (desde Supabase) */}
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
          {BENCH_CHANNELS.map((channelName) => {
            const assignedWo = workOrders.find(
              (w) => w.sector_metadata?.bench_channel === channelName
            );
            const progress = Number(assignedWo?.sector_metadata?.bench_progress || 0);
            const temp = assignedWo?.sector_metadata?.bench_temp || "20.2 °C";

            return (
              <div
                key={channelName}
                onClick={() =>
                  assignedWo && handleOpenOrderIn(assignedWo.asset_id, "testbench")
                }
                className={`p-4 rounded-xl border space-y-2.5 transition ${
                  assignedWo
                    ? "bg-slate-50 border-slate-200/90 hover:border-indigo-400 cursor-pointer"
                    : "bg-slate-50/50 border-dashed border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{channelName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      assignedWo
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {assignedWo ? t("dashboard.statusRunning") : t("dashboard.statusFree")}
                  </span>
                </div>

                <p className="font-mono font-bold text-slate-900">
                  {assignedWo
                    ? `${assignedWo.assets?.internal_ref} · ${assignedWo.assets?.customers?.full_name}`
                    : t("dashboard.ch3Battery")}
                </p>
                <p className="text-slate-600 truncate">
                  {assignedWo ? assignedWo.issue_description : t("dashboard.ch3Task")}
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      {t("dashboard.progress")}: {progress}%
                    </span>
                    <span>Temp: {temp}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}