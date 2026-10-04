CREATE TYPE "public"."bill_status" AS ENUM('unpaid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('domestic', 'commercial');--> statement-breakpoint
CREATE TYPE "public"."meter_relation" AS ENUM('owner', 'family', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."meter_status" AS ENUM('active', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'authorized', 'captured', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."reading_source" AS ENUM('simulated', 'manual', 'smart');--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_number" text NOT NULL,
	"meter_id" uuid NOT NULL,
	"tariff_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"previous_reading_id" uuid NOT NULL,
	"current_reading_id" uuid NOT NULL,
	"units" integer NOT NULL,
	"energy_paise" integer NOT NULL,
	"fixed_paise" integer NOT NULL,
	"duty_paise" integer NOT NULL,
	"adjustment_paise" integer DEFAULT 0 NOT NULL,
	"total_paise" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" "bill_status" DEFAULT 'unpaid' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_bill_number_unique" UNIQUE("bill_number"),
	CONSTRAINT "bills_units_non_negative" CHECK ("bills"."units" >= 0),
	CONSTRAINT "bills_total_non_negative" CHECK ("bills"."total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meter_id" uuid NOT NULL,
	"reading_kwh" integer NOT NULL,
	"read_at" date NOT NULL,
	"source" "reading_source" DEFAULT 'simulated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meter_readings_non_negative" CHECK ("meter_readings"."reading_kwh" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meter_number" text NOT NULL,
	"consumer_number" text NOT NULL,
	"qr_token" text NOT NULL,
	"qr_token_rotated_at" timestamp with time zone,
	"consumer_name" text NOT NULL,
	"address" text NOT NULL,
	"district" text NOT NULL,
	"connection_type" "connection_type" DEFAULT 'domestic' NOT NULL,
	"sanctioned_load_kw" numeric(6, 2) DEFAULT '3' NOT NULL,
	"status" "meter_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meters_meter_number_unique" UNIQUE("meter_number"),
	CONSTRAINT "meters_consumer_number_unique" UNIQUE("consumer_number"),
	CONSTRAINT "meters_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"user_id" text,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"gateway" text NOT NULL,
	"gateway_order_id" text NOT NULL,
	"gateway_payment_id" text,
	"method" text,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"failure_reason" text,
	"receipt_number" text,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_gateway_order_id_unique" UNIQUE("gateway_order_id"),
	CONSTRAINT "payments_gateway_payment_id_unique" UNIQUE("gateway_payment_id"),
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"connection_type" "connection_type" NOT NULL,
	"effective_from" date NOT NULL,
	"slabs" jsonb NOT NULL,
	"fixed_charge_paise" integer NOT NULL,
	"duty_bps" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_meters" (
	"user_id" text NOT NULL,
	"meter_id" uuid NOT NULL,
	"relation" "meter_relation" DEFAULT 'owner' NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_meters_user_id_meter_id_pk" PRIMARY KEY("user_id","meter_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_tariff_id_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_previous_reading_id_meter_readings_id_fk" FOREIGN KEY ("previous_reading_id") REFERENCES "public"."meter_readings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_current_reading_id_meter_readings_id_fk" FOREIGN KEY ("current_reading_id") REFERENCES "public"."meter_readings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meters" ADD CONSTRAINT "user_meters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meters" ADD CONSTRAINT "user_meters_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bills_meter_status_idx" ON "bills" USING btree ("meter_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "bills_meter_period_idx" ON "bills" USING btree ("meter_id","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "meter_readings_meter_date_idx" ON "meter_readings" USING btree ("meter_id","read_at");--> statement-breakpoint
CREATE INDEX "meters_district_idx" ON "meters" USING btree ("district");--> statement-breakpoint
CREATE INDEX "payments_bill_idx" ON "payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_captured_per_bill" ON "payments" USING btree ("bill_id") WHERE "payments"."status" = 'captured';--> statement-breakpoint
CREATE UNIQUE INDEX "tariffs_type_effective_idx" ON "tariffs" USING btree ("connection_type","effective_from");--> statement-breakpoint
CREATE INDEX "user_meters_meter_idx" ON "user_meters" USING btree ("meter_id");