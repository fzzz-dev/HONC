import React, { useEffect,  useMemo, useState }  from "react";
import { purchaseIndentApi } from "../../services/inventoryApi";


const PurchaseIndentRegister = () => {

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().split("T")[0];

    const [filters, setFilters] = useState({
      fromDate: today,
      toDate: today,
      department: "",
    });


    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const res = await purchaseIndentApi.getAll();

            setRows(Array.isArray(res) ? res : []);
        } catch (err) {

        } finally {
            setLoading(false);
        }
    }

    const filteredRows = useMemo(() => {
      return rows.filter((row) => {
        const rowDate = row.date;

        const matchFrom =
          !filters.fromDate || rowDate >= filters.fromDate;

        const matchTo =
          !filters.toDate || rowDate <= filters.toDate;

        const matchDepartment =
          !filters.department ||
          row.departmentName
            .toLowerCase()
            .includes(filters.department.toLowerCase());

        return matchFrom && matchTo && matchDepartment;
      });
    }, [rows, filters]);


  return (
    <div className="inv-page">
    <div className="page-container inv-page-header">
      <div className="page-header ">
        <h2 className="inv-page-title">Purchase Indent Register</h2>
      </div>
    </div>

      <div className="inv-card"
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <div style={{display: "flex", justifyContent: "space-around"}}>
          <label style={{width: "150px", marginTop: "8px"}}>From Date</label>
          <input
            type="date"
            className="inv-input"
            style={{padding: "5px 10px"}}
            value={filters.fromDate}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                fromDate: e.target.value,
              }))
            }
          />
        </div>

        <div style={{display: "flex", justifyContent: "space-around"}}>
          <label style={{width: "150px", marginTop: "8px"}}>To Date</label>
          <input
            type="date"
            className="inv-input"
            value={filters.toDate}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                toDate: e.target.value,
              }))
            }
          />
        </div>

        <div style={{display: "flex", justifyContent: "space-around"}}>
          <label style={{width: "150px", marginTop: "8px"}}>Department</label>
          <select
            className="inv-input"
            value={filters.department}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                department: e.target.value,
              }))
            }
          >
            <option value="">All Departments</option>

            {[...new Set(rows.map((x) => x.departmentName))].map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* <div style={{display: "flex", justifyContent: "space-around"}}>
          <label style={{width: "150px", marginTop: "8px"}}>Item Name</label>
          <select
            className="inv-input"
            value={filters.department}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                department: e.target.value,
              }))
            }
          >
            <option value="">All Departments</option>

            {[...new Set(rows.map((x) => x.departmentName))].map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div> */}


      </div>



      <div className="page-content inv-card">
        <table className="inv-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Indent No</th>
              <th>Date</th>
              <th>Department</th>
              <th>Status</th>
              <th>Total Items</th>
              <th>Total Qty</th>
              <th>Remarks</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No Records Found
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{index + 1}</td>
                  <td>{row.indentNo}</td>
                  <td>{row.date ? new Date(row.date).toLocaleDateString("en-GB") : ""}</td>
                  <td>{row.departmentName}</td>
                  <td>{row.status}</td>
                  <td style={{textAlign: "center"}}>{row.totalItems}</td>
                  <td style={{textAlign: "right"}}>{row.totalQty}</td>
                  <td>{row.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseIndentRegister;