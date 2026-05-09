const http = require('http');

const data = JSON.stringify({
  grnNo: "GRN-TEST-002",
  date: "2026-05-09",
  supplierId: 1,
  details: [{
    poId: 1,
    poNo: "PO-TEST",
    itemId: 1,
    itemName: "Test Item",
    uom: "NOS",
    grnQty: 10,
    grnRate: 100,
    discPct: 0,
    gstPct: 18
  }]
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/grns',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      console.log('Response:', JSON.parse(body));
    } catch(e) {
      console.log('Raw Response:', body);
    }
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
