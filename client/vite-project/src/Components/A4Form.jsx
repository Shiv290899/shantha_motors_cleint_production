// A4FormIFrame.jsx
import React, { useRef } from "react";

export default function A4Form() {
  const iframeRef = useRef(null);

  const printInsideIFrame = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // Ensure the HTML's layout is ready before printing
    win.focus();
    win.print();
  };

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr", gap: 8, padding: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <a href="/a4-form-print.html" target="_blank" rel="noreferrer">
          <button>Open full page</button>
        </a>
        <button onClick={printInsideIFrame}>Print (iframe)</button>
      </div>

      <iframe
        ref={iframeRef}
        src="/a4-form-print.html"
        title="A4 HTML"
        style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
      />
    </div>
  );
}
