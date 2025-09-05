// JobCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Col, DatePicker, Form, Grid, Input,
  InputNumber, Row, Typography, message, Select, Button, Segmented, Checkbox
} from "antd";
import dayjs from "dayjs";

import PreServiceSheet from "./PreServiceSheet";
import PostServiceSheet from "./PostServiceSheet";

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

const SERVICE_TYPES = ["Free", "Paid"]; // shown as checkboxes (single-select enforced)
const VEHICLE_TYPES = ["Motorcycle","Scooter"]; // tabs
const MECHANIC = ["Sonu", "ManMohan", "Mansur", "Irshad"];

// Fuel Level (tabs)
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

/* Vehicle No. mask - KA05 DB 6000 */
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

/* =========================
   MAIN COMPONENT
   ========================= */

export default function JobCard() {
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  const [regDisplay, setRegDisplay] = useState("");
  const [serviceTypeLocal, setServiceTypeLocal] = useState(null); // single selection from checkboxes
  const [vehicleTypeLocal, setVehicleTypeLocal] = useState(null); // Segmented tabs
  const [printMode, setPrintMode] = useState(null); // 'pre' | 'post' | null

  const initialValues = useMemo(
    () => ({
      jcNo: "",
      createdAt: dayjs(),
      expectedDelivery: null,
      branch: BRANCHES[0],
      executive: undefined,
      mechanic: "",
      serviceType: undefined,
      vehicleType: undefined,
      floorMat: undefined,
      fuelLevel: undefined,
      regNo: "",
      model: "",
      colour: "",
      km: undefined,
      custName: "",
      custMobile: "",
      callStatus: undefined,
      obs: "",
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

  // Watchers for totals
  const labourRows = Form.useWatch("labourRows", form) || [];
  const gstLabour = Form.useWatch("gstLabour", form) ?? DEFAULT_GST_LABOUR;
  const discounts = Form.useWatch("discounts", form) || { labour: 0 };

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

  // Mobile input: only digits, exactly 10
  const handleMobileKeyPress = (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); };
  const handleMobileChange = (e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    if (val.length > 10) return;
    form.setFieldsValue({ custMobile: val });
  };

  // Service Type UI: checkboxes but single-select enforced
  const serviceOptions = SERVICE_TYPES.map((t) => ({ label: t, value: t }));

  // 👇 DEFAULT VEHICLE = "Motorcycle" when service is chosen, and populate rows immediately
  const handleServiceCheckbox = (checkedValues) => {
    const last = checkedValues[checkedValues.length - 1] || null;

    setServiceTypeLocal(last || null);
    form.setFieldsValue({ serviceType: last || undefined });

    if (last) {
      const defaultVehicle = "Motorcycle";
      setVehicleTypeLocal(defaultVehicle);
      form.setFieldsValue({
        vehicleType: defaultVehicle,
        floorMat: undefined, // Scooter-only
        labourRows: buildRows(last, defaultVehicle),
        gstLabour: DEFAULT_GST_LABOUR,
        discounts: { labour: 0 },
      });
      message.success(`Applied preset: ${last} / ${defaultVehicle}`);
    } else {
      form.setFieldsValue({ labourRows: [] });
    }
  };
  const serviceValueForUI = serviceTypeLocal ? [serviceTypeLocal] : [];

  // If vehicle is not Scooter, clear Floor Mat
  useEffect(() => {
    if (vehicleTypeLocal !== "Scooter") {
      form.setFieldsValue({ floorMat: undefined });
    }
  }, [vehicleTypeLocal, form]);

  // PRINT handling
  const handlePrint = (which) => {
    setPrintMode(which);
    setTimeout(() => window.print(), 30);
    setTimeout(() => setPrintMode(null), 800);
  };

  // Pull everything we need for printing
  const vals = form.getFieldsValue(true);

  // Build "observation" list = labour descriptions + typed notes (no prices)
  const observationLines = [
    ...labourRows.map((r) => r.desc),
    ...(vals?.obs ? vals.obs.split("\n").map((s) => s.trim()).filter(Boolean) : []),
  ];

  return (
    <div style={{ padding: screens.xs ? 8 : 16 }}>
      {/* Screen UI (hidden when printing) */}
      <div className="no-print">
        <Card size="small" bordered>
          <Title level={4} style={{ margin: 0 }}>SHANTHA MOTORS — JOB CARD</Title>
          <Text type="secondary">Multi Brand Two Wheeler Sales & Service</Text>
        </Card>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          style={{ marginTop: 12 }}
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

              <Col xs={12} sm={4}>
                <Form.Item
                  label="Odometer Reading"
                  name="km"
                  rules={[{ required: true, message: "Please enter Odometer Reading" }]}
                  getValueFromEvent={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    return val ? `${val} KM` : "";
                  }}
                  getValueProps={(value) => ({
                    value: value?.toString().replace(/\D/g, ""),
                  })}
                >
                  <Input
                    style={{ width: "100%" }}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyPress={handleKmKeyPress}
                    placeholder="Enter KM"
                    suffix="KM"
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
                <Form.Item
                  label="Call Status"
                  name="callStatus"
                >
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
                        if (serviceTypeLocal) {
                          form.setFieldsValue({
                            labourRows: buildRows(serviceTypeLocal, val), // live switch
                            gstLabour: DEFAULT_GST_LABOUR,
                            discounts: { labour: 0 },
                          });
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
                <Form.Item label="Customer Observation (additional notes)" name="obs">
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

          {/* PRINT BUTTONS */}
          <Row justify="end" style={{ marginTop: 12 }} gutter={8}>
            <Col>
              <Button type="primary" onClick={() => handlePrint("pre")}>
                Pre-service
              </Button>
            </Col>
            <Col>
              <Button onClick={() => handlePrint("post")}>
                Post-service
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* PRINT SHEETS */}
      <PreServiceSheet
        active={printMode === "pre"}
        vals={vals}
        labourRows={labourRows}
        totals={totals}
        observationLines={observationLines}
        executives={EXECUTIVES}
      />

      <PostServiceSheet
        active={printMode === "post"}
        vals={vals}
        totals={totals}
      />
    </div>
  );
}
