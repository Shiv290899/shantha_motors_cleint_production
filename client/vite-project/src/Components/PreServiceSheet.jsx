import React from "react";
import { inr, fmtDate, tick } from "../utils/printUtils";

export default function PreServiceSheet({
  active,           // boolean -> printMode === 'pre'
  vals,             // form values (JobCard.jsx already has this) 
  labourRows,       // array of {desc, qty, rate}
  totals,           // { labourSub, labourGST, labourDisc, grand }
  observationLines, // built in JobCard.jsx
}) {
  return (
    <div className={`print-sheet ${active ? "active" : ""}`}>
      <div className="pre-a4">
        {/* MAIN CONTENT */}
        <div className="pre-wrap">
          {/* Header */}
          
        <div className="title-wrap">
  <div className="title-en">SHANTHA MOTORS JOB CARD</div>
  <div className="title-kn">ಶಾಂತ ಮೋಟರ್ಸ್</div>
</div>



            
          

  {/* JC / Exec / Date / Mechanic + Location QR side by side */}
<div className="box row-2" style={{ marginTop: 3 }}>
  {/* LEFT SIDE */}
  <div style={{ fontSize: "22px", lineHeight: "1.4" }}>
    <div><span className="label">Job Card No:</span> {vals.jcNo || "-"}</div>
    <div><span className="label">Executive:</span> {vals.executive || "-"}</div>
    <div><span className="label">Date:</span> {fmtDate(vals.createdAt)}</div>
    <div><span className="label">Mechanic:</span> {vals.mechanic || "-"}</div>
  </div>

  {/* RIGHT SIDE (Location) */}
  <div className="center">
    <div style={{ fontWeight: 700, marginBottom: 2 }}>Location</div>
    <img src="/location-qr.png" alt="location qr" style={{ height: 60 }} />
    <div className="tiny" style={{ marginTop: 3 }}>
      Mob: 9731366921<br /> 8073283502
    </div>
  </div>
</div>




          {/* Vehicle / KM */}
          <div className="row-2" style={{ marginTop: 3 }}>
            <div className="box"><span className="label">Vehicle No:</span> {vals.regNo || "-"}</div>
            <div className="box"><span className="label">KM / Odo:</span> {vals.km ?? "-"}</div>
          </div>

          {/* Model/Color + Expected Delivery */}
          <div className="row-2" style={{ marginTop: 3 }}>
            <div className="box">
              <div className="row-2">
                <div><span className="label">Model:</span> {vals.model || "-"}</div>
                <div><span className="label">Color:</span> {vals.colour || "-"}</div>
              </div>
            </div>
            <div className="box"><span className="label">Expected Delivery Date:</span> {fmtDate(vals.expectedDelivery)}</div>
          </div>

          {/* Free / Paid / Minor ticks */}
          <div className="box" style={{ marginTop: 3 }}>
            <div style={{ display: "flex", gap: "6mm" }}>
              <div>{tick(vals.serviceType === "Free")} Free</div>
              <div>{tick(vals.serviceType === "Paid")} Paid</div>
            </div>
          </div>

          {/* Observation + Estimated Cost + Damage */}
          <div className="box" style={{ marginTop: 3 }}>
            <div style={{ display: "grid", gridTemplateColumns: "4fr 3fr", gap: "3mm" }}>
              {/* Left: observation + cost */}
              <div className="obs-cost">
                <div>
                  <div className="label">Customer Observation</div>
                  <ul className="list">
                    {observationLines.length === 0 ? (
                      <li>—</li>
                    ) : (
                      observationLines.map((t, i) => <li key={i}>{t}</li>)
                    )}
                  </ul>
                </div>

                <div>
  <div className="label right">Estimated Cost</div>
  <div className="right">
    {labourRows.length === 0 ? "—" : inr(
      labourRows.reduce(
        (sum, r) => sum + Number(r.qty || 0) * Number(r.rate || 0),
        0
      )
    )}
  </div>
</div>

              </div>

              {/* Right: damage checklist */}
              <div className="v-top">
                <div className="damage-box">
                  <div className="title">CHECK BODY PART FOR ANY DAMAGE</div>
                  <div className="damage-item">{tick(false)} Dent</div>
                  <div className="damage-item">{tick(false)} Scratch</div>
                  <div className="damage-item">{tick(false)} Broken</div>
                  <div className="damage-item">{tick(false)} Floor Mat</div>
                  <div className="center" style={{ marginTop: 3 }}>
                    <div>NOTE:</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Estimated cost */}
          <div className="box" style={{ marginTop: 3 }}>
            <div className="sum-row" style={{ fontWeight: 700 }}>
              <div>Total Estimated Cost</div>
              <div className="right">{inr(totals.grand)}</div>
            </div>
          </div>

          {/* Customer name / mobile / call status */}
          <div className="row-3" style={{ marginTop: 3 }}>
            <div className="box"><span className="label">Customer Name:</span> {vals.custName || "-"}</div>
            <div className="box"><span className="label">Mobile No:</span> {vals.custMobile || "-"}</div>
            <div className="box"><span className="label">Call Status:</span> {vals.callStatus || "-"}</div>
          </div>
        </div>

        {/* VOUCHER STRIP */}
       <div className="pre-wrap voucher">
  <div className="box" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3mm", textAlign: "center" }}>
    
    {/* LEFT: Shantha Motors */}
   <div >ಶಾಂತ ಮೋಟರ್ಸ್</div>

    {/* MIDDLE: Job card details */}
    <div style={{ textAlign: "left" }}>
      <div><span className="label">Job Card No:</span> {vals.jcNo || "-"}</div>
      <div><span className="label">Reg. No:</span> {vals.regNo || "-"}</div>
      <div><span className="label">Expected Delivery:</span> {fmtDate(vals.expectedDelivery)}</div>
    </div>

    {/* RIGHT: Executive details */}
    <div style={{ textAlign: "left" }}>
      <div><span className="label">Date:</span> {fmtDate(vals.createdAt)}</div>
      <div><span className="label">Executive No:</span> {vals.executive || "-"}</div>
      <div><span className="label">Approx. Service Amount:</span> {inr(totals.grand)}</div>
    </div>

     <div>
      <div style={{ fontWeight: 500 }}>Shantha Motors</div>
      <img src="/location-qr.png" alt="location code" style={{ height: 60, marginTop: 2 }} />
      <div className="tiny" style={{ marginTop: 2 }}>9731366921 • 8073283502</div>
    </div>
    
  </div>
</div>

      </div>
    </div>
  );
}
