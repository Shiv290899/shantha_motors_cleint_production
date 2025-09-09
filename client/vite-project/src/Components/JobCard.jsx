// JobCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Card, Col, DatePicker, Form, Grid, Input,
  InputNumber, Row, Typography, message, Select, Button, Segmented, Checkbox
} from "antd";
import dayjs from "dayjs";
import { handleSmartPrint } from "../utils/printUtils"; 
import { FaWhatsapp } from "react-icons/fa";
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

// Google Form (prefill + autosubmit)
const GFORM_BASE =
  "https://docs.google.com/forms/d/e/1FAIpQLScGtIO_uWXq30BUSP3Pgs1EQFiXTBcLLiTP69rAHcv4QPm8hA/viewform?usp=pp_url";
const GFORM_POST =
  "https://docs.google.com/forms/d/e/1FAIpQLScGtIO_uWXq30BUSP3Pgs1EQFiXTBcLLiTP69rAHcv4QPm8hA/formResponse";

const GFORM_ENTRY = {
  name: "entry.1964588497",
  mobile: "entry.108507469",
  branch: "entry.2030797816",
  mechanic: "entry.122292818",
  amount: "entry.1599026863", // collected amount (Grand Total)
};

// Branches
const BRANCHES = [
  "byadarahalli",
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
  { name: "Shubha", phone: "8971585057" },
  { name: "Rani", phone: "8971585057" },
  { name: "Nikitha", phone: "9535190015" },
  { name: "Prakash", phone: "9740176476" },
  { name: "Kumar", phone: "7975807667" },
  { name: "Sujay", phone: "7022878048" },
  { name: "Kavi", phone: "9108970455" },
  { name: "Narasimha", phone: "9900887666" },
  { name: "Kavya", phone: "8073165374" },
  { name: "Vanitha", phone: "9380729861" },
];

const SERVICE_TYPES = ["Free", "Paid"]; // shown as checkboxes (single-select enforced)
const VEHICLE_TYPES = ["Motorcycle","Scooter"]; // tabs
const MECHANIC = ["Sonu", "ManMohan", "Mansur", "Irshad", "Dakshat"];

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

// // Build prefill URL for Google Form using current form values
// function buildPrefillUrl(vals, grandTotal) {
//   const params = new URLSearchParams();

//   if (vals?.custName)   params.set(GFORM_ENTRY.name, vals.custName);
//   if (vals?.custMobile) params.set(GFORM_ENTRY.mobile, String(vals.custMobile));
//   if (vals?.branch)     params.set(GFORM_ENTRY.branch, vals.branch);
//   if (vals?.mechanic)   params.set(GFORM_ENTRY.mechanic, vals.mechanic);

//   const amt = Number.isFinite(grandTotal) ? Math.round(grandTotal) : 0;
//   params.set(GFORM_ENTRY.amount, String(amt));  // send Grand Total

//   return `${GFORM_BASE}&${params.toString()}`;
// }

/** Silently POST to Google Form via hidden form + iframe (bypasses CORS) */
function autoSubmitToGoogle(entries) {
  const iframe = document.createElement("iframe");
  iframe.name = "gform_iframe";
  iframe.style.display = "none";

  const form = document.createElement("form");
  form.action = GFORM_POST;
  form.method = "POST";
  form.target = "gform_iframe";
  form.style.display = "none";

  Object.entries(entries).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value ?? "";
    form.appendChild(input);
  });

  // Optional Google params (usually not required, but harmless)
  const pageHistory = document.createElement("input");
  pageHistory.type = "hidden";
  pageHistory.name = "pageHistory";
  pageHistory.value = "0";
  form.appendChild(pageHistory);

  document.body.appendChild(iframe);
  document.body.appendChild(form);
  form.submit();

  // Clean up after a moment
  setTimeout(() => {
    try { document.body.removeChild(form); } catch {
      //
    }
    try { document.body.removeChild(iframe); } catch {

    //ignore

    }
  }, 2000);
}

/* =========================
   WHATSAPP / SMS HELPERS
   ========================= */

/** Get executive phone from your EXECUTIVES array by name */
function getExecPhone(executives, execName) {
  const found = executives.find((e) => e.name === execName);
  return found?.phone || "";
}

/** Sanitizes a 10-digit Indian mobile number and returns "91<digits>" or "" */
function normalizeINPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

/** Builds the exact bilingual message text */
function buildWelcomeMsg(vals, totals) {
  const fmtDate =
    vals?.expectedDelivery ? dayjs(vals.expectedDelivery).format("DD/MM/YYYY") : "—";
  const execPhone = getExecPhone(EXECUTIVES, vals?.executive);
  const branch = vals?.branch || "—";
  const name = vals?.custName || "Customer";
  const jc = vals?.jcNo || "—";
  const reg = vals?.regNo || "—";
  const estimate = inr(totals?.grand ?? 0);

  return (
    `Hi ${name}!\n` +
    `✅ Your service is booked at Shantha Motors.\n\n` +
    `Welcome to *Shantha Motors*,\n` +
    `ಶಾಂತ ಮೋಟರ್ಸ್‌ಗೆ ಸ್ವಾಗತ.\n\n` +
    `🧾 Job Card No: ${jc}\n` + `🏍️ ${reg}\n` +
    `📅 Delivery: ${fmtDate}\n` +
    `💰 ಅಂದಾಜು ವೆಚ್ಚ / Estimated Amount: ${estimate}\n\n` +
    `ಯಾವುದೇ ಸಹಾಯ ಬೇಕಾದರೆ ಇಲ್ಲಿ ಸಂಪರ್ಕಿಸಿ.\n` +
    `— ${vals?.executive || "Team"}, ${branch}${execPhone ? ` (☎️ ${execPhone})` : ""}`
  );
}

/**
 * Try opening WhatsApp. If it doesn't open (blocked / not installed),
 * fall back to SMS composer gracefully.
 */
function openWhatsAppOrSMS({ mobileE164, text, onFailToWhatsApp }) {
  const waUrl = `https://wa.me/${mobileE164}?text=${encodeURIComponent(text)}`;

  // Open WhatsApp in a new tab/window first (best for iPhone Safari)
  const w = window.open(waUrl, "_blank", "noopener,noreferrer");

  // If the popup was blocked, we immediately fall back to SMS.
  const blocked = !w || w.closed || typeof w.closed === "undefined";
  if (blocked) {
    onFailToWhatsApp?.();
    // iOS uses &body= ; most Android clients also accept ?body=
    const smsUrl = `sms:+${mobileE164}?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    return;
  }

  // If opened, add a short timer—if user closes quickly or WA not installed,
  // we still offer SMS after ~1s (best-effort).
  setTimeout(() => {
    try {
      if (w.closed) return; // user is in WhatsApp/kept tab open → good
      // If still open after a second, assume WA didn’t take over → offer SMS.
      onFailToWhatsApp?.();
      w.close();
      const smsUrl = `sms:+${mobileE164}?body=${encodeURIComponent(text)}`;
      window.location.href = smsUrl;
    } catch {
      // Ignore cross-origin checks and still try SMS
      onFailToWhatsApp?.();
      const smsUrl = `sms:+${mobileE164}?body=${encodeURIComponent(text)}`;
      window.location.href = smsUrl;
    }
  }, 1000);
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
 // ✅ refs for safe printing
  const preRef = useRef(null);
  const postRef = useRef(null);

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
// ✅ fixed
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

  // replace your existing handleServiceCheckbox with this:
const handleServiceCheckbox = (checkedValues) => {
  let next = null;

  if (checkedValues.length === 0) {
    next = null;
  } else if (checkedValues.length === 1) {
    next = checkedValues[0];
  } else {
    // two selected temporarily; pick the one that wasn't previously selected
    next = checkedValues.find(v => v !== serviceTypeLocal) || checkedValues[0];
  }

  setServiceTypeLocal(next || null);
  form.setFieldsValue({ serviceType: next || undefined });

  if (next) {
    const defaultVehicle = "Motorcycle";
    setVehicleTypeLocal(defaultVehicle);
    form.setFieldsValue({
      vehicleType: defaultVehicle,
      floorMat: undefined,
      labourRows: buildRows(next, defaultVehicle),
      gstLabour: DEFAULT_GST_LABOUR,
      discounts: { labour: 0 },
    });
    message.success(`Applied preset: ${next} / ${defaultVehicle}`);
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

   // ✅ PRINT handling with safe pipeline
  const handlePrint = async (which) => {
    if (which === "pre") {
      await handleSmartPrint(preRef.current);
    } else if (which === "post") {
      await handleSmartPrint(postRef.current);
    }
  };


  // SAVE handling → open Google Form with prefilled values (user-visible)
  // const handleSave = async () => {
  //   try {
  //     await form.validateFields([
  //       "custName",
  //       "custMobile",
  //       "branch",
  //       "mechanic",
  //     ]);
  //     const vals = form.getFieldsValue(true);
  //     const url = buildPrefillUrl(vals, totals.grand);
  //     window.open(url, "_blank", "noopener");
  //     message.success("Opened Google Form with pre-filled data.");
  //   } catch {
  //     message.error("Please complete required fields before saving.");
  //   }
  // };

  // AUTO-SAVE handling → silent submit to Google Form (sheet gets the row)
  const handleAutoSave = async () => {
    try {
      await form.validateFields([
        "custName",
        "custMobile",
        "branch",
        "mechanic",
      ]);
      const vals = form.getFieldsValue(true);
      const amt = Number.isFinite(totals.grand) ? Math.round(totals.grand) : 0;

      // Map app values to Google entry fields
      const entries = {
        [GFORM_ENTRY.name]: vals.custName || "",
        [GFORM_ENTRY.mobile]: String(vals.custMobile || ""),
        [GFORM_ENTRY.branch]: vals.branch || "",
        [GFORM_ENTRY.mechanic]: vals.mechanic || "",
        [GFORM_ENTRY.amount]: String(amt),
      };

      autoSubmitToGoogle(entries);
      message.loading({ content: "Auto-saving to Google Sheet…", key: "autosave" });
      setTimeout(() => {
        message.success({ content: "Saved to Google Sheet via Google Form.", key: "autosave", duration: 2 });
      }, 1200);
    } catch {
      message.error("Please complete required fields before auto-saving.");
    }
  };

  // Pull everything we need for printing
  const vals = form.getFieldsValue(true);

  // Build "observation" list = labour descriptions + typed notes (no prices)
  const observationLines = [
    ...labourRows.map((r) => r.desc),
    ...(vals?.obs ? vals.obs.split("\n").map((s) => s.trim()).filter(Boolean) : []),
  ];

  // WhatsApp share handler
const handleShareWhatsApp = async () => {
  try {
    // Validate minimum fields we reference in the message
    await form.validateFields(["custName", "custMobile", "branch"]);

    const valsNow = form.getFieldsValue(true);
    const mobileE164 = normalizeINPhone(valsNow.custMobile);

    if (!mobileE164) {
      message.error("Enter a valid 10-digit mobile number (India).");
      return;
    }

    const msg = buildWelcomeMsg(valsNow, totals);

    message.loading({ key: "share", content: "Preparing WhatsApp message…" });

    openWhatsAppOrSMS({
      mobileE164,
      text: msg,
      onFailToWhatsApp: () => {
        message.info({
          key: "share",
          content:
            "WhatsApp may not be available. Falling back to SMS composer…",
          duration: 2,
        });
      },
    });

    // Slight delay to swap toast
    setTimeout(() => {
      message.success({ key: "share", content: "Ready to send.", duration: 2 });
    }, 800);
  } catch {
    message.error("Please complete required fields (Name, Mobile, Branch).");
  }
};


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

              <Col xs={24} sm={10}>
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
              <Col xs={24} sm={4}>
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

              <Col xs={24} sm={4}>
                <Form.Item label="Model" name="model" rules={[{ required: true }]}>
                  <Input placeholder="e.g., Honda Activa 6G" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={4}>
                <Form.Item label="Colour" name="colour">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} sm={4}>
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
                            labourRows: buildRows(serviceTypeLocal, val),
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

          {/* ACTION BUTTONS */}
          <Row justify="end" style={{ marginTop: 12 }} gutter={8}>
            <Col>
              <Button onClick={handleAutoSave}>
                Save
              </Button>
            </Col>
            {/* <Col>
              <Button onClick={handleSave}>
                Save (Open Google Form)
              </Button>
            </Col> */}

<Col>
  <Button
    type="default"
    icon={<FaWhatsapp style={{ color: "#25D366" }} />}
    onClick={handleShareWhatsApp}
  >
    WhatsApp/SMS
  </Button>
</Col>


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

       {/* ✅ PRINT SHEETS with refs */}
      <PreServiceSheet
        ref={preRef}
        active
        vals={vals}
        labourRows={labourRows}
        totals={totals}
        observationLines={observationLines}
        executives={EXECUTIVES}
      />

      <PostServiceSheet
        ref={postRef}
        active
        vals={vals}
        totals={totals}
      />
    </div>
  );
}
