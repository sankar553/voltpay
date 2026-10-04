"use client";

import { Button } from "@/components/ui/button";

/** Shown when a page throws. The real error stays in the server logs; users only see a digest. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-md flex-1 place-items-center px-4 py-20 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn’t load this page. Please try again; if it keeps happening, contact us.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
