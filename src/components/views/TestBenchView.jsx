import React, { useState } from "react";
import {
  Activity,
  Lock,
  Database,
  Send,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Circle,
} from "lucide-react";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { pushInterventionToOemAas, localizeDppUrl } from "../../services/aasBridge";
import { supabase } from "../../lib/supabaseClient";
import { useTranslation } from "../../hooks/useTranslation";

export default function TestBenchView({
  selectedAsset,
  aasAsset,
  onSyncSuccess,
  lang = "es",
}) {
  const { t } = useTranslation(lang);
  const labels = SECTOR_CONFIG.labels[lang] || SECTOR_CONFIG.labels.es;
  const { operations, partnerName, partnerDid } = SECTOR_CONFIG;

  const [qcChecks, setQcChecks] = useState({
    stressTest: true,
    canBusComm: true,
    ipSealing: true,
  });

  const [laborHours, setLaborHours] = useState("1.5");
  const [invoiceEur, setInvoiceEur] = useState("165.00");
  const [privateNotes, setPrivateNotes] = useState("");

  const [operationCode, setOperationCode] = useState(operations[1].code);
  const [partNumber, setPartNumber] = useState("IV-MOD-10S4P-625");
  const [updateSoH, setUpdateSoH] = useState(true);
  const [postSoH, setPostSoH] = useState("98.0");
  const [publicRemarks, setPublicRemarks] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const currentOpObj =
    operations.find((op) => op.code === operationCode) || operations[0];
  const currentOpLabel = currentOpObj.label[lang] || currentOpObj.label.es;

  const localizedDppHref = localizeDppUrl(selectedAsset?.dpp_uri, lang);

  const edcOutboundPreview = {
    protocol: "IDTA-02010:ServiceRequestNotification/1.0.3",
    targetAssetUri: selectedAsset?.dpp_uri || "-",
    signedByDid: partnerDid,
    serviceType: operationCode,
    replacedPart: partNumber,
    verifiedPostSoH: updateSoH ? Number(postSoH) : null,
    technicalSummary: publicRemarks.trim() || currentOpLabel,
  };

  const handleEmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmitting(true);
    setSubmitError("");
    setTxSuccess(null);

    try {
      let srnId = null;
      if (aasAsset?.serviceSubmodelId) {
        const res = await pushInterventionToOemAas({
          serviceSubmodelId: aasAsset.serviceSubmodelId,
          conditionSubmodelId: aasAsset.conditionSubmodelId,
          currentCount: aasAsset.currentCount,
          serviceType: operationCode,
          operationLabel: currentOpObj.label,
          partNumber,
          publicRemarks,
          postSoH: updateSoH ? Number(postSoH) : null,
          operatorName: partnerName,
          operatorDid: partnerDid,
        });
        srnId = res.srnId;
      }

      if (supabase) {
        const { error: dbErr } = await supabase.from("work_orders").insert({
          asset_id: selectedAsset.id,
          operation_code: operationCode,
          replaced_part: partNumber,
          private_labor_hours: Number(laborHours) || 0,
          private_invoice_eur: Number(invoiceEur) || 0,
          private_notes: privateNotes.trim(),
          public_remarks: publicRemarks.trim() || currentOpLabel,
          aas_srn_id: srnId,
          edc_synced: Boolean(srnId),
        });
        if (dbErr) throw dbErr;
      }

      await onSyncSuccess();
      setSubmitting(false);
      setPrivateNotes("");
      setPublicRemarks("");
      setTxSuccess(srnId || "LOCAL-ONLY");
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{t("testbench.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("testbench.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>{t("testbench.curveTitle")}</span>
              </h2>
              <p className="text-xs text-slate-500">{t("testbench.curveSubtitle")}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" /> {t("testbench.nominalLegend")}
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> {t("testbench.postLegend")}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3">
            <svg viewBox="0 0 500 140" className="w-full h-36 overflow-visible">
              <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="4" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="#e2e8f0" strokeDasharray="4" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="#cbd5e1" />
              <text x="5" y="24" fontSize="10" fill="#64748b">42.0V</text>
              <text x="5" y="74" fontSize="10" fill="#64748b">36.0V</text>
              <text x="5" y="122" fontSize="10" fill="#64748b">30.0V</text>

              <path
                d="M 40 22 Q 160 45, 360 65 T 480 118"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="5,4"
              />
              <path
                d="M 40 24 Q 155 48, 350 69 T 468 118"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900">{t("testbench.qcTitle")}</h2>
          <p className="text-slate-500">{t("testbench.qcSubtitle")}</p>

          <div className="space-y-2 pt-1">
            {[
              { key: "stressTest", label: t("testbench.qcStress") },
              { key: "canBusComm", label: t("testbench.qcCan") },
              { key: "ipSealing", label: t("testbench.qcIp") },
            ].map((item) => {
              const checked = qcChecks[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setQcChecks((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-start gap-2.5 text-left"
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium text-slate-800">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Formulario dividido: ERP privado vs Paquete soberano EDC */}
      <form onSubmit={handleEmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Izquierda: Datos internos ERP */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>{t("testbench.privateTitle")}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {t("testbench.privateBadge")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-slate-500">{labels.customerEntity}:</p>
              <p className="font-bold text-slate-900">
                {selectedAsset?.customers?.full_name || "-"}{" "}
                <span className="font-mono font-normal text-slate-500">
                  ({selectedAsset?.customers?.tax_id || t("testbench.nifLabel")})
                </span>
              </p>
              <p className="text-slate-500">
                {labels.internalRef}:{" "}
                <span className="font-mono text-slate-800">{selectedAsset?.internal_ref}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("testbench.laborHours")}
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("testbench.invoiceEur")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceEur}
                  onChange={(e) => setInvoiceEur(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t("testbench.privateNotesLabel")}
              </label>
              <textarea
                rows={2}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder={t("testbench.privateNotesPlaceholder")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
          </section>

          {/* Derecha: Paquete Soberano IDTA 02010 */}
          <section className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{t("testbench.sovereignTitle")}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {t("testbench.sovereignBadge")}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t("testbench.opLabel")}
              </label>
              <select
                value={operationCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setOperationCode(code);
                  const found = operations.find((o) => o.code === code);
                  if (found) setUpdateSoH(found.defaultUpdateSoh);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900"
              >
                {operations.map((op) => (
                  <option key={op.code} value={op.code}>
                    [{op.code}] {op.label[lang] || op.label.es}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t("testbench.partLabel")}
                </label>
                <select
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  <option value="NONE">{t("testbench.noPart")}</option>
                  {(aasAsset?.spareParts || []).map((sp, i) => (
                    <option key={i} value={sp.code}>
                      {sp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateSoH}
                    onChange={(e) => setUpdateSoH(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>{t("testbench.updateSoh")}</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  disabled={!updateSoH}
                  value={postSoH}
                  onChange={(e) => setPostSoH(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono font-bold text-emerald-700 disabled:opacity-40"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t("testbench.publicRemarksLabel")}
              </label>
              <input
                type="text"
                value={publicRemarks}
                onChange={(e) => setPublicRemarks(e.target.value)}
                placeholder={t("testbench.publicRemarksPlaceholder")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
                <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("testbench.payloadPreview")}</span>
              </p>
              <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                {JSON.stringify(edcOutboundPreview, null, 2)}
              </pre>
            </div>
          </section>
        </div>

        {submitError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {txSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {t("testbench.txSuccessPrefix")} <strong>{txSuccess}</strong>.
              </span>
            </span>
            {localizedDppHref && (
              <a
                href={localizedDppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 hover:underline"
              >
                {t("testbench.verifyInDpp")}
              </a>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedAsset}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition disabled:opacity-50 shadow-sm"
        >
          <Send className="w-4 h-4 text-emerald-400" />
          <span>{submitting ? t("testbench.submittingBtn") : t("testbench.submitBtn")}</span>
        </button>
      </form>
    </div>
  );
}