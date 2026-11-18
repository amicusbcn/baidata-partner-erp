import React from "react";
import { Package, Flame } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

const CELL_BATCHES = [
  {
    batch: "LOT-SAM-21700-04",
    model: "Samsung INR21700-50E (5000 mAh)",
    irRange: "13.1 – 13.4 mΩ",
    qty: 160,
    storageSoc: "38%",
    cabinet: "Armario Ignífugo A1",
  },
  {
    batch: "LOT-LG-21700-11",
    model: "LG M50LT 21700 (NMC 811)",
    irRange: "14.0 – 14.3 mΩ",
    qty: 84,
    storageSoc: "41%",
    cabinet: "Armario Ignífugo A1",
  },
  {
    batch: "LOT-EVE-18650-09",
    model: "EVE INR18650-35V (3500 mAh)",
    irRange: "18.2 – 18.6 mΩ",
    qty: 240,
    storageSoc: "36%",
    cabinet: "Armario Ignífugo A2",
  },
];

export default function InventoryView({ aasAsset, lang = "es" }) {
  const { t } = useTranslation(lang);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{t("inventory.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("inventory.subtitle")}</p>
      </div>

      {/* Tabla de celdas por lote e IR */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>{t("inventory.stockTitle")}</span>
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Flame className="w-3.5 h-3.5" /> {t("inventory.storageBadge")}
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2.5 pr-4">{t("inventory.colBatch")}</th>
                <th className="py-2.5 pr-4">{t("inventory.colModel")}</th>
                <th className="py-2.5 pr-4">{t("inventory.colIr")}</th>
                <th className="py-2.5 pr-4">{t("inventory.colStock")}</th>
                <th className="py-2.5 pr-4">{t("inventory.colSoc")}</th>
                <th className="py-2.5">{t("inventory.colCabinet")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CELL_BATCHES.map((b) => (
                <tr key={b.batch}>
                  <td className="py-3 pr-4 font-mono font-bold text-slate-900">{b.batch}</td>
                  <td className="py-3 pr-4 text-slate-700">{b.model}</td>
                  <td className="py-3 pr-4 font-mono text-indigo-600 font-semibold">{b.irRange}</td>
                  <td className="py-3 pr-4 font-bold text-slate-900">
                    {b.qty} {t("inventory.units")}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                      {b.storageSoc}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{b.cabinet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Repuestos homologados extraídos del AAS */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t("inventory.sparesTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(aasAsset?.spareParts || [
            { label: "Módulo de celdas 10S4P E-625 (IV-MOD-10S4P-625)", code: "IV-MOD-10S4P-625" },
            { label: "Placa BMS Inteligente v3 (IV-BMS-E625-V3)", code: "IV-BMS-E625-V3" },
          ]).map((sp, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-slate-900">{sp.label}</p>
                <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                  {t("inventory.refPrefix")}: {sp.code}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                {t("inventory.inStock")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}