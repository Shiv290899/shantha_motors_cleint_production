import dayjs from "dayjs";

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Math.max(0, Math.round(Number(n || 0))));

export const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "");

export const tick = (cond) => (cond ? "☑" : "☐");
