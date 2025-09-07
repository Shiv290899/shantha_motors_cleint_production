// Quotation.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Row, Col, Form, Input, InputNumber, Select, Button, Radio, message, Checkbox, Switch,
} from "antd";
import PrintQuotation from "./PrintQuotation";

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
const EXECUTIVES = [
  { name: "Rukmini", phone: "9901678562" },
  { name: "Meghana", phone: "7019974219" },
  { name: "Nikitha", phone: "9535190015" },
  { name: "Prakash", phone: "9740176476" },
  { name: "Kumar", phone: "7975807667" },
  { name: "Sujay", phone: "7022878048" },
  { name: "Kavi", phone: "9108970455" },
  { name: "Narasimha", phone: "9900887666" },
  { name: "Kavya", phone: "8073165374" },
  { name: "Shubha", phone: "8971585057" },
  { name: "Vanitha", phone: "9380729861" },
];
const SCOOTER_OPTIONS = ["All Round Guard","Side Stand","Saree Guard","Grip Cover","Seat Cover","Floor Mat","ISI Helmet"];
const MOTORCYCLE_OPTIONS = ["Crash Guard","Engine Guard","Tank Cover","Ladies Handle","Gripper","Seat Cover"];
const DOCS_REQUIRED = ["Aadhar Card","Pan Card","Bank Passbook","ATM Card","Local Address Proof"];

/* ======================
   HELPERS
   ====================== */
const phoneRule = [
  { required: true, message: "Mobile number is required" },
  { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit Indian mobile number" },
];
const toE164India = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  const noLeadZero = digits.replace(/^0+/, "");
  if (!noLeadZero) return "";
  if (noLeadZero.length === 10) return `91${noLeadZero}`;
  if (noLeadZero.startsWith("91") && noLeadZero.length === 12) return noLeadZero;
  return noLeadZero;
};

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

const toEntries = (v, executiveName) => ({
  ["entry.1495914891"]: v.name ?? "",
  ["entry.606711946"]: v.mobile ?? "",
  ["entry.561486211"]: v.company ?? "",
  ["entry.772364163"]: v.bikeModel ?? "",
  ["entry.219611581"]: v.variant ?? "",
  ["entry.1594794173"]: executiveName ?? "",
  ["entry.1055001846"]: v.remarks ?? "",
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
    } catch {
      //ignpre
    }
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
  const [downPayment, setDownPayment] = useState(0);

  const [vehicleType, setVehicleType] = useState("scooter");
  const [fittings, setFittings] = useState(["Side Stand", "Floor Mat", "ISI Helmet", "Grip Cover"]);
  const [docsReq, setDocsReq] = useState(DOCS_REQUIRED);

  const executiveName = Form.useWatch("executive", form) || EXECUTIVES[0].name;

  useEffect(() => {
    (async () => {
      try {
        const raw = await fetchSheetRowsCSV(SHEET_CSV_URL);
        const cleaned = raw.map(normalizeSheetRow).filter((r) => r.company && r.model && r.variant);
        if (!cleaned.length) {
          message.warning("Sheet loaded but no valid rows. Switching to manual entry.");
          setManual(true); setSheetOk(false); return;
        }
        setBikeData(cleaned); setSheetOk(true);
      } catch {
        message.warning("Could not load vehicle sheet. Switched to manual entry.");
        setManual(true); setSheetOk(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const serial = await getNextSerial();
      if (!form.getFieldValue("serialNo")) form.setFieldsValue({ serialNo: serial });
    })();
  }, [form]);

  useEffect(() => {
    if (vehicleType === "scooter") {
      setFittings(["Side Stand", "Floor Mat", "ISI Helmet", "Grip Cover"]);
    } else {
      setFittings(["Tank Cover", "Gripper", "Seat Cover"]);
    }
  }, [vehicleType]);

  const companies = useMemo(() => [...new Set(bikeData.map((r) => r.company))], [bikeData]);
  const models = useMemo(
    () => [...new Set(bikeData.filter((r) => r.company === company).map((r) => r.model))],
    [bikeData, company]
  );
  const variants = useMemo(
    () => [...new Set(bikeData.filter((r) => r.company === company && r.model === model).map((r) => r.variant))],
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

  const handleSaveToForm = async () => {
    const v = await form.validateFields([
      "serialNo","name","mobile","address","company","bikeModel","variant","onRoadPrice","executive","remarks",
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

  const handleWhatsApp = async () => {
    try {
      await form.validateFields(["name","mobile","company","bikeModel","variant"]);
    } catch {
      message.warning("Please enter Name, Mobile, Company, Model and Variant.");
      return;
    }

    let savedOk = true;
    try { await handleSaveToForm(); } catch { savedOk = false; }

    const toE164 = toE164India(form.getFieldValue("mobile"));
    const adminMsg =
      `New quotation details:` +
      `\nName: ${(form.getFieldValue("name")||"").trim() || "-"}` +
      `\nMobile: ${toE164 ? "+"+toE164 : (form.getFieldValue("mobile")||"-")}` +
      `\nVehicle: ${[company||form.getFieldValue("company")||"", model||form.getFieldValue("bikeModel")||"", variant||form.getFieldValue("variant")||""].filter(Boolean).join(" ") || "-"}`;

    window.open(`https://wa.me/919731366921?text=${encodeURIComponent(adminMsg)}`, "_blank");

    if (savedOk) message.success("Saved to sheet and opened WhatsApp with details.");
    else message.warning("Could not save to sheet, but WhatsApp was opened with details.");
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
      `}</style>

      <div className="wrap">
        <div className="card">
          <Form layout="vertical" form={form} initialValues={{ executive: EXECUTIVES[0].name }}>
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
                <Form.Item label="Quotation No." name="serialNo" rules={[{ required: true, message: "Enter quotation no." }]}>
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
                  <Checkbox.Group value={fittings} onChange={setFittings}>
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
                  onClick={handleWhatsApp}
                  style={{ marginRight: 8, background: "#25D366", color: "#fff", borderColor: "#25D366" }}
                >
                  WhatsApp
                </Button>

                {/* PRINT lives here but renders/owns its own A4 layout internally */}
                <PrintQuotation
                  form={form}
                  brand={brand}
                  company={company}
                  model={model}
                  variant={variant}
                  onRoadPrice={onRoadPrice}
                  mode={mode}
                  downPayment={downPayment}
                  emiSet={emiSet}
                  vehicleType={vehicleType}
                  fittings={fittings}
                  docsReq={docsReq}
                  executiveName={executiveName}
                />
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </>
  );
}
