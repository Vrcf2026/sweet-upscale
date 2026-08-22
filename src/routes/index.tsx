import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoDialog } from "@/components/InfoDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Documentos de Segurança Privada — instaladores PSP" },
      {
        name: "description",
        content:
          "Gera relatórios técnicos, livros de registo, declarações e autos de instalação, com assinatura no ecrã e exportação em PDF.",
      },
      { property: "og:title", content: "Documentos de Segurança Privada — instaladores PSP" },
      {
        property: "og:description",
        content:
          "Gera relatórios técnicos, livros de registo, declarações e autos de instalação, com assinatura no ecrã e exportação em PDF.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-accent" />
            Documentos de Segurança
          </span>
          <InfoDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent">
                Info
              </Button>
            }
          />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <ShieldCheck className="h-12 w-12 text-accent" />
        <h1 className="mt-6 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
          Documentos de Segurança Privada
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Acede à tua base de clientes, instalações e documentos oficiais.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          As contas são criadas pelo administrador.
        </p>
      </section>
    </main>
  );
}
