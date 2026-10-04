"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createComplaintAction } from "@/app/actions/account";
import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { onSubmitWith } from "@/lib/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ComplaintForm({ meters }: { meters: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await createComplaintAction({
        meterId: String(fd.get("meterId") ?? ""),
        category: String(fd.get("category") ?? "other") as
          "billing" | "meter_fault" | "supply" | "other",
        subject: String(fd.get("subject") ?? ""),
        description: String(fd.get("description") ?? ""),
      });
      if (!res.ok) return setError(res.error);
      router.push("/complaints");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmitWith(submit)} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="meterId">Meter</Label>
        <Select
          id="meterId"
          name="meterId"
          required
          defaultValue={meters.length === 1 ? meters[0].id : ""}
        >
          <option value="" disabled>
            Choose a meter
          </option>
          {meters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Type of problem</Label>
        <Select id="category" name="category" defaultValue="billing">
          <option value="billing">Billing</option>
          <option value="meter_fault">Meter fault</option>
          <option value="supply">Power supply</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" maxLength={120} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">What happened?</Label>
        <Textarea id="description" name="description" maxLength={1000} required />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit complaint"}
      </Button>
    </form>
  );
}
