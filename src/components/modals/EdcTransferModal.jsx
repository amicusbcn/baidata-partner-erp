import React, { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle2,
  Loader2,
  FileCode2,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { SECTOR_CONFIG } from "../config/sectorConfig";
import { localizeDppUrl } from "../services/aasBridge";

const NODES = [
  { id: "erp", title: "ERP / DMS Taller", sub: "Supabase Local" },
  { id: "edc_shop", title: "EDC Taller", sub: "edp-workshop:8191" },
  { id: "edc_oem", title: "EDC DPP (OEM)", sub: "edc-iberiavolt:8191" },
  { id: "aas", title: "AAS Batería", sub: "Azure BaSyx v3" },
];

export default function EdcTransferModal({ config, onClose, lang = "es" }) {
  // config: { direction: 'outbound'|'inbound', title, unsignedPayload, dppUri, executeFn, onCompleted }
  const [currentStep, setCurrentStep] = useState(0);
  const [inspectedTab, setInspectedTab] = useState(null);
  const [realResponse, setRealResponse] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  const isInbound = config?.direction === "inbound";

  useEffect(() => {
    if (!config || startedRef.current) return;
    startedRef.current = true;

    const runPipeline = async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        setCurrentStep(1); // 1. Preparando datos
        await wait(650);
        setCurrentStep(2); // 2. Firmando datos
        await wait(650);
        setCurrentStep(3); // 3. Estableciendo políticas EDC
        await wait(700);
        setCurrentStep(4); // 4. Conectando con el DPP
        await wait(600);
        setCurrentStep(5); // 5. Enviando / Recibiendo datos reales en BaSyx

        const res = await config.executeFn();
        setRealResponse(res);
        await wait(450);

        setCurrentStep(6); // 6. Proceso finalizado
        if (config.onCompleted) {
          await config.onCompleted(res);
        }
      } catch (err) {
        setErrorMsg(err.message || "Error en la comunicación con Azure BaSyx");
      }
    };

    runPipeline();
  }, [config]);

  if (!config) return null;

  // Determinar qué nodo de la arquitectura superior está activo según el paso y sentido
  const getActiveNodeIndex = () => {
    if (!isInbound) {
      if (currentStep <= 2) return 0; // ERP/DMS
      if (currentStep === 3) return 1; // EDC Taller
      if (currentStep === 4) return 2; // EDC DPP
      return 3; // AAS Batería
    } else {
      if (currentStep <= 2) return 0; // ERP prepara consulta
      if (currentStep === 3) return 1; // EDC Taller negocia
      if (currentStep === 4) return 2; // EDC DPP valida
      if (currentStep === 5) return 3; // AAS Batería responde
      return 0; // Dato entregado al ERP
    }
  };

  const activeNodeIdx = getActiveNodeIndex();

  const signedEnvelope = {
    "@context": ["https://www.w3.org/2018/credentials/v1", "https://w3id.org/idsa/contexts/context.jsonld"],
    type: ["VerifiablePresentation", "DataSpaceServiceMessage"],
    issuer: SECTOR_CONFIG.partnerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: config.unsignedPayload,
    proof: {
      type: "Ed25519Signature2020",
      verificationMethod: `${SECTOR_CONFIG.partnerDid}#key-1`,
      proofPurpose: "assertionMethod",
      jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..k9xP2mQ8vL4nR7tW1zY6cB3fH5jK8pM2sV9wX4zA",
    },
  };

  const odrlPolicy = {
    "@type": "odrl:Agreement",
    "@id": "urn:uuid:policy-idta-02010-repair-write",
    assigner: isInbound ? "did:web:iberiavolt.es" : SECTOR_CONFIG.partnerDid,
    assignee: isInbound ? SECTOR_CONFIG.partnerDid : "did:web:iberiavolt.es",
    target: config.dppUri,
    permission: [
      {
        action: isInbound ? "odrl:read" : "odrl:modify",
        constraint: [
          {
            leftOperand: "purpose",
            operator: "odrl:eq",
            rightOperand: "EU_Battery_Regulation_2023_1542_Traceability",
          },
          {
            leftOperand: "submodelSemanticId",
            operator: "odrl:eq",
            rightOperand: isInbound ? "IDTA-02035-Nameplate-Condition" : "0173-1#01-AHX443#001",
          },
        ],
      },
    ],
  };

  const steps = [
    {
      num: 1,
      label: lang === "en" ? "Preparing minimized payload (GDPR filter)" : "Preparando los datos (Filtro RGPD)",
      btnLabel: lang === "en" ? "View unsigned payload" : "Ver payload sin firmar",
      inspectKey: "unsigned",
      inspectData: config.unsignedPayload,
    },
    {
      num: 2,
      label: lang === "en" ? "Signing payload with workshop DID" : "Firmando los datos con identidad DID",
      btnLabel: lang === "en" ? "View signed payload" : "Ver payload firmado",
      inspectKey: "signed",
      inspectData: signedEnvelope,
    },
    {
      num: 3,
      label: lang === "en" ? "Negotiating ODRL policies (Workshop EDC)" : "Estableciendo políticas (EDC Taller)",
      btnLabel: lang === "en" ? "View associated policies" : "Ver políticas asociadas",
      inspectKey: "policy",
      inspectData: odrlPolicy,
    },
    {
      num: 4,
      label: lang === "en" ? "Connecting with OEM DPP node" : "Conectando con el DPP del fabricante",
      btnLabel: null,
    },
    {
      num: 5,
      label: isInbound
        ? lang === "en"
          ? "Fetching authorized submodels from BaSyx"
          : "Leyendo submodelos autorizados desde AAS"
        : lang === "en"
        ? "Transmitting intervention to BaSyx AAS"
        : "Enviando datos al AAS de la batería",
      btnLabel: lang === "en" ? "View response" : "Ver respuesta",
      inspectKey: "response",
      inspectData: realResponse || { status: "Pending..." },
    },
    {
      num: 6,
      label: lang === "en" ? "Process completed successfully" : "Proceso finalizado",
      btnLabel: lang === "en" ? "Open AAS / DPP" : "Ver AAS",
      isExternalLink: true,
    },
  ];

  const activeInspection = steps.find((s) => s.inspectKey === inspectedTab);
  const localizedDppHref = localizeDppUrl(config.dppUri, lang);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden text-slate-900 my-auto">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">{config.title}</h3>
              <p className="text-[11px] font-mono text-slate-400">{config.dppUri}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ESQUEMA SUPERIOR DE NODOS DEL ESPACIO DE DATOS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>
                {isInbound
                  ? lang === "en"
                    ? "Data Flow: OEM AAS → Workshop ERP"
                    : "Sentido: AAS Batería → ERP Taller"
                  : lang === "en"
                  ? "Data Flow: Workshop ERP → OEM AAS"
                  : "Sentido: ERP Taller → AAS Batería"}
              </span>
              <span className="font-mono text-emerald-700">IDSA / EDC Protocol</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 items-center gap-2">
              {NODES.map((node, idx) => {
                const isHighlighted = idx === activeNodeIdx;
                const isDone = currentStep === 6 || (!isInbound && idx < activeNodeIdx);
                return (
                  <React.Fragment key={node.id}>
                    <div
                      className={`sm:col-span-1 p-3 rounded-xl border text-center transition-all duration-300 ${
                        isHighlighted
                          ? "bg-indigo-600 border-indigo-700 text-white shadow-md scale-[1.03]"
                          : isDone
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-xs font-extrabold leading-tight">{node.title}</p>
                      <p
                        className={`text-[10px] font-mono mt-1 truncate ${
                          isHighlighted ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        {node.sub}
                      </p>
                    </div>

                    {idx < NODES.length - 1 && (
                      <div className="hidden sm:flex justify-center text-slate-400">
                        {isInbound ? (
                          <ArrowLeft
                            className={`w-4 h-4 ${
                              idx === activeNodeIdx ? "text-indigo-600 animate-pulse" : ""
                            }`}
                          />
                        ) : (
                          <ArrowRight
                            className={`w-4 h-4 ${
                              idx === activeNodeIdx ? "text-indigo-600 animate-pulse" : ""
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* LISTA DE PASOS DE EJECUCIÓN */}
          <div className="space-y-2 text-xs">
            {steps.map((st) => {
              const isCompleted = currentStep > st.num || (st.num === 6 && currentStep === 6);
              const isRunning = currentStep === st.num && st.num < 6 && !errorMsg;
              const isPending = currentStep < st.num;

              return (
                <div
                  key={st.num}
                  className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition ${
                    isRunning
                      ? "bg-indigo-50/70 border-indigo-300 text-indigo-950"
                      : isCompleted
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-slate-50/60 border-slate-100 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-[10px] flex items-center justify-center font-bold shrink-0">
                        {st.num}
                      </span>
                    )}
                    <span className="font-semibold">
                      {st.num}. {st.label}
                    </span>
                  </div>

                  {/* Botones de inspección de payloads / respuesta / AAS */}
                  {st.btnLabel && !isPending && (
                    <>
                      {st.isExternalLink ? (
                        localizedDppHref && (
                          <a
                            href={localizedDppHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                          >
                            <span>{st.btnLabel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setInspectedTab(inspectedTab === st.inspectKey ? null : st.inspectKey)
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                            inspectedTab === st.inspectKey
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          <FileCode2 className="w-3 h-3" />
                          <span>{st.btnLabel}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visor desplegable del JSON inspeccionado */}
          {activeInspection && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono font-bold text-emerald-400">
                  {activeInspection.btnLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedTab(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Cerrar visor ✕
                </button>
              </div>
              <pre className="font-mono text-[11px] text-slate-200 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(activeInspection.inspectData, null, 2)}
              </pre>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              {currentStep === 6 || errorMsg
                ? lang === "en"
                  ? "Close & Continue"
                  : "Cerrar y Continuar"
                : lang === "en"
                ? "Hide"
                : "Cerrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}