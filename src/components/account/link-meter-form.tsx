"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { linkMeterAction } from "@/app/actions/account";
import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function LinkMeterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await linkMeterAction({
        consumerNumber: String(fd.get("consumerNumber") ?? ""),
        amount: String(fd.get("amount") ?? ""),
        relation: String(fd.get("relation") ?? "owner") as "owner" | "family" | "tenant",
      });
      if (!res.ok) return setError(res.error);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="consumerNumber">Consumer number</Label>
        <Input
          id="consumerNumber"
          name="consumerNumber"
          placeholder="e.g. VP-2024-000102"
          autoComplete="off"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount of your last paid bill (₹)</Label>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="e.g. 554.00"
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">
          Find it on your previous receipt or bill. This proves the meter is yours.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="relation">Your relation to this meter</Label>
        <Select id="relation" name="relation" defaultValue="owner">
          <option value="owner">Owner</option>
          <option value="family">Family member</option>
          <option value="tenant">Tenant</option>
        </Select>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Link meter"}
      </Button>
    </form>
  );
}
