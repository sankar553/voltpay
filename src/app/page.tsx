import { BarChart3, Bell, QrCode, Receipt, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { title: "Scan", text: "Point your phone at the QR sticker on your electricity meter." },
  { title: "Review", text: "See the current bill, units consumed and due date instantly." },
  { title: "Pay", text: "Pay with UPI, card or net banking through a secure gateway." },
  { title: "Done", text: "Get a digital receipt you can download or share any time." },
];

const features = [
  { icon: QrCode, title: "QR meter lookup", text: "No more typing long consumer numbers." },
  { icon: ShieldCheck, title: "Secure by design", text: "Signed QR codes and verified payments." },
  { icon: Receipt, title: "Digital receipts", text: "Permanent receipts with PDF download." },
  { icon: BarChart3, title: "Usage insights", text: "Monthly consumption charts and trends." },
  { icon: Bell, title: "Due-date reminders", text: "Never miss a bill again." },
  { icon: Smartphone, title: "Installable app", text: "Add to your home screen, works offline." },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:pt-24">
        <Badge variant="accent" className="mb-5">
          Prototype · V2.0
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Scan. Pay. <span className="text-primary">Done.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
          VoltPay turns the QR code on your electricity meter into the fastest way to view and pay
          your bill — with instant receipts and clear usage history.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">I have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border bg-card p-5">
              <span className="text-sm font-semibold text-primary">Step {i + 1}</span>
              <p className="mt-1 text-lg font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-20">
        <h2 className="text-2xl font-semibold tracking-tight">Everything in one place</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="gap-3">
              <CardHeader className="flex flex-row items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
