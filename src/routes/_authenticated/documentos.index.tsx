import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { fetchDocumentos } from "@/lib/data";
import { DOC_LABEL, ESTADO_LABEL, type DocTipo } from "@/lib/model";
import { dataPT } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/documentos/")({
  head: () => ({
    meta: [
      { title: "Documentos — Documentos de Segurança Privada" },
      { name: "description", content: "Todos os documentos gerados e o seu estado." },
      { property: "og:title", content: "Documentos" },
      { property: "og:description", content: "Todos os documentos gerados e o seu estado." },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const { data } = useQuery({ queryKey: ["documentos"], queryFn: () => fetchDocumentos() });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documentos</h1>
      <div className="space-y-2">
        {(data ?? []).map((d) => (
          <Link
            key={d.id}
            to="/documentos/$documentoId"
            params={{ documentoId: d.id }}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 hover:border-accent"
          >
            <div>
              <div className="font-medium">{DOC_LABEL[d.tipo as DocTipo]}</div>
              <div className="text-sm text-muted-foreground">
                {d.numero} · {dataPT(d.created_at)}
              </div>
            </div>
            <Badge variant={d.estado === "rascunho" ? "secondary" : "default"}>
              {ESTADO_LABEL[d.estado]}
            </Badge>
          </Link>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">Ainda sem documentos.</p>}
      </div>
    </div>
  );
}
