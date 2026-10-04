"use client";

import { Camera, CameraOff, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { lookupByConsumerNumber } from "@/app/actions/scan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };

/** Accept only VoltPay meter links: right path shape, and our own host. */
function toMeterPath(text: string, allowedHosts: string[]): string | null {
  try {
    const url = new URL(text);
    const hostOk = [window.location.host, ...allowedHosts].includes(url.host);
    return hostOk && /^\/m\/[\w-]+\.[\w-]+$/.test(url.pathname) ? url.pathname : null;
  } catch {
    return null;
  }
}

export function QrScanner({ appHost }: { appHost: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [consumerNo, setConsumerNo] = useState("");
  const [pending, startTransition] = useTransition();
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    setMessage(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Camera needs HTTPS (or localhost). Use the consumer number below instead.");
      return;
    }
    setStatus("starting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch {
      setStatus("error");
      setMessage("Camera permission was denied. You can enter the consumer number below.");
      return;
    }

    const video = videoRef.current!;
    video.srcObject = stream;
    await video.play();
    setStatus("scanning");

    // Native detector where available (fast); otherwise zxing-wasm.
    const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector })
      .BarcodeDetector;
    const native = BD ? new BD({ formats: ["qr_code"] }) : null;
    const zx = native ? null : await import("zxing-wasm/reader");
    zx?.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? "/zxing/zxing_reader.wasm" : prefix + path,
      },
      fireImmediately: true,
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let stopped = false;
    const stop = () => {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
    };
    stopRef.current = stop;

    const tick = async () => {
      if (stopped) return;
      try {
        let text: string | undefined;
        if (native) {
          text = (await native.detect(video))[0]?.rawValue;
        } else if (zx && video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          text = (await zx.readBarcodes(img, { formats: ["QRCode"], tryHarder: true }))[0]?.text;
        }
        if (text) {
          const path = toMeterPath(text, [appHost]);
          if (path) {
            stop();
            router.push(path);
            return;
          }
          setMessage("That QR code isn't a VoltPay meter code.");
        }
      } catch {
        /* a bad frame — keep scanning */
      }
      setTimeout(tick, 250);
    };
    tick();
  }

  function stopScanning() {
    stopRef.current();
    setStatus("idle");
  }

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await lookupByConsumerNumber(consumerNo);
      if (res.ok) router.push(res.path);
      else setMessage(res.error);
    });
  }

  const live = status === "scanning" || status === "starting";

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="relative grid aspect-square place-items-center bg-muted sm:aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            className={live ? "size-full object-cover" : "hidden"}
          />
          {live && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-accent/80"
            />
          )}
          {!live && (
            <div className="grid justify-items-center gap-3 p-6 text-center text-muted-foreground">
              {status === "error" ? (
                <CameraOff className="size-10" />
              ) : (
                <Camera className="size-10" />
              )}
              <p className="text-sm">Point your camera at the QR sticker on your meter.</p>
            </div>
          )}
        </div>
        <div className="p-4">
          {live ? (
            <Button variant="outline" className="w-full" onClick={stopScanning}>
              Stop camera
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={start}>
              <Camera aria-hidden /> Start scanning
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}

      <form onSubmit={lookup} className="grid gap-3 rounded-xl border bg-card p-4">
        <Label htmlFor="consumer">Can’t scan? Enter your consumer number</Label>
        <div className="flex gap-2">
          <Input
            id="consumer"
            value={consumerNo}
            onChange={(e) => setConsumerNo(e.target.value)}
            placeholder="e.g. VP-2024-000101"
            autoComplete="off"
            required
          />
          <Button type="submit" variant="secondary" disabled={pending}>
            <Search aria-hidden /> Find
          </Button>
        </div>
      </form>
    </div>
  );
}
