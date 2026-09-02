import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientes, fetchInstalacoes } from "@/lib/data";
import { MoradaLink } from "@/components/MoradaLink";
import { ListaFiltrada } from "@/components/ListaFiltrada";
import { Badge } from "@/components/ui/badge";
import { CONFORMIDADE_BADGE, CONFORMIDADE_LABEL, estadoConformidade } from "@/lib/conformidade";
import type { Instalacao } from "@/lib/model";

export const Route = createFileRoute("/_authenticated/instalacoes/")({
  head: () => ({
    meta: [
      { title: "Instalações — Documentos de Segurança Privada" },
      { name: "description", content: "Todas as instalações registadas e o respetivo cliente." },
      { property: "og:title", content: "Instalações" },
      { property: "og:description", content: "Todas as instalações registadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
      <ListaFiltrada<Instalacao>
        itens={instalacoes.data}
        chave={(i) => i.id}
        placeholder="Pesquisar por entidade, morada, localidade ou cliente…"
        vazio="Ainda sem instalações."
        texto={(i) =>
          [i.entidade, i.morada, i.localidade, i.tipo_sistema, nomeCliente(i.cliente_id)]
            .filter(Boolean)
            .join(" ")
        }
        render={(i) => (
          <div className="rounded-md border border-border p-3 hover:border-accent">
            <Link to="/instalacoes/$instalacaoId" params={{ instalacaoId: i.id }} className="block">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{i.entidade || i.morada || "Instalação"}</div>
                {estadoConformidade(i) !== "sem_dados" && (
                  <Badge variant={CONFORMIDADE_BADGE[estadoConformidade(i)]}>
                    {CONFORMIDADE_LABEL[estadoConformidade(i)]}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {[nomeCliente(i.cliente_id), i.tipo_sistema, i.localidade]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </Link>
            <MoradaLink partes={[i.morada, i.localidade]} />
          </div>
        )}
      />
    </div>
  );
}
