// QuotationOnePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Row, Col, Form, Input, InputNumber, Select, Button, Radio, message, Checkbox, Switch,
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";

/* ======================
   GOOGLE FORM INTEGRATION (EDIT THESE)
   ====================== */
const GFORM_ID = "1FAIpQLSf12moQr3-6sXFvF4FbA_9h94gwIz-dW_QbT-yFlVsa2wYByg";

const ENTRY = {
  name: "entry.1495914891",       // Customer Name
  phone: "entry.606711946",       // Customer Phone
  company: "entry.561486211",
  model: "entry.772364163",
  variant: "entry.219611581",
  executive: "entry.1594794173",  // Executive Name
  remarks: "entry.1055001846",    // Remarks
};

// Optional global counter source (keep empty to use localStorage)
const RESPONSES_CSV_URL = "";

/* ======================
   GOOGLE SHEETS (VEHICLE DATA) CSV LOADER
   ====================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQsXcqX5kmqG1uKHuWUnBCjMXBugJn7xljgBsRPIm2gkk2PpyRnEp8koausqNflt6Q4Gnqjczva82oN/pubhtml"
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
const PROCESSING_FEE = 8000; // included in principal
const RATE_LOW = 9;          // DP ≥ 30%
const RATE_HIGH = 11;        // DP < 30%
const TENURES = [18, 24, 30, 36];

const EXECUTIVES = [
  { name: "Rukmini", phone: "9876543210" },
  { name: "Radha", phone: "9123456789" },
  { name: "Manasa", phone: "9988776655" },
  { name: "Karthik", phone: "9090909090" },
  { name: "Suresh", phone: "9876501234" },
];

// Your requested fittings
const SCOOTER_OPTIONS = [
  "All Round Guard",
  "Side Stand",
  "Saree Guard",
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

const toE164India = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  const noLeadZero = digits.replace(/^0+/, "");
  if (!noLeadZero) return "";
  if (noLeadZero.length === 10) return `91${noLeadZero}`;
  if (noLeadZero.startsWith("91") && noLeadZero.length === 12) return noLeadZero;
  return noLeadZero;
};

// Prefilled link (not used now, per request)


// Silent submit to Google Form
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

// Map AntD form values → Google Form entry IDs
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
        const count = Math.max(0, rows.length - 1); // exclude header
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
export default function QuotationOnePage() {
  const [form] = Form.useForm();

  // vehicle data
  const [bikeData, setBikeData] = useState([]);
  const [company, setCompany] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [onRoadPrice, setOnRoadPrice] = useState(0);

  // data mode
  const [manual, setManual] = useState(false);
  const [sheetOk, setSheetOk] = useState(false);

  // mode + dp
  const [mode, setMode] = useState("cash");
  const [downPayment, setDownPayment] = useState(0);

  // vehicle type → fittings (with your default ticks)
  const [vehicleType, setVehicleType] = useState("scooter");
  const [fittings, setFittings] = useState(["Side Stand", "Floor Mat", "ISI Helmet"]); // default for scooter
  const [docsReq, setDocsReq] = useState(DOCS_REQUIRED);

  // executive (watch)
  const executiveName = Form.useWatch("executive", form) || EXECUTIVES[0].name;

  // Load vehicle data
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

  // Default quotation number
  useEffect(() => {
    (async () => {
      const serial = await getNextSerial();
      if (!form.getFieldValue("serialNo")) {
        form.setFieldsValue({ serialNo: serial });
      }
    })();
  }, [form]);

  // Vehicle type change → apply your default ticks
  useEffect(() => {
    if (vehicleType === "scooter") {
      setFittings(["Side Stand", "Floor Mat", "ISI Helmet"]);
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

  // PRINT
  const handlePrint = async () => {
    try {
      await form.validateFields([
        "serialNo", "name", "mobile", "address",
        "company", "bikeModel", "variant", "onRoadPrice",
      ]);
      window.print();
    } catch {
      message.warning("Fix the highlighted fields before printing.");
    }
  };

  // SAVE → GOOGLE FORM (silent)
  const handleSaveToForm = async () => {
    const v = await form.validateFields([
      "serialNo", "name", "mobile", "address",
      "company", "bikeModel", "variant", "onRoadPrice", "remarks", "executive",
    ]);

    if (!v.serialNo) {
      const serial = await getNextSerial();
      v.serialNo = serial;
      form.setFieldsValue({ serialNo: serial });
    }

    const entries = toEntries(v, executiveName);
    submitToGoogleForm(entries);

    return v; // no toast here (WhatsApp flow decides)
  };

  // WHATSAPP → Save silently, then send details to 9731366291
  const handleWhatsApp = async () => {
    // Ensure minimal fields for the admin message
    try {
      await form.validateFields(["name", "mobile", "company", "bikeModel", "variant"]);
    } catch {
      message.warning("Please enter Name, Mobile, Company, Model and Variant.");
      return;
    }

    // 1) Save to sheet silently
    let savedOk = true;
    try {
      await handleSaveToForm();
    } catch (err) {
      savedOk = false; // still proceed to WhatsApp send
      console.warn("Silent save failed (continuing to WhatsApp):", err);
    }

    // 2) Send admin WhatsApp
    const customerName = (form.getFieldValue("name") || "").trim();
    const mobileRaw = form.getFieldValue("mobile");
    const e164 = toE164India(mobileRaw);
    const companyVal = company || form.getFieldValue("company") || "";
    const modelVal = model || form.getFieldValue("bikeModel") || "";
    const variantVal = variant || form.getFieldValue("variant") || "";

    const adminMsg =
      `New quotation details:` +
      `\nName: ${customerName || "-"}` +
      `\nMobile: ${e164 ? "+" + e164 : (mobileRaw || "-")}` +
      `\nVehicle: ${[companyVal, modelVal, variantVal].filter(Boolean).join(" ") || "-"}`;

    const adminNumber = "919731366921"; 
    const url = `https://wa.me/${adminNumber}?text=${encodeURIComponent(adminMsg)}`;
    window.open(url, "_blank");

    // Give user feedback about save
    if (savedOk) {
      message.success("Saved to sheet and opened WhatsApp with details.");
    } else {
      message.warning("Could not save to sheet, but WhatsApp was opened with details.");
    }
  };

  // ------- UI -------
  const PrintList = ({ items }) => {
    if (!items?.length) return <span>-</span>;
    return <ul className="plist">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
  };

  // dynamic fittings list per vehicle type
  const currentFittingOptions =
    vehicleType === "scooter" ? SCOOTER_OPTIONS : MOTORCYCLE_OPTIONS;

  return (
    <>
      {/* ====== Screen & Print styles ====== */}
      <style>{`
        .wrap { max-width: 1000px; margin: 12px auto; padding: 0 12px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }

        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet { position: absolute; inset: 0; margin: 0; }
          .sheet { width: 190mm; min-height: 277mm; font: 11pt/1.28 "Helvetica Neue", Arial, sans-serif; color: #111; }
          .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
          .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 12px; }
          .box { border: 1.6px solid #000; border-radius: 6px; padding: 6px 8px; }
          .plist { margin: 0; padding-left: 18px; }
          .plist li { margin: 0 0 2px; }
          .title-kn { font-size: 30pt; font-weight: 900; letter-spacing: .3px; }
          .title-en { font-size: 20pt; font-weight: 700; margin-top: 2px; }
          .big-price { font-size: 14pt; font-weight: 900; }
          .addr-line { font-size: 9.5pt; }
          .quo-box { border: 2px solid #000; padding: 4px 8px; font-weight: 800; display: inline-block; }
        }
      `}</style>

      {/* ---------- On-screen inputs ---------- */}
      <div className="wrap no-print">
        <div className="card">
          <Form
            layout="vertical"
            form={form}
            initialValues={{ executive: EXECUTIVES[0].name }}
          >
            <Row gutter={[12, 8]}>
              {/* Manual entry toggle */}
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
              )}

              {/* Vehicle Type & Fittings with ticks */}
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
                    {currentFittingOptions.map((opt) => (
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

              {/* Actions */}
              <Col span={24} style={{ textAlign: "right" }}>
                {/* Removed Open Form (Prefilled) + Save buttons per your request */}
                <Button
                  className="no-print"
                  onClick={handleWhatsApp}
                  style={{ marginRight: 8, background: "#25D366", color: "#fff", borderColor: "#25D366" }}
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
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 8, textAlign: "center" }}>
          <div className="quo-box" style={{ margin: "0 auto 8px auto" }}>QUOTATION</div>
        </div>

        <div className="sheet">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 8 }}>
            <div>
              <div className="title-kn">ಶಾಂತ ಮೋಟರ್ಸ್</div>
              <div className="title-en">Shantha Motors</div>

              <div style={{ marginTop: 6 }}>
                <div className="addr-line">• No.195, Opp. to Muddanna Ceramics, Ullal Main Road, Gidadakonenahalli, Bangalore - 560091</div>
                <div className="addr-line">• No.1, Opp to Udupi Garden Hotel, D Group Arch, Andrahalli Main Road, Bangalore - 560091</div>
                <div className="addr-line">• Hegganahalli, Besides Anjaneya Temple, Hegganahalli Main Road, Bangalore - 560091</div>
                <div className="addr-line">• Hegganahalli, Besides Anjaneya Temple, Hegganahalli Main Road, Bangalore - 560091</div>
                <div className="addr-line">• Tavarekere, Besides Poorvika Electronics, Magadi Main Road, Bangalore - 562130</div>
                <div className="addr-line">• No. 34/1, Opp. Saritha Bar, Channenahalli, Magadi Main Road, Bangalore - 562130</div>
                <div className="addr-line">• Kadabagere, Besides SBI Bank, Magadi Main Road, Bangalore - 562130</div>
                <div className="addr-line">• Opp. Lense Cart, D Group Layout, Gidadakonenahalli, Bangalore - 560091</div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 300, marginTop: 6 }}>
                Sl. No.: {form.getFieldValue("serialNo") || "-"}
              </div>
              <img src="/shantha-logo.png" alt="Shantha Motors Logo" style={{ height: 150, marginBottom: 6 }} />
              <div style={{ fontWeight: 300, marginTop: 6 }}>Mob No: 9731366291</div>
            </div>
          </div>

          {/* Customer Box */}
          <div className="box" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Customer Details</div>
            <div className="row2">
              <div><b>Name:</b> {form.getFieldValue("name") || "-"}</div>
              <div><b>Mobile:</b> {form.getFieldValue("mobile") || "-"}</div>
              <div style={{ gridColumn: "1 / span 2" }}><b>Address:</b> {form.getFieldValue("address") || "-"}</div>
            </div>
          </div>

          {/* Vehicle Box */}
          <div className="box" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Vehicle Details</div>
            <div className="row3">
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

          {/* Loan/EMI Box */}
          {mode === "loan" && (
            <div className="box" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Loan Details – EMI DETAILS</div>
              <div style={{ marginBottom: 6 }}><b>Down Payment:</b> {inr0(downPayment || 0)}</div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                {TENURES.map((mo) => (
                  <div key={mo} style={{ flex: 1, border: "1px solid #000", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontWeight: 600 }}>{mo} months</div>
                    <div style={{ fontWeight: 800 }}>{inr0(monthlyFor(mo))}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive, Remarks, Fittings & Documents */}
          <div className="box" style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 6 }}>
              <b>Executive name:</b> {executiveName || "-"}
              {(() => {
                const found = EXECUTIVES.find((e) => e.name === executiveName);
                return found ? ` (${found.phone})` : "";
              })()}
            </div>

            <div style={{ marginBottom: 6 }}>
              <b>Remarks:</b> {form.getFieldValue("remarks") || "-"}
            </div>

            <div className="row3">
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Free Extra Fittings</div>
                {/* Only selected fittings printed */}
                <PrintList items={fittings} />
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Documents Required</div>
                <PrintList items={docsReq} />
              </div>
              <div />
            </div>
          </div>

          {/* Footer note */}
          <div style={{ fontSize: "9pt", display: "flex", justifyContent: "space-between" }}>
            <div />
            <div><b>Note:</b> Prices are indicative and subject to change without prior notice.</div>
          </div>
        </div>
      </div>
    </>
  );
}
