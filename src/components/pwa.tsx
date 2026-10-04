"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Registers the service worker (production only, so dev hot-reload isn't affected). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* offline support is a bonus; ignore registration failures */
    });
  }, []);
  return null;
}

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Shows an "Install app" button when the browser says the app is installable. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evt) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await evt.prompt();
        await evt.userChoice;
        setEvt(null);
      }}
    >
      <Download aria-hidden /> Install app
    </Button>
  );
}

export const LAST_BILL_KEY = "voltpay:last-bill";

export type BillSnapshot = {
  meterNumber: string;
  billNumber: string;
  amountPaise: number;
  dueDate: string;
};

/**
 * Remembers the most urgent bill on this device so /offline.html can show it without a network.
 * Only amount, due date and meter number are stored; it's cleared on sign-out.
 */
export function OfflineBillSnapshot({ bill }: { bill: BillSnapshot | null }) {
  useEffect(() => {
    try {
      if (bill) {
        localStorage.setItem(
          LAST_BILL_KEY,
          JSON.stringify({ ...bill, savedAt: new Date().toISOString() }),
        );
      } else {
        localStorage.removeItem(LAST_BILL_KEY);
      }
    } catch {
      /* storage can be unavailable (private mode) */
    }
  }, [bill]);
  return null;
}
