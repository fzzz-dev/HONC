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
const Company = require("./company");
const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");

// Associations
State.belongsTo(Country, { foreignKey: "countryId", as: "country" });
Country.hasMany(State, { foreignKey: "countryId" });

City.belongsTo(State, { foreignKey: "stateId", as: "state" });
State.hasMany(City, { foreignKey: "stateId" });

MainCategory.belongsTo(InventoryHead, { foreignKey: "headId", as: "inventoryHead" });
InventoryHead.hasMany(MainCategory, { foreignKey: "headId" });

Process.belongsTo(Department, { foreignKey: "departmentId", as: "department" });
Department.hasMany(Process, { foreignKey: "departmentId" });

// PO/Indent/GRN usually use JSON or plain IDs for simplicity in this migration,
// but we can define some basic ones if needed.

module.exports = {
  sequelize,
  Country, State, City, InventoryHead, Item, Department, Store, Process,
  Uom, Make, Spec, SupplierType, Supplier, MainCategory, ItemPriceList,
  PurchaseIndent, PurchaseOrder, PaymentTerm, PurchaseGRN, ConsumptionIssue, User, Role, Permission, Company
};
