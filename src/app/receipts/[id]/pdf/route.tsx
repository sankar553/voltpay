import { renderToBuffer } from "@react-pdf/renderer";

import { loadReceipt } from "@/server/receipts";
import { ReceiptPdf } from "@/server/receipt-pdf";

export async function GET(_req: Request, ctx: RouteContext<"/receipts/[id]/pdf">) {
  const { id } = await ctx.params;
  const receipt = await loadReceipt(id);
  if (!receipt) return new Response("Not found", { status: 404 });

  const pdf = await renderToBuffer(<ReceiptPdf r={receipt} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
