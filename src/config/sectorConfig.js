export const SECTOR_CONFIG = {
  id: "lmt-workshop",
  partnerName: "Taller E-Mobility Bilbao",
  partnerDid: "did:web:emobility-bilbao.es",
  edcConnectorUrl: "edc-dataplane.emobility-bilbao.es:8191",
  sectorBadge: {
    es: "Movilidad Eléctrica · Servicio Técnico Autorizado",
    en: "E-Mobility · Authorized Technical Service",
  },
  defaultDppPortalUrl: "https://dpp-test-bed.vercel.app",
  labels: {
    es: {
      appTitle: "DMS Taller · Gestión de Intervenciones",
      customerEntity: "Propietario / Cliente",
      internalRef: "Bastidor / Matrícula Vehículo",
      assetLabel: "Vehículo / Pack Asociado",
      extraField1Key: "bike_model",
      extraField1Label: "Modelo de Bicicleta",
      extraField2Key: "motor",
      extraField2Label: "Sistema Motor",
    },
    en: {
      appTitle: "Workshop DMS · Intervention Management",
      customerEntity: "Owner / Customer",
      internalRef: "Vehicle Frame / Plate ID",
      assetLabel: "Associated Vehicle / Pack",
      extraField1Key: "bike_model",
      extraField1Label: "Bicycle Model",
      extraField2Key: "motor",
      extraField2Label: "Drive Unit System",
    },
  },
  operations: [
    {
      code: "InnerInspection",
      label: {
        es: "Diagnóstico preventivo de celdas y calibración BMS",
        en: "Preventive cell diagnostics and BMS calibration",
      },
      defaultUpdateSoh: false,
    },
    {
      code: "Repair",
      label: {
        es: "Sustitución de módulo de celdas o componente defectuoso",
        en: "Defective cell module or component replacement",
      },
      defaultUpdateSoh: true,
    },
    {
      code: "FirmwareUpdate",
      label: {
        es: "Actualización de firmware de gestión térmica y seguridad BMS",
        en: "BMS thermal management and safety firmware update",
      },
      defaultUpdateSoh: false,
    },
    {
      code: "Overhauling",
      label: {
        es: "Reacondicionamiento integral para Segunda Vida (Art. 77.6)",
        en: "Full overhauling and repurposing for Second Life (Art. 77.6)",
      },
      defaultUpdateSoh: true,
    },
  ],
};