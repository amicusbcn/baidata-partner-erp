import React, { useState, useEffect } from "react";
import {
  Wrench,
  UserPlus,
  Users,
  QrCode,
  Lock,
  Database,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { SECTOR_CONFIG } from "./config/sectorConfig";
import { fetchAssetFromOemAas, pushInterventionToOemAas } from "./services/aasBridge";
import NewClientAssetModal from "./components/NewClientAssetModal";

export default function App() {
  const { labels, operations, partnerName, partnerDid, edcConnectorUrl, sectorBadge } =
    SECTOR_CONFIG;

  // Cartera cargada desde Supabase
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Estado del AAS remoto del OEM
  const [aasAsset, setAasAsset] = useState(null);
  const [aasLoading, setAasLoading] = useState(false);
  const [aasError, setAasError] = useState("");

  // Formulario de Orden de Trabajo: parte PRIVADA (Supabase)
  const [laborHours, setLaborHours] = useState("1.5");
  const [invoiceEur, setInvoiceEur] = useState("165.00");
  const [privateNotes, setPrivateNotes] = useState("");

  // Formulario de Orden de Trabajo: parte SOBERANA (EDC -> AAS OEM)
  const [operationCode, setOperationCode] = useState(operations[1].code);
  const [partNumber, setPartNumber] = useState("IV-MOD-10S4P-625");
  const [updateSoH, setUpdateSoH] = useState(true);
  const [postSoH, setPostSoH] = useState("98.0");
  const [publicRemarks, setPublicRemarks] = useState("");

  // Estado de emisión
  const [submitting, setSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const loadSupabaseData = async (preferredAssetId = null) => {
    if (!supabase) return;

    const { data: assetsData } = await supabase
      .from("assets")
      .select("*, customers(*)")
      .order("created_at", { ascending: false });

    if (assetsData && assetsData.length > 0) {
      setAssetsList(assetsData);
      const targetId = preferredAssetId || selectedAssetId || assetsData[0].id;
      setSelectedAssetId(targetId);
    }

    const { data: ordersData } = await supabase
      .from("work_orders")
      .select("*, assets(asset_label, internal_ref, customers(full_name))")
      .order("created_at", { ascending: false });

    if (ordersData) setWorkOrders(ordersData);
  };

  useEffect(() => {
    loadSupabaseData();
  }, []);

  const selectedAsset = assetsList.find((a) => a.id === selectedAssetId) || null;

  const syncWithOemAas = async (uri) => {
    if (!uri) return;
    setAasLoading(true);
    setAasError("");
    try {
      const info = await fetchAssetFromOemAas(uri);
      setAasAsset(info);
    } catch (err) {
      setAasAsset(null);
      setAasError(err.message);
    } finally {
      setAasLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAsset?.dpp_uri) {
      setTxSuccess(null);
      syncWithOemAas(selectedAsset.dpp_uri);
    }
  }, [selectedAssetId, selectedAsset?.dpp_uri]);

  const currentOpObj =
    operations.find((op) => op.code === operationCode) || operations[0];

  const edcOutboundPreview = {
    protocol: "IDTA-02010:ServiceRequestNotification/1.0.3",
    targetAssetUri: selectedAsset?.dpp_uri || "-",
    signedByDid: partnerDid,
    serviceType: operationCode,
    replacedPart: partNumber,
    verifiedPostSoH: updateSoH ? Number(postSoH) : null,
    technicalSummary: publicRemarks.trim() || currentOpObj.label,
  };

  const handleExecuteWorkOrder = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmitting(true);
    setSubmitError("");
    setTxSuccess(null);

    try {
      // 1. Emitir datos técnicos minimizados al AAS del OEM vía EDC
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

      // 2. Persistir la orden completa (privada + referencia AAS) en Supabase
      if (supabase) {
        const { error: dbErr } = await supabase.from("work_orders").insert({
          asset_id: selectedAsset.id,
          operation_code: operationCode,
          replaced_part: partNumber,
          private_labor_hours: Number(laborHours) || 0,
          private_invoice_eur: Number(invoiceEur) || 0,
          private_notes: privateNotes.trim(),
          public_remarks: publicRemarks.trim() || currentOpObj.label,
          aas_srn_id: srnId,
          edc_synced: Boolean(srnId),
        });
        if (dbErr) throw dbErr;
      }

      await syncWithOemAas(selectedAsset.dpp_uri);
      await loadSupabaseData(selectedAsset.id);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* BARRA SUPERIOR DEL ERP SOCIO */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white">
                  {labels.appTitle}
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {sectorBadge}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {partnerName} · {partnerDid} · <span className="text-emerald-400">{edcConnectorUrl}</span>
              </p>
            </div>
          </div>

          {selectedAsset?.dpp_uri && (
            <a
              href={selectedAsset.dpp_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <span>Abrir Pasaporte OEM</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (4 cols): CARTERA DE CLIENTES Y ACTIVOS EN SUPABASE */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Cartera ERP (Supabase)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Nuevo Alta</span>
              </button>
            </div>

            {!supabase && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                Faltan variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
              </div>
            )}

            <div className="space-y-2">
              {assetsList.map((asset) => {
                const isSelected = asset.id === selectedAssetId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition space-y-1.5 ${
                      isSelected
                        ? "bg-slate-800/90 border-amber-500/70 ring-1 ring-amber-500/40"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {asset.customers?.full_name || "Cliente sin asignar"}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {asset.internal_ref}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{asset.asset_label}</p>
                    <p className="text-[10px] font-mono text-amber-400/90 truncate flex items-center gap-1">
                      <QrCode className="w-3 h-3 shrink-0" />
                      <span>{asset.dpp_uri}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* COLUMNA DERECHA (8 cols): TELEMETRÍA AAS + ORDEN DE TRABAJO + HISTORIAL */}
        <div className="lg:col-span-8 space-y-6">
          {/* BLOQUE 1: LECTURA EN VIVO DEL AAS DEL FABRICANTE */}
          <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Pasaporte Digital Vinculado (Lectura Selectiva AAS OEM)</span>
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {selectedAsset?.dpp_uri || "Selecciona un activo"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectedAsset && syncWithOemAas(selectedAsset.dpp_uri)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aasLoading ? "animate-spin" : ""}`} />
                <span>Sincronizar AAS</span>
              </button>
            </div>

            {aasError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aasError}</span>
              </div>
            )}

            {aasAsset && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Batería / Componente</span>
                  <span className="font-bold text-white mt-0.5 block truncate">
                    {aasAsset.productName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{aasAsset.serial}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Fabricante OEM</span>
                  <span className="font-bold text-white mt-0.5 block truncate">
                    {aasAsset.manufacturer}
                  </span>
                  <span className="text-[11px] text-emerald-400">Azure BaSyx Live</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">SoH Certificado</span>
                  <span className="text-lg font-extrabold text-emerald-400">{aasAsset.soh}%</span>
                  <span className="text-[11px] text-slate-400 ml-1">({aasAsset.cycles} ciclos)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Despiece Autorizado</span>
                  <span className="font-mono font-bold text-amber-300 mt-0.5 block truncate">
                    {aasAsset.dismantling}
                  </span>
                  <span className="text-[11px] text-slate-400">{aasAsset.architecture}</span>
                </div>
              </div>
            )}
          </section>

          {/* BLOQUE 2: FORMULARIO DIVIDIDO (DATOS PRIVADOS VS. PAYLOAD SOBERANO EDC) */}
          <form onSubmit={handleExecuteWorkOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IZQUIERDA: DATOS INTERNOS (SOLO SUPABASE) */}
              <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <span>1. Datos Internos (ERP)</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    PRIVADO · RGPD
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <p className="text-slate-400">{labels.customerEntity}:</p>
                  <p className="font-bold text-white">
                    {selectedAsset?.customers?.full_name || "-"}{" "}
                    <span className="font-mono font-normal text-slate-400">
                      ({selectedAsset?.customers?.tax_id || "Sin NIF"})
                    </span>
                  </p>
                  <p className="text-slate-400">
                    {labels.internalRef}:{" "}
                    <span className="font-mono text-slate-200">{selectedAsset?.internal_ref}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Horas Mano de Obra</label>
                    <input
                      type="number"
                      step="0.25"
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Importe Factura (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceEur}
                      onChange={(e) => setInvoiceEur(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Notas internas mecánico</label>
                  <textarea
                    rows={2}
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    placeholder="Ej. Cliente comenta pérdida de autonomía en subidas..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
              </section>

              {/* DERECHA: DATOS REGULADOS (EDC -> AAS OEM) */}
              <section className="rounded-2xl bg-slate-900 border border-emerald-800/60 p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>2. Paquete Soberano EDC</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    IDTA 02010
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Operación Estandarizada</label>
                  <select
                    value={operationCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setOperationCode(code);
                      const found = operations.find((o) => o.code === code);
                      if (found) setUpdateSoH(found.defaultUpdateSoh);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  >
                    {operations.map((op) => (
                      <option key={op.code} value={op.code}>
                        [{op.code}] {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Repuesto Homologado</label>
                    <select
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    >
                      <option value="NONE">Ninguno (NONE)</option>
                      {(aasAsset?.spareParts || []).map((sp, i) => (
                        <option key={i} value={sp.code}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-slate-300 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateSoH}
                        onChange={(e) => setUpdateSoH(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-950"
                      />
                      <span>Nuevo SoH (%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      disabled={!updateSoH}
                      value={postSoH}
                      onChange={(e) => setPostSoH(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 font-mono font-bold text-emerald-400 disabled:opacity-40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    Resumen técnico público (viaja al AAS)
                  </label>
                  <input
                    type="text"
                    value={publicRemarks}
                    onChange={(e) => setPublicRemarks(e.target.value)}
                    placeholder="Ej. Sustitución módulo 10S4P y equilibrado de celdas"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>

                <div className="pt-1">
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                    <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payload minimizado que cruza el conector EDC:</span>
                  </p>
                  <pre className="p-2.5 rounded-xl bg-black/70 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                    {JSON.stringify(edcOutboundPreview, null, 2)}
                  </pre>
                </div>
              </section>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {txSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-xs text-emerald-200 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Orden guardada en Supabase y emitida al AAS del OEM con ID{" "}
                    <strong>{txSuccess}</strong>
                  </span>
                </span>
                {selectedAsset?.dpp_uri && (
                  <a
                    href={selectedAsset.dpp_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-emerald-300 hover:text-white shrink-0"
                  >
                    Ver en Pasaporte →
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedAsset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm transition disabled:opacity-50 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? "Guardando en ERP y negociando con EDC OEM..."
                  : "Guardar Orden en ERP (Supabase) y Emitir vía EDC al AAS del OEM"}
              </span>
            </button>
          </form>

          {/* BLOQUE 3: HISTORIAL LOCAL DE ÓRDENES EN SUPABASE */}
          <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registro Histórico Local del Taller (Supabase · Privado + Trazabilidad EDC)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Cliente / Activo</th>
                    <th className="py-2 pr-3">Operación</th>
                    <th className="py-2 pr-3">Facturación (Privado)</th>
                    <th className="py-2">Estado EDC / AAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {workOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-500 italic">
                        Aún no hay órdenes registradas en Supabase.
                      </td>
                    </tr>
                  ) : (
                    workOrders.map((wo) => (
                      <tr key={wo.id}>
                        <td className="py-2.5 pr-3 font-mono text-slate-400">
                          {new Date(wo.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="font-bold text-white block">
                            {wo.assets?.customers?.full_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {wo.assets?.internal_ref}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="font-semibold text-slate-200">{wo.operation_code}</span>
                          <span className="block text-[11px] text-slate-400 truncate max-w-[200px]">
                            {wo.public_remarks}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-rose-300">
                          {wo.private_labor_hours}h · {wo.private_invoice_eur} €
                        </td>
                        <td className="py-2.5">
                          {wo.edc_synced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> {wo.aas_srn_id}
                            </span>
                          ) : (
                            <span className="text-slate-500">Solo local</span>
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
      </main>

      <NewClientAssetModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newAssetId) => loadSupabaseData(newAssetId)}
      />
    </div>
  );
}