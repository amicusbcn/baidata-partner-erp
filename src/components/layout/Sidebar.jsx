import React from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Cpu,
  Activity,
  Package,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { useTranslation } from "../../hooks/useTranslation";

export default function Sidebar({
  activeTab,
  onSelectTab,
  pendingOrdersCount = 0,
  lang = "es",
}) {
  const { t } = useTranslation(lang);

  const navGroups = [
    {
      title: t("nav.opsGroup"),
      items: [
        { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { id: "workorders", label: t("nav.workorders"), icon: ClipboardCheck },
      ],
    },
    {
      title: t("nav.engGroup"),
      items: [
        { id: "diagnostics", label: t("nav.diagnostics"), icon: Cpu },
        { id: "testbench", label: t("nav.testbench"), icon: Activity, highlight: true },
      ],
    },
    {
      title: t("nav.resGroup"),
      items: [
        { id: "inventory", label: t("nav.inventory"), icon: Package },
        { id: "traceability", label: t("nav.traceability"), icon: ShieldCheck },
        { id: "customers", label: t("nav.customers"), icon: Users },
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
              DMS Industrial · v2.4
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
                        isActive
                          ? "text-amber-400"
                          : item.highlight
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === "workorders" && pendingOrdersCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">{t("nav.nodeTitle")}</p>
        <p className="font-mono text-[10px] truncate">{SECTOR_CONFIG.edcConnectorUrl}</p>
      </div>
    </aside>
  );
}