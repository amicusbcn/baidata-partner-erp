import React from "react";
import { ArrowUpRight, Plus } from "lucide-react";

const STATUS_BADGES = {
  received: { es: "Recepcionada", en: "Received", cls: "bg-slate-200 text-slate-800" },
  quarantine: { es: "Cuarentena", en: "Quarantine", cls: "bg-rose-100 text-rose-800" },
  diagnosing: { es: "En Diagnóstico", en: "Diagnosing", cls: "bg-amber-100 text-amber-800" },
  approval: { es: "Pte. Presupuesto", en: "Quote Pending", cls: "bg-purple-100 text-purple-800" },
  repairing: { es: "En Taller", en: "In Workshop", cls: "bg-indigo-100 text-indigo-800" },
  testing: { es: "En Pruebas", en: "In Testing", cls: "bg-cyan-100 text-cyan-800" },
  ready: { es: "Lista Entrega", en: "Ready", cls: "bg-emerald-100 text-emerald-800" },
};

export default function WorkOrdersView({
  workOrders = [],
  onOpenOrder,
  onStartNewOrder,
  lang = "es",
}) {
  const columns = [
    {
      id: "col_reception",
      title: lang === "en" ? "Intake / Quarantine" : "Recepción / Cuarentena",
      statuses: ["received", "quarantine"],
    },
    {
      id: "col_diagnostics",
      title: lang === "en" ? "Diagnostics & Quote" : "Diagnóstico / Pte. OK",
      statuses: ["diagnosing", "approval"],
    },
    {
      id: "col_workshop",
      title: lang === "en" ? "Workshop & Testing" : "En Taller / Pruebas",
      statuses: ["repairing", "testing"],
    },
    {
      id: "col_ready",
      title: lang === "en" ? "Ready for Delivery" : "Listas para Entrega",
      statuses: ["ready"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {lang === "en" ? "Active Work Orders (Kanban)" : "Órdenes de Trabajo Activas (Kanban)"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "en"
              ? "Click any battery card to open its detail view in its current workflow stage"
              : "Haz clic en cualquier tarjeta para abrir el detalle de la batería en la sección correspondiente a su fase"}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewOrder}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>{lang === "en" ? "New Work Order" : "Nueva Orden de Trabajo"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colOrders = workOrders.filter((w) => col.statuses.includes(w.status));
          return (
            <div
              key={col.id}
              className="bg-slate-100/90 rounded-2xl border border-slate-200 p-3.5 space-y-3 min-h-[420px]"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-800">{col.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-700">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {colOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8 italic">
                    {lang === "en" ? "No batteries in this stage" : "Sin baterías en esta fase"}
                  </p>
                ) : (
                  colOrders.map((wo) => {
                    const badge = STATUS_BADGES[wo.status] || STATUS_BADGES.received;
                    return (
                      <div
                        key={wo.id}
                        onClick={() => onOpenOrder(wo)}
                        className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 p-3.5 shadow-2xs hover:shadow-sm cursor-pointer transition space-y-2 text-xs group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[11px] text-slate-500">
                            {wo.assets?.internal_ref || "BAT-REF"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                            {badge[lang] || badge.es}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {wo.assets?.customers?.full_name || "Cliente"}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate">
                            {wo.assets?.asset_label}
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {wo.issue_description || wo.operation_code}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-indigo-600">
                          <span className="font-mono text-[10px] text-slate-400">
                            {wo.aas_srn_id ? `AAS: ${wo.aas_srn_id}` : ""}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            {lang === "en" ? "Open file" : "Abrir ficha"}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}