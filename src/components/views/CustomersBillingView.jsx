import React from "react";
import { Users, UserPlus, CheckCircle2, QrCode } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export default function CustomersBillingView({
  assetsList,
  workOrders,
  selectedAssetId,
  onSelectAsset,
  onOpenNewModal,
  lang = "es",
}) {
  const { t } = useTranslation(lang);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{t("customers.title")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("customers.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t("customers.newBtn")}</span>
        </button>
      </div>

      {/* Directorio de Clientes y Activos en Supabase */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>
            {t("customers.directoryTitle")} ({assetsList.length})
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {assetsList.map((asset) => {
            const isSelected = asset.id === selectedAssetId;
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-1.5 ${
                  isSelected
                    ? "bg-indigo-50/40 border-indigo-400 ring-1 ring-indigo-400/40"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {asset.customers?.full_name || "Client"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    {asset.customers?.sector_metadata?.fleet_type || "B2C"}
                  </span>
                </div>
                <p className="text-slate-600">
                  NIF: <span className="font-mono">{asset.customers?.tax_id || t("customers.noNif")}</span> ·{" "}
                  {asset.customers?.email || "-"}
                </p>
                <p className="font-semibold text-slate-800 pt-1">
                  {asset.asset_label} ({asset.internal_ref})
                </p>
                <p className="text-[11px] font-mono text-indigo-600 truncate flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>{asset.dpp_uri}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Libro de Órdenes Facturadas */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t("customers.billingTitle")}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2.5 pr-4">{t("customers.colDate")}</th>
                <th className="py-2.5 pr-4">{t("customers.colClient")}</th>
                <th className="py-2.5 pr-4">{t("customers.colOp")}</th>
                <th className="py-2.5 pr-4">{t("customers.colBilling")}</th>
                <th className="py-2.5">{t("customers.colSync")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500 italic">
                    {t("customers.noOrders")}
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td className="py-3 pr-4 font-mono text-slate-500">
                      {new Date(wo.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-slate-900 block">
                        {wo.assets?.customers?.full_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {wo.assets?.internal_ref}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-800">{wo.operation_code}</span>
                      <span className="block text-[11px] text-slate-500">{wo.public_remarks}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono font-bold text-rose-700">
                      {wo.private_labor_hours}h · {wo.private_invoice_eur} €
                    </td>
                    <td className="py-3">
                      {wo.edc_synced ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {wo.aas_srn_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">{t("customers.localOnly")}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}