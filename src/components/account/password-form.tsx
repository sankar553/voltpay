"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/account/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    setDone(false);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");

    start(async () => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        return setError(
          error.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : (error.message ?? "Could not change password."),
        );
      }
      setDone(true);
      (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
    });
  }

  return (
    <form id="password-form" action={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters. Other devices will be signed out.
        </p>
      </div>
      <FormError message={error} />
      {done && (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm">
          Password changed.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
