// ViewSheet.jsx — read-only sheet viewer with date-only filter, search, Excel export,
// column chooser, density toggle, saved views, row highlighting, and diff-aware refresh.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Space,
  DatePicker,
  Tooltip,
  Input,
  Dropdown,
  Checkbox,
  Segmented,
  Badge,
  Popconfirm,
  Select,
} from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as XLSX from "xlsx";

dayjs.extend(customParseFormat);

const { RangePicker } = DatePicker;

// Formats we try to parse your date column
const DATE_FORMATS = [
  "M/D/YYYY H:mm:ss",
  "D/M/YYYY H:mm:ss",
  "YYYY-MM-DD HH:mm:ss",
  "M/D/YYYY",
  "D/M/YYYY",
  "YYYY-MM-DD",
];

// Fallback date-like headers (case-insensitive)
const DEFAULT_DATE_KEYS = [
  "timestamp",
  "date",
  "created_at",
  "quotation_date",
  "job_date",
  "pickup_date",
  "shop_date",
];

// Amount-like headers for highlighting (case-insensitive)
const DEFAULT_AMOUNT_KEYS = [
  "amount",
  "price",
  "on_road_price",
  "onroadprice",
  "total",
  "grand_total",
  "estimate_total",
];

// LocalStorage key helper (namespaced by sheet URL)
const keyFor = (url, suffix) => `ViewSheet:${url}:${suffix}`;

/**
 * Props:
 * - sheetCsvUrl: string
 * - parseCSV: (text) => { headers: string[], rows: object[] }
 * - buttonText?: string
 * - buttonProps?: object
 * - dateColumn?: string         // e.g. "Timestamp"
 * - amountColumn?: string       // e.g. "On Road Price" (for row highlight rule)
 * - highlightThreshold?: number // default 100000 (₹1L)
 * - presetsConfig?: (today: dayjs.Dayjs) => Array<{label:string, range:[dayjs, dayjs]}> // optional
 * - initialPreset?: string      // e.g., "Last 7 days" (auto-apply on open if no URL/saved view)
 */
export default function ViewSheet({
  sheetCsvUrl,
  parseCSV,
  buttonText = "View Sheet",
  buttonProps = {},
  dateColumn,
  amountColumn,
  highlightThreshold = 100000,
  presetsConfig,
  initialPreset = "Last 7 days",
}) {
  // Modal visibility
  const [open, setOpen] = useState(false);

  // Data + loading
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  // Filters/UI state
  const [range, setRange] = useState(null); // [startDayjs, endDayjs]
  const [searchText, setSearchText] = useState("");

  // Column chooser + density
  const [visibleCols, setVisibleCols] = useState([]); // header names to show
  const [density, setDensity] = useState("compact"); // 'compact' | 'cozy'

  // Diff-aware refresh badge
  const [newCount, setNewCount] = useState(0);

  // Saved views
  const [views, setViews] = useState([]); // [{name, data}]
  const [viewName, setViewName] = useState("");
  const [selectedView, setSelectedView] = useState(null);

  // Detect date column
  const detectedDateKey = useMemo(() => {
    if (dateColumn && headers.includes(dateColumn)) return dateColumn;
    const lower = headers.map((h) => h.toLowerCase());
    for (const k of DEFAULT_DATE_KEYS) {
      const i = lower.indexOf(k);
      if (i >= 0) return headers[i];
    }
    return null;
  }, [headers, dateColumn]);

  // Detect amount column for highlighting
  const detectedAmountKey = useMemo(() => {
    if (amountColumn && headers.includes(amountColumn)) return amountColumn;
    const lower = headers.map((h) => h.toLowerCase());
    for (const k of DEFAULT_AMOUNT_KEYS) {
      const i = lower.indexOf(k);
      if (i >= 0) return headers[i];
    }
    return null;
  }, [headers, amountColumn]);

  // Parse row date (memoized)
  const parseRowDate = useCallback(
    (r) => {
      if (!detectedDateKey) return null;
      const raw = r[detectedDateKey];
      if (!raw) return null;
      for (const fmt of DATE_FORMATS) {
        const d = dayjs(raw, fmt, true);
        if (d.isValid()) return d;
      }
      const d = dayjs(raw); // loose fallback
      return d.isValid() ? d : null;
    },
    [detectedDateKey]
  );

  const numericValue = (val) => {
    if (val === null || val === undefined) return NaN;
    const s = String(val).replace(/[₹, ]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const computeMaxDate = useCallback(
    (data) => {
      let max = null;
      for (const r of data) {
        const d = parseRowDate(r);
        if (d && (max === null || d.isAfter(max))) max = d;
      }
      return max;
    },
    [parseRowDate]
  );

  // Presets (configurable)
  const today = dayjs();
  const defaultPresets = useCallback(
    () => [
      { label: "Today", range: [today.startOf("day"), today.endOf("day")] },
      {
        label: "Yesterday",
        range: [today.add(-1, "day").startOf("day"), today.add(-1, "day").endOf("day")],
      },
      { label: "Last 7 days", range: [today.add(-6, "day").startOf("day"), today.endOf("day")] },
      { label: "This Month", range: [today.startOf("month"), today.endOf("month")] },
    ],
    [today]
  );

  const presets = useMemo(
    () => (typeof presetsConfig === "function" ? presetsConfig(today) : defaultPresets()),
    [presetsConfig, today, defaultPresets]
  );

  // Seed from localStorage on open (views, visible cols, density) + URL (?from/to)
  useEffect(() => {
    if (!open) return;

    const rawViews = localStorage.getItem(keyFor(sheetCsvUrl, "views"));
    if (rawViews) {
      try {
        setViews(JSON.parse(rawViews));
      } catch {
        /* ignore */
      }
    }

    const rawCols = localStorage.getItem(keyFor(sheetCsvUrl, "visibleCols"));
    if (rawCols) {
      try {
        setVisibleCols(JSON.parse(rawCols));
      } catch {
        /* ignore */
      }
    }

    const rawDen = localStorage.getItem(keyFor(sheetCsvUrl, "density"));
    if (rawDen) setDensity(rawDen);

    // URL query → range
    const usp = new URLSearchParams(window.location.search);
    const from = usp.get("from");
    const to = usp.get("to");
    const start = from ? dayjs(from, "YYYY-MM-DD", true) : null;
    const end = to ? dayjs(to, "YYYY-MM-DD", true) : null;
    if ((start && start.isValid()) || (end && end.isValid())) {
      setRange([start && start.isValid() ? start : null, end && end.isValid() ? end : null]);
      return; // URL wins
    }

    // If a saved view applied earlier, it already set the range
    if (range && (range[0] || range[1])) return;

    // Auto-apply default preset (stored or prop)
    const stored = localStorage.getItem(keyFor(sheetCsvUrl, "defaultPreset"));
    const wanted = stored || initialPreset;
    const match = presets.find((p) => p.label === wanted);
    if (match) setRange([match.range[0], match.range[1]]);
  }, [open, sheetCsvUrl, presets, initialPreset, range]);

  // Fetch CSV (no-cache)
  const fetchCsv = async () => {
    setLoading(true);
    try {
      const res = await fetch(sheetCsvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to download sheet CSV");
      const csv = await res.text();
      const parsed = parseCSV(csv);
      const hdrs = parsed.headers || [];
      const data = parsed.rows || [];

      setHeaders(hdrs);
      setRows(data);

      // Init visible columns on first load
      if (!visibleCols?.length) {
        setVisibleCols(hdrs);
        localStorage.setItem(keyFor(sheetCsvUrl, "visibleCols"), JSON.stringify(hdrs));
      }

      // Diff-aware: compare against baseline max date
      const baselineStr = localStorage.getItem(keyFor(sheetCsvUrl, "baselineMaxDate"));
      const baseline = baselineStr ? dayjs(baselineStr) : null;
      const maxDate = computeMaxDate(data);

      if (baseline && baseline.isValid() && maxDate) {
        let count = 0;
        for (const r of data) {
          const d = parseRowDate(r);
          if (d && d.isAfter(baseline)) count++;
        }
        setNewCount(count);
      } else {
        setNewCount(0);
      }
    } catch (e) {
      console.error(e);
      message.error(e.message || "Unable to load sheet");
    } finally {
      setLoading(false);
    }
  };

  // Mark current as seen → sets baseline to current max date
  const _markAsSeen = () => {
    const maxDate = computeMaxDate(rows);
    if (maxDate) {
      localStorage.setItem(keyFor(sheetCsvUrl, "baselineMaxDate"), maxDate.toISOString());
      setNewCount(0);
      message.success("Marked current data as seen");
    } else {
      message.info("No timestamp found to mark as seen");
    }
  };

  // Build columns (apply visible set + date sorter)
  const allColumns = useMemo(() => {
    return (headers || []).map((h) => ({
      title: h,
      dataIndex: h,
      key: h,
      ellipsis: true,
      ...(h === detectedDateKey
        ? {
            sorter: (a, b) => {
              const da = parseRowDate(a);
              const db = parseRowDate(b);
              if (!da && !db) return 0;
              if (!da) return -1;
              if (!db) return 1;
              return da.valueOf() - db.valueOf();
            },
            defaultSortOrder: "descend",
          }
        : {}),
    }));
  }, [headers, detectedDateKey, parseRowDate]);

  const columns = useMemo(
    () => allColumns.filter((c) => visibleCols.includes(c.key)),
    [allColumns, visibleCols]
  );

  // 1) DATE-ONLY filter
  const dateFiltered = useMemo(() => {
    if (!detectedDateKey) return rows;
    if (!range || (!range[0] && !range[1])) return rows;
    const [start, end] = range;
    const startDay = start ? start.startOf("day") : null;
    const endDay = end ? end.endOf("day") : null;
    return rows.filter((r) => {
      const d = parseRowDate(r);
      if (!d) return false;
      const okStart = startDay ? !d.isBefore(startDay) : true;
      const okEnd = endDay ? !d.isAfter(endDay) : true;
      return okStart && okEnd;
    });
  }, [rows, range, detectedDateKey, parseRowDate]);

  // 2) TEXT search
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return dateFiltered;
    return dateFiltered.filter((r) =>
      headers.some((h) => String(r[h] ?? "").toLowerCase().includes(q))
    );
  }, [dateFiltered, searchText, headers]);

  // Row highlighting rule
  const rowClassName = (record) => {
    if (!detectedAmountKey) return "";
    const val = numericValue(record[detectedAmountKey]);
    if (!Number.isFinite(val)) return "";
    return val > highlightThreshold ? "vs-row-highlight" : "";
  };

  // URL sync (?from=YYYY-MM-DD&to=YYYY-MM-DD)
  const _syncUrl = () => {
    const usp = new URLSearchParams(window.location.search);
    if (range && (range[0] || range[1])) {
      if (range[0] && range[0].isValid()) usp.set("from", range[0].format("YYYY-MM-DD"));
      else usp.delete("from");
      if (range[1] && range[1].isValid()) usp.set("to", range[1].format("YYYY-MM-DD"));
      else usp.delete("to");
    } else {
      usp.delete("from");
      usp.delete("to");
    }
    const url = `${window.location.pathname}?${usp.toString()}${window.location.hash || ""}`;
    window.history.replaceState(null, "", url);
    message.success("Sharable link updated for current date filter");
  };

  // Excel export (filtered)
  const exportExcel = () => {
    if (!headers.length) return message.warning("No data to export");
    const ordered = filteredRows.map((r) => {
      const o = {};
      headers.forEach((h) => (o[h] = r[h]));
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(ordered, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet");
    const nameBits = [];
    if (range?.[0]?.isValid()) nameBits.push(range[0].format("YYYYMMDD"));
    if (range?.[1]?.isValid()) nameBits.push(range[1].format("YYYYMMDD"));
    const suffix = nameBits.length ? `_${nameBits.join("-")}` : "";
    XLSX.writeFile(wb, `sheet_export${suffix}.xlsx`);
  };

  // Column chooser menu
  const columnMenu = {
    items: [
      {
        key: "columns",
        label: (
          <div style={{ padding: 8, maxHeight: 260, overflow: "auto" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Columns</div>
            <Checkbox.Group
              value={visibleCols}
              onChange={(vals) => {
                setVisibleCols(vals);
                localStorage.setItem(
                  keyFor(sheetCsvUrl, "visibleCols"),
                  JSON.stringify(vals)
                );
              }}
            >
              <Space direction="vertical">
                {headers.map((h) => (
                  <Checkbox key={h} value={h}>
                    {h}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        ),
      },
    ],
  };

  // Saved views
  const _saveCurrentView = () => {
    const name = (viewName || "").trim();
    if (!name) return message.warning("Enter a view name");
    const data = {
      rangeFrom: range?.[0]?.isValid() ? range[0].format("YYYY-MM-DD") : null,
      rangeTo: range?.[1]?.isValid() ? range[1].format("YYYY-MM-DD") : null,
      searchText,
      visibleCols,
      density,
      dateKey: detectedDateKey || null,
    };
    const next = [...views.filter((v) => v.name !== name), { name, data }];
    setViews(next);
    localStorage.setItem(keyFor(sheetCsvUrl, "views"), JSON.stringify(next));
    message.success(`Saved view "${name}"`);
    setViewName("");
  };

  const _applyView = (name) => {
    const v = views.find((x) => x.name === name);
    if (!v) return;
    setSelectedView(name);
    const d = v.data;
    const start = d.rangeFrom ? dayjs(d.rangeFrom, "YYYY-MM-DD", true) : null;
    const end = d.rangeTo ? dayjs(d.rangeTo, "YYYY-MM-DD", true) : null;
    setRange([start && start.isValid() ? start : null, end && end.isValid() ? end : null]);
    setSearchText(d.searchText || "");
    if (Array.isArray(d.visibleCols) && d.visibleCols.length) {
      setVisibleCols(d.visibleCols);
      localStorage.setItem(keyFor(sheetCsvUrl, "visibleCols"), JSON.stringify(d.visibleCols));
    }
    if (d.density) {
      setDensity(d.density);
      localStorage.setItem(keyFor(sheetCsvUrl, "density"), d.density);
    }
    message.success(`Applied view "${name}"`);
  };

  const _deleteView = (name) => {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    localStorage.setItem(keyFor(sheetCsvUrl, "views"), JSON.stringify(next));
    if (selectedView === name) setSelectedView(null);
    message.success(`Deleted view "${name}"`);
  };

  // Modal title with top-right search
  const modalTitle = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontWeight: 600 }}>Sheet (read-only)</span>
      <div style={{ marginLeft: "auto", width: 360 }}>
        <Input.Search
          placeholder="Search name / mobile / model / remarks…"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(v) => setSearchText(v)}
        />
      </div>
    </div>
  );

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          setOpen(true);
          fetchCsv();
        }}
        {...buttonProps}
      >
        {buttonText}
      </Button>

      <Modal
        title={modalTitle}
        open={open}
        width="90%"
        onCancel={() => setOpen(false)}
        footer={[
  // Left section: filters & tools
  <Space key="left" style={{ marginRight: "auto", flexWrap: "wrap" }}>
    {/* Date range */}
    <Tooltip
      title={
        detectedDateKey
          ? `Filtering by date column: ${detectedDateKey}`
          : `No date column detected. Pass 'dateColumn' prop (e.g., "Timestamp").`
      }
    >
      <RangePicker
        allowClear
        value={range}
        onChange={(val) => setRange(val)}
        disabled={!detectedDateKey}
        format="YYYY-MM-DD"
      />
    </Tooltip>

    {/* Presets */}
    <Space size="small">
      {presets.map((p) => (
        <Button
          key={p.label}
          onClick={() => setRange([p.range[0], p.range[1]])}
          disabled={!detectedDateKey}
        >
          {p.label}
        </Button>
      ))}
    </Space>

    {/* <Button onClick={() => setRange(null)}>Clear</Button> */}
    {/* <Button onClick={syncUrl}>Share link</Button> */}

    {/* Excel export */}
    <Button onClick={exportExcel}>Download Excel (.xlsx)</Button>

    {/* Column chooser */}
    <Dropdown menu={columnMenu} trigger={["click"]}>
      <Button>Columns</Button>
    </Dropdown>

    {/* <Segmented
      value={density}
      onChange={(val) => {
        setDensity(val);
        localStorage.setItem(keyFor(sheetCsvUrl, "density"), String(val));
      }}
      options={[
        { label: "Cozy", value: "cozy" },
        { label: "Compact", value: "compact" },
      ]}
    /> */}

    {/* Saved views: selector + save + delete */}
    {/* <Space size="small" wrap>
      <Select
        placeholder="Load view…"
        style={{ width: 160 }}
        value={selectedView || undefined}
        onChange={(v) => applyView(v)}
        allowClear
        options={views.map((v) => ({ label: v.name, value: v.name }))}
      />
      <Input
        placeholder="New view name"
        value={viewName}
        onChange={(e) => setViewName(e.target.value)}
        style={{ width: 160 }}
      />
      <Button onClick={saveCurrentView}>Save view</Button>
      <Popconfirm
        title="Delete selected view?"
        okText="Delete"
        onConfirm={() => selectedView && deleteView(selectedView)}
        disabled={!selectedView}
      >
        <Button danger disabled={!selectedView}>
          Delete view
        </Button>
      </Popconfirm>

      <Select
        placeholder="Default preset…"
        style={{ width: 160 }}
        value={localStorage.getItem(keyFor(sheetCsvUrl, "defaultPreset")) || undefined}
        options={presets.map((p) => ({ label: p.label, value: p.label }))}
        allowClear
        onChange={(val) => {
          if (val) localStorage.setItem(keyFor(sheetCsvUrl, "defaultPreset"), val);
          else localStorage.removeItem(keyFor(sheetCsvUrl, "defaultPreset"));
          message.success(val ? `Default preset set to "${val}"` : "Default preset cleared");
        }}
      />
    </Space> */}
  </Space>,

  // Right section: refresh + close
  <Space key="right">
    <Badge
      count={newCount > 0 ? `+${newCount}` : 0}
      color="green"
      offset={[-6, 6]}
      style={{ boxShadow: "0 0 0 1px #fff inset" }}
    >
      <Button onClick={fetchCsv} loading={loading}>
        Refresh
      </Button>
    </Badge>

    {/* <Button onClick={markAsSeen}>Mark as seen</Button> */}

    <Button onClick={() => setOpen(false)}>Close</Button>
  </Space>,
]}

      >
        {/* highlight style */}
        <style>
          {`
            .vs-row-highlight td {
              background: #fff7e6 !important;
            }
          `}
        </style>

        <Table
          rowKey={(_, i) => String(i)}
          dataSource={filteredRows}
          columns={columns}
          loading={loading}
          scroll={{ x: true, y: 480 }}
          size={density === "compact" ? "small" : "middle"}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          rowClassName={rowClassName}
        />
      </Modal>
    </>
  );
}
