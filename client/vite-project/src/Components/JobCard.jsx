// JobCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Col, DatePicker, Form, Grid, Input,
  InputNumber, Row, Typography, message, Select, Button, Segmented, Checkbox
} from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

/* =========================
   CONFIG / CONSTANTS
   ========================= */

// Public CSV export (read JC serials from here)
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRu1AT7UpETjJI7ZmiD3gSQS3h_UnnzjF8yHu650gRXWSI5LJvKj5QPdW2M7gVp-zhquJDZXj1wDIy3/pub?output=csv";

// Branches
const BRANCHES = [
  "Kadabagere",
  "Muddinapalya",
  "D-Group Layout",
  "Andrahalli",
  "Tavarekere",
  "Hegganahalli",
  "Channenahalli",
  "Nelagadrahalli"
];

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

const SERVICE_TYPES = ["Free", "Paid", "Minor"]; // shown as checkboxes (single-select enforced)
const VEHICLE_TYPES = ["Scooter", "Motorcycle"]; // tabs
const MECHANIC = ["Sonu", "ManMohan", "Mansur", "Irshad"];

// NEW: Fuel Level (tabs)
const FUEL_LEVELS = ["Empty", "¼", "½", "¾", "Full"];

// Labour defaults + price book
const DEFAULT_GST_LABOUR = 0;
const PRICE_BOOK = {
  Scooter: {
    base: [
      { desc: "Engine oil", rate: 450 },
      { desc: "Consumables", rate: 70 },
      { desc: "Gearbox oil", rate: 80 },
    ],
  },
  Motorcycle: {
    base: [
      { desc: "Engine oil", rate: 450 },
      { desc: "Consumables", rate: 80 },
      { desc: "Chain lubrication", rate: 70 },
    ],
  },
  paidAddons: [
    { desc: "Service Labour", rate: 400 },
    { desc: "Water wash", rate: 150 },
  ],
};

// Phone numbers to print under header & on slip (as confirmed)
const SHOP_PHONES = ["9731366921", "8073283502"];

// Fixed estimates for Free/Minor by vehicle type (editable defaults)
const FIXED_ESTIMATES = {
  Scooter: { Free: 600, Minor: 600 },
  Motorcycle: { Free: 1150, Minor: 1150 },
};

/* =========================
   UTILS
   ========================= */

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line) =>
    line
      .match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g)
      ?.map((m) => m.replace(/^,/, ""))
      .map((m) =>
        m.startsWith('"') && m.endsWith('"') ? m.slice(1, -1).replace(/""/g, '"') : m
      ) || [];
  const headers = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((ln) => {
    const cells = split(ln);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
    return obj;
  });
  return { headers, rows };
}

async function getNextJobCardNo() {
  if (SHEET_CSV_URL) {
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (res.ok) {
        const csv = await res.text();
        const { rows } = parseCSV(csv);
        const count = Math.max(0, rows.length);
        return String(count + 1);
      }
    } catch {
      // ignore
    }
  }
  return dayjs().format("YYMMDDHHmmss");
}

/* ========= Vehicle No. mask =========
   Type 10 alphanumerics → auto spaces → 12 incl. spaces
   Example: KA05DB6000 => KA05 DB 6000
*/
function formatReg(raw) {
  const alnum = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  let out = "";
  for (let i = 0; i < alnum.length; i++) {
    out += alnum[i];
    if (i === 3 || i === 5) out += " ";
  }
  return out.slice(0, 12);
}
const REGEX_FULL = /^[A-Z]{2}\d{2}\s[A-Z]{2}\s\d{4}$/;

// Build labour rows from selections
function buildRows(serviceType, vehicleType) {
  if (!serviceType || !vehicleType) return [];
  const base = PRICE_BOOK[vehicleType]?.base ?? [];
  const rows = base.map((b) => ({ desc: b.desc, qty: 1, rate: b.rate }));
  if (serviceType === "Paid") {
    rows.push(...PRICE_BOOK.paidAddons.map((a) => ({ desc: a.desc, qty: 1, rate: a.rate })));
  }
  return rows;
}

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Math.max(0, Math.round(Number(n || 0))));

function computeEstimatedTotal(serviceType, vehicleType, totals) {
  if (serviceType === "Paid") return totals.grand;
  if (serviceType === "Free" || serviceType === "Minor") {
    return FIXED_ESTIMATES?.[vehicleType]?.[serviceType] ?? 0;
  }
  return totals.grand;
}

/* =========================
   MAIN COMPONENT
   ========================= */

export default function JobCard() {
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  const [regDisplay, setRegDisplay] = useState("");
  const [serviceTypeLocal, setServiceTypeLocal] = useState(null); // single selection from checkboxes
  const [vehicleTypeLocal, setVehicleTypeLocal] = useState(null); // Segmented tabs
  const [printMode, setPrintMode] = useState(null); // "pre" | "post" | null

  const initialValues = useMemo(
    () => ({
      jcNo: "",
      createdAt: dayjs(),
      expectedDelivery: null,
      branch: BRANCHES[0],
      executive: undefined,
      mechanic: "",
      // toggles/segments
      serviceType: undefined,
      vehicleType: undefined,
      floorMat: undefined,  // only for Scooter
      fuelLevel: undefined,
      // Vehicle & customer
      regNo: "",
      model: "",
      colour: "",
      km: undefined,
      custName: "",
      custMobile: "",
      callStatus: undefined,
      obs: "",
      // Labour editor defaults
      labourRows: [],
      gstLabour: DEFAULT_GST_LABOUR,
      discounts: { labour: 0 },
    }),
    []
  );

  useEffect(() => {
    (async () => {
      const next = await getNextJobCardNo();
      form.setFieldsValue({ jcNo: next });
      message.success(`JC No. set to ${next}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle masked registration input
  const handleRegChange = (e) => {
    const next = formatReg(e.target.value);
    setRegDisplay(next);
    form.setFieldsValue({ regNo: next });
  };

  // Watchers for labour auto-fill and values
  const labourRows = Form.useWatch("labourRows", form) || [];
  const gstLabour = Form.useWatch("gstLabour", form) ?? DEFAULT_GST_LABOUR;
  const discounts = Form.useWatch("discounts", form) || { labour: 0 };
  const createdAt = Form.useWatch("createdAt", form);
  const expectedDelivery = Form.useWatch("expectedDelivery", form);
  const branch = Form.useWatch("branch", form);
  const executive = Form.useWatch("executive", form);
  const mechanic = Form.useWatch("mechanic", form);
  const regNo = Form.useWatch("regNo", form);
  const km = Form.useWatch("km", form);
  const model = Form.useWatch("model", form);
  const colour = Form.useWatch("colour", form);
  const obs = Form.useWatch("obs", form);
  const custName = Form.useWatch("custName", form);
  const custMobile = Form.useWatch("custMobile", form);
  const callStatus = Form.useWatch("callStatus", form);

  const serviceType = serviceTypeLocal;
  const vehicleType = vehicleTypeLocal;

  // Auto-fill labour rows when type changes
  useEffect(() => {
    const auto = buildRows(serviceType, vehicleType);
    const current = labourRows?.map((r) => `${r?.desc}|${r?.qty}|${r?.rate}`) || [];
    const next = auto.map((r) => `${r?.desc}|${r?.qty}|${r?.rate}`);
    const same = current.length === next.length && current.every((v, i) => v === next[i]);
    if (!same) form.setFieldsValue({ labourRows: auto });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType, vehicleType]);

  // If vehicle is not Scooter, clear Floor Mat value
  useEffect(() => {
    if (vehicleTypeLocal !== "Scooter") {
      form.setFieldsValue({ floorMat: undefined });
    }
  }, [vehicleTypeLocal, form]);

  // Totals
  const totals = useMemo(() => {
    const labourSub = labourRows.reduce(
      (sum, r) => sum + Number(r?.qty || 0) * Number(r?.rate || 0),
      0
    );
    const labourGST = labourSub * (Number(gstLabour) / 100);
    const labourDisc = Number(discounts.labour || 0);
    const grand = Math.max(0, labourSub + labourGST - labourDisc);
    return { labourSub, labourGST, labourDisc, grand };
  }, [labourRows, gstLabour, discounts]);

  // KM input: only digits, max 6
  const handleKmKeyPress = (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); };

  // Mobile input: only digits, exactly 10 (blocks others)
  const handleMobileKeyPress = (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); };
  const handleMobileChange = (e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    if (val.length > 10) return;
    form.setFieldsValue({ custMobile: val });
  };

  // Service Type UI: checkboxes but single-select enforced
  const serviceOptions = SERVICE_TYPES.map((t) => ({ label: t, value: t }));
  const handleServiceCheckbox = (checkedValues) => {
    const last = checkedValues[checkedValues.length - 1] || null;
    setServiceTypeLocal(last || null);
    form.setFieldsValue({ serviceType: last || undefined });
  };
  const serviceValueForUI = serviceTypeLocal ? [serviceTypeLocal] : [];

  // Printing helpers
  useEffect(() => {
    const after = () => setPrintMode(null);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);
  const triggerPrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 150);
  };

  // derive executive phone
  const execPhone =
    EXECUTIVES.find((e) => e.name === executive)?.phone || "";

  // computed estimated total for pre-service
  const estimatedTotal = computeEstimatedTotal(serviceType, vehicleType, totals);

  return (
    <div style={{ padding: screens.xs ? 8 : 16 }}>
      {/* Global styles (screen + print) */}
     <style>{`
  /* Screen defaults */
  .print-area { display: none; }

  @media print {
    @page { size: A4 portrait; margin: 10mm; }

    /* 1) Hide everything in the app/site */
    html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
    body * { visibility: hidden !important; }

    /* 2) Show only the current print payload */
    .print-area, .print-area * { visibility: visible !important; }
    .print-area {
      position: absolute;       /* start at page top (after @page margin) */
      inset: 0;                 /* top:0 right:0 bottom:0 left:0 */
      margin: 0 !important;
      display: block !important;
    }

    /* 3) Nuke layout paddings that some shells add */
    #root, .ant-layout, .ant-layout-content,
    header, nav, footer, .site-header, .site-nav, .site-footer {
      padding: 0 !important;
      margin: 0 !important;
      visibility: hidden !important; /* ensure they don't render */
      height: 0 !important;
    }

    /* 4) Hide screen-only elements */
    .no-print { display: none !important; }
  }
`}</style>


      {/* Title */}
      <Card size="small" bordered className="no-print">
        <Title level={4} style={{ margin: 0 }}>SHANTHA MOTORS — JOB CARD</Title>
        <Text type="secondary">Multi Brand Two Wheeler Sales &amp; Service</Text>
      </Card>

      {/* FORM */}
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        style={{ marginTop: 12 }}
        className="no-print"
      >
        {/* Job Details */}
        <Card size="small" bordered title="Job Details">
          <Row gutter={12}>
            <Col xs={12} sm={2}>
              <Form.Item label="JC No." name="jcNo" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={12} sm={4}>
              <Form.Item label="Created At" name="createdAt" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={6} sm={4}>
              <Form.Item label="Branch" name="branch" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children" placeholder="Select branch">
                  {BRANCHES.map((b) => (
                    <Option key={b} value={b}>{b}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={4}>
              <Form.Item label="Allotted Mechanic" name="mechanic" rules={[{ required: true }]}>
                <Select
                  placeholder="Select mechanic"
                  options={MECHANIC.map((name) => ({ value: name, label: name }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item label="Executive" name="executive" rules={[{ required: true }]}>
                <Select options={EXECUTIVES.map((e) => ({ value: e.name, label: e.name }))} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={4}>
              <Form.Item label="Expected Delivery Date" name="expectedDelivery" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Vehicle & Customer */}
        <Card size="small" bordered style={{ marginTop: 12 }} title="Vehicle & Customer">
          <Row gutter={12}>
            <Col xs={12} sm={4}>
              <Form.Item
                label="Vehicle No."
                name="regNo"
                validateFirst
                rules={[
                  { required: true, message: "Vehicle number is required" },
                  {
                    validator: (_, val) =>
                      !val || REGEX_FULL.test(val)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Format must be KA05 DB 6000 (12 chars incl. spaces)")),
                  },
                ]}
              >
                <Input
                  placeholder="KA05 DB 6000"
                  value={regDisplay}
                  onChange={handleRegChange}
                  maxLength={12}
                  inputMode="latin"
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={4}>
              <Form.Item label="Model" name="model" rules={[{ required: true }]}>
                <Input placeholder="e.g., Honda Activa 6G" />
              </Form.Item>
            </Col>

            <Col xs={12} sm={4}>
              <Form.Item label="Colour" name="colour">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={12} sm={3}>
              <Form.Item
                label="KM / Odo"
                name="km"
                rules={[{ required: true, message: "Please enter KM / Odo" }]}
              >
                <Input
                  style={{ width: "100%" }}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyPress={handleKmKeyPress}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={6}>
              <Form.Item label="Customer Name" name="custName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} sm={6}>
              <Form.Item
                label="Mobile"
                name="custMobile"
                rules={[
                  { required: true, message: "Please enter mobile number" },
                  {
                    validator: (_, val) => {
                      if (!val) return Promise.resolve();
                      if (!/^\d{10}$/.test(String(val))) {
                        return Promise.reject(new Error("Enter 10-digit mobile number"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyPress={handleMobileKeyPress}
                  onChange={handleMobileChange}
                  placeholder="10-digit number"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="Call Status" name="callStatus">
                <Input placeholder="Connected / Not reachable / Will call back" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Service */}
        <Card size="small" bordered style={{ marginTop: 12 }} title="Service">
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item label="Service Type (tick one)">
                <Checkbox.Group
                  options={serviceOptions}
                  value={serviceValueForUI}
                  onChange={handleServiceCheckbox}
                />
              </Form.Item>
            </Col>

            {serviceTypeLocal && (
              <Col xs={24} md={6}>
                <Form.Item
                  label="Vehicle Type"
                  name="vehicleType"
                  rules={[{ required: true, message: "Please choose Scooter or Motorcycle" }]}
                >
                  <Segmented
                    className="blue-segmented"
                    block
                    options={VEHICLE_TYPES}
                    value={vehicleTypeLocal || undefined}
                    onChange={(val) => {
                      setVehicleTypeLocal(val);
                      form.setFieldsValue({ vehicleType: val });
                      if (val !== "Scooter") {
                        form.setFieldsValue({ floorMat: undefined });
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            )}

            {vehicleTypeLocal === "Scooter" && (
              <Col xs={24} md={4}>
                <Form.Item
                  label="Floor Mat (Mandatory)"
                  name="floorMat"
                  rules={[{ required: true, message: "Please select Yes/No" }]}
                >
                  <Segmented
                    className="blue-segmented"
                    block
                    options={["Yes", "No"]}
                    onChange={(val) => form.setFieldsValue({ floorMat: val })}
                  />
                </Form.Item>
              </Col>
            )}

            <Col xs={24} md={8}>
              <Form.Item label="Fuel Level" name="fuelLevel">
                <Segmented className="blue-segmented" block options={FUEL_LEVELS} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Customer Observation" name="obs">
                <Input.TextArea rows={3} placeholder="Write the customer's observations..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Labour Editor */}
        <Card size="small" bordered style={{ marginTop: 12 }} title="Labour">
          <Form.List name="labourRows">
            {(fields, { add, remove }) => (
              <>
                <Row gutter={8} style={{ fontWeight: 600, marginBottom: 6 }}>
                  <Col span={12}>Description</Col>
                  <Col span={4}>Qty</Col>
                  <Col span={4}>Rate</Col>
                  <Col span={4} style={{ textAlign: "right" }}>Amount</Col>
                </Row>

                {fields.map(({ key, name, ...rest }) => {
                  const row = labourRows?.[name] || {};
                  const amt = Number(row?.qty || 0) * Number(row?.rate || 0);
                  return (
                    <Row key={key} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                      <Col span={12}>
                        <Form.Item {...rest} name={[name, "desc"]} rules={[{ required: true }]}>
                          <Input placeholder="Labour description" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...rest}
                          name={[name, "qty"]}
                          initialValue={1}
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...rest} name={[name, "rate"]} rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={4} style={{ textAlign: "right" }}>
                        <Text>{inr(amt)}</Text>
                        <Button type="link" danger onClick={() => remove(name)} style={{ paddingLeft: 8 }}>
                          Remove
                        </Button>
                      </Col>
                    </Row>
                  );
                })}

                <Button onClick={() => add({ qty: 1 })}>Add labour</Button>
              </>
            )}
          </Form.List>
        </Card>

        {/* Totals */}
        <Card size="small" bordered style={{ marginTop: 12 }} title="Totals">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, maxWidth: 480 }}>
            <div>Labour Subtotal</div>
            <div style={{ textAlign: "right" }}>{inr(totals.labourSub)}</div>

            <Form.Item label="GST % on Labour" name="gstLabour" style={{ marginBottom: 0 }}>
              <InputNumber min={0} max={28} />
            </Form.Item>
            <div style={{ textAlign: "right" }}>{inr(totals.labourGST)}</div>

            <div>Discount (Labour)</div>
            <Form.Item name={["discounts", "labour"]} style={{ marginBottom: 0 }}>
              <InputNumber min={0} />
            </Form.Item>

            <div style={{ fontWeight: 700 }}>Grand Total</div>
            <div style={{ textAlign: "right", fontWeight: 700 }}>{inr(totals.grand)}</div>
          </div>
        </Card>

        {/* Print buttons */}
        <Row justify="end" style={{ marginTop: 16 }}>
          <Col>
            <Button type="primary" onClick={() => triggerPrint("pre")} style={{ marginRight: 8 }}>
              Pre-service
            </Button>
            <Button onClick={() => triggerPrint("post")}>
              Post-service
            </Button>
          </Col>
        </Row>
      </Form>

      {/* =========================
          PRE-SERVICE PRINT LAYOUT
          ========================= */}
      {printMode === "pre" && (
        <div className="print-area">
          <style>{`
            .pre-wrapper { font-family: Arial, Helvetica, sans-serif; color: #000; }
            .pre-header { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; margin-bottom: 6px; }
            .pre-title { font-size: 18pt; font-weight: 700; }
            .pre-phones { font-size: 9pt; }
            .pre-qrwrap { text-align: right; }
            .pre-subrow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 6px 0 10px; }
            .box { border: 1px solid #000; padding: 6px; font-size: 10pt; }
            .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
            .row4 { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr; gap: 8px; }
            .label { font-weight: 600; margin-right: 4px; }
            .kv { display: flex; gap: 4px; }
            .ticks { display: flex; gap: 16px; align-items: center; }
            .tick { display:inline-flex; align-items:center; gap:6px; }
            .square { width: 11px; height: 11px; border: 1px solid #000; display:inline-block; }
            .square.checked { background:#000; }
            .ul { margin: 0; padding-left: 16px; }
            .muted { color:#000; }
            .vehicle-img { width: 100%; max-height: 120px; object-fit: contain; border: 1px solid #000; }
            .tearoff {
              position: fixed; left: 10mm; right: 10mm; bottom: 10mm;
              height: 1.95in; /* ~1/6 of A4 height */
              border: 1px solid #000; padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
              box-sizing: border-box; background: #fff;
            }
            .tearline { 
              position: fixed; left: 10mm; right: 10mm; 
              bottom: calc(10mm + 1.95in); height: 0; 
              border-top: 1px dashed #000; text-align: center; 
            }
            .content-keep-bottom-gap { margin-bottom: calc(1.95in + 14mm); } /* prevent overlap with slip + line */
            .kv-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 6px; }
            .right-kv-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          `}</style>

          <div className="pre-wrapper content-keep-bottom-gap">
            {/* Header */}
            <div className="pre-header">
              <div>
                <div className="pre-title">SHANTHA MOTORS — JOB CARD</div>
                <div className="pre-phones">
                  {branch ? `${branch} • ` : ""}+91 {SHOP_PHONES[0]} / +91 {SHOP_PHONES[1]}
                </div>
                <div style={{ marginTop: 6 }} className="box kv-grid">
                  <div className="kv"><span className="label">Job Card No.:</span><span>{String(form.getFieldValue("jcNo") || "")}</span></div>
                  <div className="kv"><span className="label">Date:</span><span>{createdAt ? dayjs(createdAt).format("DD/MM/YYYY") : ""}</span></div>
                  <div className="kv"><span className="label">Executive:</span><span>{executive || ""}</span></div>
                  <div className="kv"><span className="label">Mechanic:</span><span>{mechanic || ""}</span></div>
                </div>
              </div>
              <div className="pre-qrwrap">
                <img src="/location-qr.png" alt="Location QR" style={{ width: 110, height: 110, objectFit: "contain" }} />
                <div style={{ fontSize: 8, marginTop: 4 }}>Scan for location</div>
              </div>
            </div>

            {/* Row 1 */}
            <div className="row">
              <div className="box"><span className="label">Vehicle No.:</span>{regNo || ""}</div>
              <div className="box"><span className="label">KM / Odo:</span>{km || ""}</div>
              <div className="box"><span className="label">Branch:</span>{branch || ""}</div>
            </div>

            {/* Row 2 */}
            <div className="row">
              <div className="box"><span className="label">Model:</span>{model || ""}</div>
              <div className="box"><span className="label">Colour:</span>{colour || ""}</div>
              <div className="box"><span className="label">Expected Delivery:</span>{expectedDelivery ? dayjs(expectedDelivery).format("DD/MM/YYYY") : ""}</div>
            </div>

            {/* Row 3 - service ticks */}
            <div className="box">
              <div className="label">Service Type:</div>
              <div className="ticks" style={{ marginTop: 4 }}>
                {["Free", "Paid", "Minor"].map((t) => (
                  <div key={t} className="tick">
                    <span className={`square ${serviceType === t ? "checked" : ""}`}></span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 4 split */}
            <div className="row4">
              {/* Left: Customer Observation + Total Estimated Cost */}
              <div className="box" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Customer Observation</div>
                <div style={{ whiteSpace: "pre-wrap", minHeight: 70 }}>{obs || ""}</div>
                <div style={{ marginTop: "auto", fontWeight: 700, borderTop: "1px solid #000", paddingTop: 6 }}>
                  Total Estimated Cost: {inr(estimatedTotal)}
                </div>
              </div>

              {/* Middle: Estimated Cost (line items, descriptions only) */}
              <div className="box">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Estimated Cost (Items)</div>
                {labourRows && labourRows.length ? (
                  <ul className="ul">
                    {labourRows.map((r, idx) => (
                      <li key={idx}>{r?.desc || "-"}</li>
                    ))}
                  </ul>
                ) : (
                  <div>—</div>
                )}
              </div>

              {/* Right: Damage checklist + vehicle image */}
              <div className="box">
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Check body part for any damage</div>
                <div style={{ display: "grid", gap: 4, marginBottom: 6 }}>
                  {["Dented", "Scratched", "Broken", "Missing"].map((label) => (
                    <div key={label} className="tick">
                      <span className="square"></span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <img className="vehicle-img" src="/vehicle.png" alt="Vehicle reference" />
              </div>
            </div>

            {/* Customer details under the split */}
            <div className="row" style={{ marginTop: 8 }}>
              <div className="box"><span className="label">Customer Name:</span>{custName || ""}</div>
              <div className="box"><span className="label">Mobile No.:</span>{custMobile || ""}</div>
              <div className="box"><span className="label">Call Status:</span>{callStatus || ""}</div>
            </div>
          </div>

          {/* Tear line and slip (fixed at bottom) */}
          <div className="tearline"></div>
          <div className="tearoff">
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Shantha Motors</div>
              <img src="/location-qr.png" alt="Location QR" style={{ width: 110, height: 110, objectFit: "contain" }} />
              <div style={{ fontSize: 10 }}>+91 {SHOP_PHONES[0]} / +91 {SHOP_PHONES[1]}</div>
            </div>

            {/* Right */}
            <div style={{ fontSize: 10 }}>
              <div className="right-kv-grid">
                <div className="label">Job Card No.</div><div>{String(form.getFieldValue("jcNo") || "")}</div>
                <div className="label">Registration No.</div><div>{regNo || ""}</div>
                <div className="label">Expected Delivery</div><div>{expectedDelivery ? dayjs(expectedDelivery).format("DD/MM/YYYY") : ""}</div>
                <div className="label">Date</div><div>{createdAt ? dayjs(createdAt).format("DD/MM/YYYY") : ""}</div>
                <div className="label">Exec No.</div><div>{execPhone ? `+91 ${execPhone}` : ""}</div>
                <div className="label">Approx. Service Amount</div><div>{inr(estimatedTotal)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          POST-SERVICE PRINT (placeholder)
          ========================= */}
      {printMode === "post" && (
        <div className="print-area">
          <style>{`
            .post-wrapper { font-family: Arial, Helvetica, sans-serif; color: #000; }
            .post-header { display:flex; align-items:center; justify-content:space-between; }
            .post-title { font-size: 18pt; font-weight: 700; }
          `}</style>
          <div className="post-wrapper">
            <div className="post-header">
              <div className="post-title">Shantha Motors — Post-service (Billing)</div>
              <img src="/location-qr.png" alt="QR" style={{ width: 90, height: 90, objectFit: "contain", border: "1px solid #000" }} />
            </div>
            <div style={{ marginTop: 12 }}>Billing layout to be implemented next.</div>
          </div>
        </div>
      )}
    </div>
  );
}
