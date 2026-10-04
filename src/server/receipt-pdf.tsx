import "server-only";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate, formatINR } from "@/lib/money";

export type ReceiptData = {
  receiptNumber: string;
  paidAt: Date;
  method: string | null;
  gateway: string;
  transactionId: string | null;
  consumerName: string;
  meterNumber: string;
  district: string;
  billNumber: string;
  periodStart: string;
  periodEnd: string;
  units: number;
  energyPaise: number;
  fixedPaise: number;
  dutyPaise: number;
  adjustmentPaise: number;
  totalPaise: number;
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1d4ed8" },
  muted: { color: "#6b7280" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  box: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, padding: 12, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  total: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  paid: { color: "#15803d", fontFamily: "Helvetica-Bold" },
  foot: { marginTop: 24, fontSize: 9, color: "#6b7280" },
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.muted}>{label}</Text>
      <Text style={bold ? s.total : undefined}>{value}</Text>
    </View>
  );
}

export function ReceiptPdf({ r }: { r: ReceiptData }) {
  return (
    <Document title={`Receipt ${r.receiptNumber}`} author="VoltPay">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.brand}>VoltPay</Text>
            <Text style={s.muted}>Scan. Pay. Done.</Text>
          </View>
          <View>
            <Text style={s.title}>Payment receipt</Text>
            <Text>{r.receiptNumber}</Text>
            <Text style={s.muted}>{formatDate(r.paidAt)}</Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.title}>Consumer</Text>
          <Row label="Name" value={r.consumerName} />
          <Row label="Meter number" value={r.meterNumber} />
          <Row label="District" value={r.district} />
        </View>

        <View style={s.box}>
          <Text style={s.title}>Bill</Text>
          <Row label="Bill number" value={r.billNumber} />
          <Row label="Period" value={`${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`} />
          <Row label="Units consumed" value={`${r.units} kWh`} />
          <Row label="Energy charges" value={formatINR(r.energyPaise)} />
          <Row label="Fixed charges" value={formatINR(r.fixedPaise)} />
          <Row label="Electricity duty" value={formatINR(r.dutyPaise)} />
          {r.adjustmentPaise !== 0 && (
            <Row label="Adjustments" value={formatINR(r.adjustmentPaise)} />
          )}
          <Row label="Amount paid" value={formatINR(r.totalPaise)} bold />
        </View>

        <View style={s.box}>
          <Text style={s.title}>Payment</Text>
          <View style={s.row}>
            <Text style={s.muted}>Status</Text>
            <Text style={s.paid}>PAID</Text>
          </View>
          <Row label="Method" value={r.method ?? "—"} />
          <Row label="Transaction ID" value={r.transactionId ?? "—"} />
          <Row
            label="Gateway"
            value={r.gateway === "mock" ? "Simulated (test)" : "Razorpay (test mode)"}
          />
        </View>

        <Text style={s.foot}>
          VoltPay prototype — simulated billing data; payments run in test mode and no real money is
          charged. This receipt is computer-generated.
        </Text>
      </Page>
    </Document>
  );
}
