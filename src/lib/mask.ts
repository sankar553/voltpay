/** "Rajesh Kumar Reddy" → "R***** K**** R****" — shown to anyone who isn't linked to the meter. */
export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0) + "*".repeat(Math.max(w.length - 1, 3)))
    .join(" ");
}
