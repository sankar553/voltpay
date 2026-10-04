"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addReadingAction,
  cancelBillAction,
  createMeterAction,
  createTariffAction,
  deleteContactAction,
  markContactReadAction,
  rotateQrAction,
  runDailyJobAction,
  runBillingCycleAction,
  updateComplaintAction,
  updateMeterAction,
} from "@/app/actions/admin";
import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onSubmitWith } from "@/lib/form";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Note({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
      {message}
    </p>
  );
}

/** Shared pending/error/success state for the forms below. */
function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    after?: () => void,
  ) {
    setError(null);
    setNote(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Something went wrong.");
      setNote(res.message ?? "Saved.");
      after?.();
      router.refresh();
    });
  }
  return { error, note, pending, run, router, setNote };
}

// ─── Meter create / edit ─────────────────────────────────────────────────────

type MeterDefaults = {
  id: string;
  consumerName: string;
  address: string;
  district: string;
  connectionType: "domestic" | "commercial";
  sanctionedLoadKw: string;
  status: "active" | "disconnected";
};

export function MeterForm({ meter }: { meter?: MeterDefaults }) {
  const { error, note, pending, run, router } = useAction();

  function submit(fd: FormData) {
    const common = {
      consumerName: str(fd, "consumerName"),
      address: str(fd, "address"),
      district: str(fd, "district"),
      connectionType: str(fd, "connectionType") as "domestic" | "commercial",
      sanctionedLoadKw: str(fd, "sanctionedLoadKw"),
    };
    if (meter) {
      run(() =>
        updateMeterAction({
          id: meter.id,
          status: str(fd, "status") as "active" | "disconnected",
          ...common,
        }),
      );
    } else {
      run(async () => {
        const res = await createMeterAction({
          meterNumber: str(fd, "meterNumber"),
          consumerNumber: str(fd, "consumerNumber"),
          openingKwh: str(fd, "openingKwh"),
          ...common,
        });
        if (res.ok) router.push(`/admin/meters/${res.meterId}`);
        return res;
      });
    }
  }

  return (
    <form onSubmit={onSubmitWith(submit)} className="grid gap-4">
      {!meter && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="meterNumber" label="Meter number">
            <Input id="meterNumber" name="meterNumber" placeholder="MTR2001" required />
          </Field>
          <Field id="consumerNumber" label="Consumer number">
            <Input
              id="consumerNumber"
              name="consumerNumber"
              placeholder="VP-2026-000201"
              required
            />
          </Field>
        </div>
      )}
      <Field id="consumerName" label="Consumer name">
        <Input id="consumerName" name="consumerName" defaultValue={meter?.consumerName} required />
      </Field>
      <Field id="address" label="Service address">
        <Input id="address" name="address" defaultValue={meter?.address} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="district" label="District">
          <Input id="district" name="district" defaultValue={meter?.district} required />
        </Field>
        <Field id="connectionType" label="Connection type">
          <Select
            id="connectionType"
            name="connectionType"
            defaultValue={meter?.connectionType ?? "domestic"}
          >
            <option value="domestic">Domestic</option>
            <option value="commercial">Commercial</option>
          </Select>
        </Field>
        <Field id="sanctionedLoadKw" label="Sanctioned load (kW)">
          <Input
            id="sanctionedLoadKw"
            name="sanctionedLoadKw"
            inputMode="decimal"
            defaultValue={meter?.sanctionedLoadKw ?? "3"}
            required
          />
        </Field>
      </div>
      {meter ? (
        <Field id="status" label="Status">
          <Select id="status" name="status" defaultValue={meter.status}>
            <option value="active">Active</option>
            <option value="disconnected">Disconnected (no new bills)</option>
          </Select>
        </Field>
      ) : (
        <Field id="openingKwh" label="Opening meter reading (kWh)">
          <Input id="openingKwh" name="openingKwh" inputMode="numeric" defaultValue="0" required />
        </Field>
      )}
      <FormError message={error} />
      <Note message={note} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : meter ? "Save changes" : "Add meter"}
      </Button>
    </form>
  );
}

// ─── Small action buttons / forms ────────────────────────────────────────────

export function RotateQrButton({ meterId }: { meterId: string }) {
  const { error, note, pending, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="grid gap-2">
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">The printed sticker will stop working. Continue?</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              run(
                () => rotateQrAction(meterId),
                () => setConfirm(false),
              )
            }
          >
            Yes, rotate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setConfirm(true)}
        >
          Rotate QR code
        </Button>
      )}
      <FormError message={error} />
      <Note message={note ? "QR code replaced. Print the new sticker." : null} />
    </div>
  );
}

export function ReadingForm({ meterId, today }: { meterId: string; today: string }) {
  const { error, note, pending, run } = useAction();
  return (
    <form
      onSubmit={onSubmitWith((fd) =>
        run(() =>
          addReadingAction({
            meterId,
            readingKwh: str(fd, "readingKwh"),
            readAt: str(fd, "readAt"),
          }),
        ),
      )}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="readingKwh" label="New cumulative reading (kWh)">
          <Input id="readingKwh" name="readingKwh" inputMode="numeric" required />
        </Field>
        <Field id="readAt" label="Reading date">
          <Input id="readAt" name="readAt" type="date" defaultValue={today} max={today} required />
        </Field>
      </div>
      <FormError message={error} />
      <Note message={note} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Billing…" : "Add reading & create bill"}
      </Button>
    </form>
  );
}

export function BillingCycleForm({ today }: { today: string }) {
  const { error, pending, run } = useAction();
  const [summary, setSummary] = useState<{
    created: number;
    skipped: { meterNumber: string; reason: string }[];
  } | null>(null);
  return (
    <form
      onSubmit={onSubmitWith((fd) => {
        setSummary(null);
        run(async () => {
          const res = await runBillingCycleAction({ readAt: str(fd, "readAt") });
          if (res.ok) setSummary({ created: res.created, skipped: res.skipped });
          return res;
        });
      })}
      className="grid gap-4"
    >
      <Field id="readAt" label="Billing date (reading date)">
        <Input
          id="readAt"
          name="readAt"
          type="date"
          defaultValue={today}
          max={today}
          required
          className="sm:max-w-56"
        />
      </Field>
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Running…" : "Run billing cycle"}
      </Button>
      {summary && (
        <div role="status" className="rounded-md border bg-card px-3 py-2 text-sm">
          <p className="font-medium">
            {summary.created} bill{summary.created === 1 ? "" : "s"} created.
          </p>
          {summary.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {summary.skipped.map((s) => (
                <li key={s.meterNumber}>
                  {s.meterNumber}: skipped — {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

export function CancelBillButton({ billId, billNumber }: { billId: string; billNumber: string }) {
  const { error, pending, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirm(true)}
        aria-label={`Cancel bill ${billNumber}`}
      >
        Cancel bill
      </Button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => run(() => cancelBillAction(billId))}
      >
        Confirm
      </Button>
      <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>
        Keep
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

// ─── Tariff ──────────────────────────────────────────────────────────────────

export function TariffForm({ today }: { today: string }) {
  const { error, note, pending, run } = useAction();
  return (
    <form
      onSubmit={onSubmitWith((fd) =>
        run(() =>
          createTariffAction({
            name: str(fd, "name"),
            connectionType: str(fd, "connectionType") as "domestic" | "commercial",
            effectiveFrom: str(fd, "effectiveFrom"),
            fixedCharge: str(fd, "fixedCharge"),
            dutyPercent: str(fd, "dutyPercent"),
            slabs: [0, 1, 2, 3].map((i) => ({
              upto: str(fd, `upto${i}`),
              rate: str(fd, `rate${i}`),
            })),
          }),
        ),
      )}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="name" label="Name">
          <Input id="name" name="name" placeholder="Domestic 2027" required />
        </Field>
        <Field id="connectionType" label="Connection type">
          <Select id="connectionType" name="connectionType" defaultValue="domestic">
            <option value="domestic">Domestic</option>
            <option value="commercial">Commercial</option>
          </Select>
        </Field>
        <Field id="effectiveFrom" label="Effective from">
          <Input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            defaultValue={today}
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fixedCharge" label="Fixed charge per bill (₹)">
          <Input
            id="fixedCharge"
            name="fixedCharge"
            inputMode="decimal"
            defaultValue="50"
            required
          />
        </Field>
        <Field id="dutyPercent" label="Electricity duty (% of energy charge)">
          <Input
            id="dutyPercent"
            name="dutyPercent"
            inputMode="decimal"
            defaultValue="5"
            required
          />
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Slabs (units per bill → ₹ per unit)</legend>
        <p className="text-xs text-muted-foreground">
          Fill rows top to bottom. Leave “Up to” blank on the last row you use.
        </p>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <Input
              name={`upto${i}`}
              inputMode="numeric"
              placeholder="Up to (units)"
              aria-label={`Slab ${i + 1} up to units`}
            />
            <Input
              name={`rate${i}`}
              inputMode="decimal"
              placeholder="₹ per unit"
              aria-label={`Slab ${i + 1} rate per unit`}
            />
          </div>
        ))}
      </fieldset>
      <FormError message={error} />
      <Note
        message={
          note ? "Tariff saved. It applies to bills dated on or after its start date." : null
        }
      />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Add tariff"}
      </Button>
    </form>
  );
}

// ─── Complaint response ──────────────────────────────────────────────────────

export function ComplaintUpdateForm({
  id,
  status,
  adminNote,
}: {
  id: string;
  status: "open" | "in_progress" | "resolved";
  adminNote: string | null;
}) {
  const { error, note, pending, run } = useAction();
  return (
    <form
      onSubmit={onSubmitWith((fd) =>
        run(() =>
          updateComplaintAction({
            id,
            status: str(fd, "status") as "open" | "in_progress" | "resolved",
            adminNote: str(fd, "adminNote"),
          }),
        ),
      )}
      className="grid gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </Select>
        <Textarea
          name="adminNote"
          defaultValue={adminNote ?? ""}
          placeholder="Response shown to the customer"
          aria-label="Response to customer"
          maxLength={1000}
          className="min-h-10"
          rows={2}
        />
      </div>
      <FormError message={error} />
      <Note message={note} />
      <Button type="submit" size="sm" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save response"}
      </Button>
    </form>
  );
}

// ─── Daily job ───────────────────────────────────────────────────────────────

export function DailyJobButton() {
  const { error, pending, run } = useAction();
  const [summary, setSummary] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      <Button
        className="justify-self-start"
        disabled={pending}
        onClick={() => {
          setSummary(null);
          run(async () => {
            const res = await runDailyJobAction();
            if (res.ok) {
              const s = res.summary;
              const parts = [`${s.markedOverdue} bill(s) marked overdue`];
              if (s.sent) parts.push(`${s.sent} email(s) sent`);
              if (s.logged)
                parts.push(`${s.logged} email(s) printed to the server console (no email key set)`);
              if (s.skipped) parts.push(`${s.skipped} not sent (no email key set)`);
              if (s.failed) parts.push(`${s.failed} failed — will retry on the next run`);
              if (!s.sent && !s.logged && !s.skipped && !s.failed)
                parts.push("no reminders needed");
              setSummary(parts.join(" · "));
            }
            return res;
          });
        }}
      >
        {pending ? "Running…" : "Run daily job now"}
      </Button>
      <FormError message={error} />
      {summary && (
        <p role="status" className="rounded-md border bg-card px-3 py-2 text-sm">
          {summary}
        </p>
      )}
    </div>
  );
}

// ─── Contact inbox actions ───────────────────────────────────────────────────

export function InboxActions({ id, unread }: { id: string; unread: boolean }) {
  const { error, pending, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {unread && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => markContactReadAction(id))}
        >
          Mark as read
        </Button>
      )}
      {confirm ? (
        <>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => deleteContactAction(id))}
          >
            Confirm delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          Delete
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
