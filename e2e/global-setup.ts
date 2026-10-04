import { execSync } from "node:child_process";

/** Start every run from the same demo data (also clears complaints, messages, audit log, rate limits). */
export default function globalSetup() {
  execSync("npm run db:seed -- --fresh", { stdio: "inherit" });
}
