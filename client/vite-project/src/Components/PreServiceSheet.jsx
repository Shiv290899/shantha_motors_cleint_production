import React from "react";
import { inr, fmtDate, tick } from "../utils/printUtils";

export default function PreServiceSheet({
  active,           // boolean -> printMode === 'pre'
  vals,             // form values (JobCard.jsx already has this) 
  labourRows,       // array of {desc, qty, rate}
   executives = [], 
  observationLines, // built in JobCard.jsx
}) {
  // --- Helpers to align observations with labour rows and compute amounts ---
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  // desc -> amount (qty * rate)
  const amountMap = new Map(
    (labourRows || []).map((r) => {
      const amt = Number(r?.qty || 0) * Number(r?.rate || 0);
      return [norm(r?.desc || r?.name), amt];
    })
  );

  // Build list of observations with their matched amount (or null if no match)
  const obsWithAmounts = (observationLines || []).map((t) => {
    const amt = amountMap.get(norm(t));
    return { text: t, amount: Number.isFinite(amt) ? amt : null };
  });

  // Sum of all matched amounts = Estimated Total
  const estimatedTotal = obsWithAmounts.reduce(
    (sum, x) => sum + (x.amount ?? 0),
    0
  );

  // Normalize KM so you never get "KM KM"
  const prettyKm = (v) => {
    const raw = String(v ?? "").toUpperCase().trim();
    const noKm = raw.replace(/\s*KM\s*$/i, "");
    const digits = noKm.replace(/\D/g, "");
    return digits ? `${digits} KM` : "-";
  };

  const HSpace = ({ w = "8mm" }) => (
  <span aria-hidden="true" style={{ display: "inline-block", width: w }} />
);

const execPhone = (() => {
  // line explains: normalize whatever is stored in vals.executive
  const raw = String(vals?.executive || "").trim();
  // line explains: if the value already looks like a 10-digit number, use it directly
  const asDigits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(asDigits)) return asDigits;
  // line explains: otherwise match the name against the EXECUTIVES array and return the phone
  const match = (executives || []).find((e) => e.name === raw);
  return match?.phone || null;   // line explains: null → will render "-" later
})();



  return (
    <div className={`print-sheet ${active ? "active" : ""}`}>
      <style>{`
/* antd Segmented blue */
.blue-segmented .ant-segmented-item-selected {
  background: #1677ff !important;
  color: #fff !important;
  border-color: #1677ff !important;
}
.blue-segmented .ant-segmented-thumb { background: #1677ff !important; }
.blue-segmented .ant-segmented-item:hover { color: #1677ff; }

/* PRINT LAYOUT */
@page { size: A4 portrait; margin: 0mm; }
@media screen { .print-sheet { display: none !important; } }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden !important; }                 /* hide all */
  .print-sheet { display: block !important; }
  .print-sheet.active,
  .print-sheet.active * { visibility: visible !important; } /* show only sheet */
  .print-sheet.active { position: absolute; inset: 0; width: 100%; } /* start at top-left */

  /* IMPORTANT: avoid blank extra pages by letting height auto */
  .pre-a4 {
    display: block !important;
    min-height: auto !important;
    height: auto !important;
  }

  /* keep voucher from splitting */
  .voucher { break-inside: avoid; page-break-inside: avoid; }
}

.print-sheet {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto;
  color: #000;
}

/* Page grid: header | main | voucher(≈1/8 A4) */
.pre-a4 {
      /* full A4 height minus margins (screen only; canceled on print) */
}

/* Content paddings */
.pre-wrap { padding: 4mm; }
.pre-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }

/* Generic boxes and text helpers */
.box { border: 1px solid #111; padding: 2.5mm; border-radius: 1mm; }
.tiny { font-size: 11px; }
.label { font-weight: 600; }

/* Titles (one line) */
.title-kn { font-size: 18pt; font-weight: 500; letter-spacing: 1px; }
.title-en { font-size: 25pt; font-weight: 700; margin-top: 2px; }
.title-wrap {
  display: flex;
  align-items: baseline;   /* keeps Kannada baseline aligned to English */
  gap: 8px;
  white-space: nowrap;     /* prevent line break */
}

/* Grids */
.row   { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
.row-3 { display: grid; grid-template-columns: 2fr 1fr;   gap: 2mm; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr;       gap: 2mm; }

.right { text-align: right; }
.center { text-align: center; }
.v-top { align-self: start; }

/* Observation + cost split column */
.obs-cost {
  display: grid;
  grid-template-columns: 1fr 40mm; /* observation | cost column */
  gap: 2mm;
}
.list { padding-left: 4mm; margin: 0; }
.list li { margin: 0.8mm 0; }
.sum-row { display: grid; grid-template-columns: 1fr 40mm; gap: 2mm; align-items: center; }
.divider { border-top: 1px solid #000; margin: 3mm 0; }

/* Voucher area (bottom strip) */
.voucher {
  border-top: 3px dashed #777;
  padding-top: 3mm;
  height: 60%;             /* fills the fixed 35mm row */
  align-items: stretch;
}

/* === Brand line (single continuous line in voucher) === */
.voucher .brand-line{
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;         /* keep Kannada + English on one line */
}
.voucher .brand-kn{ font-size:18pt; font-weight:500; line-height:1.05; }
.voucher .brand-en{ font-size:18pt; font-weight:500; line-height:1.05; }

/* Single outer box inside voucher with 3 columns: left | middle | right(=QR) */
.voucher .box {
  width: 98%;
   border: 1px solid #111;
  border-radius: 5mm;
  display: grid;
  grid-template-columns: 0.7fr 0.9fr 0.5fr;  /* fixed right column for QR */
  gap: 3mm;
  align-items: start;
  text-align: left;
}
.voucher .col { text-align: left; }
.voucher .col-right { text-align: center; }
.voucher .qr { height: 60px; width: 60px; object-fit: contain; }
.voucher .scan { font-size: 13px; font-weight: 600; margin-top: 4px; }
.voucher .phones { margin-top: 2px; }

/* Damage section (bullets + Yes/No checkboxes + NOTE box) */
.damage-box { border: 1px solid #111; padding: 2mm; min-width: 38mm; }
.damage-box .title { font-weight: 700; font-size: 12px; margin-bottom: 2mm; }

/* Bulleted list */
.damage-list { list-style: disc; padding-left: 5mm; margin: 0 0 3mm 0; }
.damage-list li { margin: 1mm 0; position: relative; }

/* Yes / No on the right of each line */
.yn {
  float: right;
  display: inline-flex;
  align-items: center;
  gap: 4mm;
}

/* Printable empty checkbox square */
.cb {
  display: inline-block;
  width: 4mm;
  height: 4mm;
  border: 1px solid #111;
  margin-left: 1.5mm;
  vertical-align: middle;
}

/* NOTE block below the list */
.note-box {
  border-top: 1px dashed #777;
  margin-top: 3mm;
  padding-top: 2mm;
}
.note-title { font-weight: 600; margin-bottom: 1.5mm; }
.note-area {
  border: 1px solid #111;
  height: 45mm;
  border-radius: 1mm;
}
`}</style>
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
            <div style={{ fontSize: "20px", lineHeight: "1.4" }}>
              <div><span className="label">Job Card No:</span> {vals.jcNo || "-"}</div>
              <div><span className="label">Executive:</span> {vals.executive || "-"}</div>
              <div><span className="label">Date:</span> {fmtDate(vals.createdAt)}</div>
              <div><span className="label">Mechanic:</span> {vals.mechanic || "-"}</div>
            </div>

            {/* RIGHT SIDE (Location) */}
            <div className="center">
             
              <img src="/location-qr.png" alt="location qr" style={{ height: 60 }} />
               <div className="scan">Scan for Location</div>
              <div className="tiny" style={{ marginTop: 3 }}>
                Mob: 9731366921<br /> 8073283502
              </div>
            </div>
          </div>

          {/* Vehicle / KM */}
          <div className="row-2" style={{ marginTop: 3 }}>
            <div className="box"><span className="label">Vehicle No:</span> {vals.regNo || "-"}</div>
            <div className="box">
              <span className="label">Odometer Reading:</span>{" "}
              {prettyKm(vals.km)}
            </div>
          </div>

          {/* Model/Color + Expected Delivery */}
          <div className="row-2" style={{ marginTop: 3 }}>
            <div className="box">
              <div className="row-2">
                <div><span className="label">Model:</span> {vals.model || "-"}</div>
               
              </div>
            </div>
            <div className="box"><span className="label">Expected Delivery Date:</span> {fmtDate(vals.expectedDelivery)}</div>
          </div>

          {/* Free / Paid ticks */}
          <div className="box" style={{ marginTop: 3 }}>
            <div style={{ display: "flex", gap: "6mm" }}>
              <div>{tick(vals.serviceType === "Free")} Free</div>
              <div>{tick(vals.serviceType === "Paid")} Paid</div>
              <HSpace w="50mm" />
             <div><span className="label">Color:</span> {vals.colour || "-"}</div>
            </div>
          </div>

          {/* Observation + Estimated Cost + Damage */}
          <div className="box" style={{ marginTop: 3 }}>
            <div style={{ display: "grid", gridTemplateColumns: "4fr 3fr", gap: "3mm" }}>
              {/* Left group: observation text + right group: matching amounts */}
              <div className="obs-cost">
                {/* Customer Observation list (left) */}
                <div>
                  <div className="label">Customer Observation</div>
                  <ul className="list">
                    {obsWithAmounts.length === 0 ? (
                      <li>—</li>
                    ) : (
                      obsWithAmounts.map(({ text }, i) => <li key={i}>{text}</li>)
                    )}
                  </ul>
                </div>

                {/* Estimated Cost (right): only amounts per observation line */}
                <div>
                  <div className="label right">Estimated Cost</div>
                  <ul className="list" style={{ listStyle: "none", paddingLeft: 0 }}>
                    {obsWithAmounts.length === 0 ? (
                      <li className="right">—</li>
                    ) : (
                      obsWithAmounts.map(({ amount }, i) => (
                        <li key={i} className="right">
                          {amount != null ? inr(amount) : "—"}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {/* Right: damage checklist */}
              <div className="v-top">
                <div className="damage-box">
                  <div className="title">CHECK BODY PART FOR ANY DAMAGE</div>

                  <ul className="damage-list">
                    <li>
                      Dent
                      <span className="yn">
                        Yes <span className="cb"></span>
                        No <span className="cb"></span>
                      </span>
                    </li>
                    <li>
                      Scratch
                      <span className="yn">
                        Yes <span className="cb"></span>
                        No <span className="cb"></span>
                      </span>
                    </li>
                    <li>
                      Broken
                      <span className="yn">
                        Yes <span className="cb"></span>
                        No <span className="cb"></span>
                      </span>
                    </li>
                    <li>
                      Floor Mat
                      <span className="yn">
                        Yes <span className="cb"></span>
                        No <span className="cb"></span>
                      </span>
                    </li>
                  </ul>

                  {/* NOTE box */}
                  <div className="note-box">
                    <div className="note-title">NOTE:</div>
                    <div className="note-area"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Estimated cost: sum of per-observation amounts */}
          <div className="box" style={{ marginTop: 3 }}>
            <div className="sum-row" style={{ fontWeight: 700 }}>
              <div>Total Estimated Cost</div>
              <div className="right">{inr(estimatedTotal)}</div>
            </div>
          </div>

          {/* Customer name / mobile / call status */}
          <div className="row-3 box" style={{ marginTop: 3 }}>
            <div ><span className="label">Customer Name:</span> {vals.custName || "-"}</div>
            <div ><span className="label">Mobile No:</span> {vals.custMobile || "-"}</div>
          </div>
        </div>

    {/* VOUCHER STRIP */}
<div className="pre-wrap voucher">
  {/* One continuous line: Kannada | English */}
  <div className="brand-line">
    <span className="brand-kn">ಶಾಂತ ಮೋಟರ್ಸ್</span>
    <span> || </span>
    <span className="brand-en">SHANTHA MOTORS</span>
  </div>

  {/* Three blocks directly below */}
  <div className="box" style={{ fontSize: "20px", lineHeight: "1.4", marginTop: "2mm" }}>
    {/* LEFT: Address */}
    <div className="col">
      <div><span className="label">Job Card No:</span> {vals?.jcNo || "-"}</div>
      <div><span className="label">Reg. No:</span> {vals?.regNo || "-"}</div>
      <div><span className="label">Expected Del. Date:</span> {fmtDate(vals?.expectedDelivery)}</div>
    </div>

    {/* MIDDLE: Date / Executive No / Approx amount */}
    <div className="col">
      <div><span className="label">Date:</span> {fmtDate(vals?.createdAt)}</div>
     <div><span className="label">Executive No:</span> {execPhone || "-"}</div>
      <div><span className="label">Apprx. Service Amount:</span> {inr(estimatedTotal)}</div>

    </div>

    {/* RIGHT: QR + caption (phones optional; remove if not needed) */}
    <div className="col col-right">
      <img src="/location-qr.png" alt="Location QR" className="qr" />
      <div className="scan">Scan for Location</div>
      <div className="tiny phones">9731366921 • 8073283502</div>
    </div>
  </div>
</div>

      </div>
    </div>
  );
}
