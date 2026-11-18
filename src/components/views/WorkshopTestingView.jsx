import React, { useState, useEffect } from "react";
import {
  Play,
  Send,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { fetchAssetFromOemAas, pushInterventionToOemAas } from "../../services/aasBridge";

export default function WorkshopTestingView({
  workOrders = [],
  selectedOrderId,
  onSelectOrderId,
  onRefreshData,
  onOpenEdcModal,
  onNavigate,
  lang = "es",
}) {
  const shopOrders = workOrders.filter((w) => ["repairing", "testing"].includes(w.status));
  const selectedOrder =
    shopOrders.find((w) => w.id === selectedOrderId) || shopOrders[0] || null;

  const [publicRemarks, setPublicRemarks] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [laborHours, setLaborHours] = useState("2.0");
  const [partUsed, setPartUsed] = useState("IV-MOD-10S4P-625");
  const [postSoH, setPostSoH] = useState("98.0");

  // Simulación de pruebas sincronizada con la curva SVG
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [aasCertified, setAasCertified] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    const meta = selectedOrder.sector_metadata || {};
    setPublicRemarks(selectedOrder.public_remarks || meta.quoted_task_label || "");
    setPrivateNotes(selectedOrder.private_notes || "");
    setLaborHours(String(selectedOrder.private_labor_hours || 2.0));
    setPartUsed(selectedOrder.replaced_part || "IV-MOD-10S4P-625");
    setPostSoH(String(meta.recommended_post_soh || 98.0));

    const alreadyTested = selectedOrder.status === "testing" && Boolean(meta.test_completed);
    setIsTesting(false);
    setTestProgress(alreadyTested ? 100 : 0);
    setTestFinished(alreadyTested);
    setAasCertified(Boolean(meta.repair_certified_aas));
  }, [selectedOrder?.id]);

  const handleStartTestPhase = async () => {
    if (!selectedOrder || isTesting) return;

    if (supabase) {
      await supabase
        .from("work_orders")
        .update({
          status: "testing",
          public_remarks: publicRemarks.trim(),
          private_notes: privateNotes.trim(),
          private_labor_hours: Number(laborHours) || 0,
          replaced_part: partUsed,
        })
        .eq("id", selectedOrder.id);
      await onRefreshData(selectedOrder.id);
    }

    setIsTesting(true);
    setTestFinished(false);
    setTestProgress(0);

    const timer = setInterval(() => {
      setTestProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsTesting(false);
          setTestFinished(true);
          if (supabase) {
            supabase
              .from("work_orders")
              .update({
                sector_metadata: {
                  ...(selectedOrder.sector_metadata || {}),
                  test_completed: true,
                  bench_progress: 100,
                },
              })
              .eq("id", selectedOrder.id)
              .then(() => onRefreshData(selectedOrder.id));
          }
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleFailBackToWorkshop = async () => {
    if (!selectedOrder || !supabase) return;
    setTestProgress(0);
    setTestFinished(false);
    await supabase
      .from("work_orders")
      .update({
        status: "repairing",
        sector_metadata: {
          ...(selectedOrder.sector_metadata || {}),
          test_completed: false,
          bench_progress: 25,
        },
      })
      .eq("id", selectedOrder.id);
    await onRefreshData(selectedOrder.id);
  };

  const handlePublishToAas = () => {
    if (!selectedOrder) return;
    const dppUri = selectedOrder.assets?.dpp_uri;
    const opCode = selectedOrder.operation_code || "Repair";
    const opObj =
      SECTOR_CONFIG.operations.find((o) => o.code === opCode) || SECTOR_CONFIG.operations[1];

    const unsignedPayload = {
      protocol: "IDTA-02010:ServiceRequestNotification/1.0.3",
      targetAssetUri: dppUri,
      signedByDid: SECTOR_CONFIG.partnerDid,
      serviceType: opCode,
      replacedComponent: partUsed,
      verifiedPostSoH: Number(postSoH),
      technicalSummary: publicRemarks.trim() || opObj.label.es,
    };

    onOpenEdcModal({
      direction: "outbound",
      title:
        lang === "en"
          ? "Certifying Intervention in Battery AAS (IDTA 02010)"
          : "Certificando Intervención en AAS de la Batería",
      dppUri,
      unsignedPayload,
      executeFn: async () => {
        const aasInfo = await fetchAssetFromOemAas(dppUri, lang);
        return pushInterventionToOemAas({
          serviceSubmodelId: aasInfo.serviceSubmodelId,
          conditionSubmodelId: aasInfo.conditionSubmodelId,
          currentCount: aasInfo.currentCount,
          serviceType: opCode,
          operationLabel: opObj.label,
          partNumber: partUsed,
          publicRemarks: publicRemarks.trim(),
          postSoH: Number(postSoH),
          operatorName: SECTOR_CONFIG.partnerName,
          operatorDid: SECTOR_CONFIG.partnerDid,
        });
      },
      onCompleted: async (res) => {
        setAasCertified(true);
        if (supabase) {
          await supabase
            .from("work_orders")
            .update({
              aas_srn_id: res.srnId,
              edc_synced: true,
              public_remarks: publicRemarks.trim(),
              sector_metadata: {
                ...(selectedOrder.sector_metadata || {}),
                repair_certified_aas: true,
                post_soh: Number(postSoH),
              },
            })
            .eq("id", selectedOrder.id);
          await onRefreshData(selectedOrder.id);
        }
      },
    });
  };

  const handleMoveToBilling = async () => {
    if (!selectedOrder || !supabase) return;
    await supabase
      .from("work_orders")
      .update({
        status: "ready",
        public_remarks: publicRemarks.trim(),
        private_notes: privateNotes.trim(),
        private_labor_hours: Number(laborHours) || 0,
        replaced_part: partUsed,
      })
      .eq("id", selectedOrder.id);
    await onRefreshData(selectedOrder.id);
    onNavigate("billing");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {lang === "en" ? "Workshop Execution & Test Bench" : "Taller y Banco de Pruebas"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === "en"
            ? "Log technical intervention, run synchronized 1C discharge verification, and publish to AAS"
            : "Registro técnico de reparación, validación sincronizada en banco de pruebas y certificación en AAS"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista izquierda (4 cols) */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 h-fit">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {lang === "en" ? "Active in Workshop / Bench" : "En Taller / Banco Pruebas"} ({shopOrders.length})
          </p>

          {shopOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              {lang === "en" ? "No batteries in workshop" : "Sin baterías en taller"}
            </p>
          ) : (
            shopOrders.map((wo) => {
              const isSelected = selectedOrder?.id === wo.id;
              const isTestingStatus = wo.status === "testing";
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
                        isTestingStatus
                          ? "bg-cyan-100 text-cyan-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {isTestingStatus
                        ? lang === "en"
                          ? "Testing"
                          : "En Pruebas"
                        : lang === "en"
                        ? "In Workshop"
                        : "En Taller"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {wo.assets?.customers?.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {wo.sector_metadata?.quoted_task_label || wo.issue_description}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        {/* Detalle derecha (8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 text-xs">
          {!selectedOrder ? (
            <p className="text-slate-500">Selecciona una orden en curso de la izquierda.</p>
          ) : (
            <>
              {/* Diagnóstico previo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    {selectedOrder.assets?.internal_ref}
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    <strong>Diagnóstico previo:</strong> {selectedOrder.issue_description}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-bold text-indigo-800">
                  {selectedOrder.operation_code}
                </span>
              </div>

              {/* Campos del trabajo realizado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {lang === "en"
                      ? "Technical Work Description (Published to BaSyx)"
                      : "Descripción técnica del trabajo (Se publica en BaSyx)"}
                  </label>
                  <textarea
                    rows={3}
                    value={publicRemarks}
                    onChange={(e) => setPublicRemarks(e.target.value)}
                    placeholder="Ej. Sustitución módulo 10S4P, equilibrado de celdas y sellado IP67..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {lang === "en"
                      ? "Internal Observations (Private · Not sent to AAS)"
                      : "Observaciones internas (Privado · No se envía a BaSyx)"}
                  </label>
                  <textarea
                    rows={3}
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    placeholder="Notas internas de montaje o comentarios para facturación..."
                    className="w-full rounded-xl border border-slate-300 bg-rose-50/20 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Horas de Trabajo
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Recambio Confirmado
                  </label>
                  <select
                    value={partUsed}
                    onChange={(e) => setPartUsed(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="NONE">Sin recambio (NONE)</option>
                    <option value="IV-MOD-10S4P-625">Módulo Celdas 10S4P (IV-MOD-10S4P-625)</option>
                    <option value="IV-BMS-E625-V3">Placa BMS v3 (IV-BMS-E625-V3)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SoH Post-Reparación (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={postSoH}
                    onChange={(e) => setPostSoH(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Botón para lanzar fase de pruebas */}
              {!isTesting && !testFinished && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleStartTestPhase}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition shadow-xs"
                  >
                    <Play className="w-4 h-4" />
                    <span>{lang === "en" ? "Start Test Bench Run" : "Pasar a Fase de Pruebas"}</span>
                  </button>
                </div>
              )}

              {/* FASE DE PRUEBAS: Barra de progreso sincronizada con la curva de descarga SVG */}
              {(isTesting || testFinished) && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <span>
                        {lang === "en"
                          ? "1C Controlled Discharge Curve (Live Bench Telemetry)"
                          : "Curva de Descarga Controlada 1C (Sincronizada con Banco)"}
                      </span>
                    </span>
                    <span className="font-mono font-extrabold text-indigo-700">
                      {testProgress}% ({((625 * (Number(postSoH) / 100) * testProgress) / 100).toFixed(1)} Wh)
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${testProgress}%` }}
                    />
                  </div>

                  {/* Gráfica SVG sincronizada con testProgress */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <svg viewBox="0 0 500 130" className="w-full h-32 overflow-visible">
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="4" />
                      <line x1="40" y1="65" x2="480" y2="65" stroke="#e2e8f0" strokeDasharray="4" />
                      <line x1="40" y1="110" x2="480" y2="110" stroke="#cbd5e1" />
                      <text x="5" y="24" fontSize="10" fill="#64748b">42.0V</text>
                      <text x="5" y="69" fontSize="10" fill="#64748b">36.0V</text>
                      <text x="5" y="112" fontSize="10" fill="#64748b">30.0V</text>

                      {/* Curva Nominal de referencia */}
                      <path
                        d="M 40 22 Q 160 42, 360 60 T 480 108"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="5,4"
                      />

                      {/* Curva Real dibujada progresivamente según testProgress */}
                      <path
                        d="M 40 24 Q 155 45, 350 64 T 468 108"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - testProgress}
                        style={{ transition: "stroke-dashoffset 0.3s linear" }}
                      />
                    </svg>
                  </div>

                  {/* Acciones tras finalizar las pruebas */}
                  {testFinished && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleFailBackToWorkshop}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {lang === "en" ? "Test Failed → Return to Workshop" : "Test Fallido → Devolver a Taller"}
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={handlePublishToAas}
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition ${
                            aasCertified
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {aasCertified ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Certificado en AAS</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{lang === "en" ? "Send to AAS (Optional)" : "Enviar al AAS"}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleMoveToBilling}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition shadow-xs"
                        >
                          <span>
                            {lang === "en"
                              ? "Move to Billing & Delivery"
                              : "Pasar a Facturación y Entrega"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
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