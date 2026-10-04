import type { Metadata } from "next";

import { InboxActions } from "@/components/admin/admin-forms";
import { Empty } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/money";
import { listContactMessages } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireAdmin();
  const rows = await listContactMessages();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
      <p className="mt-1 text-muted-foreground">
        Messages from the public contact form. Deleted messages are hidden, not erased.
      </p>
      {rows.length === 0 ? (
        <Empty>No messages.</Empty>
      ) : (
        <div className="mt-4 grid gap-4">
          {rows.map((m) => (
            <Card key={m.id} className="gap-3">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  {!m.readAt && <Badge variant="accent">New</Badge>}
                </div>
                <CardDescription>
                  <a href={`mailto:${m.email}`} className="text-primary hover:underline">
                    {m.email}
                  </a>{" "}
                  · {formatDate(m.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <p className="whitespace-pre-wrap">{m.message}</p>
                <InboxActions id={m.id} unread={!m.readAt} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
