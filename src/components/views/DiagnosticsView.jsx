import React, { useState, useEffect } from "react";
import {
  Play,
  Cpu,
  UploadCloud,
  FileText,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { fetchAssetFromOemAas, pushInterventionToOemAas } from "../../services/aasBridge";

const MATRIX_SAMPLES = [
  { group: "S1", v: 3692, ir: 14.1 },
  { group: "S2", v: 3689, ir: 14.3 },
  { group: "S3", v: 3691, ir: 14.0 },
  { group: "S4", v: 3642, ir: 19.8 },
  { group: "S5", v: 3688, ir: 14.2 },
  { group: "S6", v: 3690, ir: 14.1 },
  { group: "S7", v: 3693, ir: 13.9 },
  { group: "S8", v: 3687, ir: 14.4 },
  { group: "S9", v: 3690, ir: 14.2 },
  { group: "S10", v: 3691, ir: 14.1 },
];

const QUOTE_PRESETS = {
  InnerInspection: { hours: 1.0, partsCost: 0, partCode: "NONE", recommendedSoh: 91.5 },
  Repair: { hours: 2.0, partsCost: 135, partCode: "IV-MOD-10S4P-625", recommendedSoh: 98.0 },
  FirmwareUpdate: { hours: 0.75, partsCost: 0, partCode: "NONE", recommendedSoh: 92.0 },
  Overhauling: { hours: 3.5, partsCost: 220, partCode: "IV-MOD-10S4P-625", recommendedSoh: 99.0 },
};

const HOURLY_RATE = 55;

export default function DiagnosticsView({
  workOrders = [],
  selectedOrderId,
  onSelectOrderId,
  onRefreshData,
  onOpenEdcModal,
  onNavigate,
  lang = "es",
}) {
  const diagOrders = workOrders.filter((w) => ["diagnosing", "approval"].includes(w.status));
  const selectedOrder =
    diagOrders.find((w) => w.id === selectedOrderId) || diagOrders[0] || null;

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [diagDone, setDiagDone] = useState(false);
  const [aasUploaded, setAasUploaded] = useState(false);

  const [selectedOp, setSelectedOp] = useState("Repair");
  const [detectedSoh, setDetectedSoh] = useState(91.5);

  useEffect(() => {
    if (!selectedOrder) return;
    const meta = selectedOrder.sector_metadata || {};
    setIsScanning(false);
    setScanProgress(meta.diagnosis_completed || selectedOrder.status === "approval" ? 100 : 0);
    setDiagDone(Boolean(meta.diagnosis_completed || selectedOrder.status === "approval"));
    setAasUploaded(Boolean(meta.diagnosis_uploaded_aas));
    setSelectedOp(selectedOrder.operation_code && selectedOrder.operation_code !== "InnerInspection" ? selectedOrder.operation_code : "Repair");
    setDetectedSoh(meta.measured_soh || 91.5);
  }, [selectedOrder?.id, selectedOrder?.status]);

  const startDiagnosticSimulation = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsScanning(false);
          setDiagDone(true);
          if (selectedOrder && supabase) {
            supabase
              .from("work_orders")
              .update({
                sector_metadata: {
                  ...(selectedOrder.sector_metadata || {}),
                  diagnosis_completed: true,
                  measured_soh: 91.5,
                  delta_v_mv: 51,
                },
              })
              .eq("id", selectedOrder.id)
              .then(() => onRefreshData(selectedOrder.id));
          }
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  // Subir diagnóstico (InnerInspection + SoH medido) al AAS vía modal EDC
  const handleUploadDiagnosisToAas = () => {
    if (!selectedOrder) return;
    const dppUri = selectedOrder.assets?.dpp_uri;
    const unsignedPayload = {
      protocol: "IDTA-02010:ServiceRequestNotification/1.0.3",
      targetAssetUri: dppUri,
      signedByDid: SECTOR_CONFIG.partnerDid,
      serviceType: "InnerInspection",
      measuredSoH: Number(detectedSoh),
      imbalanceDeltaMv: 51,
      remarks: "Diagnóstico BMS completado: desequilibrio detectado en grupo S4 (ΔV 51 mV).",
    };

    onOpenEdcModal({
      direction: "outbound",
      title:
        lang === "en"
          ? "Uploading BMS Diagnosis to OEM AAS (IDTA 02010)"
          : "Subiendo Diagnóstico BMS al AAS del Fabricante",
      dppUri,
      unsignedPayload,
      executeFn: async () => {
        const aasInfo = await fetchAssetFromOemAas(dppUri, lang);
        return pushInterventionToOemAas({
          serviceSubmodelId: aasInfo.serviceSubmodelId,
          conditionSubmodelId: aasInfo.conditionSubmodelId,
          currentCount: aasInfo.currentCount,
          serviceType: "InnerInspection",
          operationLabel: "Diagnóstico preventivo de celdas y calibración BMS",
          partNumber: "NONE",
          publicRemarks: `Diagnóstico BMS en taller: SoH medido ${detectedSoh}%, ΔV = 51 mV en S4.`,
          postSoH: Number(detectedSoh),
          operatorName: SECTOR_CONFIG.partnerName,
          operatorDid: SECTOR_CONFIG.partnerDid,
        });
      },
      onCompleted: async (res) => {
        setAasUploaded(true);
        if (supabase) {
          await supabase
            .from("work_orders")
            .update({
              aas_srn_id: res.srnId,
              edc_synced: true,
              sector_metadata: {
                ...(selectedOrder.sector_metadata || {}),
                diagnosis_completed: true,
                diagnosis_uploaded_aas: true,
                measured_soh: Number(detectedSoh),
              },
            })
            .eq("id", selectedOrder.id);
          await onRefreshData(selectedOrder.id);
        }
      },
    });
  };

  // Cálculo automático de presupuesto según tarea elegida
  const preset = QUOTE_PRESETS[selectedOp] || QUOTE_PRESETS.Repair;
  const opMeta = SECTOR_CONFIG.operations.find((o) => o.code === selectedOp) || SECTOR_CONFIG.operations[1];
  const calculatedTotal = Number((preset.hours * HOURLY_RATE + preset.partsCost).toFixed(2));

  const handleSendQuote = async () => {
    if (!selectedOrder || !supabase) return;
    await supabase
      .from("work_orders")
      .update({
        status: "approval",
        operation_code: selectedOp,
        replaced_part: preset.partCode,
        private_labor_hours: preset.hours,
        private_invoice_eur: calculatedTotal,
        sector_metadata: {
          ...(selectedOrder.sector_metadata || {}),
          diagnosis_completed: true,
          quoted_task_label: opMeta.label[lang] || opMeta.label.es,
          recommended_post_soh: preset.recommendedSoh,
        },
      })
      .eq("id", selectedOrder.id);
    await onRefreshData(selectedOrder.id);
  };

  const handleQuoteDecision = async (accepted) => {
    if (!selectedOrder || !supabase) return;
    const nextStatus = accepted ? "repairing" : "cancelled";
    await supabase
      .from("work_orders")
      .update({
        status: nextStatus,
        sector_metadata: {
          ...(selectedOrder.sector_metadata || {}),
          quote_decision: accepted ? "accepted" : "rejected",
          ...(accepted ? { bench_channel: "Canal 1 · Chroma 17011", bench_progress: 15 } : {}),
        },
      })
      .eq("id", selectedOrder.id);
    await onRefreshData(selectedOrder.id);
    if (accepted) onNavigate("workshop");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {lang === "en" ? "BMS Diagnostics & Automated Quoting" : "Diagnóstico Técnico y Presupuestos"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === "en"
            ? "Run cell matrix scan, publish diagnostic state to AAS, and manage client quote approval"
            : "Ejecución de lectura BMS, publicación de diagnóstico al AAS y aprobación de presupuesto"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista izquierda (4 cols) */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 h-fit">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "en" ? "Pending Diagnostics / Quote" : "Cola de Diagnóstico / Presupuesto"} ({diagOrders.length})
          </p>

          {diagOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              {lang === "en" ? "No batteries in diagnostics" : "Sin baterías en diagnóstico"}
            </p>
          ) : (
            diagOrders.map((wo) => {
              const isSelected = selectedOrder?.id === wo.id;
              const isApproval = wo.status === "approval";
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
                        isApproval
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isApproval
                        ? lang === "en"
                          ? "Quote Pending"
                          : "Pte. Presupuesto"
                        : lang === "en"
                        ? "Diagnosing"
                        : "En Diagnóstico"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {wo.assets?.customers?.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{wo.issue_description}</p>
                </button>
              );
            })
          )}
        </aside>

        {/* Detalle derecha (8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 text-xs">
          {!selectedOrder ? (
            <p className="text-slate-500">Selecciona una batería de la lista izquierda.</p>
          ) : (
            <>
              {/* Cabecera del activo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    {selectedOrder.assets?.internal_ref}
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    {selectedOrder.assets?.customers?.full_name} · {selectedOrder.assets?.asset_label}
                  </p>
                </div>
                <span className="text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  <strong>Síntoma:</strong> {selectedOrder.issue_description}
                </span>
              </div>

              {/* PASO 1: Botón Iniciar Diagnóstico + Barra de progreso */}
              {!diagDone && (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-4">
                  <Cpu className="w-8 h-8 text-indigo-600 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {lang === "en"
                        ? "Ready to interrogate BMS & Cell Matrix"
                        : "Listo para interrogar BMS y matriz de celdas"}
                    </h3>
                    <p className="text-slate-500 mt-1">
                      {lang === "en"
                        ? "Connects to CAN/UART bus to measure individual series voltages (S1–S10) and internal resistance"
                        : "Conecta con el bus CAN/UART para leer tensiones por grupo en serie (S1–S10) y resistencia interna"}
                    </p>
                  </div>

                  {isScanning ? (
                    <div className="max-w-md mx-auto space-y-1.5">
                      <div className="flex justify-between font-bold text-indigo-700">
                        <span>Leyendo grupos S1–S10 e historial BMS...</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startDiagnosticSimulation}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition shadow-xs"
                    >
                      <Play className="w-4 h-4" />
                      <span>{lang === "en" ? "Start Diagnostics" : "Iniciar Diagnóstico"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* PASO 2: Matriz de Celdas + Subir Diagnóstico al AAS */}
              {diagDone && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Matriz de Celdas S1–S10 (ΔV = 51 mV detectado en S4)
                    </h3>

                    <div className="flex items-center gap-2">
                      <label className="text-slate-500 font-semibold">SoH Medido (%):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={detectedSoh}
                        onChange={(e) => setDetectedSoh(e.target.value)}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleUploadDiagnosisToAas}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition ${
                          aasUploaded
                            ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {aasUploaded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Diagnóstico en AAS</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {lang === "en" ? "Upload Diagnosis to AAS" : "Subir Diagnóstico al AAS"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {MATRIX_SAMPLES.map((c) => {
                      const bad = c.v < 3660;
                      return (
                        <div
                          key={c.group}
                          className={`p-3 rounded-xl border ${
                            bad ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span>{c.group}</span>
                            <span className={bad ? "text-amber-800" : "text-emerald-700"}>
                              {bad ? "ΔV!" : "OK"}
                            </span>
                          </div>
                          <p className="font-mono font-extrabold text-sm mt-1">
                            {(c.v / 1000).toFixed(3)} V
                          </p>
                          <p className="font-mono text-[10px] text-slate-500">IR: {c.ir} mΩ</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* PASO 3: Presupuestador Automático o Aprobación de Presupuesto */}
                  {selectedOrder.status === "diagnosing" ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>
                          {lang === "en"
                            ? "Prepare Automated Quote by Intervention Type"
                            : "Preparar Presupuesto Automático según Intervención"}
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">
                            Tarea técnica recomendada
                          </label>
                          <select
                            value={selectedOp}
                            onChange={(e) => setSelectedOp(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium"
                          >
                            {SECTOR_CONFIG.operations.map((op) => (
                              <option key={op.code} value={op.code}>
                                [{op.code}] {op.label[lang] || op.label.es}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-right">
                          <span className="text-[11px] text-slate-500 block">
                            {preset.hours}h + Recambios ({preset.partsCost} €)
                          </span>
                          <span className="text-lg font-extrabold text-slate-900">
                            {calculatedTotal.toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSendQuote}
                          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold transition"
                        >
                          {lang === "en"
                            ? "Generate Quote (Pending Client OK)"
                            : "Preparar Presupuesto (Dejar Pte. Aceptación)"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Estado 'approval': Botones de Presupuesto Aceptado / Rechazado */
                    <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900 uppercase">
                            {lang === "en" ? "Quote Awaiting Client Decision" : "Presupuesto Pendiente de Aceptación"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {selectedOrder.sector_metadata?.quoted_task_label || selectedOrder.operation_code}
                          </h4>
                          <p className="text-slate-600">
                            Mano de obra: {selectedOrder.private_labor_hours}h · Repuesto:{" "}
                            <span className="font-mono">{selectedOrder.replaced_part || "NONE"}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Importe Total</span>
                          <span className="text-2xl font-extrabold text-slate-900">
                            {Number(selectedOrder.private_invoice_eur || 0).toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-purple-200/70">
                        <button
                          type="button"
                          onClick={() => handleQuoteDecision(false)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold transition"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>{lang === "en" ? "Quote Rejected" : "Presupuesto Rechazado"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuoteDecision(true)}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition shadow-xs"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{lang === "en" ? "Quote Accepted → Workshop" : "Presupuesto Aceptado"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}