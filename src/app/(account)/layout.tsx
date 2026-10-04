import { AccountNav } from "@/components/account-nav";
import { requireUser } from "@/server/authz";

/**
 * Everything under (account) needs a signed-in user. Layouts don't re-run on client
 * navigation, so each page also calls requireUser() — this is the first line of defence.
 */
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <AccountNav />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
