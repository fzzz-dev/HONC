import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import SimpleMasterPage from "./components/SimpleMasterPage";

import InventoryHeadPage from "./pages/InventoryHeadPage";
import MainCategoryPage from "./pages/MainCategoryPage";
import ItemPage from "./pages/ItemPage";
import MakePage from "./pages/Makepage";
import SpecPage from "./pages/SpecPage";
import SupplierPage from "./pages/SupplierPage";
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

import {
  initialInventoryHeads,
  initialCategories,
  initialItems,
  initialSuppliers,
  initialUoms,
  initialMakes,
  initialSpecs,
  initialCountries,
  initialStates,
  initialCities,
  initialStores,
  initialDepartments,
  initialProcesses,
  initialPOs,
  initialIndents,
  initialPriceLists,
  initialGRNs,
  initialIssues,
} from "./data/initialData";

import "./index.css";

export default function App() {
  // ── Masters ────────────────────────────────────────────────────────────────
  const [heads, setHeads] = useState(initialInventoryHeads);
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [uoms, setUoms] = useState(initialUoms);
  const [makes, setMakes] = useState(initialMakes);
  const [specs, setSpecs] = useState(initialSpecs);
  const [countries, setCountries] = useState(initialCountries);
  const [states, setStates] = useState(initialStates);
  const [cities, setCities] = useState(initialCities);
  const [stores, setStores] = useState(initialStores);
  const [departments, setDepartments] = useState(initialDepartments);
  const [processes, setProcesses] = useState(initialProcesses);

  // ── Transactions ───────────────────────────────────────────────────────────
  const [indents, setIndents] = useState(initialIndents);
  const [priceLists, setPriceLists] = useState(initialPriceLists);
  const [pos, setPos] = useState(initialPOs);
  const [grns, setGrns] = useState(initialGRNs);
  const [issues, setIssues] = useState(initialIssues);

  return (
    <BrowserRouter>
      <div className="inv-layout">
        <Sidebar />
        <main className="inv-main">
          <Routes>
            <Route path="/" element={<Navigate to="/inv-head" replace />} />

            {/* ── Masters ── */}
            <Route
              path="/inv-head"
              element={<InventoryHeadPage heads={heads} setHeads={setHeads} />}
            />
            <Route
              path="/main-cat"
              element={
                <MainCategoryPage
                  categories={categories}
                  setCategories={setCategories}
                  heads={heads}
                />
              }
            />
            <Route
              path="/item"
              element={
                <ItemPage
                  items={items}
                  setItems={setItems}
                  heads={heads}
                  categories={categories}
                />
              }
            />
            <Route
              path="/supplier"
              element={
                <SupplierPage
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                  countries={countries}
                  states={states}
                  cities={cities}
                />
              }
            />
            <Route
              path="/uom"
              element={
                <Uompage
                  title="UOM"
                  subtitle="Unit of measure"
                  items={uoms}
                  setItems={setUoms}
                  showDesc
                />
              }
            />
            <Route
              path="/make"
              element={
                <MakePage
                  title="Make"
                  subtitle="Manage makes / brands"
                  items={makes}
                  setItems={setMakes}
                />
              }
            />
            <Route
              path="/spec"
              element={
                <SpecPage
                  title="Spec Name"
                  subtitle="Manage specifications"
                  items={specs}
                  setItems={setSpecs}
                />
              }
            />
            <Route
              path="/country"
              element={
                <CountryPage
                  countries={countries}
                  setCountries={setCountries}
                />
              }
            />
            <Route
              path="/state"
              element={
                <StatePage
                  states={states}
                  setStates={setStates}
                  countries={countries}
                />
              }
            />
            <Route
              path="/city"
              element={
                <CityPage
                  cities={cities}
                  setCities={setCities}
                  states={states}
                />
              }
            />
            <Route
              path="/store"
              element={
                <StoreMasterPage stores={stores} setStores={setStores} />
              }
            />
            <Route path="/department" element={<DepartmentMasterPage />} />
            <Route path="/process" element={<ProcessMasterPage />} />

            {/* ── Transactions ── */}
            <Route
              path="/purchase-indent"
              element={
                <PurchaseIndentPage
                  indents={indents}
                  setIndents={setIndents}
                  departments={departments}
                  heads={heads}
                  categories={categories}
                  items={items}
                  uoms={uoms}
                />
              }
            />
            <Route
              path="/item-price-list"
              element={
                <ItemPriceListPage
                  priceLists={priceLists}
                  setPriceLists={setPriceLists}
                  suppliers={suppliers}
                  heads={heads}
                  items={items}
                />
              }
            />
            <Route
              path="/purchase-order"
              element={
                <PurchaseOrderPage
                  pos={pos}
                  setPos={setPos}
                  suppliers={suppliers}
                  items={items}
                  uoms={uoms}
                   indents={indents}
                />
              }
            />
            <Route
              path="/purchase-grn"
              element={
                <PurchaseGRNPage
                  grns={grns}
                  setGrns={setGrns}
                  suppliers={suppliers}
                  stores={stores}
                  items={items}
                  uoms={uoms}
                  pos={pos}
                  indents={indents}
                />
              }
            />
            <Route
              path="/consumption-issue"
              element={
                <ConsumptionIssuePage
                  issues={issues}
                  setIssues={setIssues}
                  departments={departments}
                  stores={stores}
                  items={items}
                  heads={heads}
                  grns={grns}
                />
              }
            />

            <Route path="*" element={<Navigate to="/inv-head" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
