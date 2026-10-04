import type { Metadata } from "next";

import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/server/account";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireUser("/profile");
  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <Badge variant="secondary">{user.role}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>Used for receipts and reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name}
            email={user.email}
            phone={profile.phone ?? ""}
            address={profile.address ?? ""}
            notifyEmail={profile.notifyEmail}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Changing it signs you out on other devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
