export const SECTOR_CONFIG = {
  id: "lmt-workshop",
  partnerName: "Taller E-Mobility Bilbao",
  partnerDid: "did:web:emobility-bilbao.es",
  edcConnectorUrl: "edc-dataplane.emobility-bilbao.es:8191",
  sectorBadge: "Movilidad Eléctrica · Servicio Técnico Autorizado",
  defaultDppPortalUrl: "https://dpp-test-bed.vercel.app",
  labels: {
    appTitle: "DMS Taller · Gestión de Intervenciones",
    customerEntity: "Propietario / Cliente",
    internalRef: "Bastidor / Matrícula Vehículo",
    assetLabel: "Vehículo / Pack Asociado",
    extraField1Key: "bike_model",
    extraField1Label: "Modelo de Bicicleta",
    extraField2Key: "motor",
    extraField2Label: "Sistema Motor",
  },
  // Vocabulario cerrado compatible con IDTA 02010 (DIN 31051 / EN 13306)
  // Para Acería o Construcción, basta con adaptar estos códigos y descripciones:
  operations: [
    {
      code: "InnerInspection",
      label: "Diagnóstico preventivo de celdas y calibración BMS",
      defaultUpdateSoh: false,
    },
    {
      code: "Repair",
      label: "Sustitución de módulo de celdas o componente defectuoso",
      defaultUpdateSoh: true,
    },
    {
      code: "FirmwareUpdate",
      label: "Actualización de firmware de gestión térmica y seguridad BMS",
      defaultUpdateSoh: false,
    },
    {
      code: "Overhauling",
      label: "Reacondicionamiento integral para Segunda Vida (Art. 77.6)",
      defaultUpdateSoh: true,
    },
  ],
};