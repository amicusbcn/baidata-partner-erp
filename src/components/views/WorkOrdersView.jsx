import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export default function WorkOrdersView({ selectedAsset, onNavigate, lang = "es" }) {
  const { t } = useTranslation(lang);

  const kanbanColumns = [
    { id: "received", title: t("workorders.colReceived"), badge: "bg-slate-200 text-slate-800" },
    { id: "diagnosing", title: t("workorders.colDiagnosing"), badge: "bg-amber-100 text-amber-800" },
    { id: "approval", title: t("workorders.colApproval"), badge: "bg-purple-100 text-purple-800" },
    { id: "repairing", title: t("workorders.colRepairing"), badge: "bg-indigo-100 text-indigo-800" },
    { id: "ready", title: t("workorders.colReady"), badge: "bg-emerald-100 text-emerald-800" },
  ];

  const [zones, setZones] = useState({
    topShell: false,
    mainConnector: false,
    chargePort: true,
    mountingRails: false,
  });

  const [safetyChecks, setSafetyChecks] = useState({
    tempOk: true,
    noOdor: true,
    noSwelling: true,
  });

  const [cards, setCards] = useState([
    {
      id: "OT-2026-104",
      serial: "ORBEA-RISE-M10-8841",
      client: "Ane Miren Etxebarria",
      issue: "Pérdida de autonomía / BMS alert",
      stage: "diagnosing",
    },
    {
      id: "OT-2026-103",
      serial: "BH-ATOMX-7719",
      client: "Bilbao E-Bike Tours S.L. (B2B)",
      issue: "Módulo 10S4P + IP67 sealing",
      stage: "repairing",
    },
    {
      id: "OT-2026-102",
      serial: "TREK-RAIL-5520",
      client: "Mikel Agirre",
      issue: "Charge port inspection",
      stage: "approval",
    },
    {
      id: "OT-2026-101",
      serial: "SPECIALIZED-LEVO-3310",
      client: "Laura Mendizabal",
      issue: "BMS Firmware + 1C Load Test",
      stage: "ready",
    },
  ]);

  useEffect(() => {
    if (!selectedAsset) return;
    setCards((prev) =>
      prev.map((c, idx) =>
        idx === 0
          ? {
              ...c,
              serial: selectedAsset.internal_ref || c.serial,
              client: selectedAsset.customers?.full_name || c.client,
            }
          : c
      )
    );
  }, [selectedAsset]);

  const toggleZone = (key) => setZones((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleCheck = (key) => setSafetyChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const advanceCard = (cardId) => {
    const order = kanbanColumns.map((c) => c.id);
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const nextIdx = Math.min(order.indexOf(c.stage) + 1, order.length - 1);
        return { ...c, stage: order[nextIdx] };
      })
    );
  };

  const allSafetyPassed = Object.values(safetyChecks).every(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{t("workorders.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("workorders.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Check-in físico de carcasa */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("workorders.checkinTitle")}</h2>
              <p className="text-xs text-slate-500">{t("workorders.checkinSubtitle")}</p>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              {selectedAsset?.internal_ref || "BAT-2026-8841"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {[
              { key: "topShell", label: t("workorders.zoneTop") },
              { key: "mainConnector", label: t("workorders.zoneMain") },
              { key: "chargePort", label: t("workorders.zoneCharge") },
              { key: "mountingRails", label: t("workorders.zoneRails") },
            ].map((item) => {
              const damaged = zones[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleZone(item.key)}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                    damaged
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      damaged ? "bg-amber-200 text-amber-900" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {damaged ? t("workorders.incident") : "OK"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Checklist obligatorio de seguridad */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("workorders.safetyTitle")}</h2>
              <p className="text-xs text-slate-500">{t("workorders.safetySubtitle")}</p>
            </div>
            {allSafetyPassed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5"/> {t("workorders.safetyOk")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5"/> {t("workorders.safetyQuarantine")}
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {[
              { key: "tempOk", label: t("workorders.chkTemp") },
              { key: "noOdor", label: t("workorders.chkOdor") },
              { key: "noSwelling", label: t("workorders.chkSwelling") },
            ].map((chk) => {
              const checked = safetyChecks[chk.key];
              return (
                <button
                  key={chk.key}
                  type="button"
                  onClick={() => toggleCheck(chk.key)}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 text-left"
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0"/>
                  ) : (
                    <Circle className="w-4 h-4 text-rose-500 shrink-0"/>
                  )}
                  <span className="font-medium text-slate-800">{chk.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Tablero Kanban */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{t("workorders.kanbanTitle")}</h2>
          <button
            type="button"
            onClick={() => onNavigate("diagnostics")}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            {t("workorders.openFileLink")} {selectedAsset?.internal_ref || "OT-2026-104"} →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {kanbanColumns.map((col) => {
            const colCards = cards.filter((c) => c.stage === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/80 rounded-2xl border border-slate-200/90 p-3 space-y-2.5 min-h-[240px]"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700">{col.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badge}`}>
                    {colCards.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11px] text-indigo-600">
                          {card.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{card.serial}</span>
                      </div>
                      <p className="font-bold text-slate-900">{card.client}</p>
                      <p className="text-[11px] text-slate-600 leading-snug">{card.issue}</p>

                      {col.id !== "ready" && (
                        <button
                          type="button"
                          onClick={() => advanceCard(card.id)}
                          className="w-full pt-1.5 border-t border-slate-100 text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-end gap-1"
                        >
                          <span>{t("workorders.advanceStage")}</span>
                          <ArrowRight className="w-3 h-3"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}