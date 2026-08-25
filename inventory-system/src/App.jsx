import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import LoadingScreen from "./components/LoadingScreen";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
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
import PurchaseIndentReportPage from "./pages/Reports/purchaseIndentReportPage";
import PurchaseOrderReportPage from "./pages/Reports/PurchaseOrderResult";
import PurchaseGrnReportPage from "./pages/Reports/PurchaseGrnReportPage";
import InventoryStockFlow from "./pages/Reports/InventoryStockFlow";
import ConsumptionIssueReportPage from "./pages/Reports/ConsumptionIssueReportPage";
import POLevel1Pending from "./pages/Reports/POLevel1Pending";
import POLevel2Pending from "./pages/Reports/POLevel2Pending";
import {
  StoreMasterPage,
  DepartmentMasterPage,
  ProcessMasterPage,
} from "./pages/OrgMasterPages";
import Uompage from "./pages/UomPage";
import IssueTypePage from "./pages/IssueTypePage";

// Transactions
import PurchaseIndentPage from "./pages/ProcessMasterPage/Purchaseindentpage";
import ItemPriceListPage from "./pages/ProcessMasterPage/ItemPriceListPage";
import PurchaseOrderPage from "./pages/ProcessMasterPage/PurchaseOrderPage";
import PurchaseGRNPage from "./pages/ProcessMasterPage/PurchaseGRNPage";
import ConsumptionIssuePage from "./pages/ProcessMasterPage/ConsumptionIssuePage";
import OpeningStockPage from "./pages/ProcessMasterPage/OpeningStockPage";
import PurchaseIndentRegister from "./pages/RegisterPage/PurchaseIndentRegister";

// HRMS Pages
import HrDepartment from "./pages/hrms/HrDepartment";
import HrDesignation from "./pages/hrms/HrDesignation";
import HrShift from "./pages/hrms/HrShift";
import HrEmployee from "./pages/hrms/HrEmployee";
import EmployeeReportPage from "./pages/Reports/EmployeeReport"

// ========== PRODUCTION MASTER PAGES  ==========
import Color from "./pages/ProductionMasters/Color";
import Counts from "./pages/ProductionMasters/Counts";
import YarnType from "./pages/ProductionMasters/YarnType";
import Mill from "./pages/ProductionMasters/Mill";
import Process from "./pages/ProductionMasters/Process";

//=========== PRODUCTION TRANSACTION PAGES =========
import Enquiry from "./pages/ProductionTransactions/Enquiry";
import Quotation from "./pages/ProductionTransactions/Quotation";
import SalesOrder from "./pages/ProductionTransactions/SalesOrder";
import YarnInward from "./pages/ProductionTransactions/YarnInward";

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
                <Route path="/" element={<HomePage />} />

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
                <Route path="/Issues" element={<IssueTypePage />} />

                {/* ── Production Masters ── */}
                <Route path="/production/colors" element={<Color />} />
                <Route path="/production/counts" element={<Counts />} />
                <Route path="/production/yarn-types" element={<YarnType />} />
                <Route path="/production/mills" element={<Mill />} />
                <Route path="/production/processes" element={<Process />} />

                {/* ── Production Transactions ── */}
                <Route path="/production/enquiry" element={<Enquiry />} />
                <Route path="/production/quotation" element={<Quotation/>} />
                <Route path="/production/sales-order" element={<SalesOrder/>} />
                <Route path="/production/yarn-inward" element={<YarnInward/>}/>

                {/* ── Transactions ── */}
                <Route path="/purchase-indent" element={<PurchaseIndentPage />} />
                <Route path="/item-price-list" element={<ItemPriceListPage />} />
                <Route path="/purchase-order" element={<PurchaseOrderPage />} />
                <Route path="/purchase-grn" element={<PurchaseGRNPage />} />
                <Route path="/consumption-issue" element={<ConsumptionIssuePage />} />
                <Route path="/opening-stock" element={<OpeningStockPage />} />

                {/* ── Register ── */}
                <Route path="/purchase-indent-register" element={<PurchaseIndentRegister />} />

                {/* ── Reports ── */}
                <Route path="/purchase-indent-report" element={<PurchaseIndentReportPage />} />
                <Route path="/purchase-order-report" element={<PurchaseOrderReportPage />} />
                <Route path="/purchase-grn-report" element={<PurchaseGrnReportPage />} />
                <Route path="/inventory-report" element={<InventoryStockFlow />} />
                <Route path="/po-level1-pending" element={<POLevel1Pending />} />
                <Route path="/po-level2-pending" element={<POLevel2Pending />} />
                <Route path="/consumption-issue-report" element={<ConsumptionIssueReportPage />} />
                <Route path="/Employee-Report" element={<EmployeeReportPage />} />

                {/* ── HRMS ── */}
                <Route path="/hr/department" element={<HrDepartment />} />
                <Route path="/hr/designation" element={<HrDesignation />} />
                <Route path="/hr/shift" element={<HrShift />} />
                <Route path="/hr/employee" element={<HrEmployee />} />


                <Route path="*" element={<Navigate to="/inv-head" replace />} />
              </Routes>
            </AuthenticatedLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}