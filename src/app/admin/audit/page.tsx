import type { Metadata } from "next";

import { Empty, Td, TableWrap, Thead } from "@/components/admin/table";
import { listAudit } from "@/server/admin";
import { requireAdmin } from "@/server/authz";

export const metadata: Metadata = { title: "Audit log" };

const when = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function AuditPage() {
  await requireAdmin();
  const rows = await listAudit();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
      <p className="mt-1 text-muted-foreground">
        Latest 200 security-relevant actions. Entries can’t be edited or deleted from the app.
      </p>
      {rows.length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        <div className="mt-4">
          <TableWrap>
            <Thead cols={["When (IST)", "Who", "Action", "Record", "Details"]} />
            <tbody className="divide-y">
              {rows.map(({ entry: e, email }) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap">{when.format(e.createdAt)}</Td>
                  <Td className="text-muted-foreground">{email ?? "—"}</Td>
                  <Td className="font-medium whitespace-nowrap">{e.action}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {e.entity}
                    {e.entityId ? ` ${e.entityId.slice(0, 8)}` : ""}
                  </Td>
                  <Td className="font-mono text-xs break-all text-muted-foreground">
                    {e.meta ? JSON.stringify(e.meta) : ""}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}
    </>
  );
}
