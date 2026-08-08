import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Download, FileText, LogOut, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const NAV = [
  { to: "/painel", label: "Painel", icon: ShieldCheck },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/empresa", label: "Empresa", icon: Building2 },
  { to: "/backup", label: "Backup", icon: Download },
] as const;

function Layout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-20 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/painel" className="flex items-center gap-2 font-display font-semibold">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="hidden sm:inline">Documentos de Segurança</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={sair} className="hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
