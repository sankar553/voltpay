import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoltPay — Scan. Pay. Done.",
    short_name: "VoltPay",
    description: "Pay your electricity bill by scanning the QR code on your meter.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d4fd7",
    categories: ["finance", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Scan a meter",
        short_name: "Scan",
        url: "/scan",
        description: "Scan a meter QR code",
      },
      { name: "My bills", short_name: "Bills", url: "/dashboard" },
    ],
  };
}
