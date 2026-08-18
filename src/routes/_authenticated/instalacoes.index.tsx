import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientes, fetchInstalacoes } from "@/lib/data";
import { MoradaLink } from "@/components/MoradaLink";

export const Route = createFileRoute("/_authenticated/instalacoes/")({
  head: () => ({
    meta: [
      { title: "Instalações — Documentos de Segurança Privada" },
      { name: "description", content: "Todas as instalações registadas e o respetivo cliente." },
      { property: "og:title", content: "Instalações" },
      { property: "og:description", content: "Todas as instalações registadas." },
    ],
  }),
  component: InstalacoesPage,
});

function InstalacoesPage() {
  const instalacoes = useQuery({ queryKey: ["instalacoes"], queryFn: () => fetchInstalacoes() });
  const clientes = useQuery({ queryKey: ["clientes"], queryFn: fetchClientes });
  const nomeCliente = (id: string) => clientes.data?.find((c) => c.id === id)?.nome ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Instalações</h1>
      <div className="space-y-2">
        {(instalacoes.data ?? []).map((i) => (
          <div key={i.id} className="rounded-md border border-border p-3 hover:border-accent">
            <Link to="/instalacoes/$instalacaoId" params={{ instalacaoId: i.id }} className="block">
              <div className="font-medium">{i.entidade || i.morada || "Instalação"}</div>
              <div className="text-sm text-muted-foreground">
                {[nomeCliente(i.cliente_id), i.tipo_sistema, i.localidade].filter(Boolean).join(" · ")}
              </div>
            </Link>
            <MoradaLink partes={[i.morada, i.localidade]} />
          </div>
        ))}
        {!instalacoes.data?.length && (
          <p className="text-sm text-muted-foreground">Ainda sem instalações.</p>
        )}
      </div>
    </div>
  );
}
