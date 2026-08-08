import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClipboardList, FileText, ShieldCheck, Signature } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const FEATURES = [
  {
    icon: FileText,
    titulo: "Quatro documentos oficiais",
    texto:
      "Relatório Técnico de Intervenção, Livro de Registos, Declaração e Auto de Instalação, sempre pré-preenchidos.",
  },
  {
    icon: ClipboardList,
    titulo: "Clientes e instalações",
    texto:
      "Cada cliente pode ter várias instalações, cada uma com o seu inventário, histórico e livro de registos.",
  },
  {
    icon: Signature,
    titulo: "Assinatura em obra",
    texto:
      "Assinatura no ecrã do telemóvel, foto do local e exportação para PDF descarregável.",
  },
];

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-accent" />
            Documentos de Segurança
          </span>
          <Button asChild size="sm" variant="secondary">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="font-medium uppercase tracking-widest text-accent-foreground/70">
          Instaladores com registo prévio PSP
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Todos os documentos da tua instalação, em qualquer dispositivo.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Gera, assina e arquiva os documentos de cada instalação. Preenchimento assistido por IA a
          partir de faturas, Excel ou orçamentos em PDF.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Começar</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ modo: "registo" }}>
              Criar conta
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.titulo} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h2 className="mt-4 text-base font-semibold">{f.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.texto}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
