import React from "react";
import { inr, fmtDate } from "../utils/printUtils";

export default function PostServiceSheet({
  active, // boolean -> printMode === 'post'
  vals,
  totals,
}) {
  return (
    <div className={`print-sheet ${active ? "active" : ""}`}>
      <div className="pre-a4">
        <div className="pre-wrap">
          <div className="box center" style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>SHANTHA MOTORS — POST-SERVICE BILL</div>
            <div className="tiny">Billing layout will be implemented next.</div>
          </div>
          <div className="box">
            <div className="row-2">
              <div><span className="label">Job Card No:</span> {vals.jcNo || "-"}</div>
              <div><span className="label">Date:</span> {fmtDate(vals.createdAt)}</div>
            </div>
            <div className="row-2" style={{ marginTop: 3 }}>
              <div><span className="label">Vehicle No:</span> {vals.regNo || "-"}</div>
              <div><span className="label">Customer:</span> {vals.custName || "-"}</div>
            </div>
          </div>
        </div>

        <div className="pre-wrap voucher">
          <div className="box center">
            <div style={{ fontWeight: 800 }}>Shantha Motors</div>
            <img src="/location-qr.png" alt="location code" style={{ height: 60 }} />
            <div className="tiny" style={{ marginTop: 2 }}>9731366921 • 8073283502</div>
          </div>
          <div className="box">
            <div><span className="label">Grand Total:</span> {inr(totals.grand)}</div>
            <div><span className="label">GST % (Labour):</span> {vals.gstLabour ?? 0}%</div>
          </div>
          <div className="box">
            <div><span className="label">Thank you!</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
