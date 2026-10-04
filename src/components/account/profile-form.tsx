"use client";

import { useState, useTransition } from "react";

import { updateProfileAction } from "@/app/actions/account";
import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm(props: {
  name: string;
  email: string;
  phone: string;
  address: string;
  notifyEmail: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateProfileAction({
        name: String(fd.get("name") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        address: String(fd.get("address") ?? ""),
        notifyEmail: fd.get("notifyEmail") === "on",
      });
      if (!res.ok) return setError(res.error);
      setSaved(true);
    });
  }

  return (
    <form action={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={props.name} maxLength={100} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={props.email} readOnly disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Mobile number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={props.phone}
          placeholder="+91 98765 43210"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={props.address}
          maxLength={200}
          className="min-h-20"
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="notifyEmail"
          defaultChecked={props.notifyEmail}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          Email me due-date reminders
          <span className="block text-xs text-muted-foreground">
            Reminders start working in a later update.
          </span>
        </span>
      </label>
      <FormError message={error} />
      {saved && (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm">
          Profile saved.
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
