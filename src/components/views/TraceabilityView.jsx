import React, { useState } from "react";
import { ShieldCheck, ExternalLink, Recycle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { localizeDppUrl } from "../../services/aasBridge";

export default function TraceabilityView({ selectedAsset, workOrders, lang = "es" }) {
  const { t } = useTranslation(lang);
  const [raeeGenerated, setRaeeGenerated] = useState(false);

  const syncedOrders = workOrders.filter((w) => w.edc_synced);
  const localizedDppHref = localizeDppUrl(selectedAsset?.dpp_uri, lang);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{t("traceability.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("traceability.subtitle")}</p>
      </div>

      {/* Semáforo de Garantías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              {t("traceability.oemWarrantyTitle")}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
              {t("traceability.oemWarrantyBadge")}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">{t("traceability.oemWarrantyDesc")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              {t("traceability.shopWarrantyTitle")}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
              {t("traceability.shopWarrantyBadge")}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">{t("traceability.shopWarrantyDesc")}</p>
        </div>
      </div>

      {/* Huella emitida al Pasaporte Digital */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t("traceability.footprintTitle")}
              </h2>
              <p className="text-slate-500">{t("traceability.footprintSubtitle")}</p>
            </div>
          </div>

          {localizedDppHref && (
            <a
              href={localizedDppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <span>{t("traceability.inspectDppBtn")}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {syncedOrders.length === 0 ? (
          <p className="text-slate-500 italic">{t("traceability.noSyncedOrders")}</p>
        ) : (
          <div className="space-y-2">
            {syncedOrders.map((wo) => (
              <div
                key={wo.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-700 mr-2">{wo.aas_srn_id}</span>
                  <span className="font-bold text-slate-900">{wo.operation_code}</span>
                  <p className="text-slate-600 mt-0.5">{wo.public_remarks}</p>
                </div>
                <span className="font-mono text-slate-400">
                  {new Date(wo.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flujo RAEE */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0">
            <Recycle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("traceability.raeeTitle")}</h3>
            <p className="text-slate-600 mt-0.5">{t("traceability.raeeDesc")}</p>
          </div>
        </div>

        {!raeeGenerated ? (
          <button
            type="button"
            onClick={() => setRaeeGenerated(true)}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-800 shrink-0"
          >
            {t("traceability.raeeBtn")}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4" /> {t("traceability.raeeDone")}
          </span>
        )}
      </section>
    </div>
  );
}