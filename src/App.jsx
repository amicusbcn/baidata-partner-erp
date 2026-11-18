import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { getInitialLang } from "./hooks/useTranslation";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import DashboardView from "./components/views/DashboardView";
import WorkOrdersView from "./components/views/WorkOrdersView";
import ReceptionView from "./components/views/ReceptionView";
import DiagnosticsView from "./components/views/DiagnosticsView";
import WorkshopTestingView from "./components/views/WorkshopTestingView";
import BillingDeliveryView from "./components/views/BillingDeliveryView";
import InventoryView from "./components/views/InventoryView";
import EdcTransferModal from "./components/EdcTransferModal";

const STATUS_TO_TAB = {
  received: "reception",
  quarantine: "reception",
  diagnosing: "diagnostics",
  approval: "diagnostics",
  repairing: "workshop",
  testing: "workshop",
  ready: "billing",
  closed: "billing",
};

export default function App() {
  const [lang, setLang] = useState(() => getInitialLang());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);

  // Estado del visualizador modal de interacciones EDC / AAS
  const [edcModalConfig, setEdcModalConfig] = useState(null);

  const handleChangeLang = (nextLang) => {
    setLang(nextLang);
    localStorage.setItem("baidata_erp_lang", nextLang);
  };

  const loadWorkOrders = async (preferredOrderId = null) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("work_orders")
      .select("*, assets(id, asset_label, internal_ref, dpp_uri, customers(*))")
      .order("created_at", { ascending: false });

    if (data) {
      setWorkOrders(data);
      if (preferredOrderId) {
        setSelectedOrderId(preferredOrderId);
      }
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  // Abrir una orden directamente en la sección correspondiente a su estado
  const handleOpenOrder = (wo) => {
    if (!wo) return;
    setIsCreatingNewOrder(false);
    setSelectedOrderId(wo.id);
    const targetTab = STATUS_TO_TAB[wo.status] || "reception";
    setActiveTab(targetTab);
  };

  // Ir a Recepción con el formulario de Nueva Orden abierto
  const handleStartNewOrder = () => {
    setIsCreatingNewOrder(true);
    setActiveTab("reception");
  };

  const counts = {
    totalActive: workOrders.filter((w) => !["closed", "cancelled"].includes(w.status)).length,
    reception: workOrders.filter((w) => ["received", "quarantine"].includes(w.status)).length,
    diagnostics: workOrders.filter((w) => ["diagnosing", "approval"].includes(w.status)).length,
    workshop: workOrders.filter((w) => ["repairing", "testing"].includes(w.status)).length,
    billing: workOrders.filter((w) => w.status === "ready").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsCreatingNewOrder(false);
          setActiveTab(tab);
        }}
        counts={counts}
        lang={lang}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar lang={lang} onChangeLang={handleChangeLang} />

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
          {activeTab === "dashboard" && (
            <DashboardView
              workOrders={workOrders}
              onOpenOrder={handleOpenOrder}
              onNavigate={setActiveTab}
              onStartNewOrder={handleStartNewOrder}
              lang={lang}
            />
          )}

          {activeTab === "workorders" && (
            <WorkOrdersView
              workOrders={workOrders}
              onOpenOrder={handleOpenOrder}
              onStartNewOrder={handleStartNewOrder}
              lang={lang}
            />
          )}

          {activeTab === "reception" && (
            <ReceptionView
              workOrders={workOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrderId={setSelectedOrderId}
              isCreatingNew={isCreatingNewOrder}
              onSetCreatingNew={setIsCreatingNewOrder}
              onRefreshData={loadWorkOrders}
              onOpenEdcModal={setEdcModalConfig}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "diagnostics" && (
            <DiagnosticsView
              workOrders={workOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrderId={setSelectedOrderId}
              onRefreshData={loadWorkOrders}
              onOpenEdcModal={setEdcModalConfig}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "workshop" && (
            <WorkshopTestingView
              workOrders={workOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrderId={setSelectedOrderId}
              onRefreshData={loadWorkOrders}
              onOpenEdcModal={setEdcModalConfig}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "billing" && (
            <BillingDeliveryView
              workOrders={workOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrderId={setSelectedOrderId}
              onRefreshData={loadWorkOrders}
              lang={lang}
            />
          )}

          {activeTab === "inventory" && <InventoryView lang={lang} />}
        </main>
      </div>

      {/* Visualizador Modal de Interacciones ERP <-> EDC <-> AAS */}
      {edcModalConfig && (
        <EdcTransferModal
          config={edcModalConfig}
          onClose={() => setEdcModalConfig(null)}
          lang={lang}
        />
      )}
    </div>
  );
}