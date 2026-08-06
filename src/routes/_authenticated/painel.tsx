import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, FileText, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchClientes, fetchDocumentos, fetchInstalacoes } from "@/lib/data";
import { DOC_LABEL, ESTADO_LABEL, type DocTipo } from "@/lib/model";
import { dataPT } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Documentos de Segurança Privada" },
      { name: "description", content: "Resumo de clientes, instalações e documentos recentes." },
      { property: "og:title", content: "Painel" },
      { property: "og:description", content: "Resumo da atividade da tua empresa." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const [termo, setTermo] = useState("");
  const clientes = useQuery({ queryKey: ["clientes"], queryFn: fetchClientes });
  const instalacoes = useQuery({ queryKey: ["instalacoes"], queryFn: () => fetchInstalacoes() });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: () => fetchDocumentos() });

  const t = termo.trim().toLowerCase();
  const resultados = useMemo(() => {
    if (!t) return null;
    return {
      clientes: (clientes.data ?? []).filter((c) =>
        [c.nome, c.nif, c.morada, c.localidade, c.email].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        ),
      ),
      instalacoes: (instalacoes.data ?? []).filter((i) =>
        [i.entidade, i.morada, i.sistema_id, i.num_registo].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        ),
      ),
      documentos: (documentos.data ?? []).filter((d) =>
        [d.numero, d.resumo, DOC_LABEL[d.tipo as DocTipo]].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        ),
      ),
    };
  }, [t, clientes.data, instalacoes.data, documentos.data]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-muted-foreground">Visão geral da tua atividade.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar cliente, morada, n.º de série ou documento…"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </div>

      {resultados ? (
        <div className="space-y-6">
          <Bloco titulo="Clientes">
            {resultados.clientes.map((c) => (
              <Link
                key={c.id}
                to="/clientes/$clienteId"
                params={{ clienteId: c.id }}
                className="block rounded-md border border-border bg-card p-3 hover:border-accent"
              >
                <span className="font-medium">{c.nome}</span>
                <span className="ml-2 text-sm text-muted-foreground">{c.localidade}</span>
              </Link>
            ))}
          </Bloco>
          <Bloco titulo="Instalações">
            {resultados.instalacoes.map((i) => (
              <Link
                key={i.id}
                to="/instalacoes/$instalacaoId"
                params={{ instalacaoId: i.id }}
                className="block rounded-md border border-border bg-card p-3 hover:border-accent"
              >
                <span className="font-medium">{i.entidade || i.morada || "Instalação"}</span>
                <span className="ml-2 text-sm text-muted-foreground">{i.tipo_sistema}</span>
              </Link>
            ))}
          </Bloco>
          <Bloco titulo="Documentos">
            {resultados.documentos.map((d) => (
              <Link
                key={d.id}
                to="/documentos/$documentoId"
                params={{ documentoId: d.id }}
                className="block rounded-md border border-border bg-card p-3 hover:border-accent"
              >
                <span className="font-medium">{DOC_LABEL[d.tipo as DocTipo]}</span>
                <span className="ml-2 text-sm text-muted-foreground">{d.numero}</span>
              </Link>
            ))}
          </Bloco>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={Users} label="Clientes" valor={clientes.data?.length ?? 0} />
            <Stat icon={Building2} label="Instalações" valor={instalacoes.data?.length ?? 0} />
            <Stat icon={FileText} label="Documentos" valor={documentos.data?.length ?? 0} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Documentos recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(documentos.data ?? []).slice(0, 8).map((d) => (
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
              {!documentos.data?.length && (
                <p className="text-sm text-muted-foreground">
                  Ainda não geraste documentos. Começa por criar um cliente.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const vazio = Array.isArray(children) && children.length === 0;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {vazio ? <p className="text-sm text-muted-foreground">Sem resultados.</p> : children}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof Users;
  label: string;
  valor: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <Icon className="h-8 w-8 text-accent" />
        <div>
          <div className="text-2xl font-bold">{valor}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
