import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { fetchAssetFromOemAas } from "./services/aasBridge";
import { getInitialLang } from "./hooks/useTranslation";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/Topbar";
import DashboardView from "./components/views/DashboardView";
import WorkOrdersView from "./components/views/WorkOrdersView";
import DiagnosticsView from "./components/views/DiagnosticsView";
import TestBenchView from "./components/views/TestBenchView";
import InventoryView from "./components/views/InventoryView";
import TraceabilityView from "./components/views/TraceabilityView";
import CustomersBillingView from "./components/views/CustomersBillingView";
import NewClientAssetModal from "./components/NewClientAssetModal";

export default function App() {
  const [lang, setLang] = useState(() => getInitialLang());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [aasAsset, setAasAsset] = useState(null);
  const [aasLoading, setAasLoading] = useState(false);

  const handleChangeLang = (nextLang) => {
    setLang(nextLang);
    localStorage.setItem("baidata_erp_lang", nextLang);
  };

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
    try {
      const info = await fetchAssetFromOemAas(uri, lang);
      setAasAsset(info);
    } catch {
      setAasAsset(null);
    } finally {
      setAasLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAsset?.dpp_uri) {
      syncWithOemAas(selectedAsset.dpp_uri);
    }
  }, [selectedAssetId, selectedAsset?.dpp_uri, lang]);

  const handleFullRefresh = async () => {
    if (selectedAsset?.dpp_uri) {
      await syncWithOemAas(selectedAsset.dpp_uri);
    }
    await loadSupabaseData(selectedAsset?.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingOrdersCount={assetsList.length}
        lang={lang}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          assetsList={assetsList}
          selectedAsset={selectedAsset}
          onSelectAsset={setSelectedAssetId}
          aasAsset={aasAsset}
          aasLoading={aasLoading}
          onSyncAas={syncWithOemAas}
          onOpenNewModal={() => setIsNewModalOpen(true)}
          lang={lang}
          onChangeLang={handleChangeLang}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
          {activeTab === "dashboard" && (
            <DashboardView
              assetsList={assetsList}
              workOrders={workOrders}
              aasAsset={aasAsset}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "workorders" && (
            <WorkOrdersView
              selectedAsset={selectedAsset}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "diagnostics" && (
            <DiagnosticsView
              selectedAsset={selectedAsset}
              aasAsset={aasAsset}
              onNavigate={setActiveTab}
              lang={lang}
            />
          )}

          {activeTab === "testbench" && (
            <TestBenchView
              selectedAsset={selectedAsset}
              aasAsset={aasAsset}
              onSyncSuccess={handleFullRefresh}
              lang={lang}
            />
          )}

          {activeTab === "inventory" && (
            <InventoryView aasAsset={aasAsset} lang={lang} />
          )}

          {activeTab === "traceability" && (
            <TraceabilityView
              selectedAsset={selectedAsset}
              workOrders={workOrders}
              lang={lang}
            />
          )}

          {activeTab === "customers" && (
            <CustomersBillingView
              assetsList={assetsList}
              workOrders={workOrders}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              onOpenNewModal={() => setIsNewModalOpen(true)}
              lang={lang}
            />
          )}
        </main>
      </div>

      <NewClientAssetModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newAssetId) => loadSupabaseData(newAssetId)}
        lang={lang}
      />
    </div>
  );
}