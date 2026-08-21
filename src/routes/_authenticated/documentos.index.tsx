import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListaFiltrada } from "@/components/ListaFiltrada";
import { fetchDocumentos } from "@/lib/data";
import { DOC_LABEL, ESTADO_LABEL, type Documento, type DocTipo } from "@/lib/model";
import { dataPT } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/documentos/")({
  head: () => ({
    meta: [
      { title: "Documentos — Documentos de Segurança Privada" },
      { name: "description", content: "Todos os documentos gerados e o seu estado." },
      { property: "og:title", content: "Documentos" },
      { property: "og:description", content: "Todos os documentos gerados e o seu estado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const { data } = useQuery({ queryKey: ["documentos"], queryFn: () => fetchDocumentos() });
  const [estado, setEstado] = useState("todos");
  const [tipo, setTipo] = useState("todos");

  const filtrados = (data ?? []).filter(
    (d) => (estado === "todos" || d.estado === estado) && (tipo === "todos" || d.tipo === tipo),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documentos</h1>

      <ListaFiltrada<Documento>
        itens={filtrados}
        chave={(d) => d.id}
        placeholder="Pesquisar por número, tipo ou resumo…"
        vazio="Ainda sem documentos."
        texto={(d) => `${d.numero ?? ""} ${DOC_LABEL[d.tipo as DocTipo]} ${d.resumo ?? ""}`}
        extras={
          <div className="flex gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {(Object.keys(DOC_LABEL) as DocTipo[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOC_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        render={(d) => (
          <Link
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
        )}
      />
    </div>
  );
}
