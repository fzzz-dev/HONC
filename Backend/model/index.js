// model/index.js
const sequelize = require("../config/database");
const Country = require("./country");
const State = require("./state");
const City = require("./city");
const InventoryHead = require("./inventoryHead");
const Item = require("./item");
const Department = require("./Department");
const Store = require("./Store");
const Process = require("./Process");
const Uom = require("./uom");
const Make = require("./make");
const Spec = require("./spec");
const SupplierType = require("./supplierType");
const PaymentTerm = require("./paymentTerm");
const Supplier = require("./supplier");
const MainCategory = require("./mainCategory");
const ItemPriceList = require("./Itempricelist");
const PurchaseIndent = require("./purchaseIndent");
const PurchaseOrder = require("./purchaseOrder");
const PurchaseGRN = require("./purchaseGRN");
const ConsumptionIssue = require("./consumptionIssue");
const OpeningStock = require("./openingStock");
const OpeningStockDetail = require("./openingStockDetail");
const Company = require("./company");
const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");

const PurchaseIndentDetail = require("./purchaseIndentDetail");
const PurchaseOrderDetail = require("./purchaseOrderDetail");
const PurchaseGRNDetail = require("./purchaseGRNDetail");
const ConsumptionIssueDetail = require("./consumptionIssueDetail");

// ========== HR Models from hrms folder ==========
const HrDepartment = require("./hrms/hrDepartment");
const HrDesignation = require("./hrms/hrDesignation");
const HrShift = require("./hrms/hrShift");
const HrEmployee = require("./hrms/hrEmployeeModel");

// ========== Associations ==========

// Location Associations
State.belongsTo(Country, { foreignKey: "countryId", as: "country" });
Country.hasMany(State, { foreignKey: "countryId" });

City.belongsTo(State, { foreignKey: "stateId", as: "state" });
State.hasMany(City, { foreignKey: "stateId" });

// Inventory Associations
MainCategory.belongsTo(InventoryHead, { foreignKey: "headId", as: "inventoryHead" });
InventoryHead.hasMany(MainCategory, { foreignKey: "headId" });

Process.belongsTo(Department, { foreignKey: "departmentId", as: "department" });
Department.hasMany(Process, { foreignKey: "departmentId" });

// Purchase / Inventory Associations
PurchaseIndent.hasMany(PurchaseIndentDetail, { as: "details", foreignKey: "purchaseIndentId", onDelete: "CASCADE" });
PurchaseIndentDetail.belongsTo(PurchaseIndent, { foreignKey: "purchaseIndentId" });

PurchaseOrder.hasMany(PurchaseOrderDetail, { as: "details", foreignKey: "purchaseOrderId", onDelete: "CASCADE" });
PurchaseOrderDetail.belongsTo(PurchaseOrder, { foreignKey: "purchaseOrderId" });

PurchaseGRN.hasMany(PurchaseGRNDetail, { as: "details", foreignKey: "purchaseGRNId", onDelete: "CASCADE" });
PurchaseGRNDetail.belongsTo(PurchaseGRN, { foreignKey: "purchaseGRNId" });

ConsumptionIssue.hasMany(ConsumptionIssueDetail, { as: "details", foreignKey: "consumptionIssueId", onDelete: "CASCADE" });
ConsumptionIssueDetail.belongsTo(ConsumptionIssue, { foreignKey: "consumptionIssueId" });

OpeningStock.hasMany(OpeningStockDetail, { as: "details", foreignKey: "openingStockId", onDelete: "CASCADE" });
OpeningStockDetail.belongsTo(OpeningStock, { foreignKey: "openingStockId" });

// ========== HR Associations ==========
// Employee belongs to Department and Designation
HrEmployee.belongsTo(HrDepartment, { foreignKey: "departmentId", as: "department" });
HrEmployee.belongsTo(HrDesignation, { foreignKey: "designationId", as: "designation" });

// Department has many Employees
HrDepartment.hasMany(HrEmployee, { foreignKey: "departmentId", as: "employees" });

// Designation has many Employees
HrDesignation.hasMany(HrEmployee, { foreignKey: "designationId", as: "employees" });

// Designation belongs to Department (since we removed sub_department)
HrDesignation.belongsTo(HrDepartment, { foreignKey: "department_id", as: "department" });
HrDepartment.hasMany(HrDesignation, { foreignKey: "department_id", as: "designations" });

// ========== Exports ==========
module.exports = {
  sequelize,
  Country, 
  State, 
  City, 
  InventoryHead, 
  Item, 
  Department, 
  Store, 
  Process,
  Uom, 
  Make, 
  Spec, 
  SupplierType, 
  Supplier, 
  MainCategory, 
  ItemPriceList,
  PurchaseIndent, 
  PurchaseIndentDetail, 
  PurchaseOrder, 
  PurchaseOrderDetail, 
  PaymentTerm, 
  PurchaseGRN, 
  PurchaseGRNDetail, 
  ConsumptionIssue, 
  ConsumptionIssueDetail, 
  OpeningStock, 
  OpeningStockDetail, 
  User, 
  Role, 
  Permission, 
  Company,
  // HR Models
  HrDepartment,
  HrDesignation,
  HrShift,
  HrEmployee
};