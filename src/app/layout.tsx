import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VoltPay — Scan. Pay. Done.", template: "%s · VoltPay" },
  description:
    "Pay your electricity bill by scanning the QR code on your meter. Secure payments, instant receipts, usage insights.",
  applicationName: "VoltPay",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          VoltPay prototype · simulated billing data · payments in test mode
        </footer>
      </body>
    </html>
  );
}
