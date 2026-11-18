import React, { useState, useRef, useEffect } from "react";
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Camera,
  CameraOff,
  Upload,
} from "lucide-react";
import jsQR from "jsqr";
import { supabase } from "../../lib/supabaseClient";
import { SECTOR_CONFIG } from "../../config/sectorConfig";
import { extractSerialFromUri } from "../../services/aasBridge";
import { useTranslation } from "../../hooks/useTranslation";

export default function NewClientAssetModal({ isOpen, onClose, onCreated, lang = "es" }) {
  const { t } = useTranslation(lang);
  const labels = SECTOR_CONFIG.labels[lang] || SECTOR_CONFIG.labels.es;
  const { defaultDppPortalUrl } = SECTOR_CONFIG;

  const [fullName, setFullName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [assetLabel, setAssetLabel] = useState("");
  const [dppUri, setDppUri] = useState("");
  const [extra1, setExtra1] = useState("");
  const [extra2, setExtra2] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estado del escáner QR
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [qrDetectedToast, setQrDetectedToast] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannerError("");
      setQrDetectedToast("");
    }
    return () => stopCamera();
  }, [isOpen]);

  const handleDecodedQr = (rawText) => {
    const cleanUri = rawText.trim();
    setDppUri(cleanUri);
    const detectedSerial = extractSerialFromUri(cleanUri);
    setQrDetectedToast(
      lang === "en"
        ? `QR decoded: ${detectedSerial}`
        : `QR leído correctamente: ${detectedSerial}`
    );
    stopCamera();
  };

  const startCameraScanner = async () => {
    setScannerError("");
    setQrDetectedToast("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError(
        lang === "en"
          ? "Camera API not available in this browser. Upload a QR image instead."
          : "Cámara no disponible en este navegador. Usa el botón de subir imagen QR."
      );
      return;
    }

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
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code?.data) {
            handleDecodedQr(code.data);
          }
        }, 250);
      }, 100);
    } catch {
      setScannerError(
        lang === "en"
          ? "Camera permission denied or no camera found."
          : "Permiso de cámara denegado o no se detectó cámara."
      );
      stopCamera();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerError("");
    setQrDetectedToast("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code?.data) {
          handleDecodedQr(code.data);
        } else {
          setScannerError(
            lang === "en"
              ? "No valid QR code found in the selected image."
              : "No se detectó ningún código QR válido en la imagen."
          );
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Faltan variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: fullName.trim(),
          tax_id: taxId.trim(),
          email: email.trim(),
          phone: phone.trim(),
        })
        .select()
        .single();

      if (custErr) throw custErr;

      const finalDppUri = dppUri.trim() || `${defaultDppPortalUrl}/id/BAT-2026-8841`;

      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          customer_id: customer.id,
          internal_ref: internalRef.trim(),
          asset_label: assetLabel.trim(),
          dpp_uri: finalDppUri,
          sector_metadata: {
            [labels.extraField1Key]: extra1.trim(),
            [labels.extraField2Key]: extra2.trim(),
          },
        })
        .select()
        .single();

      if (assetErr) throw assetErr;

      stopCamera();
      setSaving(false);
      setFullName("");
      setTaxId("");
      setEmail("");
      setPhone("");
      setInternalRef("");
      setAssetLabel("");
      setDppUri("");
      setQrDetectedToast("");
      onCreated(asset.id);
      onClose();
    } catch (err) {
      setSaving(false);
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-900 my-auto">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-600"/>
            <div>
              <h3 className="text-sm font-bold">{t("modal.title")}</h3>
              <p className="text-[11px] text-slate-500">{t("modal.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
          {/* Datos personales RGPD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {labels.customerEntity} *
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Jon Ander Zubizarreta"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t("modal.taxId")}</label>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="72819304M"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t("modal.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.eus"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t("modal.phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          {/* Datos del activo y escaneo QR */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {labels.internalRef} *
                </label>
                <input
                  required
                  value={internalRef}
                  onChange={(e) => setInternalRef(e.target.value)}
                  placeholder="ORBEA-WILD-FS-9921"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {labels.assetLabel} *
                </label>
                <input
                  required
                  value={assetLabel}
                  onChange={(e) => setAssetLabel(e.target.value)}
                  placeholder="Orbea Wild M-Team · Pack E-625"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {labels.extraField1Label}
                </label>
                <input
                  value={extra1}
                  onChange={(e) => setExtra1(e.target.value)}
                  placeholder="Orbea Wild M-Team"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {labels.extraField2Label}
                </label>
                <input
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  placeholder="Bosch Performance CX"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            {/* Bloque de Escaneo QR IEC 61406 */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-600"/>
                  <span>{t("modal.dppUriLabel")} *</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {!scannerOpen ? (
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition"
                    >
                      <Camera className="w-3.5 h-3.5"/>
                      <span>{lang === "en" ? "Scan QR" : "Escanear QR"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition"
                    >
                      <CameraOff className="w-3.5 h-3.5"/>
                      <span>{lang === "en" ? "Stop" : "Cerrar cámara"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={lang === "en" ? "Upload QR image" : "Subir imagen QR"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-indigo-200 text-indigo-800 font-semibold text-[11px] transition"
                  >
                    <Upload className="w-3.5 h-3.5"/>
                    <span>{lang === "en" ? "QR Image" : "Foto QR"}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Visor de cámara en vivo */}
              {scannerOpen && (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-indigo-300 aspect-video flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-emerald-400/70 m-6 rounded-xl pointer-events-none flex items-end justify-center pb-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900/80 text-emerald-300 font-mono text-[10px]">
                      {lang === "en" ? "Point camera at battery QR..." : "Enfoca el código QR de la batería..."}
                    </span>
                  </div>
                </div>
              )}

              <input
                required
                value={dppUri}
                onChange={(e) => setDppUri(e.target.value)}
                placeholder={`${defaultDppPortalUrl}/id/BAT-2026-8841`}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 font-mono text-indigo-950"
              />

              {qrDetectedToast && (
                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0"/>
                  <span>{qrDetectedToast}</span>
                </p>
              )}

              {scannerError && (
                <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
                  <span>{scannerError}</span>
                </p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0"/>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
              <span>{saving ? t("modal.saving") : t("modal.saveBtn")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}