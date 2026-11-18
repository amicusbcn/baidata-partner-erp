import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  QrCode,
  Camera,
  CameraOff,
  Upload,
  CheckCircle2,
  Circle,
  Flame,
  ArrowRight,
  Ban,
  Recycle,
  AlertCircle,
} from "lucide-react";
import jsQR from "jsqr";
import { supabase } from "../../lib/supabaseClient";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { fetchAssetFromOemAas, extractSerialFromUri } from "../../services/aasBridge";
import { buildIdta02010Collection } from "../../utils/idta02010Builder";

export default function ReceptionView({
  workOrders = [],
  selectedOrderId,
  onSelectOrderId,
  isCreatingNew,
  onSetCreatingNew,
  onRefreshData,
  onOpenEdcModal,
  onNavigate,
  lang = "es",
}) {
  const labels = SECTOR_CONFIG.labels[lang] || SECTOR_CONFIG.labels.es;
  const receptionOrders = workOrders.filter((w) => ["received", "quarantine"].includes(w.status));
  const selectedOrder =
    receptionOrders.find((w) => w.id === selectedOrderId) || receptionOrders[0] || null;

  // Estado formulario Nueva Orden
  const [fullName, setFullName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [assetLabel, setAssetLabel] = useState("");
  const [dppUri, setDppUri] = useState(`${SECTOR_CONFIG.defaultDppPortalUrl}/id/BAT-2026-8841`);
  const [scannedAasInfo, setScannedAasInfo] = useState(null);

  // Estado Check-in, Seguridad y Avería (aplica tanto a nueva orden como a orden en recepción)
  const [issueDesc, setIssueDesc] = useState("");
  const [zones, setZones] = useState({
    topShell: false,
    mainConnector: false,
    chargePort: false,
    mountingRails: false,
  });
  const [safetyChecks, setSafetyChecks] = useState({
    tempOk: true,
    noOdor: true,
    noSwelling: true,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [raeeIssued, setRaeeIssued] = useState(false);

  // Escáner QR
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isCreatingNew && selectedOrder) {
      setIssueDesc(selectedOrder.issue_description || "");
      const meta = selectedOrder.sector_metadata || {};
      if (meta.casing_zones) setZones(meta.casing_zones);
      if (meta.safety_checks) setSafetyChecks(meta.safety_checks);
      setRaeeIssued(Boolean(meta.raee_certificate));
      setScannedAasInfo(meta.aas_snapshot || null);
    } else if (isCreatingNew) {
      setIssueDesc("");
      setZones({ topShell: false, mainConnector: false, chargePort: false, mountingRails: false });
      setSafetyChecks({ tempOk: true, noOdor: true, noSwelling: true });
      setScannedAasInfo(null);
      setRaeeIssued(false);
    }
  }, [isCreatingNew, selectedOrder?.id]);

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    scanIntervalRef.current = null;
    streamRef.current = null;
    setScannerOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Lanzar lectura del AAS vía el visualizador EDC
  const triggerAasLookup = (uriToFetch) => {
    const cleanUri = uriToFetch.trim();
    if (!cleanUri) return;
    setDppUri(cleanUri);

    onOpenEdcModal({
      mode: "pull",
      title:
        lang === "en"
          ? "Pulling Battery AAS from OEM via EDC"
          : "Consultando AAS de Batería al OEM vía EDC (Pull)",
      dppUri: cleanUri,
      contractOfferId: "urn:uuid:offer-oem-workshop-read-02035",
      requestOrPayload: {
        consumerDid: SECTOR_CONFIG.partnerDid,
        globalAssetId: cleanUri,
        requestedSubmodels: ["Nameplate", "ProductCondition", "Circularity"],
      },
      executeFn: () => fetchAssetFromOemAas(cleanUri, lang),
      onCompleted: async (aasData) => {
        setScannedAasInfo(aasData);
        if (!assetLabel) setAssetLabel(aasData.productName);
        if (!isCreatingNew && selectedOrder && supabase) {
          await supabase
            .from("work_orders")
            .update({
              sector_metadata: {
                ...(selectedOrder.sector_metadata || {}),
                aas_snapshot: aasData,
              },
            })
            .eq("id", selectedOrder.id);
          await onRefreshData(selectedOrder.id);
        }
      },
    });
  };

  const startCamera = async () => {
    setScannerError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScannerOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        scanIntervalRef.current = setInterval(() => {
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) return;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            stopCamera();
            triggerAasLookup(code.data);
          }
        }, 250);
      }, 100);
    } catch {
      setScannerError(
        lang === "en"
          ? "Camera unavailable. Use the QR image button or paste the URI."
          : "Cámara no disponible. Usa el botón de imagen QR o introduce la URI."
      );
      stopCamera();
    }
  };

  const handleQrFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const code = jsQR(data.data, data.width, data.height);
        if (code?.data) triggerAasLookup(code.data);
        else setScannerError("No se detectó un QR válido en la imagen.");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Crear nueva orden en Supabase
  const handleCreateOrder = async (targetStatus = "received") => {
    if (!fullName.trim() || !internalRef.trim()) {
      setErrorMsg("Completa al menos el nombre del cliente y la referencia del vehículo.");
      return;
    }
    setSaving(true);
    setErrorMsg("");

    try {
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({ full_name: fullName.trim(), tax_id: taxId.trim(), phone: phone.trim() })
        .select()
        .single();
      if (cErr) throw cErr;

      const { data: asset, error: aErr } = await supabase
        .from("assets")
        .insert({
          customer_id: customer.id,
          internal_ref: internalRef.trim(),
          asset_label: assetLabel.trim() || "Pack Batería e-Bike",
          dpp_uri: dppUri.trim(),
        })
        .select()
        .single();
      if (aErr) throw aErr;

      const { data: newWo, error: wErr } = await supabase
        .from("work_orders")
        .insert({
          asset_id: asset.id,
          operation_code: "InnerInspection",
          status: targetStatus,
          issue_description: issueDesc.trim() || "Revisión general en recepción",
          sector_metadata: {
            casing_zones: zones,
            safety_checks: safetyChecks,
            aas_snapshot: scannedAasInfo,
            ...(targetStatus === "quarantine"
              ? { quarantine_alert: "Alerta térmica o física activada en recepción (Armario Ignífugo)" }
              : {}),
          },
        })
        .select()
        .single();
      if (wErr) throw wErr;

      setSaving(false);
      setFullName("");
      setTaxId("");
      setPhone("");
      setInternalRef("");
      setAssetLabel("");
      onSetCreatingNew(false);
      await onRefreshData(newWo.id);
      if (targetStatus === "diagnosing") {
        onNavigate("diagnostics");
      }
    } catch (err) {
      setSaving(false);
      setErrorMsg(err.message);
    }
  };

  // Actualizar orden existente en Recepción (Cuarentena, Desistir o Pasar a Diagnóstico)
  const handleUpdateExisting = async (nextStatus, extraMeta = {}) => {
    if (!selectedOrder || !supabase) return;
    setSaving(true);
    try {
      const updatedMeta = {
        ...(selectedOrder.sector_metadata || {}),
        casing_zones: zones,
        safety_checks: safetyChecks,
        ...extraMeta,
      };
      if (nextStatus === "quarantine") {
        updatedMeta.quarantine_alert =
          "Puesta en cuarentena preventiva en recepción (Armario Ignífugo B2)";
      } else if (nextStatus === "diagnosing") {
        delete updatedMeta.quarantine_alert;
      }

      const { error } = await supabase
        .from("work_orders")
        .update({
          status: nextStatus,
          issue_description: issueDesc.trim(),
          sector_metadata: updatedMeta,
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;
      setSaving(false);
      await onRefreshData(selectedOrder.id);

      if (nextStatus === "diagnosing") {
        onNavigate("diagnostics");
      }
    } catch (err) {
      setSaving(false);
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {lang === "en" ? "Workshop Intake & Physical Check-in" : "Recepción y Nueva Orden de Trabajo"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === "en"
            ? "Scan battery QR (IEC 61406), inspect physical casing, verify lithium safety or isolate in quarantine"
            : "Escaneo QR de la batería, inspección física de carcasa, control de seguridad de litio y apertura de expediente"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO (4 cols): Botón Nueva Orden + Lista de activos en Recepción */}
        <aside className="lg:col-span-4 space-y-3">
          <button
            type="button"
            onClick={() => onSetCreatingNew(true)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition shadow-xs ${
              isCreatingNew
                ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "en" ? "New Work Order" : "Nueva Orden de Trabajo"}</span>
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "en" ? "In Intake / Quarantine" : "En Recepción / Cuarentena"} ({receptionOrders.length})
            </p>

            {receptionOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">
                {lang === "en" ? "No batteries pending intake" : "Sin baterías pendientes en recepción"}
              </p>
            ) : (
              receptionOrders.map((wo) => {
                const isSelected = !isCreatingNew && selectedOrder?.id === wo.id;
                const isQuarantine = wo.status === "quarantine";
                return (
                  <button
                    key={wo.id}
                    type="button"
                    onClick={() => {
                      onSetCreatingNew(false);
                      onSelectOrderId(wo.id);
                    }}
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
                          isQuarantine
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isQuarantine
                          ? lang === "en"
                            ? "Quarantine"
                            : "Cuarentena"
                          : lang === "en"
                          ? "Received"
                          : "Recepcionada"}
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
          </div>
        </aside>

        {/* PANEL DERECHO (8 cols): Formulario Nueva Orden o Detalle de Recepción */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 text-xs">
          {/* 1. Datos de Cliente y Batería */}
          {isCreatingNew ? (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">
                {lang === "en" ? "1. Client & Asset Identification" : "1. Datos del Cliente y Batería"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {labels.customerEntity} *
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Jon Ander Zubizarreta"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIF / CIF</label>
                  <input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="72819304M"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {labels.internalRef} *
                  </label>
                  <input
                    value={internalRef}
                    onChange={(e) => setInternalRef(e.target.value)}
                    placeholder="ORBEA-WILD-9921"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {labels.assetLabel}
                  </label>
                  <input
                    value={assetLabel}
                    onChange={(e) => setAssetLabel(e.target.value)}
                    placeholder="Orbea Wild M-Team · Pack E-625"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ) : selectedOrder ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    {selectedOrder.assets?.internal_ref}
                  </span>
                  {selectedOrder.status === "quarantine" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      {lang === "en" ? "THERMAL QUARANTINE" : "EN CUARENTENA"}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 font-semibold mt-0.5">
                  {selectedOrder.assets?.customers?.full_name} · {selectedOrder.assets?.asset_label}
                </p>
              </div>
              <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                {extractSerialFromUri(selectedOrder.assets?.dpp_uri)}
              </span>
            </div>
          ) : (
            <p className="text-slate-500">
              Selecciona una orden de la izquierda o pulsa "Nueva Orden de Trabajo".
            </p>
          )}

          {/* 2. Escaneo QR para traer datos del AAS */}
          {(isCreatingNew || selectedOrder) && (
            <>
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === "en"
                        ? "2. Scan Battery QR (Fetch AAS from Data Space)"
                        : "2. Escanear QR de Batería (Traer AAS vía EDC)"}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!scannerOpen ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{lang === "en" ? "Camera QR" : "Cámara QR"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold"
                      >
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Cerrar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-semibold hover:bg-slate-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === "en" ? "QR Image" : "Imagen QR"}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQrFile}
                      className="hidden"
                    />
                  </div>
                </div>

                {scannerOpen && (
                  <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video max-h-48 mx-auto">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={isCreatingNew ? dppUri : selectedOrder?.assets?.dpp_uri || dppUri}
                    onChange={(e) => setDppUri(e.target.value)}
                    className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 font-mono text-indigo-950"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      triggerAasLookup(
                        isCreatingNew ? dppUri : selectedOrder?.assets?.dpp_uri || dppUri
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                  >
                    {lang === "en" ? "Fetch AAS" : "Leer AAS"}
                  </button>
                </div>

                {scannedAasInfo && (
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {scannedAasInfo.productName} ({scannedAasInfo.manufacturer})
                    </span>
                    <span className="font-mono text-slate-600">
                      SoH AAS: <strong>{scannedAasInfo.soh}%</strong> · {scannedAasInfo.cycles} ciclos
                    </span>
                  </div>
                )}
                {scannerError && <p className="text-rose-600 font-semibold">{scannerError}</p>}
              </div>

              {/* 3. Check-in Físico de Carcasa y Checklist de Seguridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-bold text-slate-800">
                    {lang === "en" ? "3A. Casing Physical Check-in" : "3A. Check-in Físico de Carcasa"}
                  </p>
                  {[
                    { key: "topShell", label: lang === "en" ? "Top / Side Shell" : "Carcasa Superior / Lateral" },
                    { key: "mainConnector", label: lang === "en" ? "Main Connector" : "Conector Descarga" },
                    { key: "chargePort", label: lang === "en" ? "Charge Port" : "Puerto Carga / BMS" },
                    { key: "mountingRails", label: lang === "en" ? "Mounting Rails" : "Guías y Cerradura" },
                  ].map((z) => (
                    <button
                      key={z.key}
                      type="button"
                      onClick={() => setZones((p) => ({ ...p, [z.key]: !p[z.key] }))}
                      className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between transition ${
                        zones[z.key]
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{z.label}</span>
                      <span className="font-bold text-[10px]">
                        {zones[z.key] ? (lang === "en" ? "Damaged" : "Incidencia") : "OK"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800">
                    {lang === "en" ? "3B. Lithium Safety Checklist" : "3B. Checklist Seguridad Litio"}
                  </p>
                  {[
                    { key: "tempOk", label: lang === "en" ? "Surface Temp < 35°C" : "Temperatura carcasa < 35 °C" },
                    { key: "noOdor", label: lang === "en" ? "No electrolyte odor" : "Sin olor químico / electrolito" },
                    { key: "noSwelling", label: lang === "en" ? "No swelling / dents" : "Sin hinchazón ni perforación" },
                  ].map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSafetyChecks((p) => ({ ...p, [c.key]: !p[c.key] }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-left"
                    >
                      {safetyChecks[c.key] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span>{c.label}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      isCreatingNew
                        ? handleCreateOrder("quarantine")
                        : handleUpdateExisting("quarantine")
                    }
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold transition"
                  >
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>
                      {lang === "en" ? "Place in Thermal Quarantine" : "Poner en Cuarentena Térmica"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 4. Problema reportado por el cliente */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {lang === "en"
                    ? "4. Problem Identified by Client"
                    : "4. Problema Identificado por el Cliente"}
                </label>
                <textarea
                  rows={2}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? "Describe symptoms reported by the customer..."
                      : "Ej. El cliente indica corte de asistencia al 40% de batería y error E010 en display..."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botones de acción de Recepción */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isCreatingNew && selectedOrder && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateExisting("cancelled")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 font-semibold"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{lang === "en" ? "Withdraw / Cancel" : "Desistir"}</span>
                      </button>

                      {!raeeIssued ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRaeeIssued(true);
                            handleUpdateExisting("cancelled", {
                              raee_certificate: "DI-RAEE-2026-889 (ReciclaBat Norte S.A.)",
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold"
                        >
                          <Recycle className="w-3.5 h-3.5" />
                          <span>{lang === "en" ? "WEEE Disposal" : "Baja Gestor RAEE"}</span>
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold">✓ DI-RAEE emitido</span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {isCreatingNew && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleCreateOrder("received")}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-800"
                    >
                      {lang === "en" ? "Save in Intake" : "Guardar en Recepción"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      isCreatingNew
                        ? handleCreateOrder("diagnosing")
                        : handleUpdateExisting("diagnosing")
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition shadow-sm"
                  >
                    <span>{lang === "en" ? "Move to Diagnostics" : "Diagnosticar"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}