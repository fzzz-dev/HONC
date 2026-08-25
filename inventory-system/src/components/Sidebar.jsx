import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Icons = {
  Chevron: ({ open }) => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M19 9l-7 7-7-7"></path>
    </svg>
  ),
  Toggle: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>,
  Admin: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.116-1.116A10.001 10.001 0 0110 21m-2-2a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  InventoryHead: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>,
  Category: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>,
  Item: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 12V8a2 2 0 00-2-2H6a2 2 0 00-2 2v4-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>,
  Supplier: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
  Make: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"></path></svg>,
  Uom: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18M7 6v12M11 6v12M15 6v12"></path></svg>,
  Issues: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug-play-icon lucide-bug-play"><path d="M10 19.655A6 6 0 0 1 6 14v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 3.97"/><path d="M14 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"/><path d="M14.12 3.88 16 2"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/></svg>,
  Spec: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
  Globe: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path></svg>,
  Store: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Dept: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path></svg>,
  Process: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>,
  Indent: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Price: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  Order: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path></svg>,
  GRN: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Issue: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Logout: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Shield: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  PIresult: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20a2 2 0 0 0 2 2h10a2.4 2.4 0 0 0 1.706-.706l3.588-3.588A2.4 2.4 0 0 0 21 16V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M15 22v-5a1 1 0 0 1 1-1h5"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>,
  POresult: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m14 16-4-4 4-4"/></svg>,
  GRNresult: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg>,
  INVresult: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/></svg>,
  Conresult: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-barcode-icon lucide-scan-barcode"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/></svg>,
  POLevel1: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>,
  POLevel2: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  SlideLeft: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>,
  SlideRight: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>,
  //HRMS Icons

  HRdept: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-icon lucide-building"><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M12 6h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/><path d="M8 6h.01"/><path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>,
  HRdesg: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-key-icon lucide-user-round-key"><path d="M19 11v6"/><path d="M19 13h2"/><path d="M2 21a8 8 0 0 1 12.868-6.349"/><circle cx="10" cy="8" r="5"/><circle cx="19" cy="19" r="2"/></svg>,
  HRshift: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-fading-icon lucide-clock-fading"><path d="M12 2a10 10 0 0 1 7.38 16.75"/><path d="M12 6v6l4 2"/><path d="M2.5 8.875a10 10 0 0 0-.5 3"/><path d="M2.83 16a10 10 0 0 0 2.43 3.4"/><path d="M4.636 5.235a10 10 0 0 1 .891-.857"/><path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/></svg>,
  HRemp: () =>  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-id-card-lanyard-icon lucide-id-card-lanyard"><path d="M13.5 8h-3"/><path d="m15 2-1 2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"/><path d="M16.899 22A5 5 0 0 0 7.1 22"/><path d="m9 2 3 6"/><circle cx="12" cy="15" r="3"/></svg>,
  HRempReport: ()=> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pc-case-icon lucide-pc-case"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M15 14h.01"/><path d="M9 6h6"/><path d="M9 10h6"/></svg>,
  //ProductionMasters
  Color: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette-icon lucide-palette"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  Counts: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sigma-icon lucide-sigma"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>,
  YarnType: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thread-icon lucide-thread"><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10"/><path d="M12 8a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4"/><path d="M12 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4"/><path d="M12 12a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4 4 4 0 0 1 4 4"/></svg>,
  Mill: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-factory-icon lucide-factory"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>,
  PRprocess: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-workflow-icon lucide-workflow"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><path d="M5 8v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M19 8v4a2 2 0 0 1-2 2h-4"/></svg>,
  // Production Transactions Icons
  Enquiry: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle-question-icon lucide-message-circle-question"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>,
  Quotation: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
  SalesOrder: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-list-icon lucide-clipboard-list"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 15h4"/><path d="M8 11h.01"/><path d="M8 15h.01"/></svg>,
  YarnInward: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package-plus-icon lucide-package-plus"><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,

};

const TRANSACTIONS = [
  { path: "/purchase-indent", label: "Purchase Indent", icon: Icons.Indent },
  { path: "/item-price-list", label: "Item Price List", icon: Icons.Price },
  { path: "/purchase-order", label: "Purchase Order", icon: Icons.Order },
  { path: "/purchase-grn", label: "Purchase GRN", icon: Icons.GRN },
  { path: "/consumption-issue", label: "Consumption Issue", icon: Icons.Issue },
  { path: "/opening-stock", label: "Opening Stock", icon: Icons.Store },
];

const MASTERS = [
  { path: "/inv-head", label: "Inventory Head", icon: Icons.InventoryHead },
  { path: "/main-cat", label: "Main Category", icon: Icons.Category },
  { path: "/item", label: "Item", icon: Icons.Item },
  { path: "/supplier", label: "Supplier", icon: Icons.Supplier },
  { path: "/payment-terms", label: "Payment Terms", icon: Icons.Price },
  { path: "/uom", label: "UOM", icon: Icons.Uom },
  { path: "/make", label: "Make", icon: Icons.Make },
  { path: "/spec", label: "Spec Name", icon: Icons.Spec },
  { path: "/store", label: "Store Master", icon: Icons.Store },
  { path: "/department", label: "Department Master", icon: Icons.Dept },
  { path: "/process", label: "Process Master", icon: Icons.Process },
  { path:"/Issues", label: "Issues", icon: Icons.Issues}
];

const ADMIN = [
  { path: "/admin/users", label: "User Management", icon: Icons.Admin },
  { path: "/admin/permissions", label: "Access Control", icon: Icons.Shield },
];

const REPORTS = [
  { path: "/purchase-indent-report", label: "Purchase Indent Report", icon: Icons.PIresult },
  { path: "/purchase-order-report", label: "Purchase Order Report", icon: Icons.POresult },
  { path: "/purchase-grn-report", label: "Purchase GRN Report", icon: Icons.GRNresult },
  { path: "/inventory-report", label: "Inventory Report", icon: Icons.INVresult },
  { path: "/consumption-issue-report", label: "Consumption Issue Report", icon: Icons.Conresult },
  { path: "/po-level2-pending", label: "PO Level 2 Pending", icon: Icons.POLevel2 },
  { path: "/po-level1-pending", label: "PO Level 1 Pending", icon: Icons.POLevel1 },
  { path: "/Employee-report", label: "Employee's Report", icon: Icons.HRempReport}
];

const HRMS = [
  { path: "/hr/department", label: "Department", icon: Icons.HRdept },
  { path: "/hr/designation", label: "Designation", icon: Icons.HRdesg },
  { path: "/hr/shift", label: "Shift", icon: Icons.HRshift },
  { path: "/hr/employee", label: "Employee", icon: Icons.HRemp },
];

const ProductionMasters = [
  { path: "/production/colors", label: "Colors", icon: Icons.Color },
  { path: "/production/counts", label: "Counts", icon: Icons.Counts },
  { path: "/production/yarn-types", label: "Yarn Types", icon: Icons.YarnType },
  { path: "/production/mills", label: "Mills", icon: Icons.Mill },
  { path: "/production/processes", label: "Processes", icon: Icons.PRprocess },
];

const ProductionTransactions = [
  { path: "/production/enquiry", label: "Enquiry", icon: Icons.Enquiry },
  { path: "/production/quotation", label: "Quotation", icon: Icons.Quotation },
  { path: "/production/sales-order", label: "Sales Order", icon: Icons.SalesOrder },
  { path: "/production/yarn-inward", label: "Yarn Inward", icon: Icons.YarnInward },
];

function NavGroup({ label, items, navigate, pathname, onHover, onLeave, isOpen, onToggle }) {
  return (
    <div className="inv-nav-section" style={{ marginBottom: '16px' }}>
      <div 
        className="inv-section-label" 
        onClick={onToggle}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          userSelect: 'none'
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span>{label}</span>
        <Icons.Chevron open={isOpen} />
      </div>
      {isOpen && (
        <div className="inv-nav-grid" style={{ marginTop: '12px' }}>
          {items.map((item) => (
            <button
              key={item.path}
              data-path={item.path}
              className={`inv-nav-item ${pathname === item.path ? "active" : ""}`}
              onClick={() => {
                navigate(item.path);
                setTimeout(() => {
                  const firstField = document.querySelector('[tabIndex="1"]');
                  if (firstField) firstField.focus();
                }, 150);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  navigate(item.path);
                  setTimeout(() => {
                    const firstField = document.querySelector('[tabIndex="1"]');
                    if (firstField) firstField.focus();
                  }, 150);
                }
              }}
              onMouseEnter={(e) => onHover(e, item.label)}
              onMouseLeave={onLeave}
            >
              <item.icon />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  
  const [openSection, setOpenSection] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const toggleSidebar = () => setIsVisible(!isVisible);

  const handleMouseEnter = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    setHoveredLabel(label);
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };
  

  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL || "/api";
        const res = await fetch(`${BASE_URL}/permissions`);
        const data = await res.json();
        setPermissions(data);
      } catch (err) {

      }
    };
    fetchPerms();
  }, []);

  // On page load or refresh, focus the sidebar
  useEffect(() => {
    const attemptFocus = (attempt = 0) => {
      const firstNavItem = document.querySelector('.inv-nav-item');
      if (firstNavItem) {
        firstNavItem.focus();
      } else if (attempt < 10) {
        setTimeout(() => attemptFocus(attempt + 1), 100);
      }
    };
    const timer = setTimeout(() => attemptFocus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // When pathname changes, also focus sidebar (except form pages)
  useEffect(() => {
    const isFormPage = pathname === "/purchase-indent" || 
                       pathname === "/purchase-order" || 
                       pathname === "/item" ||
                       pathname === "/supplier" ||
                       pathname === "/purchase-grn" ||
                       pathname === "/consumption-issue";
    
    if (!isFormPage) {
      setTimeout(() => {
        const firstNavItem = document.querySelector('.inv-nav-item');
        if (firstNavItem) {
          firstNavItem.focus();
        }
      }, 100);
    }
  }, [pathname]);

  // GLOBAL KEYBOARD HANDLER - ESC returns focus to sidebar
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('.inv-sidebar');
        const firstNavItem = document.querySelector('.inv-nav-item');
        
        if (firstNavItem) {
          firstNavItem.focus();
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  // GLOBAL ARROW KEY HANDLER - Works based on current focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      const sidebar = document.querySelector('.inv-sidebar');
      const isSidebarFocused = sidebar && sidebar.contains(document.activeElement);
      
      // Arrow keys for sidebar navigation (Up, Down, Left, Right) - ONLY when sidebar has focus
      if (isSidebarFocused && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        
        const allFocusable = Array.from(sidebar.querySelectorAll('.inv-nav-item, .inv-section-label, button, [tabindex="0"]'));
        const currentFocused = document.activeElement;
        const currentIndex = allFocusable.indexOf(currentFocused);
        
        if (currentIndex === -1) return;
        
        let nextIndex;
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          nextIndex = currentIndex === allFocusable.length - 1 ? 0 : currentIndex + 1;
        } else {
          nextIndex = currentIndex === 0 ? allFocusable.length - 1 : currentIndex - 1;
        }
        
        const nextElement = allFocusable[nextIndex];
        if (nextElement) {
          nextElement.focus();
        }
      }
      // If sidebar does NOT have focus, arrow keys will be handled by the page (tables, etc.)
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasAccess = (path) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perm = permissions.find(p => p.roleName === user.role && p.resourcePath === path);
    return perm ? perm.canAccess : false;
  };

  const filteredMasters = MASTERS.filter(m => hasAccess(m.path));
  const filteredTransactions = TRANSACTIONS.filter(t => hasAccess(t.path));
  const filteredAdmin = ADMIN.filter(a => hasAccess(a.path));
  const filteredReports = REPORTS.filter(r => hasAccess(r.path));
  const filteredHRMS = HRMS.filter(h => hasAccess(h.path));
  const filteredProductionMasters = ProductionMasters.filter(p => hasAccess(p.path));
  const filteredProductionTransactions = ProductionTransactions.filter(p => hasAccess(p.path));

  if (!isVisible) {
    return (
      <div style={{ position: 'fixed', left: '0px', top: '0px', zIndex: 1000, cursor: 'pointer' }} onClick={toggleSidebar}>
        <Icons.SlideRight />
      </div>
    );
  }

  return (
    <aside className="inv-sidebar no-scrollbar">
      <div style={{ color: 'white', display: 'flex', justifyContent: 'flex-end', padding: '0px 0px 10px 10px', cursor: 'pointer' }} onClick={toggleSidebar}>
        <Icons.SlideLeft />
      </div>

      <div 
        className="inv-logo" 
        style={{ 
          cursor: 'pointer', 
          padding: '16px 0', 
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} 
        onClick={() => navigate('/')}
        tabIndex={-1}
        onKeyDown={(e) => { 
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/');
            setTimeout(() => {
              const firstField = document.querySelector('[tabIndex="1"]');
              if (firstField) firstField.focus();
            }, 150);
          }
        }}
      >
        <img 
          src="/Fiosun-logo.png" 
          alt="FIOSUN" 
          style={{ 
            width: '50px', 
            height: '36px', 
            borderRadius: '0',
            objectFit: 'contain'
          }} 
        />
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {filteredAdmin.length > 0 && (
          <NavGroup 
            label="Admin" 
            items={filteredAdmin} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'admin'}
            onToggle={() => toggleSection('admin')}
          />
        )}
        {filteredTransactions.length > 0 && (
          <NavGroup 
            label="Transactions" 
            items={filteredTransactions} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'transactions'}
            onToggle={() => toggleSection('transactions')}
          />
        )}
        {filteredReports.length > 0 && (
          <NavGroup 
            label="Reports" 
            items={filteredReports} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'reports'}
            onToggle={() => toggleSection('reports')}
          />
        )}
        {filteredMasters.length > 0 && (
          <NavGroup 
            label="Masters" 
            items={filteredMasters} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'masters'}
            onToggle={() => toggleSection('masters')}
          />
        )}
        {filteredHRMS.length > 0 && (
          <NavGroup 
            label="HRMS" 
            items={filteredHRMS} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'hrms'}
            onToggle={() => toggleSection('hrms')}
          />
        )}
        {filteredProductionMasters.length > 0 && (
          <NavGroup 
            label="Production Masters" 
            items={filteredProductionMasters} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'production'}
            onToggle={() => toggleSection('production')}
          />
        )}
          {filteredProductionTransactions.length > 0 && (
          <NavGroup 
            label="Production Transactions" 
            items={filteredProductionTransactions} 
            navigate={navigate} 
            pathname={pathname} 
            onHover={handleMouseEnter} 
            onLeave={() => setHoveredLabel(null)}
            isOpen={openSection === 'production-transactions'}
            onToggle={() => toggleSection('production-transactions')}
          />
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div 
          className="inv-nav-item" 
          data-tooltip={`${user?.username} (${user?.role})`}
          tabIndex={0}
        >
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b6ef8, #10b981)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 4px 12px rgba(59, 110, 248, 0.3)' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="inv-nav-item"
          onMouseEnter={(e) => handleMouseEnter(e, "Logout")}
          onMouseLeave={() => setHoveredLabel(null)}
          style={{ color: '#ef4444' }}
        >
          <Icons.Logout />
        </button>
      </div>

      {hoveredLabel && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: 'translateY(-50%)',
          background: '#3b6ef8',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 10px 15px -3px rgba(59, 110, 248, 0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: '6px solid transparent',
            borderRightColor: '#3b6ef8',
          }} />
          {hoveredLabel}
        </div>
      )}
    </aside>
  );
}