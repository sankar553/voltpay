import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return ["/", "/scan", "/contact", "/login", "/signup"].map((p) => ({ url: base + p }));
}
