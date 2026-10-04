const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** Format integer paise as ₹1,234.50. */
export function formatINR(paise: number): string {
  return inr.format(paise / 100);
}

/** "2026-10-15" → "15 Oct 2026" (date-only strings are treated as calendar dates, not UTC instants). */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
