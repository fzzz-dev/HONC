// ── helpers ───────────────────────────────────────────────────────────────────
export const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFY = () => {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m < 4 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
};

export const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};

export const toTitleCase = (str) => {
  if (!str) return "";
  return str;
};

export const numberToWords = (num) => {
  if (num === 0 || num === null || num === undefined) return "Zero Only";
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return tens[ten] + (one ? ' ' + ones[one] : '');
  };
  
  const convertThousands = (n) => {
    if (n === 0) return '';
    if (n < 100) return convertHundreds(n);
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder ? ' ' + convertHundreds(remainder) : '');
  };
  
  let result = [];
  let remaining = num;
  
  // Crores (10000000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    result.push(convertHundreds(crores) + ' Crore');
    remaining %= 10000000;
  }
  
  // Lakhs (100000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    result.push(convertHundreds(lakhs) + ' Lakh');
    remaining %= 100000;
  }
  
  // Thousands (1000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    result.push(convertThousands(thousands) + ' Thousand');
    remaining %= 1000;
  }
  
  // Remaining hundreds and below
  if (remaining > 0) {
    if (remaining < 100) {
      result.push(convertHundreds(remaining));
    } else {
      result.push(convertThousands(remaining));
    }
  }
  
  // Add "Rupees" and "Only" to the result
  const words = result.join(' ').trim();
  return words ? ` ${words}` : 'Zero Only';
};

// Icons
export const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);