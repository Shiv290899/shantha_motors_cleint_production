// components/PostServiceSheet.jsx
import React, { useMemo } from "react";
import { inr, fmtDate, amountInWords } from "../utils/printUtils";

export default function PostServiceSheet({ active, vals }) {
  const rows = Array.isArray(vals?.labourRows) ? vals.labourRows : [];
  const items = rows.map((r, idx) => ({
    sn: idx + 1,
    particulars: r?.desc || "-",
    qty: Number(r?.qty || 0),
    rate: Number(r?.rate || 0),
    amount: Math.max(0, Number(r?.qty || 0) * Number(r?.rate || 0)),
  }));

  const subTotal = useMemo(() => items.reduce((s, x) => s + x.amount, 0), [items]);
  const gstPct = Number(vals?.gstLabour ?? 0);
  const gstAmt = Math.round(subTotal * (gstPct / 100));
  const grandTotal = Math.max(0, subTotal + gstAmt);
  const grandInWords = amountInWords(grandTotal);
  // put these just above the return() inside your component render
const parseKm = (v) => {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : null;
};
const kmVal = parseKm(vals?.km);
const nextServiceKm = kmVal != null ? kmVal + 2000 : null;


  return (
    <div className={`print-sheet ${active ? "active" : ""}`}>
      <style>{`
        .doc-title{
          display:block;
          width:max-content;
          margin:0 auto 0;
          text-align:center;
          font-size:20pt;
          font-weight:700;
          letter-spacing:0.8px;
        }

        .bill-wrap { padding:4mm; font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto; color:#000; }
        .bill-box { border:1px solid #000000ff; border-radius:1mm; padding:3mm; }
        .hdr-grid { display:grid; grid-template-columns:28mm 1fr 28mm; align-items:center; gap:3mm; }
        .shop-title { text-align:center; }
        .shop-title .en { font-size:18pt; font-weight:500; line-height:1.05; }
        .shop-sub { font-size:10pt; margin-top:1mm; }
        .id-grid { display:grid; grid-template-columns:1fr 1fr; gap:2mm; margin-top:3mm; }
        .label { font-weight:600; }
        .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:2mm; }
        .bill-to { margin-top:3mm; }
        .tbl { width:100%; border-collapse:collapse; margin-top:3mm; }
        .tbl th, .tbl td { border:1px solid #111; padding:1.8mm; font-size:11pt; }
        .tbl th { font-weight:700; text-align:center; }
        .right { text-align:right; }
        .center { text-align:center; }
        .tiny { font-size:10px; }

        .totals { display:grid; grid-template-columns:1fr 70mm; gap:3mm; margin-top:4mm; }

        .sum { display:grid; grid-auto-rows:minmax(14mm,auto); gap:3mm; }
        .sum-pair { display:grid; grid-template-columns:1fr 1fr; align-items:center; border:1px solid #111; border-radius:2mm; overflow:hidden; }
        .sum-pair .cell { padding:0.5mm 1mm; font-size:11pt; line-height:1.2; }
        .sum-pair .label { font-weight:600; border-right:1px solid #111; }
        .sum-pair .value { text-align:right; }
        .sum-pair.emph { border-width:1.5px; }
        .sum-pair.emph .label, .sum-pair.emph .value { font-weight:700; }

        .tandc { margin-top:4mm; }
        .tandc-title { font-weight:700; margin-bottom:2mm; }
        .tandc ol { margin:0; padding-left:4mm; }
        .sign-row { display:grid; grid-template-columns:1fr 40mm; margin-top:8mm; gap:3mm; align-items:end; }
        .sign-box { text-align:center; border-top:1px solid #111; padding-top:2mm; }

        @media screen {
          .post-a4 { display:grid; grid-template-rows:auto 1fr auto; min-height:calc(297mm - 16mm); }
        }

        /* PRINT SCOPE: print only this sheet; no extra blank pages */
        @media print {
          @page { size:A4; margin:10mm; }
          html, body { height:auto !important; overflow:visible !important; }
          body * { visibility:hidden; }
          .print-sheet, .print-sheet * { visibility:visible; }
          .print-sheet { position:absolute; left:0; top:0; right:0; }
          .post-a4 { display:block !important; min-height:auto !important; height:auto !important; }

          .bill-wrap, .bill-box, .hdr-grid, .id-grid, .totals, .tandc, .sign-row { break-inside:avoid; page-break-inside:avoid; }
          .tbl { page-break-inside:auto; }
          .tbl thead { display:table-header-group; }
          .tbl tr { page-break-inside:avoid; }
        }
      `}</style>

      <div className="post-a4">
        <div className="doc-title">SERVICE INVOICE</div>

        <div className="bill-wrap">
          <div className="bill-box">
            <div className="hdr-grid">
              <img src="/shantha-logoprint.png" alt="Shantha Motors" style={{ width:"100%", maxHeight:100 }} />
              <div className="shop-title">
                <div className="en">SHANTHA MOTORS | ಶಾಂತ ಮೋಟರ್ಸ್</div>
                <div className="shop-sub">Multi Brand Two Wheeler Sales &amp; Service</div>
                <div className="shop-sub">Mob No : 9731366921 / 8073283502 </div>
                <div className="tiny">Kadabagere • Muddinapalya • D-Group Layout • Andrahalli • Tavarekere • Hegganahalli • Channenahalli • Nelagadrahalli</div>

              </div>
              <div>
                <img src="/location-qr.png" alt="Location QR" style={{ width:"100%", maxHeight:100 }} />
                <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>Scan for Location</div>
              </div>
            </div>

            <div className="id-grid">
                <div><span className="label">Bill To (Customer):</span> {vals?.custName || "-"}</div>
                <div><span className="label">Invoice No:</span> {vals?.jcNo || "-"}</div>
                <div><span className="label">Vehicle No:</span> {vals?.regNo || "-"}</div>
                <div><span className="label">Date:</span> {fmtDate(vals?.createdAt)}</div>
                <div><span className="label">Odometer Reading:</span> {kmVal != null ? `${kmVal} KM` : "-"}</div>
                <div><span className="label">Next Service:</span> {nextServiceKm != null ? `${nextServiceKm} KM` : "-"}</div>
            </div>


            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width:"8mm" }}>S/N</th>
                  <th>Particulars</th>
                  <th style={{ width:"20mm" }}>Qty</th>
                  <th style={{ width:"28mm" }}>Price</th>
                  <th style={{ width:"30mm" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="center">No items</td></tr>
                ) : items.map((r) => (
                  <tr key={r.sn}>
                    <td className="center">{r.sn}</td>
                    <td>{r.particulars}</td>
                    <td className="center">{r.qty}</td>
                    <td className="right">{inr(r.rate)}</td>
                    <td className="right">{inr(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals">
              <div className="bill-to">
                <div><span className="label">Invoice Amount (in words):</span></div>
                <div style={{ border:"1px solid #111", borderRadius:"2mm", padding:"3mm", minHeight:18 }}>
                  {grandInWords}
                </div>
              </div>

              <div className="sum">
                <div className="sum-pair emph">
                  <div className="cell label">Grand Total</div>
                  <div className="cell value">{inr(grandTotal)}</div>
                </div>
                
              </div>
            </div>

            <div className="tandc">
              <div className="tandc-title">Terms &amp; Conditions</div>
              <ol>
                <li>All services/parts once billed are non-returnable.</li>
                <li>Vehicle will be delivered against full and final payment only.</li>
                <li>Company is not responsible for loss/damage to valuables left in vehicle.</li>
                <li>Kindly verify items and amounts before making payment.</li>
                <li>Vehicle left unclaimed beyond 7 days may attract parking charges.</li>
                <li>Any damages must be reported at the time of delivery.</li>
              </ol>
            </div>

            <div className="sign-row">
              <div />
              <div className="sign-box tiny">
                For Shantha Motors<br/>Authorised Signatory
              </div>
            </div>
           <div className=" center tiny">
            <div style={{ fontWeight:700, fontSize:16 }}>Thank you for your business — please visit again.</div>
            <div>Ride Smooth. Ride Safe.</div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
