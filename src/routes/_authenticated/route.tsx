import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { ErpShell } from "@/components/erp/erp-shell";
import { supabase } from "@/integrations/supabase/client";
import { CompanyProvider } from "@/lib/erp/company-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <CompanyProvider>
      <ErpShell>
        <Outlet />
      </ErpShell>
    </CompanyProvider>
  );
}
