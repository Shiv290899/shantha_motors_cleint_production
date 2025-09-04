// utils/printUtils.js
import dayjs from "dayjs";

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Math.max(0, Math.round(Number(n || 0))));

export const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "");

export const tick = (cond) => (cond ? "☑" : "☐");

// Converts a number to Indian currency words, e.g. 12345 -> "Twelve Thousand Three Hundred Forty Five Rupees Only"
export const amountInWords = (numInput) => {
  const n = Math.max(0, Math.floor(Number(numInput || 0)));
  if (n === 0) return "Zero Rupees Only";

  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

  const two = (num) => (num < 20 ? ones[num] : tens[Math.floor(num/10)] + (num%10 ? " " + ones[num%10] : ""));
  const three = (num) => {
    const hundred = Math.floor(num/100);
    const rest = num % 100;
    return (hundred ? ones[hundred] + " Hundred" + (rest ? " " : "") : "") + (rest ? two(rest) : "");
  };

  let out = "";
  const crore = Math.floor(n / 10000000);    // 1,00,00,000
  const lakh  = Math.floor((n / 100000) % 100);
  const thousand = Math.floor((n / 1000) % 100);
  const hundred  = n % 1000;

  if (crore) out += three(crore) + " Crore ";
  if (lakh) out += two(lakh) + " Lakh ";
  if (thousand) out += two(thousand) + " Thousand ";
  if (hundred) out += three(hundred);

  return (out.trim() + " Rupees Only").replace(/\s+/g, " ");
};
