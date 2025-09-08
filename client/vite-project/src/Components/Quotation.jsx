// QuotationOnePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Row, Col, Form, Input, InputNumber, Select, Button, Radio, message, Checkbox, Switch,
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";

/* ======================
   GOOGLE FORM INTEGRATION
   ====================== */
const GFORM_ID = "1FAIpQLSf12moQr3-6sXFvF4FbA_9h94gwIz-dW_QbT-yFlVsa2wYByg";

const ENTRY = {
  name: "entry.1495914891",
  phone: "entry.606711946",
  company: "entry.561486211",
  model: "entry.772364163",
  variant: "entry.219611581",
  executive: "entry.1594794173",
  remarks: "entry.1055001846",
};

const RESPONSES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRXJ4xTMWJVv7v-U9SD8R5X2z4Lt0EBUeOOo6_leF-75-gToGJV1yxBk3YUooCtMAJ410quZN7UrhnO/pub?output=csv";

/* ======================
   GOOGLE SHEETS (VEHICLE DATA) CSV LOADER
   ====================== */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsXcqX5kmqG1uKHuWUnBCjMXBugJn7xljgBsRPIm2gkk2PpyRnEp8koausqNflt6Q4Gnqjczva82oN/pub?output=csv";

const HEADERS = {
  company: ["Company", "Company Name"],
  model: ["Model", "Model Name"],
  variant: ["Variant"],
  price: ["On-Road Price", "On Road Price", "Price"],
};

// Minimal CSV parser
const parseCsv = (text) => {
  const rows = [];
  let row = [], col = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && !inQuotes) { inQuotes = true; continue; }
    if (c === '"' && inQuotes) {
      if (n === '"') { col += '"'; i++; continue; }
      inQuotes = false; continue;
    }
    if (c === "," && !inQuotes) { row.push(col); col = ""; continue; }
    if ((c === "\n" || c === "\r") && !inQuotes) {
      if (col !== "" || row.length) { row.push(col); rows.push(row); row = []; col = ""; }
      if (c === "\r" && n === "\n") i++;
      continue;
    }
    col += c;
  }
  if (col !== "" || row.length) { row.push(col); rows.push(row); }
  return rows;
};

const fetchSheetRowsCSV = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Sheet fetch failed");
  const csv = await res.text();
  if (csv.trim().startsWith("<")) throw new Error("Expected CSV, got HTML");
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => (h || "").trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj;
  });
};

const pick = (row, keys) =>
  String(keys.map((k) => row[k] ?? "").find((v) => v !== "") || "").trim();

const normalizeSheetRow = (row = {}) => ({
  company: pick(row, HEADERS.company),
  model: pick(row, HEADERS.model),
  variant: pick(row, HEADERS.variant),
  onRoadPrice:
    Number(String(pick(row, HEADERS.price) || "0").replace(/[,\s₹]/g, "")) || 0,
});

/* ======================
   CONFIG + STATIC OPTIONS
   ====================== */
const PROCESSING_FEE = 8000;
const RATE_LOW = 9;
const RATE_HIGH = 11;

const EXECUTIVES = [
  { name: "Rukmini", phone: "9901678562" },
  { name: "Meghana", phone: "7019974219" },
  { name: "Shubha", phone: "8971585057" },
  { name: "Rani", phone: "9108970455" },
  { name: "Nikitha", phone: "9535190015" },
  { name: "Prakash", phone: "9740176476" },
  { name: "Kumar", phone: "7975807667" },
  { name: "Sujay", phone: "7022878048" },
  { name: "Kavi", phone: "9108970455" },
  { name: "Narasimha", phone: "9900887666" },
  { name: "Kavya", phone: "8073165374" },
  { name: "Vanitha", phone: "9380729861" },
];

const SCOOTER_OPTIONS = [
  "All Round Guard",
  "Side Stand",
  "Ladies Foot Rest",
  "Grip Cover",
  "Seat Cover",
  "Floor Mat",
  "ISI Helmet",
];

const MOTORCYCLE_OPTIONS = [
  "Crash Guard",
  "Engine Guard",
  "Tank Cover",
  "Ladies Handle",
  "Gripper",
  "Seat Cover",
];

const DOCS_REQUIRED = [
  "Aadhar Card",
  "Pan Card",
  "Bank Passbook",
  "ATM Card",
  "Local Address Proof",
];

const MEGHANA_NAME = "Meghana";

/* ======================
   HELPERS
   ====================== */
const phoneRule = [
  { required: true, message: "Mobile number is required" },
  { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit Indian mobile number" },
];

const inr0 = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n || 0)));

const submitToGoogleForm = (entries) => {
  const iframeName = "gform_silent_target_" + Date.now();
  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.action = `https://docs.google.com/forms/d/e/${GFORM_ID}/formResponse`;
  form.method = "POST";
  form.target = iframeName;
  form.style.display = "none";

  Object.entries(entries).forEach(([k, v]) => {
    if (!k) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = String(v ?? "");
    form.appendChild(input);
  });

  [["fvv","1"],["draftResponse","[]"],["pageHistory","0"]].forEach(([k,v]) => {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = k; i.value = v; form.appendChild(i);
  });

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => { form.remove(); iframe.remove(); }, 3000);
};

const toEntries = (v, executiveName) => ({
  [ENTRY.name]: v.name ?? "",
  [ENTRY.phone]: v.mobile ?? "",
  [ENTRY.company]: v.company ?? "",
  [ENTRY.model]: v.bikeModel ?? "",
  [ENTRY.variant]: v.variant ?? "",
  [ENTRY.executive]: executiveName ?? "",
  [ENTRY.remarks]: v.remarks ?? "",
});

/* ======================
   AUTO SERIAL NUMBER
   ====================== */
async function getNextSerial() {
  if (RESPONSES_CSV_URL) {
    try {
      const res = await fetch(RESPONSES_CSV_URL, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        const rows = parseCsv(csv);
        const count = Math.max(0, rows.length - 1);
        return String(count + 1);
      }
    } catch { /* fallback */ }
  }
  const key = `SM_QUOTE_COUNTER_SIMPLE`;
  const current = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(current));
  return String(current);
}

/* ======================
   COMPONENT
   ====================== */
export default function Quotation() {
  const [form] = Form.useForm();

  const [brand, setBrand] = useState("SHANTHA"); // "SHANTHA" | "NH"

  const [bikeData, setBikeData] = useState([]);
  const [company, setCompany] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [onRoadPrice, setOnRoadPrice] = useState(0);

  const [manual, setManual] = useState(false);
  const [sheetOk, setSheetOk] = useState(false);

  const [mode, setMode] = useState("cash");

  const [emiSet, setEmiSet] = useState("12");
  const tenures = useMemo(
    () => (emiSet === "12" ? [12, 18, 24, 30] : [24, 30, 36, 48]),
    [emiSet]
  );

  const [downPayment, setDownPayment] = useState(0);

  const [vehicleType, setVehicleType] = useState("scooter");
  const [fittings, setFittings] = useState(["Side Stand", "Floor Mat", "ISI Helmet", "Grip Cover"]);
  const [docsReq, setDocsReq] = useState(DOCS_REQUIRED);

  const executiveName = Form.useWatch("executive", form) || EXECUTIVES[0].name;

  const pageRef = useRef(null);
  const printDate = useMemo(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  // helper to make image paths absolute for the print iframe + cache-bust
  const absBust = (p) => {
    const src = p?.startsWith("http") ? p : `${window.location.origin}${p || ""}`;
    const v = Date.now();
    return src.includes("?") ? `${src}&v=${v}` : `${src}?v=${v}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await fetchSheetRowsCSV(SHEET_CSV_URL);
        const cleaned = raw
          .map(normalizeSheetRow)
          .filter((r) => r.company && r.model && r.variant);
        if (!cleaned.length) {
          message.warning("Sheet loaded but no valid rows. Switching to manual entry.");
          setManual(true);
          setSheetOk(false);
          return;
        }
        setBikeData(cleaned);
        setSheetOk(true);
      } catch {
        message.warning("Could not load vehicle sheet. Switched to manual entry.");
        setManual(true);
        setSheetOk(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const serial = await getNextSerial();
      if (!form.getFieldValue("serialNo")) {
        form.setFieldsValue({ serialNo: serial });
      }
    })();
  }, [form]);

  useEffect(() => {
  // When NH Motors is selected, default the executive to Meghana once.
  if (brand === "NH") {
    form.setFieldsValue({ executive: MEGHANA_NAME }); // or "Meghana"
  }
}, [brand, form]);


  useEffect(() => {
    if (vehicleType === "scooter") {
      setFittings(["Side Stand", "Floor Mat", "ISI Helmet", "Grip Cover"]);
    } else {
      setFittings(["Tank Cover", "Gripper", "Seat Cover"]);
    }
  }, [vehicleType]);

  const companies = useMemo(
    () => [...new Set(bikeData.map((r) => r.company))],
    [bikeData]
  );
  const models = useMemo(
    () => [...new Set(bikeData.filter((r) => r.company === company).map((r) => r.model))],
    [bikeData, company]
  );
  const variants = useMemo(
    () => [
      ...new Set(
        bikeData.filter((r) => r.company === company && r.model === model).map((r) => r.variant)
      ),
    ],
    [bikeData, company, model]
  );

  const handleVariant = (v) => {
    setVariant(v);
    if (!manual) {
      const found = bikeData.find((r) => r.company === company && r.model === model && r.variant === v);
      const price = found?.onRoadPrice || 0;
      form.setFieldsValue({ onRoadPrice: price });
      setOnRoadPrice(price);
      setDownPayment(0);
    }
  };

  const dpPct = onRoadPrice > 0 ? downPayment / onRoadPrice : 0;
  const rate = dpPct >= 0.3 ? RATE_LOW : RATE_HIGH;

  const monthlyFor = (months) => {
    const base = Math.max(Number(onRoadPrice || 0) - Number(downPayment || 0), 0);
    const principal = base + PROCESSING_FEE;
    const years = months / 12;
    const totalInterest = principal * (rate / 100) * years;
    const total = principal + totalInterest;
    return months > 0 ? total / months : 0;
  };

  // ---------- Android-proof A4 print ----------
  const handlePrint = async () => {
    try {
      await form.validateFields([
        "serialNo", "name", "mobile", "address",
        "company", "bikeModel", "variant", "onRoadPrice",
      ]);
    } catch {
      message.warning("Fix the highlighted fields before printing.");
      return;
    }

    const page = pageRef.current;
    if (!page) { window.print(); return; }

    // Ensure latest React commit is flushed
    await new Promise((r) => setTimeout(r, 0));

    const cloned = page.cloneNode(true);

 // canvas -> img (Android print-safe)
  cloned.querySelectorAll("canvas").forEach(cnv => {
    try {
      const img = document.createElement("img");
      img.alt = cnv.getAttribute("aria-label") || "canvas";
      img.src = cnv.toDataURL("image/png");
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      cnv.parentNode && cnv.parentNode.replaceChild(img, cnv);
    } catch {
      //ignore
    }
  });


  // absolute + cache-busted images
  cloned.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) img.setAttribute("src", absBust(src));
  });

 const PRINT_STYLES = `
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0 !important; padding: 0 !important; background: #fff !important;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      font-family: Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    .print-wrap { margin: 0 auto; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm; background: #fff !important; }
    .sheet { width: 100%; font: 12pt/1.32 Arial, sans-serif; color: #111; page-break-inside: avoid; }
    .row2 { display: grid; grid-template-columns: 0.8fr 1.4fr; gap: 8px 16px; }
    .row3 { display: grid; grid-template-columns: 0.5fr 0.8fr 1fr; gap: 10px 16px; }
    .box { border: 2px solid #000; border-radius: 6px; padding: 8px 10px; background: #fff; }
    .plist { margin: 0; padding-left: 18px; } .plist li { margin: 0 0 2px; }
    .title-knhonda { font-size: 30pt; font-weight: 900; letter-spacing: .2px; }
    .title-kn { font-size: 38pt; font-weight: 900; letter-spacing: .2px; }
    .title-en { font-size: 20pt; font-weight: 800; margin-top: 2px; }
    .big-price { font-size: 16pt; font-weight: 900; }
    .addr-line { font-size: 11pt; } .addr-linehonda { font-size: 12pt; }
    .hdr-line { display:flex; align-items:center; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; }
    .hdr-title { flex: 1; display: flex; justify-content: center; }
    .quo-box { font-size: 17pt; border: 2px solid #000; padding: 4px 10px; font-weight: 800; display: inline-block; }
    .hdr-right { text-align: right; font-weight: 600; }
    .emibox { border: 2px solid #000; border-radius: 8px; padding: 6px 10px; text-align: center; }
    .section-title { font-size: 14pt; font-weight: 900; margin-bottom: 4px; }
    img { max-width: 100%; height: auto; background: transparent; }
    @media print {
      * { transform: none !important; }
      .fixed, .sticky, [style*="position: sticky"], [style*="position: fixed"] { position: static !important; }
      .no-print { display: none !important; }
    }
  `;


  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // ✅ Open a new tab immediately (keeps user gesture alive on mobile)
    const win = window.open("", "_blank");
    if (!win) { message.error("Please allow pop-ups to print."); return; }
    const doc = win.document;

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <base href="${location.origin}${location.pathname}">
        <title>Quotation</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="print-wrap"></div>
      </body>
      </html>
    `);
    doc.close();

// adopt/import the cloned node into the new document
    const mount = doc.querySelector(".print-wrap");
    const node = doc.importNode(cloned, true);
    mount.appendChild(node);

    const waitForAssets = async () => {
      const imgs = Array.from(doc.images || []);
      await Promise.all(
        imgs.map(img =>
          (img.complete && img.naturalWidth)
            ? Promise.resolve()
            : new Promise(res => { img.onload = img.onerror = () => res(); })
        )
      );
      if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch {
        //igg
      } }
      await new Promise(res => setTimeout(res, 200));
    };

    await waitForAssets();
    try { win.focus(); } catch {
      //og
    }
    win.print();
    // Optionally close after print on mobile:
    // setTimeout(() => { try { win.close(); } catch {} }, 500);
    return;
  }

  // Desktop: iframe flow (works fine)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win.document;

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <base href="${location.origin}${location.pathname}">
      <title>Quotation</title>
      <style>${PRINT_STYLES}</style>
    </head>
    <body>
      <div class="print-wrap"></div>
    </body>
    </html>
  `);
  doc.close();

  const mount = doc.querySelector(".print-wrap");
  mount.appendChild(doc.importNode(cloned, true));

  const waitForAssets = async () => {
    const imgs = Array.from(doc.images || []);
    await Promise.all(
      imgs.map(img =>
        (img.complete && img.naturalWidth)
          ? Promise.resolve()
          : new Promise(res => { img.onload = img.onerror = () => res(); })
      )
    );
    if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch {
      //jijh
    } }
    await new Promise(res => setTimeout(res, 200));
  };

  try {
    await waitForAssets();
    try { win.focus(); } catch {
      //kgk
    }
    try { win.print(); } catch { window.print(); }
  } finally {
    setTimeout(() => { iframe.parentNode && iframe.parentNode.removeChild(iframe); }, 800);
  }
};


  // Capture Ctrl/Cmd + P and route to handlePrint
  useEffect(() => {
    const onKeyDown = (e) => {
      const isPrintShortcut =
        (e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P");
      if (isPrintShortcut) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // handlePrint uses stable inner functions/values


const handleSaveToForm = async () => {
    const v = await form.validateFields([
      "serialNo", "name", "mobile", "address",
      "company", "bikeModel", "variant", "onRoadPrice", "executive", "remarks",
    ]);

    if (!v.serialNo) {
      const serial = await getNextSerial();
      v.serialNo = serial;
      form.setFieldsValue({ serialNo: serial });
    }

    const entries = toEntries(v, executiveName);
    submitToGoogleForm(entries);

    return v;
  };

  const handleSaveClick = async () => {
    try {
      await handleSaveToForm();
      message.success("Saved successfully.");
    } catch (err) {
      console.warn("Save failed:", err);
      message.error("Could not save. Please check required fields and try again.");
    }
  };
 // --------- NEW: WhatsApp deep-link (frontend only) ----------
  const toE164NoPlusIndia = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith("91") && digits.length === 12) return digits;
    return "";
  };

  // Updated WhatsApp share handler with a warmer, impressive welcome message
// --------- UPDATED: WhatsApp deep-link handler (adds highlighted Free Extra Fittings) ----------
const handleWhatsAppClick = async () => {
  try {
    // Validate essentials before composing the message
    const v = await form.validateFields([
      "serialNo", "name", "mobile",
      "company", "bikeModel", "variant", "onRoadPrice"
    ]);

    // Normalize phone to E.164 (India) without plus
    const phone = toE164NoPlusIndia(v.mobile);
    if (!phone) {
      message.error("Enter a valid 10-digit Indian mobile to open WhatsApp.");
      return;
    }

    // Pull values from state/form, with safe fallbacks
    const showroomName = (brand === "SHANTHA" ? "Shantha Motors" : "NH Motors");
    const name   = (form.getFieldValue("name") || "-").trim();
    const comp   = (company || form.getFieldValue("company") || "-").trim();
    const mdl    = (model   || form.getFieldValue("bikeModel") || "-").trim();
    const varnt  = (variant || form.getFieldValue("variant")   || "-").trim();
    const priceNum = form.getFieldValue("onRoadPrice") ?? onRoadPrice ?? 0;

    // Executive contact
    const execPhone = (EXECUTIVES.find(e => e.name === executiveName) || {}).phone || "-";

    // Quotation date (IST)
    const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    // EMI helpers
    const monthly = (typeof monthlyFor === "function") ? monthlyFor : () => 0;
    const tenureList = Array.isArray(tenures) && tenures.length ? tenures : ["12","24","36","48"];

    // Selected fittings (highlight only those the user ticked)
    const selectedFittings = Array.isArray(fittings) ? fittings.filter(Boolean) : [];
    const selectedDocsReq = Array.isArray(docsReq) ? docsReq.filter(Boolean) : [];

    // ---------- Message copy (short, warm, impressive) ----------
    const header = [
      `*Hi ${name}, Welcome to ${showroomName}! 🚀*`,
      `_Your personalized quotation is ready — clear, quick & tailored for you._`,
      ``
    ];

    const bullets = [
      `• *Quotation Date:* ${printDate}`,
      `• *Vehicle:* ${comp} ${mdl} ${varnt}`,
      `• *On-Road Price:* ${inr0(priceNum)}`
    ];

    if (mode === "loan") {
      bullets.push(
        `• *EMI Options (approx.):*`,
        `   – Down Payment: ${inr0(downPayment || 0)}`,
        ...tenureList.map((mo) => `   – ${mo} months: ${inr0(monthly(mo))}`)
      );
    }

    // ✅ NEW: Highlight Free Extra Fittings the user selected
    if (selectedFittings.length) {
      bullets.push(
        `• *Free Extra Fittings:*`,
        ...selectedFittings.map(f => `   ✅ ${f}`)
      );
    }
    // ✅ NEW: Highlight Free Extra Fittings the user selected
    if (selectedDocsReq.length) {
      bullets.push(
        `• *Documents Required:*`,
        ...selectedDocsReq.map(f => `   ✅ ${f}`)
      );
    }

    // Contact + note
    bullets.push(
      `• *Sales Advisor:* ${executiveName || "-"} (${execPhone})`,
      `• *Note:* Prices are indicative and may change without prior notice.`
    );

    const cta = [
      ``,
      `✨ *${showroomName} — Ride with Pride, Drive with Confidence.* ✨`
    ];

    const lines = [...header, ...bullets, ...cta];
    const text = lines.join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;

  } catch {
    message.warning("Please fill all required fields before sending on WhatsApp.");
  }
};

  const PrintList = ({ items }) => {
    if (!items?.length) return <span>-</span>;
    return <ul className="plist">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
  };

  return (
    <>
      <style>{`
        .wrap { max-width: 1000px; margin: 12px auto; padding: 0 12px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
        @media screen and (max-width: 600px) {
          .brand-row2 { grid-template-columns: 1fr !important; row-gap: 8px; }
          .brand-right { justify-content: flex-start !important; }
        }
        .print-sheet { display: none; }
        @media print { .print-sheet { display: block; } .no-print { display: none !important; } }
      `}</style>

  {/* On-screen inputs */}
      <div className="wrap no-print">
        <div className="card">
          <Form
            layout="vertical"
            form={form}
            initialValues={{ executive: EXECUTIVES[0].name }}
          >
            <Row gutter={[12, 8]}>

              <Col span={24}>
                <Form.Item label="Brand on Print">
                  <Radio.Group value={brand} onChange={(e)=>setBrand(e.target.value)}>
                    <Radio value="SHANTHA">Shantha Motors</Radio>
                    <Radio value="NH">NH Motors (Honda)</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item label="Type manually (no sheet)" valuePropName="checked">
                  <Switch checked={manual} onChange={setManual} />
                  <span style={{ marginLeft: 8, color: "#666" }}>
                    {sheetOk ? "You can still switch to manual if needed." : "Sheet unavailable — manual mode enabled."}
                  </span>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label="Quotation No."
                  name="serialNo"
                  rules={[{ required: true, message: "Enter quotation no." }]}
                >
                  <Input placeholder="Auto-filled (1, 2, 3…)" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Executive Name" name="executive">
                  <Select options={EXECUTIVES.map((e) => ({ value: e.name, label: e.name }))} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Payment Mode">
                  <Radio.Group optionType="button" buttonStyle="solid" value={mode} onChange={(e)=>setMode(e.target.value)}>
                    <Radio.Button value="cash">Cash</Radio.Button>
                    <Radio.Button value="loan">Loan</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>

              {/* Customer */}
              <Col xs={24} md={12}>
                <Form.Item label="Customer Name" name="name" rules={[{ required: true, message: "Enter name" }]}>
                  <Input placeholder="Customer name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Mobile Number"
                  name="mobile"
                  rules={phoneRule}
                  normalize={(v) => (v ? v.replace(/\D/g, "").slice(0, 10) : v)}
                >
                  <Input placeholder="10-digit mobile" maxLength={10} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Address" name="address" rules={[{ required: true, message: "Enter address" }]}>
                  <Input.TextArea rows={2} placeholder="House No, Street, Area, City, PIN" />
                </Form.Item>
              </Col>

              {/* Vehicle selection */}
              <Col xs={24} md={8}>
                <Form.Item label="Company" name="company" rules={[{ required: true, message: "Enter company" }]}>
                  {manual ? (
                    <Input placeholder="Type company" onChange={(e)=>setCompany(e.target.value)} />
                  ) : (
                    <Select
                      placeholder="Select Company"
                      options={companies.map((c) => ({ value: c, label: c }))}
                      onChange={(val) => {
                        setCompany(val);
                        setModel(""); setVariant(""); setOnRoadPrice(0); setDownPayment(0);
                        form.setFieldsValue({ bikeModel: undefined, variant: undefined, onRoadPrice: undefined });
                      }}
                    />
                  )}
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Model" name="bikeModel" rules={[{ required: true, message: "Enter model" }]}>
                  {manual ? (
                    <Input placeholder="Type model" onChange={(e)=>setModel(e.target.value)} />
                  ) : (
                    <Select
                      placeholder="Select Model"
                      disabled={!company}
                      options={models.map((m) => ({ value: m, label: m }))}
                      onChange={(val) => {
                        setModel(val);
                        setVariant(""); setOnRoadPrice(0); setDownPayment(0);
                        form.setFieldsValue({ variant: undefined, onRoadPrice: undefined });
                      }}
                    />
                  )}
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label="Variant" name="variant" rules={[{ required: true, message: "Enter variant" }]}>
                  {manual ? (
                    <Input placeholder="Type variant" onChange={(e)=>setVariant(e.target.value)} />
                  ) : (
                    <Select
                      placeholder="Select Variant"
                      disabled={!model}
                      options={variants.map((v) => ({ value: v, label: v }))}
                      onChange={handleVariant}
                    />
                  )}
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="On-Road Price (₹)" name="onRoadPrice" rules={[{ required: true }]}>
                  <InputNumber
                    style={{ width: "100%" }}
                    readOnly={!manual}
                    value={onRoadPrice}
                    onChange={(v)=>setOnRoadPrice(Number(v||0))}
                    formatter={(val) => `₹ ${String(val ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}
                    parser={(val) => String(val || "0").replace(/[₹,\s]/g, "")}
                  />
                </Form.Item>
              </Col>

              {mode === "loan" && (
                <>
                  <Col xs={24} md={12}>
                    <Form.Item label="Down Payment (₹)">
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={onRoadPrice}
                        step={1000}
                        value={downPayment}
                        onChange={(v) => setDownPayment(Math.min(Number(v || 0), onRoadPrice || 0))}
                        formatter={(val) => `₹ ${String(val ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}
                        parser={(val) => String(val || "0").replace(/[₹,\s]/g, "")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item label="EMI Set">
                      <Radio.Group value={emiSet} onChange={(e)=>setEmiSet(e.target.value)}>
                        <Radio value="12">12</Radio>
                        <Radio value="48">48</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {tenures.map((mo) => (
                        <div key={mo} className="emibox" style={{ minWidth: 140 }}>
                          <div style={{ fontWeight: 700 }}>{mo} months</div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>{inr0(monthlyFor(mo))}</div>
                        </div>
                      ))}
                    </div>
                  </Col>
                </>
              )}

              {/* Vehicle Type & Fittings */}
              <Col xs={24} md={12}>
                <Form.Item label="Vehicle Type" name="vehicleType">
                  <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <Radio.Button value="scooter">Scooter</Radio.Button>
                    <Radio.Button value="motorcycle">Motorcycle</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Free Extra Fittings (shown on print)">
                  <Checkbox.Group
                    value={fittings}
                    onChange={setFittings}
                  >
                    {(vehicleType === "scooter" ? SCOOTER_OPTIONS : MOTORCYCLE_OPTIONS).map((opt) => (
                      <div key={opt} style={{ marginBottom: 6 }}>
                        <Checkbox value={opt}>{opt}</Checkbox>
                      </div>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              </Col>

              {/* Documents */}
              <Col xs={24}>
                <Form.Item label="Documents Required (always printed)">
                  <Checkbox.Group value={docsReq} onChange={setDocsReq}>
                    {DOCS_REQUIRED.map((x) => (
                      <div key={x} style={{ marginBottom: 6 }}>
                        <Checkbox value={x}>{x}</Checkbox>
                      </div>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              </Col>

              {/* Remarks */}
              <Col xs={24}>
                <Form.Item label="Remarks" name="remarks">
                  <Input.TextArea rows={2} placeholder="Any notes for this quotation (optional)" />
                </Form.Item>
              </Col>

              {/* Actions */}
              <Col span={24} style={{ textAlign: "right" }}>
                 <Button
                  className="no-print"
                  onClick={handleSaveClick}
                  style={{ marginRight: 8 }}
                  type="default"
                >
                  Save
                </Button>
                {/* NEW: WhatsApp */}
                <Button
                  className="no-print"
                  onClick={handleWhatsAppClick}
                  style={{ marginRight: 8, background: "#25D366", borderColor: "#25D366", color: "#fff" }}
                >
                  WhatsApp
                </Button>

               

                <Button className="no-print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                  Print
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </div>

      {/* ---------- PRINT SLIP (A4) ---------- */}
      <div className="print-sheet">
        <div className="page" ref={pageRef}>
          <div className="sheet">

            {/* Header */}
            <div className="hdr-line">
              <div style={{ textAlign: "center", marginRight: 12 }}>
                <img
                  src={"/location-qr.png"}
                  alt="Location QR"
                  style={{ height: 50, objectFit: "contain" }}
                />
                <div style={{ fontSize: 8, fontWeight: 600, marginTop: 4 }}>Scan for Location</div>
              </div>

              <div className="hdr-title">
                <div className="quo-box">QUOTATION</div>
              </div>

              <div className="hdr-right">
                <div>Sl. No.: {form.getFieldValue("serialNo") || "-"}</div>
                <div>Date: {printDate}</div>
              </div>
            </div>

            {/* Brand block */}
            <div
              style={{
                borderBottom: "2px solid #000",
                paddingBottom: 6,
                marginBottom: 8,
                display: "grid",
                gridTemplateRows: "auto auto",
                rowGap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {brand === "SHANTHA" ? (
                  <>
                    <div className="title-kn" style={{ whiteSpace: "nowrap" }}>
                      ಶಾಂತ ಮೋಟರ್ಸ್
                    </div>
                    <div className="title-en" style={{ whiteSpace: "nowrap" }}>
                      Shantha Motors
                    </div>
                  </>
                ) : (
                  <>
                    <div className="title-knhonda" style={{ whiteSpace: "nowrap" }}>
                      ಎನ್ ಎಚ್ ಮೋಟರ್ಸ್
                    </div>
                    <div className="title-en" style={{ whiteSpace: "nowrap" }}>
                      NH Motors
                    </div>
                  </>
                )}
              </div>

              <div
                className="brand-row2"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  columnGap: 16,
                  alignItems: "start",
                }}
              >
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
                      <div style={{ marginTop: 6, fontWeight: 600 }}>
                        Mob: 9731366921 / 8073283502 / 9035131806
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="addr-linehonda">
                        Site No. 116/1, Bydarahalli, Magadi Main Road, Opp. HP Petrol Bunk, Bangalore - 560091
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 600 }}>
                        Mob: 9731366921 / 8073283502 / 9741609799
                      </div>
                    </>
                  )}
                </div>

                <div
                  className="brand-right"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    justifyContent: "flex-end",
                  }}
                >
                  <img
                    src={brand === "SHANTHA" ? "/shantha-logoprint.png" : "/honda-logo.png"}
                    alt="Brand Logo"
                    style={{
                      height: brand === "SHANTHA" ? 160 : 120,
                      objectFit: "contain",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="box" style={{ marginBottom: 8 }}>
              <div className="section-title">Customer Details</div>
              <div className="row2">
                <div><b>Name:</b> {form.getFieldValue("name") || "-"}</div>
                <div><b>Mobile:</b> {form.getFieldValue("mobile") || "-"}</div>
                <div style={{ gridColumn: "1 / span 2" }}><b>Address:</b> {form.getFieldValue("address") || "-"}</div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="box" style={{ marginBottom: 8 }}>
              <div className="section-title">Vehicle Details</div>
              <div className="row3" style={{ fontSize: "12pt" }}>
                <div><b>Company:</b> {company || form.getFieldValue("company") || "-"}</div>
                <div><b>Model:</b> {model || form.getFieldValue("bikeModel") || "-"}</div>
                <div><b>Variant:</b> {variant || form.getFieldValue("variant") || "-"}</div>
              </div>
              <div style={{ marginTop: 6, textAlign: "center" }}>
                <span className="big-price">
                  <span><b>On-Road Price:</b> </span>
                  {inr0(form.getFieldValue("onRoadPrice") ?? onRoadPrice ?? 0)}
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
                {(() => {
                  const found = EXECUTIVES.find((e) => e.name === executiveName);
                  return found ? ` (${found.phone})` : "";
                })()}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.6fr 1fr 1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Free Extra Fittings</div>
                  <PrintList items={fittings} />
                </div>

                <div
                  style={{
                    minHeight: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  <img
                    src={"/shantha-access.png"}
                    alt="Accessories"
                    style={{ height: 140, margin: "6px 0" }}
                  />
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
    </>
  );
}
