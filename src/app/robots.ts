import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/** Public marketing pages may be indexed; accounts, admin, receipts and meter pages may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact"],
        disallow: [
          "/admin",
          "/api",
          "/dashboard",
          "/meters",
          "/m/",
          "/receipts",
          "/payments",
          "/complaints",
          "/profile",
        ],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
