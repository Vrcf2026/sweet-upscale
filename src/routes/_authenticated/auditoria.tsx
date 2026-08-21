import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ListaFiltrada } from "@/components/ListaFiltrada";
import { ACCAO_LABEL, fetchAuditoria, type Accao, type Auditoria } from "@/lib/auditoria";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Documentos de Segurança Privada" },
      {
        name: "description",
        content: "Trilho de auditoria: quem criou, alterou ou apagou cada registo.",
      },
      { property: "og:title", content: "Auditoria" },
      { property: "og:description", content: "Histórico de alterações da aplicação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data } = useQuery({ queryKey: ["auditoria"], queryFn: () => fetchAuditoria() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground">
          Histórico de quem criou, alterou, arquivou ou apagou registos.
        </p>
      </div>

      <ListaFiltrada<Auditoria>
        itens={data}
        chave={(a) => a.id}
        porPagina={25}
        placeholder="Pesquisar por entidade, ação ou descrição…"
        vazio="Ainda sem registos de auditoria."
        texto={(a) => `${a.entidade} ${a.accao} ${a.descricao}`}
        render={(a) => (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
            <div>
              <div className="font-medium">{a.descricao || a.entidade}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-PT")} · {a.entidade}
              </div>
            </div>
            <Badge variant={a.accao === "apagou" ? "destructive" : "secondary"}>
              {ACCAO_LABEL[a.accao as Accao] ?? a.accao}
            </Badge>
          </div>
        )}
      />
    </div>
  );
}
