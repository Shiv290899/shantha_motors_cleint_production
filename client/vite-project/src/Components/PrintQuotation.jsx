// PrintQuotation.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";

/**
 * Props expected from the parent (e.g., Quotation.jsx):
 * - form: AntD form instance (to read live field values)
 * - brand, company, model, variant, onRoadPrice
 * - mode ("cash" | "loan"), downPayment, emiSet ("12" | "48")
 * - vehicleType ("scooter" | "motorcycle"), fittings[], docsReq[]
 * - executiveName (string)
 */
export default function PrintQuotation(props) {
  const {
    form,
    brand,
    company,
    model,
    variant,
    onRoadPrice = 0,
    mode = "cash",
    downPayment = 0,
    emiSet = "12",
    vehicleType = "scooter",
    fittings = [],
    docsReq = [],
    executiveName = "",
  } = props;

  const pageRef = useRef(null);

  const fittingsTitle = useMemo(
    () =>
      `Free Extra Fittings (${vehicleType === "motorcycle" ? "Motorcycle" : "Scooter"})`,
    [vehicleType]
  );

  // display helpers
  const inr0 = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(n || 0)));

  const PROCESSING_FEE = 8000;
  const RATE_LOW = 9;
  const RATE_HIGH = 11;

  const dpPct = onRoadPrice > 0 ? downPayment / onRoadPrice : 0;
  const rate = dpPct >= 0.3 ? RATE_LOW : RATE_HIGH;

  const tenures = useMemo(
    () => (emiSet === "12" ? [12, 18, 24, 30] : [24, 30, 36, 48]),
    [emiSet]
  );

  const monthlyFor = (months) => {
    const base = Math.max(Number(onRoadPrice || 0) - Number(downPayment || 0), 0);
    const principal = base + PROCESSING_FEE;
    const years = months / 12;
    const totalInterest = principal * (rate / 100) * years;
    const total = principal + totalInterest;
    return months > 0 ? total / months : 0;
  };

  const PrintList = ({ items }) =>
    !items?.length ? <span>-</span> : (
      <ul className="plist">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    );

  const printDate = useMemo(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  // CSS injected into the printable document (Blob page)
  const PRINT_STYLES = useMemo(
    () => `
      @page { size: A4 portrait; margin: 0; }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      * { box-sizing: border-box; }

      .print-wrap { margin: 0 auto; }
      .print-sheet { display: block; } /* visible in the print doc */

      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 12mm;
        background: #fff !important;
        box-sizing: border-box;
      }

      .sheet {
        width: 100%;
        font: 12pt/1.32 "Helvetica Neue", Arial, sans-serif;
        color: #111;
        overflow: visible !important;
        page-break-inside: avoid;
        background: #fff !important;
      }

      .row2 { display: grid; grid-template-columns: 0.8fr 1.4fr; gap: 8px 16px; }
      .row3 { display: grid; grid-template-columns: 0.5fr 0.8fr 1fr; gap: 10px 16px; }

      .box { border: 2px solid #000; border-radius: 6px; padding: 8px 10px; background: #fff; }
      .plist { margin: 0; padding-left: 18px; }
      .plist li { margin: 0 0 2px; }

      .title-knhonda { font-size: 30pt; font-weight: 900; letter-spacing: .2px; }
      .title-kn { font-size: 38pt; font-weight: 900; letter-spacing: .2px; }
      .title-en { font-size: 20pt; font-weight: 800; margin-top: 2px; }
      .big-price { font-size: 16pt; font-weight: 900; }
      .addr-line { font-size: 11pt; }
      .addr-linehonda { font-size: 12pt; }

      .hdr-line { display:flex; align-items:center; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; }
      .hdr-title { flex: 1; display: flex; justify-content: center; }
      .quo-box { font-size: 17pt; border: 2px solid #000; padding: 4px 10px; font-weight: 800; display: inline-block; }
      .hdr-right { text-align: right; font-weight: 600; }

      .emibox { border: 2px solid #000; border-radius: 8px; padding: 6px 10px; text-align: center; }
      .section-title { font-size: 14pt; font-weight: 900; margin-bottom: 4px; }

      img { max-width: 100%; height: auto; background: transparent; }
      .no-print { display: inline-block; }
      @media print { .no-print { display: none !important; } }
    `,
    []
  );

  // Blob-URL print flow (works reliably on Android Chrome)
  const handlePrint = async () => {
    const page = pageRef.current;
    if (!page) {
      try { window.print(); } catch  { /* intentionally empty */ }
      return;
    }

    // flush layout
    await new Promise((r) => setTimeout(r, 0));

    const cloned = page.cloneNode(true);

    // absolutize + cache-bust images (avoid stale or broken resources)
    const absBust = (p) => {
      const src = p?.startsWith("http") ? p : `${window.location.origin}${p || ""}`;
      const v = Date.now();
      return src.includes("?") ? `${src}&v=${v}` : `${src}?v=${v}`;
    };
    cloned.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src) img.setAttribute("src", absBust(src));
    });

    // Build a self-contained printable HTML document
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <base href="${window.location.origin}/">
  <title>Quotation</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="print-wrap">${cloned.outerHTML}</div>
  <script>
    (function(){
      const wait = async () => {
        const imgs = Array.from(document.images || []);
        await Promise.all(imgs.map(img =>
          (img.complete && img.naturalWidth) ? 1 : new Promise(r => { img.onload = img.onerror = () => r(); })
        ));
        if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} }
        await new Promise(r => setTimeout(r, 600));
        try { window.focus(); } catch(e){}
        try { window.print(); } catch(e){}
        const closeIt = () => { try { window.close(); } catch(e){} };
        try { window.addEventListener('afterprint', closeIt); } catch(e){}
        setTimeout(closeIt, 45000);
      };
      if (document.readyState === 'complete') wait();
      else window.addEventListener('load', wait);
    })();
  </script>
</body>
</html>`;

    // Open as a Blob URL (no document.write / no noreferrer issues)
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    let popup = null;
    try { popup = window.open(url, "_blank"); } catch  { /* intentionally empty */ }

    if (!popup) {
      // Popup blocked → same-tab fallback (user can go back)
      const revoke = () => { try { URL.revokeObjectURL(url); } catch  { /* intentionally empty */ } };
      window.addEventListener("pagehide", revoke, { once: true });
      window.location.href = url;
      return;
    }

    // Revoke Blob URL later
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch  { /* intentionally empty */ }
    }, 120000);
  };

  // Ctrl/Cmd+P shortcut → custom print
  useEffect(() => {
    const onKeyDown = (e) => {
      const isPrintShortcut = (e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P");
      if (isPrintShortcut) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Hidden-on-screen print canvas that this component owns */}
      <div className="print-sheet">
        <div className="page" ref={pageRef}>
          <div className="sheet">

            {/* Header */}
            <div className="hdr-line">
              <div style={{ textAlign: "center", marginRight: 12 }}>
                <img src={"/location-qr.png"} alt="Location QR" style={{ height: 50, objectFit: "contain" }} />
                <div style={{ fontSize: 8, fontWeight: 600, marginTop: 4 }}>Scan for Location</div>
              </div>

              <div className="hdr-title">
                <div className="quo-box">QUOTATION</div>
              </div>

              <div className="hdr-right">
                <div>Sl. No.: {form?.getFieldValue("serialNo") || "-"}</div>
                <div>Date: {printDate}</div>
              </div>
            </div>

            {/* Brand block */}
            <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 8, display: "grid", gridTemplateRows: "auto auto", rowGap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {brand === "SHANTHA" ? (
                  <>
                    <div className="title-kn" style={{ whiteSpace: "nowrap" }}>ಶಾಂತ ಮೋಟರ್ಸ್</div>
                    <div className="title-en" style={{ whiteSpace: "nowrap" }}>Shantha Motors</div>
                  </>
                ) : (
                  <>
                    <div className="title-knhonda" style={{ whiteSpace: "nowrap" }}>ಎನ್ ಎಚ್ ಮೋಟರ್ಸ್</div>
                    <div className="title-en" style={{ whiteSpace: "nowrap" }}>NH Motors</div>
                  </>
                )}
              </div>

              <div className="brand-row2" style={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 16, alignItems: "start" }}>
                <div>
                  {brand === "SHANTHA" ? (
                    <>
                      <div>
                        <div className="addr-line">• Kadabagere,Beside State Bank India,Magadi Main Road, Bangalore - 562130</div>
                        <div className="addr-line">• No.195, Oppsit.to Muddanna Ceramics, Ullal Main Road, Bangalore - 560091</div>
                        <div className="addr-line">• Oppsit. Lens Cart, D - Group Layout, Gidadakonenahalli, Bangalore - 560091</div>
                        <div className="addr-line">• No.1, Opp to Udupi Garden Hotel,Andrahalli Main Road, Bangalore - 560091</div>
                        <div className="addr-line">• Tavarekere, Besides Poorvika Elect., Magadi Main Road, Bangalore - 562130</div>
                        <div className="addr-line">• Hegganahalli,Anjaneya Temple,Hegganahali Main Road, Bangalore - 560091</div>
                        <div className="addr-line">• No.34/1,Opp.Sarita Bar,Channenahali,Magdi Main Road, Bangalore - 562130</div>
                        <div className="addr-line">• No.14,Nelagadrahalli Main Road,Nr St Joseph's College, Bangalore - 560073</div>
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 600 }}>Mob: 9731366921 / 8073283502 / 9035131806</div>
                    </>
                  ) : (
                    <>
                      <div className="addr-linehonda">Site No. 116/1, Bydarahalli, Magadi Main Road, Opp. HP Petrol Bunk, Bangalore - 560091</div>
                      <div style={{ marginTop: 6, fontWeight: 600 }}>Mob: 9731366921 / 8073283502 / 9741609799</div>
                    </>
                  )}
                </div>

                <div className="brand-right" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "flex-end" }}>
                  <img
                    src={brand === "SHANTHA" ? "/shantha-logoprint.png" : "/honda-logo.png"}
                    alt="Brand Logo"
                    style={{ height: brand === "SHANTHA" ? 160 : 120, objectFit: "contain" }}
                  />
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="box" style={{ marginBottom: 8 }}>
              <div className="section-title">Customer Details</div>
              <div className="row2">
                <div><b>Name:</b> {form?.getFieldValue("name") || "-"}</div>
                <div><b>Mobile:</b> {form?.getFieldValue("mobile") || "-"}</div>
                <div style={{ gridColumn: "1 / span 2" }}><b>Address:</b> {form?.getFieldValue("address") || "-"}</div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="box" style={{ marginBottom: 8 }}>
              <div className="section-title">Vehicle Details</div>
              <div className="row3" style={{ fontSize: "12pt" }}>
                <div><b>Company:</b> {company || form?.getFieldValue("company") || "-"}</div>
                <div><b>Model:</b> {model || form?.getFieldValue("bikeModel") || "-"}</div>
                <div><b>Variant:</b> {variant || form?.getFieldValue("variant") || "-"}</div>
              </div>
              <div style={{ marginTop: 6, textAlign: "center" }}>
                <span className="big-price">
                  <b>On-Road Price:</b> {inr0(form?.getFieldValue("onRoadPrice") ?? onRoadPrice ?? 0)}
                </span>
              </div>
            </div>

            {/* EMI */}
            {mode === "loan" && (
              <div className="box" style={{ marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: "12pt" }}>Down Payment</div>
                    <div style={{ fontWeight: 800, fontSize: "18pt" }}>{inr0(downPayment || 0)}</div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, textAlign: "center", marginBottom: 4, fontSize: "14pt" }}>EMI DETAILS</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                      {tenures.map((mo) => (
                        <div key={mo} className="emibox" style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 700 }}>{mo} months</div>
                          <div style={{ fontWeight: 900 }}>{inr0(monthlyFor(mo))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Executive + fittings + docs */}
            <div className="box" style={{ marginBottom: 8 }}>
              <div style={{ marginBottom: 6, fontSize: "13pt", fontWeight: 700 }}>
                <b>Executive name:</b> {executiveName || "-"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "0.6fr 1fr 1fr", gap: 16, alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{fittingsTitle}</div>
                  <PrintList items={fittings} />
                </div>

                <div style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                  <img src={"/shantha-access.png"} alt="Accessories" style={{ height: 140, margin: "6px 0" }} />
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Documents Required</div>
                  <PrintList items={docsReq} />
                </div>
              </div>
            </div>

            <div style={{ fontSize: "9.5pt", display: "flex", justifyContent: "space-between" }}>
              <div />
              <div><b>Note:</b> Prices are indicative and subject to change without prior notice.</div>
            </div>

          </div>
        </div>
      </div>

      {/* The actual button shown on screen */}
      <Button className="no-print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
        Print
      </Button>
    </>
  );
}
