// downloadAsPDF function
export const downloadAsPDF = async ({ header, details: detailRows, totals, gstEnabled, gstType, company, supplier }) => {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  const ROWS_PER_PAGE = 15;
  
  // Function to pad rows to always have exactly ROWS_PER_PAGE rows per page
  const getPaddedRowsForPage = (rows, startIndex) => {
    const pageRows = rows.slice(startIndex, startIndex + ROWS_PER_PAGE);
    const paddedRows = [...pageRows];
    const emptyRowsNeeded = ROWS_PER_PAGE - pageRows.length;
    
    for (let i = 0; i < emptyRowsNeeded; i++) {
      paddedRows.push({
        isEmpty: true,
        indentNo: "",
        itemName: "",
        discPct: "",
        gstPct: "",
        uom: "",
        poQty: "",
        poRate: "",
        lineTotal: ""
      });
    }
    return paddedRows;
  };
  
  const numberToWords = (num) => {
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
    
    if (remaining >= 10000000) {
      const crores = Math.floor(remaining / 10000000);
      result.push(convertHundreds(crores) + ' Crore');
      remaining %= 10000000;
    }
    
    if (remaining >= 100000) {
      const lakhs = Math.floor(remaining / 100000);
      result.push(convertHundreds(lakhs) + ' Lakh');
      remaining %= 100000;
    }
    
    if (remaining >= 1000) {
      const thousands = Math.floor(remaining / 1000);
      result.push(convertThousands(thousands) + ' Thousand');
      remaining %= 1000;
    }
    
    if (remaining > 0) {
      if (remaining < 100) {
        result.push(convertHundreds(remaining));
      } else {
        result.push(convertThousands(remaining));
      }
    }
    
    const words = result.join(' ').trim();
    return words ? `${words} only` : 'Zero Only';
  };

  // Safe number formatter
  const fmt = (num) => {
    const safeNum = Number(num);
    return isNaN(safeNum) ? "0.00" : safeNum.toFixed(2);
  };

  const grossValue = detailRows.reduce((s, d) => s + (Number(d.poQty || 0) * Number(d.poRate || 0)), 0);
  const discountAmount = grossValue - (Number(totals.poAmount) || 0);
  const itemsTotal = Number(totals.poAmount) || 0;
  
  // Get transport charges from header
  const transportAmount = Number(header.transportCharges) || 0;
  
  // Subtotal before GST = Items Total + Transport
  const subtotalBeforeGst = itemsTotal + transportAmount;
  
  // Calculate GST on the Subtotal (items + transport)
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, totalGst = 0;
  
  if (gstEnabled) {
    if (gstType === 'local') {
      // CGST and SGST each at 9% (total 18%)
      cgstAmount = subtotalBeforeGst * 0.09;
      sgstAmount = subtotalBeforeGst * 0.09;
      totalGst = cgstAmount + sgstAmount;
    } else {
      // IGST at 18%
      igstAmount = subtotalBeforeGst * 0.18;
      totalGst = igstAmount;
    }
  }
  
  // Grand Total = Subtotal before GST + Total GST
  const finalTotal = subtotalBeforeGst + totalGst;
  const netValueRounded = Math.round(finalTotal);
  const roundOffAmount = netValueRounded - finalTotal;

  const totalPages = Math.ceil(detailRows.length / ROWS_PER_PAGE);
  
  let allPagesHtml = '';
  
  for (let page = 1; page <= totalPages; page++) {
    const startIndex = (page - 1) * ROWS_PER_PAGE;
    const pageItems = getPaddedRowsForPage(detailRows, startIndex);
    const isLastPage = page === totalPages;
    const startSerial = (page - 1) * ROWS_PER_PAGE;
    
    allPagesHtml += `
      <div ${page < totalPages ? 'style="page-break-after: always;"' : ''}>
        <div class="page-content">
          <table style="border: none; margin-bottom: 2px; width: 100%;">
            <tr>
              <td class="no-border text-center bold" style="font-size: 15px; width: 100%;">Purchase Order</td>
            </tr>
          </table>
          
          <div class="container">
            <table class="grid-table" style="width: 100%;">
              <tr>
                <td colspan="2" style="width: 66.66%; border-bottom: 1px solid #000; padding: 0;">
                  <table style="width: 100%; height: 100%; border: none;">
                    <tr>
                      <td style="width: 30%; border: none; text-align: center; vertical-align: middle; padding: 10px;">
                        ${company?.logo ? `<img src="${company.logo}" style="height: 55px; max-width: 100%; object-fit: contain;" />` : ''}
                       </td>
                      <td class="text-center" style="width: 70%; border: none; vertical-align: middle; padding: 10px 10px 10px 0;">
                        <div class="bold" style="font-size: 14px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                        <div style="font-size: 9.5px; margin-top: 4px;">${esc(company?.address || "Company Address")}</div>
                        <div style="font-size: 9.5px;">Tel: ${esc(company?.phone || "")}, E-Mail: ${esc(company?.email || "")}</div>
                        <div style="font-size: 9.5px;">GSTIN: ${esc(company?.gstin || "")}</div>
                       </td>
                    </tr>
                  </table>
                 </td>
                <td style="width: 33.33%; padding: 0; border-bottom: 1px solid #000; border-left: 1px solid #000;">
                  <table style="height: 100%; border: none; width: 100%;">
                    <tr>
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-left: none; border-right: 1px solid #000; width: 50%; font-size: 9px;">PO Number</td>
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-right: none; width: 50%; font-size: 9px;">PO Date</td>
                    </tr>
                    <tr>
                      <td class="text-center bold" style="border-left: none; border-bottom: none; font-size: 11px; vertical-align: middle; height: 35px;">${esc(header.poNo)}</td>
                      <td class="text-center bold" style="border-right: none; border-bottom: none; font-size: 11px; vertical-align: middle; height: 35px;">${esc(new Date(header.date).toLocaleDateString("en-GB"))}</td>
                    </tr>
                  </table>
                 </td>
              </tr>
              <tr>
                <td colspan="2" style="border-bottom: 1px solid #000; padding: 5px;">
                  <div><span class="bold">Party:</span> <span class="bold" style="margin-left: 10px; font-size: 11px;">${esc(header.supplierName)}</span></div>
                  <div style="margin-top: 4px;">${esc(header.supplierAddress)}</div>
                  <div style="margin-top: 4px;">GST: ${esc(header.supplierGst)}</div>
                 </td>
                <td style="padding: 0; border-bottom: 1px solid #000; border-left: 1px solid #000;">
                  <table style="height: 100%; border: none; width: 100%;">
                    <tr><td style="border-bottom: 1px solid #000; padding: 5px;"><span class="bold">Reference:</span> ${esc(header.refNo || "")}</td>
                    <tr><td style="border-bottom: none; border-left: none; border-right: none; padding: 5px;"><span class="bold">Delivery Date:</span> <span style="margin-left: 10px;" class="bold">${esc(header.deliveryDate ? new Date(header.deliveryDate).toLocaleDateString("en-GB") : "")}</span></td></tr>
                  </table>
                 </td>
              </tr>
              <tr>
                <td style="width: 33.33%; border-bottom: none;">
                  <div class="bold">Place of Delivery</div>
                  <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                  <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                  <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
                 </td>
                <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                  <div class="bold">Transported</div>
                  <div style="margin-top: 4px;"></div>
                 </td>
                <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                  <div class="bold">Invoice to be Sent to</div>
                  <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                  <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                  <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
                 </td>
              </tr>
            </table>

            <table class="items-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 4%; border-left: none;">S.No</th>
                  <th style="width: 12%;">Indent No</th>
                  <th style="width: 46%; font-weight: bold;">Item Description</th>
                  <th style="width: 5%;">Disc%</th>
                  <th style="width: 5%;">Tax%</th>
                  <th style="width: 5%;">Uom</th>
                  <th style="width: 5%;">Qty</th>
                  <th style="width: 5%;">Unit Price</th>
                  <th style="width: 10%; border-right: none;">Value</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map((d, i) => {
                  if (d.isEmpty) {
                    return `
                      <tr>
                        <td class="text-left" style="border-left: none;">&nbsp;</td>
                        <td class="text-left" style="font-size: 8.5px;">&nbsp;</td>
                        <td class="text-left" style="font-size: 8.5px;">&nbsp;</td>
                        <td class="text-right">&nbsp;</td>
                        <td class="text-right">&nbsp;</td>
                        <td class="text-center">&nbsp;</td>
                        <td class="text-right">&nbsp;</td>
                        <td class="text-right">&nbsp;</td>
                        <td class="text-right" style="border-right: none;">&nbsp;</td>
                      </td>
                    `;
                  }
                  const discValue = d.discMode === 'pct' ? (Number(d.discPct) || 0).toFixed(2) : '';
                  const gstValue = (Number(d.gstPct) || 0).toFixed(2);
                  const qtyValue = (Number(d.poQty) || 0).toFixed(3);
                  const rateValue = (Number(d.poRate) || 0).toFixed(2);
                  const lineValue = ((Number(d.poQty) || 0) * (Number(d.poRate) || 0)).toFixed(2);
                  
                  return `
                    <tr>
                      <td class="text-left" style="border-left: none;">${startSerial + i + 1}</td>
                      <td class="text-center" style="font-size: 8.5px;">${esc(d.indentNo || "Direct")}</td>
                      <td class="text-left" style="font-size: 10.5px;">${esc(d.itemName)}</td>
                      <td class="text-center">${discValue}</td>
                      <td class="text-center">${gstValue}</td>
                      <td class="text-center">${esc(d.uom)}</td>
                      <td class="text-right">${qtyValue}</td>
                      <td class="text-right">${rateValue}</td>
                      <td class="text-right" style="border-right: none;">${lineValue}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>

            ${isLastPage ? `
            <table style="border: none; width: 100%;">
              <tr>
                <td style="width: 70%; padding: 0; border: none; border-right: 1px solid #000; vertical-align: top;">
                  <table style="border: none; width: 100%; height: 100%;">
                    <tr>
                      <td style="border: none; border-bottom: 1px solid #000; height: 100px; vertical-align: top; padding: 5px;">
                        <div class="bold" style="font-size: 8.5px; margin-bottom: 4px;">Remarks</div>
                        <div style="font-size: 9px;">${esc(header.remarks || "")}</div>
                       </td>
                    </tr>
                    <tr>
                      <td style="border: none; height: 40px; vertical-align: middle; padding: 5px;">
                        <span class="bold" style="font-size: 10px;">Value in Words:</span> 
                        <span style="font-size: 12px; margin-left: 4px;"> Rupees ${numberToWords(netValueRounded)}</span>
                       </td>
                    </tr>
                   </table>
                 </td>
                <td style="width: 30%; padding: 0; border: none; vertical-align: top;">
                  <table class="summary-table" style="width: 100%;">
                    <tr>
                      <td class="bold text-left">Gross Value</td>
                      <td class="text-right">${fmt(grossValue)}</td>
                    </tr>
                    <tr>
                      <td class="bold text-left">Discount</td>
                      <td class="text-right">${fmt(discountAmount)}</td>
                    </tr>
                    <tr>
                      <td class="text-left">Transport & Other Charges</td>
                      <td class="text-right">${fmt(transportAmount)}</td>
                    </tr>
                    <tr>
                      <td class="bold text-left">Basic Value</td>
                      <td class="text-right">${fmt(subtotalBeforeGst)}</td>
                    </tr>
                    ${gstType === 'local' ? `
                    <tr>
                      <td class="text-left">CGST @ 9%</td>
                      <td class="text-right">${fmt(cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td class="text-left">SGST @ 9%</td>
                      <td class="text-right">${fmt(sgstAmount)}</td>
                    </tr>
                    ` : `
                    <tr>
                      <td class="text-left">IGST @ 18%</td>
                      <td class="text-right">${fmt(igstAmount)}</td>
                    </tr>
                    `}
                    <tr>
                      <td class="bold text-left">Total Tax</td>
                      <td class="text-right">${fmt(totalGst)}</td>
                    </tr>
                    <tr>
                      <td class="text-left" style="border-bottom: 1px solid #000; padding-bottom: 6px;">Round off</td>
                      <td class="text-right" style="border-bottom: 1px solid #000; padding-bottom: 6px;">${fmt(roundOffAmount)}</td>
                    </tr>
                    <tr>
                      <td class="bold text-left" style="font-size: 11px; padding-top: 11px;">Net Value</td>
                      <td class="bold text-right" style="font-size: 11px; padding-top: 6px;">${fmt(netValueRounded)}</td>
                    </tr>
                  </table>
                 </td>
              </tr>
            </table>

            <table style="border: none; width: 100%; margin-top: -1px;">
              <tr class="signature-row">
                <td style="width: 20%; border-left: none; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">
                  <div>Prepared By</div>
                  <div style="margin-top: 20px; font-weight: normal; font-size: 10px;">${esc(header.preparedBy || "")}</div>
                 </td>
                <td style="width: 20%; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">Verified By</td>
                <td style="width: 30%; padding: 5px 10px 10px 10px;">
                  <table style="border: none; width: 100%; margin-bottom: 8px;">
                    <tr>
                      <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 15%; font-size: 9px;">Name:</td>
                      <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 35%;"></td>
                      <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 20%; font-size: 9px;">Mobile:</td>
                      <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 30%;"></td>
                    </tr>
                    <tr>
                      <td style="border: none; padding: 2px; font-weight: bold; text-align: right; font-size: 9px;">Sign:</td>
                      <td colspan="3" style="border: none; padding: 2px; border-bottom: 1px dotted #000;"></td>
                    </tr>
                  </table>
                  <div style="text-align: right; font-weight: bold; font-size: 9px; padding-right: 5px;">Received By</div>
                 </td>
                <td style="width: 30%; border-right: none; text-align: center; position: relative; padding-bottom: 10px;">
                  <div class="bold" style="font-size: 9px; position: absolute; top: 5px; left: 0; right: 0;">For ${esc(company?.companyName || "TEST COMPANY")}</div>
                  <div style="font-weight: bold; font-size: 9px; font-style: italic;">Authorised Signatory</div>
                 </td>
              </table>
            </table>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>PO ${esc(header.poNo)}</title>
  <style>
    @page { margin: 8mm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 9.5px; margin: 0; padding: 0; color: #000; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
    .no-border { border: none !important; }
    
    .container { border: 1px solid #000; margin-top: 2px; }
    .header-info td { border-bottom: none; border-top: none; }
    
    .grid-table { border: none; }
    .grid-table td { border-top: none; border-left: none; }
    .grid-table td:last-child { border-right: none; }
    
    .items-table { border-left: none; border-right: none; border-bottom: none; }
    .items-table th { background: #f0f0f0; border-top: 1px solid #000; }
    .items-table td { border-top: none; border-bottom: none; height: 25px; }
    .items-table tr:last-child td { border-bottom: 1px solid #000; }
    
    .footer-table { border: none; }
    .footer-table td { border: none; }
    
    .summary-table td { padding: 3px 5px; border: none; }
    
    .signature-row td { height: 60px; vertical-align: bottom; border-top: 1px solid #000; border-bottom: none; }

    .container { 
      border: 1px solid #000; 
      margin-top: 2px;
      width: 98%;
      margin-left: 1%;
    }
  </style>
</head>
<body>
  ${allPagesHtml}
</body>
</html>`;

  const element = document.createElement('div');
  element.innerHTML = html;
  document.body.appendChild(element);

  const opt = {
    margin: [0.3, 0.1, 0.3, 0.25],
    filename: `PO_${header.poNo || 'document'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().set(opt).from(element).save();
  document.body.removeChild(element);
};