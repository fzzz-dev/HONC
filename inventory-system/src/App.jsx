import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import LoadingScreen from "./components/LoadingScreen";

// Pages
import LoginPage from "./pages/LoginPage";
import UserManagement from "./pages/UserManagement";
import RolePermissions from "./pages/RolePermissions";
import InventoryHeadPage from "./pages/InventoryHeadPage";
import MainCategoryPage from "./pages/MainCategoryPage";
import ItemPage from "./pages/ItemPage";
import MakePage from "./pages/Makepage";
import SpecPage from "./pages/SpecPage";
import SupplierPage from "./pages/SupplierPage";
import PaymentTermsPage from "./pages/PaymentTermsPage";
import CountryPage from "./pages/CountryPage";
import StatePage from "./pages/StatePage";
import CityPage from "./pages/CityPage";
import {
  StoreMasterPage,
  DepartmentMasterPage,
  ProcessMasterPage,
} from "./pages/OrgMasterPages";
import Uompage from "./pages/UomPage";

// Transactions
import PurchaseIndentPage from "./pages/ProcessMasterPage/Purchaseindentpage";
import ItemPriceListPage from "./pages/ProcessMasterPage/ItemPriceListPage";
import PurchaseOrderPage from "./pages/ProcessMasterPage/PurchaseOrderPage";
import PurchaseGRNPage from "./pages/ProcessMasterPage/PurchaseGRNPage";
import ConsumptionIssuePage from "./pages/ProcessMasterPage/ConsumptionIssuePage";
import CompanySettingsPage from "./pages/CompanySettingsPage";

import "./index.css";

function AuthenticatedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="inv-layout">
      <Sidebar />
      <main className="inv-main">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Private Routes */}
        <Route
          path="/*"
          element={
            <AuthenticatedLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/inv-head" replace />} />

                {/* ── Administration ── */}
                <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/permissions" element={<RolePermissions />} />

                {/* ── Masters ── */}
                <Route path="/inv-head" element={<InventoryHeadPage />} />
                <Route path="/main-cat" element={<MainCategoryPage />} />
                <Route path="/item" element={<ItemPage />} />
                <Route path="/supplier" element={<SupplierPage />} />
                <Route path="/payment-terms" element={<PaymentTermsPage />} />
                <Route path="/uom" element={<Uompage />} />
                <Route path="/make" element={<MakePage />} />
                <Route path="/spec" element={<SpecPage />} />
                <Route path="/country" element={<CountryPage />} />
                <Route path="/state" element={<StatePage />} />
                <Route path="/city" element={<CityPage />} />
                <Route path="/store" element={<StoreMasterPage />} />
                <Route path="/department" element={<DepartmentMasterPage />} />
                <Route path="/process" element={<ProcessMasterPage />} />

                {/* ── Transactions ── */}
                <Route path="/purchase-indent" element={<PurchaseIndentPage />} />
                <Route path="/item-price-list" element={<ItemPriceListPage />} />
                <Route path="/purchase-order" element={<PurchaseOrderPage />} />
                <Route path="/purchase-grn" element={<PurchaseGRNPage />} />
                <Route path="/consumption-issue" element={<ConsumptionIssuePage />} />
                <Route path="/company-settings" element={<CompanySettingsPage />} />

                <Route path="*" element={<Navigate to="/inv-head" replace />} />
              </Routes>
            </AuthenticatedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

