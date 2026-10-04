"use client";

import { useState, useTransition } from "react";

import { submitContactAction } from "@/app/actions/contact";
import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { onSubmitWith } from "@/lib/form";

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done)
    return (
      <p role="status" className="rounded-md bg-success/10 px-3 py-3 text-sm text-success">
        Thanks — your message has been sent. We’ll get back to you by email.
      </p>
    );

  return (
    <form
      onSubmit={onSubmitWith((fd) => {
        setError(null);
        start(async () => {
          const res = await submitContactAction({
            name: String(fd.get("name") ?? ""),
            email: String(fd.get("email") ?? ""),
            message: String(fd.get("message") ?? ""),
            website: String(fd.get("website") ?? ""),
          });
          if (!res.ok) return setError(res.error);
          setDone(true);
        });
      })}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultName}
            autoComplete="name"
            required
            maxLength={80}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            autoComplete="email"
            required
            maxLength={120}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required minLength={10} maxLength={1500} />
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
