import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  // ---- simple responsive hook (copied from Home) ----
  const useScreen = () => {
    const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1280);
    React.useEffect(() => {
      const onResize = () => setW(window.innerWidth);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    const isMobile = w <= 480;
    const isTablet = w > 480 && w <= 1024;
    const isDesktop = w > 1024;
    return { w, isMobile, isTablet, isDesktop };
  };

  const { isMobile } = useScreen();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  const styles = {
    topbar: {
      background: "#f6f6f6",
      color: "#333",
      fontSize: 14,
      padding: "6px 16px",
    },
    container: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: `0 ${isMobile ? 12 : 16}px`,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 0",
      position: "relative",
    },
    logoWrap: { display: "flex", alignItems: "center", gap: 12 },
    logoImg: { height: isMobile ? 40 : 48, width: "auto", objectFit: "contain" },
    tagline: { fontSize: 12, color: "#666" },
    nav: {
      display: isMobile ? "none" : "flex",
      gap: 18,
      flexWrap: "wrap",
      alignItems: "center",
    },
    navLink: (active) => ({
      textDecoration: "none",
      color: active ? "#e11d48" : "#222",
      fontWeight: active ? 700 : 500,
    }),
    burger: {
      display: isMobile ? "flex" : "none",
      height: 36,
      width: 44,
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid #ddd",
      borderRadius: 8,
      background: "#fff",
      cursor: "pointer",
    },
    drawer: {
      position: "absolute",
      top: "64px",
      right: 0,
      background: "#fff",
      border: "1px solid #eee",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
      display: menuOpen ? "block" : "none",
      zIndex: 50,
      minWidth: 220,
    },
    drawerLink: (active) => ({
      display: "block",
      padding: "10px 12px",
      textDecoration: "none",
      color: active ? "#e11d48" : "#222",
      fontWeight: 600,
      borderRadius: 8,
    }),
    small: { fontSize: 12, color: "#777" },
    phoneRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
  };

  // map labels to your actual paths (so no 404s)
  const navItems = [
    { label: "Home", path: "/" },
    { label: "Quotation", path: "/quotation" },
    { label: "JobCard", path: "/jobcard" },             // add this route if/when you have it
    { label: "BookingForm", path: "/bookingform" },
    { label: "EMICalculator", path: "/emicalculator" }, // matches your route
    { label: "Contact", path: "/contact" },
    { label: "Login", path: "/login" },
       { label: "About Us", path: "/about-us" },
     { label: "A4Form", path: "/a4form" },
    { label: "About Us", path: "/about-us" },
     { label: "A4Form", path: "/a4form" },
  ];

  return (
    <>
      {/* Topbar (same design) */}
      <div style={styles.topbar}>
        <div style={styles.container}>
          <div style={styles.phoneRow}>
            <div>
              Sales : <strong>9731366921/ 8073283502</strong>
            </div>
            <div style={styles.small}>
              Open 9:00 AM – 8:30 PM • Mon–Sat <span>Opens 9:00 AM – 2:30 PM • Sunday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header / Navbar */}
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logoWrap}>
            <img
              src="/shantha-logo.png"
              alt="Shantha Motors Logo"
              style={styles.logoImg}
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/200x48?text=Shantha+Motors";
              }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Shantha Motors</div>
              <div style={styles.tagline}>The Power of Trust</div>
            </div>
          </div>

          {/* Desktop/Tablet nav */}
          <nav style={styles.nav} aria-label="Primary">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} style={styles.navLink(active)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile burger */}
          <button
            aria-label="Toggle menu"
            style={styles.burger}
            onClick={() => setMenuOpen((s) => !s)}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ height: 2, width: 18, background: "#333", display: "block" }} />
              <span style={{ height: 2, width: 18, background: "#333", display: "block" }} />
              <span style={{ height: 2, width: 18, background: "#333", display: "block" }} />
            </div>
          </button>

          {/* Mobile drawer */}
          <div style={styles.drawer}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={styles.drawerLink(active)}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>
      </div>
    </>
  );
}
