import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/authz";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const session = await getSession();
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Contact us</CardTitle>
          <CardDescription>
            Questions or feedback about VoltPay? Send us a note. For a problem with your own meter,
            raise a complaint from your account instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <ContactForm defaultName={session?.user.name} defaultEmail={session?.user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
