import React, { useState } from "react";
import { X, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { SECTOR_CONFIG } from "../config/sectorConfig";

export default function NewClientAssetModal({ isOpen, onClose, onCreated }) {
  const { labels, defaultDppPortalUrl } = SECTOR_CONFIG;

  const [fullName, setFullName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [assetLabel, setAssetLabel] = useState("");
  const [dppUri, setDppUri] = useState(`${defaultDppPortalUrl}/id/BAT-2026-8841`);
  const [extra1, setExtra1] = useState("");
  const [extra2, setExtra2] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local");
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

      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          customer_id: customer.id,
          internal_ref: internalRef.trim(),
          asset_label: assetLabel.trim(),
          dpp_uri: dppUri.trim(),
          sector_metadata: {
            [labels.extraField1Key]: extra1.trim(),
            [labels.extraField2Key]: extra2.trim(),
          },
        })
        .select()
        .single();

      if (assetErr) throw assetErr;

      setSaving(false);
      setFullName("");
      setTaxId("");
      setEmail("");
      setPhone("");
      setInternalRef("");
      setAssetLabel("");
      onCreated(asset.id);
      onClose();
    } catch (err) {
      setSaving(false);
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-100">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">Alta de Cliente y Activo en ERP Local</h3>
              <p className="text-[11px] text-slate-400">
                Los datos personales se almacenan exclusivamente en Supabase (RGPD)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{labels.customerEntity} *</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Jon Ander Zubizarreta"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">NIF / CIF</label>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="72819304M"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.eus"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">{labels.internalRef} *</label>
                <input
                  required
                  value={internalRef}
                  onChange={(e) => setInternalRef(e.target.value)}
                  placeholder="ORBEA-WILD-FS-9921"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{labels.assetLabel} *</label>
                <input
                  required
                  value={assetLabel}
                  onChange={(e) => setAssetLabel(e.target.value)}
                  placeholder="Orbea Wild M-Team · Pack E-625"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{labels.extraField1Label}</label>
                <input
                  value={extra1}
                  onChange={(e) => setExtra1(e.target.value)}
                  placeholder="Orbea Wild M-Team"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{labels.extraField2Label}</label>
                <input
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  placeholder="Bosch Performance CX"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-amber-300 font-semibold mb-1">
                URI Pasaporte Digital (IEC 61406 Identification Link) *
              </label>
              <input
                required
                value={dppUri}
                onChange={(e) => setDppUri(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-amber-500/40 px-3 py-2 font-mono text-amber-300"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Guardando..." : "Guardar en Supabase"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}