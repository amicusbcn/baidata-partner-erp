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
  XCircle,
} from "lucide-react";
import { SECTOR_CONFIG } from "../config/sectorConfig";
import { localizeDppUrl } from "../services/aasBridge";

const NODES = [
  { id: "erp", title: "ERP / DMS Taller", sub: "Supabase Local" },
  { id: "edc_shop", title: "EDC Taller", sub: "edc-workshop:8191" },
  { id: "edc_oem", title: "EDC OEM (IberiaVolt)", sub: "edc-iberiavolt:8191" },
  { id: "aas", title: "AAS Batería", sub: "Azure BaSyx v3" },
];

export default function EdcTransferModal({ config, onClose, lang = "es" }) {
  // config: { mode: 'pull'|'push', title, dppUri, contractOfferId, requestOrPayload, executeFn, onCompleted }
  const [currentStep, setCurrentStep] = useState(0);
  const [failedStep, setFailedStep] = useState(null);
  const [inspectedTab, setInspectedTab] = useState(null);
  const [realResponse, setRealResponse] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  const isPull = config?.mode === "pull";
  const totalSteps = isPull ? 4 : 5;
  const executionStep = isPull ? 3 : 4;

  useEffect(() => {
    if (!config || startedRef.current) return;
    startedRef.current = true;

    const runPipeline = async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let activeStep = 1;
      try {
        for (let s = 1; s < executionStep; s++) {
          activeStep = s;
          setCurrentStep(s);
          await wait(650);
        }

        activeStep = executionStep;
        setCurrentStep(executionStep);
        const res = await config.executeFn();
        setRealResponse(res);
        await wait(450);

        setCurrentStep(totalSteps);
        if (config.onCompleted) {
          await config.onCompleted(res);
        }
      } catch (err) {
        setFailedStep(activeStep);
        setErrorMsg(err.message || "Error en la negociación o transferencia EDC");
      }
    };

    runPipeline();
  }, [config]);

  if (!config) return null;

  // Iluminación de nodos superiores según paso y sentido
  const getActiveNodeIndex = () => {
    if (isPull) {
      if (currentStep === 1) return 0; // ERP pide al EDC Taller
      if (currentStep === 2) return 1; // EDC Taller negocia contrato con EDC OEM
      if (currentStep === 3) return 2; // EDC OEM consulta AAS Batería
      return 3; // Datos recibidos desde AAS
    } else {
      if (currentStep === 1) return 0; // ERP filtra RGPD y prepara IDTA 02010
      if (currentStep === 2) return 1; // EDC Taller negocia contrato escritura
      if (currentStep === 3) return 2; // EDC OEM valida acuerdo
      return 3; // AAS Batería persiste registro
    }
  };

  const activeNodeIdx = getActiveNodeIndex();

  // Contratos DCAT / ODRL reales según el tipo de operación
  const offerId =
    config.contractOfferId ||
    (isPull
      ? "urn:uuid:offer-oem-workshop-read-02035"
      : "urn:uuid:offer-oem-workshop-write-02010");

  const dcatContractNegotiation = {
    "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
    "@type": "ContractRequest",
    counterPartyAddress: "https://edc-iberiavolt.es/api/v1/dsp",
    protocol: "dataspace-protocol-http",
    policy: {
      "@type": "odrl:Offer",
      "@id": offerId,
      assigner: "did:web:iberiavolt.es",
      assignee: SECTOR_CONFIG.partnerDid,
      target: isPull
        ? "asset:battery-submodels-Nameplate-Condition-Circularity"
        : "asset:battery-submodel-IDTA-02010-ServiceRequestNotification",
      permission: [
        {
          action: isPull ? "odrl:read" : "odrl:modify",
          constraint: {
            leftOperand: "VerifiedCredentialType",
            operator: "odrl:eq",
            rightOperand: "AccreditedBatteryRepairWorkshop",
          },
        },
      ],
    },
  };

  const steps = isPull
    ? [
        {
          num: 1,
          label:
            lang === "en"
              ? "ERP Taller → EDC Taller: Requesting asset resolution by globalAssetId"
              : "ERP Taller → EDC Taller: Solicitando consulta por globalAssetId",
          btnLabel: lang === "en" ? "View Catalog Request" : "Ver petición al EDC",
          inspectKey: "request",
          inspectData: config.requestOrPayload,
        },
        {
          num: 2,
          label:
            lang === "en"
              ? "EDC Taller ↔ EDC OEM: Selecting read contract & negotiating ODRL policy"
              : "EDC Taller ↔ EDC OEM: Seleccionando contrato de lectura y validando DID",
          btnLabel: lang === "en" ? "View Contract Offer" : "Ver contrato seleccionado",
          inspectKey: "contract",
          inspectData: dcatContractNegotiation,
        },
        {
          num: 3,
          label:
            lang === "en"
              ? "EDC OEM → AAS Battery: Fetching authorized submodels from BaSyx"
              : "EDC OEM → AAS Batería: Leyendo submodelos autorizados en BaSyx",
          btnLabel: lang === "en" ? "View BaSyx Response" : "Ver respuesta real AAS",
          inspectKey: "response",
          inspectData: realResponse?.rawBasyxReceipt || realResponse || { status: "Querying..." },
        },
        {
          num: 4,
          label:
            lang === "en"
              ? "AAS Battery → ERP Taller: Telemetry loaded into workshop file"
              : "AAS Batería → ERP Taller: Datos incorporados a la ficha de recepción",
          btnLabel: lang === "en" ? "Open Public DPP" : "Ver AAS / Pasaporte",
          isExternalLink: true,
        },
      ]
    : [
        {
          num: 1,
          label:
            lang === "en"
              ? "ERP Taller: GDPR filter applied & IDTA 02010 element built"
              : "ERP Taller: Filtro RGPD aplicado y payload IDTA 02010 preparado",
          btnLabel: lang === "en" ? "View IDTA 02010 Payload" : "Ver payload real a enviar",
          inspectKey: "payload",
          inspectData: config.requestOrPayload,
        },
        {
          num: 2,
          label:
            lang === "en"
              ? "EDC Taller ↔ EDC OEM: Selecting write contract & signing with DID"
              : "EDC Taller ↔ EDC OEM: Seleccionando contrato de escritura y firmando con DID",
          btnLabel: lang === "en" ? "View Write Contract" : "Ver contrato y firma DID",
          inspectKey: "contract",
          inspectData: dcatContractNegotiation,
        },
        {
          num: 3,
          label:
            lang === "en"
              ? "EDC Taller → EDC OEM: Opening Data Plane transfer channel"
              : "EDC Taller → EDC OEM: Estableciendo canal de transferencia (Data Plane)",
          btnLabel: null,
        },
        {
          num: 4,
          label:
            lang === "en"
              ? "EDC OEM → AAS Battery: Executing POST/PATCH in Azure BaSyx"
              : "EDC OEM → AAS Batería: Escribiendo intervención en Azure BaSyx",
          btnLabel: lang === "en" ? "View BaSyx Receipt" : "Ver respuesta real BaSyx",
          inspectKey: "response",
          inspectData: realResponse?.basyxReceipt || realResponse || { status: "Sending..." },
        },
        {
          num: 5,
          label:
            lang === "en"
              ? "Process completed: Record persisted in OEM AAS"
              : "Proceso finalizado: Registro persistido en el AAS del OEM",
          btnLabel: lang === "en" ? "Open Updated AAS" : "Ver AAS actualizado",
          isExternalLink: true,
        },
      ];

  const activeInspection = steps.find((s) => s.inspectKey === inspectedTab);
  const localizedDppHref = localizeDppUrl(config.dppUri, lang);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden text-slate-900 my-auto">
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
          {/* ESQUEMA SUPERIOR DE NODOS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>
                {isPull
                  ? lang === "en"
                    ? "PULL Flow: OEM AAS → Workshop ERP"
                    : "Flujo PULL: Consulta AAS Batería → ERP Taller"
                  : lang === "en"
                  ? "PUSH Flow: Workshop ERP → OEM AAS"
                  : "Flujo PUSH: Escritura ERP Taller → AAS Batería"}
              </span>
              <span className="font-mono text-emerald-700">Eclipse Dataspace Protocol</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 items-center gap-2">
              {NODES.map((node, idx) => {
                const isFailedNode = failedStep !== null && idx === activeNodeIdx;
                const isHighlighted = !failedStep && idx === activeNodeIdx;
                const isDone =
                  !failedStep && (currentStep === totalSteps || idx < activeNodeIdx);

                return (
                  <React.Fragment key={node.id}>
                    <div
                      className={`sm:col-span-1 p-3 rounded-xl border text-center transition-all duration-300 ${
                        isFailedNode
                          ? "bg-rose-600 border-rose-700 text-white shadow-md"
                          : isHighlighted
                          ? "bg-indigo-600 border-indigo-700 text-white shadow-md scale-[1.03]"
                          : isDone
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-xs font-extrabold leading-tight">{node.title}</p>
                      <p
                        className={`text-[10px] font-mono mt-1 truncate ${
                          isHighlighted || isFailedNode ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {node.sub}
                      </p>
                    </div>

                    {idx < NODES.length - 1 && (
                      <div className="hidden sm:flex justify-center text-slate-400">
                        {isPull && currentStep === totalSteps ? (
                          <ArrowLeft className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowRight
                            className={`w-4 h-4 ${
                              idx === activeNodeIdx && !failedStep
                                ? "text-indigo-600 animate-pulse"
                                : ""
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

          {/* LISTA DE PASOS ADAPTADA A PULL O PUSH */}
          <div className="space-y-2 text-xs">
            {steps.map((st) => {
              const isStepFailed = failedStep === st.num;
              const isCompleted =
                !isStepFailed &&
                failedStep === null &&
                (currentStep > st.num || (st.num === totalSteps && currentStep === totalSteps));
              const isRunning =
                !isStepFailed && failedStep === null && currentStep === st.num && st.num < totalSteps;
              const isPending = currentStep < st.num || (failedStep !== null && st.num > failedStep);

              return (
                <div
                  key={st.num}
                  className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition ${
                    isStepFailed
                      ? "bg-rose-50 border-rose-300 text-rose-950"
                      : isRunning
                      ? "bg-indigo-50/70 border-indigo-300 text-indigo-950"
                      : isCompleted
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-slate-50/60 border-slate-100 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isStepFailed ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : isCompleted ? (
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

                  {st.btnLabel && !isPending && !isStepFailed && (
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

          {/* Visor JSON real */}
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
              <pre className="font-mono text-[11px] text-slate-200 overflow-x-auto max-h-52 leading-relaxed">
                {JSON.stringify(activeInspection.inspectData, null, 2)}
              </pre>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {lang === "en"
                    ? `Transfer aborted at step ${failedStep}`
                    : `Intercambio detenido en el paso ${failedStep}`}
                </p>
                <p className="mt-0.5 font-mono text-[11px]">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              {currentStep === totalSteps || errorMsg
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