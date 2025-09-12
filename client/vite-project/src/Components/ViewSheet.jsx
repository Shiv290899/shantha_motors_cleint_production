// ViewSheet.jsx (read-only)
import React, {  useMemo, useState } from "react";
import { Button, Modal, Table, message } from "antd";

/**
 * Props:
 *  - sheetCsvUrl: string  (published CSV link)
 *  - parseCSV:    (text:string) => { headers: string[], rows: object[] }
 *  - buttonText?: string
 *  - buttonProps?: AntD Button props
 */
export default function ViewSheet({ sheetCsvUrl, parseCSV, buttonText = "View Sheet", buttonProps = {} }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  const fetchCsv = async () => {
    setLoading(true);
    try {
      const res = await fetch(sheetCsvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to download sheet CSV");
      const csv = await res.text();
      const parsed = parseCSV(csv);
      setHeaders(parsed.headers || []);
      setRows(parsed.rows || []);
    } catch (e) {
      console.error(e);
      message.error(e.message || "Unable to load sheet");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () =>
      (headers || []).map((h) => ({
        title: h,
        dataIndex: h,
        key: h,
        ellipsis: true,
      })),
    [headers]
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
        title="Sheet (read-only)"
        open={open}
        width="90%"
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="refresh" onClick={fetchCsv} loading={loading}>Refresh</Button>,
          <Button key="close" onClick={() => setOpen(false)}>Close</Button>,
        ]}
      >
        <Table
          rowKey={(_, i) => String(i)}
          dataSource={rows}
          columns={columns}
          loading={loading}
          scroll={{ x: true, y: 480 }}
          size="small"
        />
      </Modal>
    </>
  );
}
