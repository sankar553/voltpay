import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/server/authz";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  if (await getSession()) redirect(safeRedirectPath(nextPath));

  return (
    <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Welcome back. Sign in to view and pay your bills.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" next={nextPath} />
        </CardContent>
      </Card>
    </div>
  );
}
