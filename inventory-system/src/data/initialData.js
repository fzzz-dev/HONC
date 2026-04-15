// ─── Inventory Heads ────────────────────────────────────────────────────────
export const initialInventoryHeads = [
  { id: 1, headName: "Raw Materials", active: true, defaultFields: [] },
  { id: 2, headName: "Finished Goods", active: true, defaultFields: [] },
  { id: 3, headName: "Consumables", active: false, defaultFields: [] },
  { id: 4, headName: "Spare Parts", active: true, defaultFields: [] },
];

// ─── Main Categories ─────────────────────────────────────────────────────────
export const initialCategories = [
  {
    id: 1,
    headId: 1,
    headName: "Raw Materials",
    groupName: "Metals",
    active: true,
  },
  {
    id: 2,
    headId: 1,
    headName: "Raw Materials",
    groupName: "Plastics",
    active: true,
  },
  {
    id: 3,
    headId: 2,
    headName: "Finished Goods",
    groupName: "Electronics",
    active: true,
  },
  {
    id: 4,
    headId: 3,
    headName: "Consumables",
    groupName: "Lubricants",
    active: false,
  },
  {
    id: 5,
    headId: 4,
    headName: "Spare Parts",
    groupName: "Bearings",
    active: true,
  },
];

// ─── Items ───────────────────────────────────────────────────────────────────
export const initialItems = [
  {
    id: 1,
    headId: 1,
    head: "Raw Materials",
    group: "Metals",
    subCategory: "Mild Steel",
    itemName: "MS Flat Bar 50x6",
    uom: "kg",
    make: "SAIL",
    spec: "50x6mm IS 2062",
    itemDescription: "Mild steel flat bar",
    rate: 85.0,
    active: true,
    image: null,
  },
  {
    id: 2,
    headId: 4,
    head: "Spare Parts",
    group: "Bearings",
    subCategory: "Deep Groove",
    itemName: "Bearing 6205-2RS",
    uom: "No",
    make: "SKF",
    spec: "25x52x15mm",
    itemDescription: "Deep groove ball bearing",
    rate: 420.0,
    active: true,
    image: null,
  },
  {
    id: 3,
    headId: 3,
    head: "Consumables",
    group: "Lubricants",
    subCategory: "Hydraulic",
    itemName: "Hydraulic Oil 68",
    uom: "ltr",
    make: "Castrol",
    spec: "ISO VG 68",
    itemDescription: "Premium hydraulic oil",
    rate: 195.0,
    active: false,
    image: null,
  },
];

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const initialSuppliers = [
  {
    id: 1,
    supplierName: "Steel India Ltd.",
    type: "Manufacturer",
    active: true,
    gstNo: "",
    panNo: "",
    emailId1: "info@steelindia.com",
    emailId2: "",
    mobileNo1: "+91 98765 43210",
    mobileNo2: "",
    addresses: [
      {
        _id: 101,
        address: "123, Steel Complex, Andheri East",
        pinCode: "400069",
        cityId: "3", // Mumbai  → id:3 in initialCities
        cityName: "Mumbai",
        stateId: "2", // Maharashtra → id:2 in initialStates
        stateName: "Maharashtra",
        countryId: "1", // India → id:1 in initialCountries
        countryName: "India",
      },
    ],
  },
  {
    id: 2,
    supplierName: "SKF Bearings India",
    type: "Distributor",
    active: true,
    gstNo: "",
    panNo: "",
    emailId1: "sales@skfindia.com",
    emailId2: "",
    mobileNo1: "+91 90123 45678",
    mobileNo2: "",
    addresses: [
      {
        _id: 102,
        address: "45, Industrial Area, Pimpri",
        pinCode: "411018",
        cityId: "4", // Pune → id:4 in initialCities
        cityName: "Pune",
        stateId: "2", // Maharashtra
        stateName: "Maharashtra",
        countryId: "1",
        countryName: "India",
      },
    ],
  },
  {
    id: 3,
    supplierName: "Castrol Lubricants",
    type: "Importer",
    active: true,
    gstNo: "",
    panNo: "",
    emailId1: "orders@castrol.in",
    emailId2: "",
    mobileNo1: "+91 80987 65432",
    mobileNo2: "",
    addresses: [
      {
        _id: 103,
        address: "7, Mount Road, Anna Salai",
        pinCode: "600002",
        cityId: "1", // Chennai → id:1 in initialCities
        cityName: "Chennai",
        stateId: "1", // Tamil Nadu → id:1 in initialStates
        stateName: "Tamil Nadu",
        countryId: "1",
        countryName: "India",
      },
    ],
  },
];

// ─── UOMs ────────────────────────────────────────────────────────────────────
export const initialUoms = [
  { id: 1, name: "kg", description: "Kilogram", active: true },
  { id: 2, name: "ltr", description: "Litre", active: true },
  { id: 3, name: "No", description: "Numbers", active: true },
  { id: 4, name: "mtr", description: "Metre", active: true },
  { id: 5, name: "pcs", description: "Pieces", active: true },
];

// ─── Makes ───────────────────────────────────────────────────────────────────
export const initialMakes = [
  { id: 1, name: "SAIL", active: true },
  { id: 2, name: "SKF", active: true },
  { id: 3, name: "Castrol", active: true },
  { id: 4, name: "Bosch", active: true },
];

// ─── Specs ───────────────────────────────────────────────────────────────────
export const initialSpecs = [
  { id: 1, name: "IS 2062", active: true },
  { id: 2, name: "ISO VG 68", active: true },
  { id: 3, name: "DIN 625", active: true },
];

// ─── Countries ───────────────────────────────────────────────────────────────
export const initialCountries = [
  { id: 1, name: "India", code: "IN", active: true },
  { id: 2, name: "USA", code: "US", active: true },
  { id: 3, name: "Germany", code: "DE", active: true },
];

// ─── States ──────────────────────────────────────────────────────────────────
export const initialStates = [
  {
    id: 1,
    countryId: 1,
    countryName: "India",
    name: "Tamil Nadu",
    code: "TN",
    active: true,
  },
  {
    id: 2,
    countryId: 1,
    countryName: "India",
    name: "Maharashtra",
    code: "MH",
    active: true,
  },
  {
    id: 3,
    countryId: 1,
    countryName: "India",
    name: "Karnataka",
    code: "KA",
    active: true,
  },
];

// ─── Cities ──────────────────────────────────────────────────────────────────
export const initialCities = [
  { id: 1, stateId: 1, stateName: "Tamil Nadu", name: "Chennai", active: true },
  {
    id: 2,
    stateId: 1,
    stateName: "Tamil Nadu",
    name: "Coimbatore",
    active: true,
  },
  { id: 3, stateId: 2, stateName: "Maharashtra", name: "Mumbai", active: true },
  { id: 4, stateId: 2, stateName: "Maharashtra", name: "Pune", active: true },
];

// ─── Stores ──────────────────────────────────────────────────────────────────
export const initialStores = [
  { id: 1, name: "Main Warehouse", location: "Block A", active: true },
  { id: 2, name: "Production Store", location: "Block B", active: true },
];

// ─── Departments ─────────────────────────────────────────────────────────────
export const initialDepartments = [
  { id: 1, name: "Production", code: "PRD", active: true },
  { id: 2, name: "Maintenance", code: "MNT", active: true },
  { id: 3, name: "Purchase", code: "PUR", active: true },
];

// ─── Processes ───────────────────────────────────────────────────────────────
export const initialProcesses = [
  { id: 1, name: "Machining", department: "Production", active: true },
  { id: 2, name: "Welding", department: "Production", active: true },
  { id: 3, name: "Assembly", department: "Production", active: true },
];

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export const initialPOs = [
  {
    id: 1,
    poNo: "PO-2024-001",
    date: "2024-01-15",
    supplierId: 1,
    supplierName: "Steel India Ltd.",
    createdBy: "Admin",
    createdOn: "2024-01-14",
    status: "Open",
    remarks: "Urgent order",
    details: [
      {
        id: 1,
        indentNo: "IND-001",
        itemName: "MS Flat Bar 50x6",
        uom: "kg",
        indentQty: 100,
        alPoQty: 0,
        balQty: 100,
        poQty: 100,
        priceListRate: 90,
        poRate: 85,
        discPct: 5.56,
        poAmount: 8500,
        gstPct: 18,
        sgst: 765,
        cgst: 765,
        igst: 0,
        totGst: 1530,
        totalAmount: 10030,
        indentRemarks: "",
        poRemarks: "",
      },
    ],
  },
];

// ─── Constants ───────────────────────────────────────────────────────────────
export const SUPPLIER_TYPES = [
  "Manufacturer",
  "Distributor",
  "Importer",
  "Trader",
  "Service Provider",
];

export const FIELD_OPTIONS = [
  "Make",
  "Spec",
  "Sub Category",
  "Description",
  "Rate",
  "UOM",
];

export const UOM_OPTIONS = ["kg", "ltr", "No", "mtr", "pcs"];
// ─── Purchase Indents ────────────────────────────────────────────────────────
export const initialIndents = [
  {
    id: 1,
    indentNo: "IND-2024-001",
    date: "2024-01-10",
    departmentId: "2",
    departmentName: "Maintenance",
    createdBy: "Admin",
    createdOn: "2024-01-10",
    status: "Open",
    remarks: "Monthly maintenance requirement",
    details: [
      {
        id: 501,
        inventoryHeadId: "4",
        inventoryHeadName: "Spare Parts",
        mainCategoryId: "5",
        mainCategoryName: "Bearings",
        itemId: "2",
        itemName: "Bearing 6205-2RS",
        uom: "No",
        indentQty: 10,
        dueDate: "2024-01-20",
        remarks: "Urgent",
      },
    ],
  },
  {
    id: 2,
    indentNo: "IND-2024-002",
    date: "2024-01-12",
    departmentId: "1",
    departmentName: "Production",
    createdBy: "Admin",
    createdOn: "2024-01-12",
    status: "Open",
    remarks: "",
    details: [
      {
        id: 502,
        inventoryHeadId: "1",
        inventoryHeadName: "Raw Materials",
        mainCategoryId: "1",
        mainCategoryName: "Metals",
        itemId: "1",
        itemName: "MS Flat Bar 50x6",
        uom: "kg",
        indentQty: 500,
        dueDate: "2024-01-25",
        remarks: "For new batch",
      },
      {
        id: 503,
        inventoryHeadId: "3",
        inventoryHeadName: "Consumables",
        mainCategoryId: "4",
        mainCategoryName: "Lubricants",
        itemId: "3",
        itemName: "Hydraulic Oil 68",
        uom: "ltr",
        indentQty: 50,
        dueDate: "2024-01-25",
        remarks: "",
      },
    ],
  },
];

export const initialPriceLists = [
  {
    id: 1,
    listNo: "IPL-2024-001",
    supplierId: "1",
    supplierName: "Steel India Ltd.",
    date: "2024-01-01",
    details: [
      {
        id: 701,
        inventoryHeadId: "1",
        inventoryHeadName: "Raw Materials",
        subCategory: "Mild Steel",
        itemId: "1",
        itemName: "MS Flat Bar 50x6",
        price: 85,
        discPct: 5,
        gstPct: 18,
        fromDate: "2024-01-01",
        toDate: "2024-03-31",
        freight: 200,
        others: 0,
        notes: "Valid for Q1 2024",
      },
    ],
  },
  {
    id: 2,
    listNo: "IPL-2024-002",
    supplierId: "2",
    supplierName: "SKF Bearings India",
    date: "2024-01-05",
    details: [
      {
        id: 702,
        inventoryHeadId: "4",
        inventoryHeadName: "Spare Parts",
        subCategory: "Deep Groove",
        itemId: "2",
        itemName: "Bearing 6205-2RS",
        price: 420,
        discPct: 3,
        gstPct: 18,
        fromDate: "2024-01-05",
        toDate: "2024-06-30",
        freight: 50,
        others: 0,
        notes: "",
      },
    ],
  },
];

// ─── Purchase GRNs ────────────────────────────────────────────────────────────
export const initialGRNs = [
  {
    id: 1,
    grnNo: "GRN-2024-001",
    date: "2024-01-20",
    supplierId: "1",
    supplierName: "Steel India Ltd.",
    storeId: "1",
    storeName: "Main Warehouse",
    details: [
      {
        id: 801,
        indentNo: "IND-2024-002",
        poNo: "PO-2024-001",
        poDate: "2024-01-15",
        itemName: "MS Flat Bar 50x6",
        uom: "kg",
        poQty: 100,
        alGrnQty: 0,
        balQty: 100,
        grnQty: 100,
        poRate: 85,
        grnRate: 85,
        discPct: 5.56,
        grnAmount: 8026.44,
        gstPct: 18,
        sgst: 722.38,
        cgst: 722.38,
        igst: 0,
        totGst: 1444.76,
        totalAmount: 9471.2,
        remarks: "",
      },
    ],
  },
];

// ─── Consumption Issues ───────────────────────────────────────────────────────
export const initialIssues = [
  {
    id: 1,
    issNo: "ISS-2024-001",
    date: "2024-01-22",
    departmentId: "1",
    departmentName: "Production",
    storeId: "1",
    storeName: "Main Warehouse",
    details: [
      {
        id: 901,
        category: "Raw Materials",
        subCategory: "Mild Steel",
        itemName: "MS Flat Bar 50x6",
        grnNo: "GRN-2024-001",
        stkQty: 100,
        issueQty: 50,
        rate: 85,
        amount: 4250,
      },
    ],
  },
];
