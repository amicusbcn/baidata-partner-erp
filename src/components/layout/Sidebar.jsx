import React from "react";
import {
  LayoutDashboard,
  Kanban,
  ClipboardPlus,
  Cpu,
  Activity,
  Receipt,
  Package,
  Wrench,
} from "lucide-react";
import { SECTOR_CONFIG } from "../../config/sectorConfig";

export default function Sidebar({
  activeTab,
  onSelectTab,
  counts = {},
  lang = "es",
}) {
  const navGroups = [
    {
      title: lang === "en" ? "Overview" : "Visión General",
      items: [
        {
          id: "dashboard",
          label: lang === "en" ? "Dashboard & Safety" : "Dashboard",
          icon: LayoutDashboard,
        },
        {
          id: "workorders",
          label: lang === "en" ? "Work Orders (Kanban)" : "Órdenes de Trabajo",
          icon: Kanban,
          badge: counts.totalActive,
        },
      ],
    },
    {
      title: lang === "en" ? "Workshop Workflow" : "Flujo de Taller",
      items: [
        {
          id: "reception",
          label: lang === "en" ? "Intake (New Order)" : "Recepción (Nueva Orden)",
          icon: ClipboardPlus,
          badge: counts.reception,
        },
        {
          id: "diagnostics",
          label: lang === "en" ? "Diagnostics & Quotes" : "Diagnóstico",
          icon: Cpu,
          badge: counts.diagnostics,
        },
        {
          id: "workshop",
          label: lang === "en" ? "Workshop & Testing" : "Taller / Pruebas",
          icon: Activity,
          badge: counts.workshop,
        },
        {
          id: "billing",
          label: lang === "en" ? "Billing & Delivery" : "Entrega y Facturación",
          icon: Receipt,
          badge: counts.billing,
        },
      ],
    },
    {
      title: lang === "en" ? "Warehouse" : "Almacén",
      items: [
        {
          id: "inventory",
          label: lang === "en" ? "Inventory & Batches" : "Inventario y Lotes",
          icon: Package,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-sm text-slate-900 truncate">
              {SECTOR_CONFIG.partnerName}
            </p>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              DMS Industrial · v2.5
            </p>
          </div>
        </div>

        <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
          <span className="font-mono text-slate-600 truncate">{SECTOR_CONFIG.partnerDid}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 shrink-0 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            EDC
          </span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-amber-400" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Conector Soberano IDSA</p>
        <p className="font-mono text-[10px] truncate">{SECTOR_CONFIG.edcConnectorUrl}</p>
      </div>
    </aside>
  );
}