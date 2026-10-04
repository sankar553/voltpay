import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/server/authz";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function Page(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  if (await getSession()) redirect(safeRedirectPath(nextPath));

  return (
    <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Link your meters, pay bills and track usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" next={nextPath} />
        </CardContent>
      </Card>
    </div>
  );
}
