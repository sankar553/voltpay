import { cn } from "@/lib/utils";

/** Scrolls horizontally inside its box; `relative` keeps sr-only cells from widening the page. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Thead({
  cols,
}: {
  cols: (string | { label: string; right?: boolean; hidden?: boolean })[];
}) {
  return (
    <thead className="bg-secondary text-left text-muted-foreground">
      <tr>
        {cols.map((c) => {
          const col = typeof c === "string" ? { label: c } : c;
          return (
            <th
              key={col.label}
              className={cn("px-4 py-3 font-medium", "right" in col && col.right && "text-right")}
            >
              {"hidden" in col && col.hidden ? (
                <span className="sr-only">{col.label}</span>
              ) : (
                col.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-xl border bg-card px-4 py-8 text-center text-muted-foreground">
      {children}
    </p>
  );
}
