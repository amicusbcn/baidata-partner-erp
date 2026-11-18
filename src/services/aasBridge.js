const RAW_AAS_URL = import.meta.env.VITE_AAS_BASE_URL || "http://158.158.54.56:8081";
const AAS_BASE_URL =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  RAW_AAS_URL.startsWith("http://")
    ? "/api/aas"
    : RAW_AAS_URL;

function toBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function findEl(elements = [], idShort, semanticFragment = null) {
  return elements.find(
    (el) =>
      el.idShort === idShort ||
      (semanticFragment &&
        el.semanticId?.keys?.some((k) => k.value?.includes(semanticFragment)))
  );
}

function getPropVal(elements = [], idShort, fallback = undefined) {
  const el = findEl(elements, idShort);
  if (!el || el.value === undefined || el.value === null || el.value === "") return fallback;
  if (["xs:float", "xs:double", "xs:decimal"].includes(el.valueType)) {
    const n = Number(el.value);
    return Number.isNaN(n) ? fallback : n;
  }
  if (["xs:integer", "xs:unsignedInt"].includes(el.valueType)) {
    const n = parseInt(el.value, 10);
    return Number.isNaN(n) ? fallback : n;
  }
  return el.value;
}

function getTextVal(el, lang = "es", fallback = "") {
  if (!el || !el.value) return fallback;
  if (typeof el.value === "string") return el.value;
  if (Array.isArray(el.value)) {
    return (
      el.value.find((v) => v.language === lang)?.text ||
      el.value.find((v) => v.language === "es")?.text ||
      el.value.find((v) => v.language === "en")?.text ||
      el.value[0]?.text ||
      fallback
    );
  }
  return fallback;
}

export function extractSerialFromUri(uriOrId = "") {
  const trimmed = uriOrId.trim();
  const match = trimmed.match(/\/id\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : trimmed;
}

export function localizeDppUrl(rawUrl = "", lang = "es") {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    const cleanPath = url.pathname.replace(/^\/(es|en)(?=\/)/i, "");
    url.pathname = lang === "en" ? `/en${cleanPath}` : cleanPath;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export async function fetchAssetFromOemAas(dppUriOrId, lang = "es") {
  const serial = extractSerialFromUri(dppUriOrId);

  const shellsRes = await fetch(`${AAS_BASE_URL}/shells`, {
    headers: { Accept: "application/json" },
  });
  if (!shellsRes.ok) throw new Error(`Error conectando con AAS OEM (${shellsRes.status})`);

  const shellsPayload = await shellsRes.json();
  const shells = Array.isArray(shellsPayload) ? shellsPayload : shellsPayload.result || [];

  const targetShell = shells.find((sh) => {
    const gId = sh.assetInformation?.globalAssetId || "";
    return (
      gId.endsWith(`/id/${serial}`) ||
      gId === serial ||
      sh.idShort?.toLowerCase().includes(serial.toLowerCase())
    );
  });

  if (!targetShell) {
    throw new Error(`No se encontró ningún activo en el AAS del OEM con ID "${serial}".`);
  }

  const linkedIds = new Set(
    (targetShell.submodels || []).map((r) => r.keys?.[0]?.value).filter(Boolean)
  );

  const smRes = await fetch(`${AAS_BASE_URL}/submodels`, {
    headers: { Accept: "application/json" },
  });
  if (!smRes.ok) throw new Error(`Error leyendo submodelos (${smRes.status})`);

  const smPayload = await smRes.json();
  const allSubmodels = Array.isArray(smPayload) ? smPayload : smPayload.result || [];
  const submodels = allSubmodels.filter((s) => linkedIds.has(s.id));

  const smNameplate = submodels.find((s) => s.idShort === "Nameplate");
  const smCond = submodels.find((s) => s.idShort === "ProductCondition");
  const smCirc = submodels.find((s) => s.idShort === "Circularity");
  const smService = submodels.find((s) => s.idShort === "ServiceRequestNotification");

  const productName = getTextVal(
    findEl(smNameplate?.submodelElements, "ManufacturerProductDesignation"),
    lang,
    targetShell.idShort
  );
  const manufacturer = getTextVal(
    findEl(smNameplate?.submodelElements, "ManufacturerName"),
    lang,
    "Fabricante OEM"
  );

  // Estado BMS (ProductCondition)
  const condEls = smCond?.submodelElements || [];
  const soh = getPropVal(
    findEl(condEls, "StateOfCertifiedEnergy")?.value || [],
    "StateOfCertifiedEnergyValue",
    91.5
  );
  const cycles = getPropVal(
    findEl(condEls, "NumberOfFullCycles")?.value || [],
    "NumberOfFullCyclesValue",
    0
  );

  // Repuestos y manual (Circularity)
  const circEls = smCirc?.submodelElements || [];
  const architecture = getTextVal(findEl(circEls, "CellArchitecture"), lang, "10S4P");
  const dismantling =
    findEl(circEls, "DismantlingAndRemovalInformation")?.value?.[0]?.value || "Manual B2B";

  const spareParts = [];
  const sparesList = findEl(circEls, "SparePartSources")?.value || [];
  for (const sup of sparesList) {
    const comps = findEl(sup.value || [], "Components")?.value || [];
    for (const c of comps) {
      const pName = getPropVal(c.value || [], "PartName");
      const pNum = getPropVal(c.value || [], "PartNumber");
      if (pName) spareParts.push({ label: pNum ? `${pName} (${pNum})` : pName, code: pNum || pName });
    }
  }

  // Contador actual de intervenciones (IDTA 02010)
  const servEls = smService?.submodelElements || [];
  const currentCount = getPropVal(servEls, "NumberOfServiceRequestNotifications", 1);

  return {
    serial,
    shellIdShort: targetShell.idShort,
    globalAssetId: targetShell.assetInformation?.globalAssetId || dppUriOrId,
    productName,
    manufacturer,
    soh,
    cycles,
    architecture,
    dismantling,
    spareParts,
    conditionSubmodelId: smCond?.id,
    serviceSubmodelId: smService?.id,
    currentCount,
  };
}

export async function pushInterventionToOemAas({
  serviceSubmodelId,
  conditionSubmodelId,
  currentCount = 1,
  serviceType,
  operationLabel,
  partNumber = "NONE",
  publicRemarks = "",
  postSoH = null,
  operatorName,
  operatorDid,
}) {
  if (!serviceSubmodelId) {
    throw new Error("El AAS del fabricante no tiene vinculado el submodelo ServiceRequestNotification.");
  }

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nextIndex = Number(currentCount || 0) + 1;
  const srnId = `SRN-2026-${String(nextIndex).padStart(3, "0")}`;
  const uniqueIdShort = `ServiceRequestNotification_${Date.now().toString().slice(-6)}`;

  const labelEs = typeof operationLabel === "object" ? operationLabel.es : operationLabel;
  const labelEn =
    typeof operationLabel === "object" ? operationLabel.en : `${serviceType}: ${operationLabel}`;

  const newCollection = {
    modelType: "SubmodelElementCollection",
    idShort: uniqueIdShort,
    semanticId: {
      type: "ExternalReference",
      keys: [{ type: "GlobalReference", value: "0173-1#02-ABI788#001/0173-1#01-AHX444#001" }],
    },
    value: [
      {
        modelType: "Property",
        idShort: "ServiceRequestNotificationId",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI772#001" }] },
        valueType: "xs:string",
        value: srnId,
      },
      {
        modelType: "Property",
        idShort: "Status",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABH938#002" }] },
        valueType: "xs:string",
        value: "Closed",
      },
      {
        modelType: "Property",
        idShort: "Priority",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI773#001" }] },
        valueType: "xs:string",
        value: serviceType === "Repair" ? "High" : "Medium",
      },
      {
        modelType: "Property",
        idShort: "ServiceType",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI763#001" }] },
        valueType: "xs:string",
        value: serviceType,
      },
      {
        modelType: "MultiLanguageProperty",
        idShort: "ShortText",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI762#001" }] },
        value: [
          { language: "es", text: labelEs },
          { language: "en", text: labelEn },
        ],
      },
      {
        modelType: "SubmodelElementCollection",
        idShort: "ReportedBy",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI792#00/0173-1#01-AHX448#001" }] },
        value: [
          {
            modelType: "Property",
            idShort: "CustomerNumber",
            semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI769#001" }] },
            valueType: "xs:string",
            value: operatorName,
          },
        ],
      },
      {
        modelType: "SubmodelElementCollection",
        idShort: "DetailedInformation",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI789#001/0173-1#01-AHX445#001" }] },
        value: [
          {
            modelType: "Property",
            idShort: "StartOfFault",
            semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI765#001" }] },
            valueType: "xs:dateTime",
            value: nowIso,
          },
          {
            modelType: "Property",
            idShort: "ErrorCode",
            semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI766#001" }] },
            valueType: "xs:string",
            value: partNumber || "NONE",
          },
          {
            modelType: "MultiLanguageProperty",
            idShort: "LongText",
            semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI764#001" }] },
            value: [
              {
                language: "es",
                text: publicRemarks.trim() || `Orden ejecutada vía DMS externo (${operatorName})`,
              },
              {
                language: "en",
                text: publicRemarks.trim() || `Work order executed via external DMS (${operatorName})`,
              },
            ],
          },
        ],
      },
      {
        modelType: "SubmodelElementCollection",
        idShort: "OnsiteContact",
        semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI793#001/0173-1#01-AHX449#001" }] },
        value: [
          {
            modelType: "Property",
            idShort: "PartnerNumber",
            semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: "0173-1#02-ABI771#001" }] },
            valueType: "xs:string",
            value: operatorDid,
          },
        ],
      },
    ],
  };

  const encodedServiceSm = toBase64Url(serviceSubmodelId);
  const postRes = await fetch(`${AAS_BASE_URL}/submodels/${encodedServiceSm}/submodel-elements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(newCollection),
  });
  if (!postRes.ok) {
    throw new Error(`Error BaSyx POST (${postRes.status})`);
  }

  await fetch(
    `${AAS_BASE_URL}/submodels/${encodedServiceSm}/submodel-elements/NumberOfServiceRequestNotifications/$value`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(String(nextIndex)),
    }
  ).catch(() => {});

  if (conditionSubmodelId && postSoH !== null && postSoH !== "") {
    const encodedCondSm = toBase64Url(conditionSubmodelId);
    const cleanTs = nowIso.replace("Z", "");
    await Promise.all([
      fetch(
        `${AAS_BASE_URL}/submodels/${encodedCondSm}/submodel-elements/StateOfCertifiedEnergy.StateOfCertifiedEnergyValue/$value`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(String(postSoH)),
        }
      ),
      fetch(
        `${AAS_BASE_URL}/submodels/${encodedCondSm}/submodel-elements/StateOfCertifiedEnergy.LastUpdate/$value`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanTs),
        }
      ),
    ]).catch(() => {});
  }

  return { srnId, timestamp: nowIso };
}