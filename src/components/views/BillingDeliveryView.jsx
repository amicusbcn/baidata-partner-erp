import React from "react";
import { Receipt, CheckCircle2, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { localizeDppUrl } from "../../services/aasBridge";

export default function BillingDeliveryView({
  workOrders = [],
  selectedOrderId,
  onSelectOrderId,
  onRefreshData,
  lang = "es",
}) {
  const billingOrders = workOrders.filter((w) => ["ready", "closed"].includes(w.status));
  const selectedOrder =
    billingOrders.find((w) => w.id === selectedOrderId) || billingOrders[0] || null;

  const handleInvoiceAndDeliver = async () => {
    if (!selectedOrder || !supabase) return;
    await supabase
      .from("work_orders")
      .update({
        status: "closed",
        sector_metadata: {
          ...(selectedOrder.sector_metadata || {}),
          delivered_at: new Date().toISOString(),
        },
      })
      .eq("id", selectedOrder.id);
    await onRefreshData(selectedOrder.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {lang === "en" ? "Billing & Final Delivery" : "Entrega y Facturación"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === "en"
            ? "Issue workshop invoice and close work order upon battery handover"
            : "Emisión de factura comercial del taller y cierre definitivo de la orden de trabajo"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista izquierda (4 cols) */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 h-fit">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "en" ? "Ready / Delivered" : "Listas / Entregadas"} ({billingOrders.length})
          </p>

          {billingOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              {lang === "en" ? "No batteries ready for delivery" : "Sin baterías listas para entrega"}
            </p>
          ) : (
            billingOrders.map((wo) => {
              const isSelected = selectedOrder?.id === wo.id;
              const isClosed = wo.status === "closed";
              return (
                <button
                  key={wo.id}
                  type="button"
                  onClick={() => onSelectOrderId(wo.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition space-y-1.5 ${
                    isSelected
                      ? "bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/40"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {wo.assets?.internal_ref}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isClosed
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isClosed
                        ? lang === "en"
                          ? "Delivered"
                          : "Entregada"
                        : lang === "en"
                        ? "Ready"
                        : "Lista Entrega"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {wo.assets?.customers?.full_name}
                  </p>
                  <p className="font-mono text-[11px] font-bold text-slate-600">
                    {Number(wo.private_invoice_eur || 0).toFixed(2)} €
                  </p>
                </button>
              );
            })
          )}
        </aside>

        {/* Detalle derecha (8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 text-xs">
          {!selectedOrder ? (
            <p className="text-slate-500">Selecciona una orden lista para entrega.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Datos del Cliente (Privado)
                  </span>
                  <p className="font-bold text-sm text-slate-900 mt-1">
                    {selectedOrder.assets?.customers?.full_name}
                  </p>
                  <p className="text-slate-600">
                    NIF: {selectedOrder.assets?.customers?.tax_id || "-"} · Tel:{" "}
                    {selectedOrder.assets?.customers?.phone || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Activo y Trazabilidad AAS
                  </span>
                  <p className="font-bold text-sm text-slate-900 mt-1">
                    {selectedOrder.assets?.internal_ref} · {selectedOrder.assets?.asset_label}
                  </p>
                  <p className="font-mono text-emerald-700 mt-0.5">
                    {selectedOrder.aas_srn_id
                      ? `Certificado AAS: ${selectedOrder.aas_srn_id}`
                      : "Sin emisión AAS vinculada"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">Desglose de Intervención</h3>
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Operación ejecutada:</span>
                    <span className="font-bold text-slate-900">
                      [{selectedOrder.operation_code}] {selectedOrder.public_remarks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Repuesto sustituido:</span>
                    <span className="font-mono text-slate-800">
                      {selectedOrder.replaced_part || "NONE"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mano de obra imputada:</span>
                    <span className="font-mono text-slate-800">
                      {selectedOrder.private_labor_hours || 0} horas
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">Total Factura (IVA incl.):</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {Number(selectedOrder.private_invoice_eur || 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                {selectedOrder.assets?.dpp_uri && (
                  <a
                    href={localizeDppUrl(selectedOrder.assets.dpp_uri, lang)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-600 font-bold hover:underline"
                  >
                    <span>Ver Pasaporte Digital actualizado</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {selectedOrder.status === "ready" ? (
                  <button
                    type="button"
                    onClick={handleInvoiceAndDeliver}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition shadow-sm ml-auto"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>
                      {lang === "en" ? "Issue Invoice & Deliver" : "Emitir Factura y Entregar"}
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold ml-auto">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === "en" ? "Invoice Issued & Delivered" : "Factura Emitida y Batería Entregada"}
                    </span>
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}