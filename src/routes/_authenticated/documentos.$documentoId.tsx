import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Image as ImageIcon, Lock, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApagarDialog } from "@/components/ApagarDialog";
import { supabase } from "@/integrations/supabase/client";
import { fetchCliente, fetchDocumento, fetchEmpresa } from "@/lib/data";
import { DOC_LABEL, ESTADO_LABEL, type Documento, type DocTipo } from "@/lib/model";
import { exportarPdf, imprimirDoc } from "@/lib/ficheiros";
import { arquivarDocumento } from "@/lib/arquivo";
import { registar } from "@/lib/auditoria";

export const Route = createFileRoute("/_authenticated/documentos/$documentoId")({
  head: () => ({
    meta: [
      { title: "Documento — Documentos de Segurança Privada" },
      { name: "description", content: "Pré-visualização, estado e exportação em PDF." },
      { property: "og:title", content: "Documento" },
      { property: "og:description", content: "Pré-visualização e exportação em PDF." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentoPage,
});

const ESTADOS: Documento["estado"][] = ["rascunho", "assinado", "entregue"];

function DocumentoPage() {
  const { documentoId } = Route.useParams();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [aArquivar, setAArquivar] = useState(false);
  const { data } = useQuery({
    queryKey: ["documento", documentoId],
    queryFn: () => fetchDocumento(documentoId),
  });

  const doc = data as (Documento & { hash?: string | null; ficheiro_path?: string | null }) | null;

  const cliente = useQuery({
    queryKey: ["cliente", doc?.cliente_id],
    queryFn: () => fetchCliente(doc!.cliente_id!),
    enabled: !!doc?.cliente_id,
  });
  const empresa = useQuery({ queryKey: ["empresa"], queryFn: fetchEmpresa });

  /**
   * Envio ao cliente: gera o PDF (para anexar) e abre o email já preenchido
   * no programa de correio do técnico, registando o envio na auditoria.
   */
  async function enviarPorEmail() {
    if (!doc) return;
    const email = cliente.data?.email ?? "";
    if (!email) {
      toast.error("O cliente não tem email preenchido na ficha");
      return;
    }
    imprimirDoc(doc.html, doc.numero ?? "documento");
    const assunto = `${DOC_LABEL[doc.tipo as DocTipo]} ${doc.numero ?? ""}`.trim();
    const corpo = [
      `Exmo(a). Sr(a). ${cliente.data?.nome ?? ""},`,
      "",
      `Segue em anexo o documento ${assunto}.`,
      doc.hash ? `Impressão digital do documento: ${doc.hash}` : "",
      "",
      "Com os melhores cumprimentos,",
      empresa.data?.nome ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      assunto,
    )}&body=${encodeURIComponent(corpo)}`;
    await registar("documento", "enviou", doc.id, `Documento ${doc.numero ?? ""} enviado para ${email}`);
    toast.success("Email preparado — anexa o PDF que acabou de ser gerado");
  }

  const mudarEstado = useMutation({
    mutationFn: async (estado: Documento["estado"]) => {
      const { error } = await supabase.from("documentos").update({ estado }).eq("id", documentoId);
      if (error) throw new Error(error.message);
      await registar(
        "documento",
        "estado",
        documentoId,
        `Documento ${doc?.numero ?? ""} marcado como ${ESTADO_LABEL[estado].toLowerCase()}`,
      );
      // ao assinar/entregar, arquiva o ficheiro final com impressão digital
      if (estado !== "rascunho" && doc && !doc.hash) {
        try {
          await arquivarDocumento({ id: doc.id, numero: doc.numero, html: doc.html });
        } catch {
          /* arquivo é complementar; o estado já ficou registado */
        }
      }
    },
    onSuccess: () => {
      toast.success("Estado atualizado");
      queryClient.invalidateQueries({ queryKey: ["documento", documentoId] });
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function arquivarAgora() {
    if (!doc) return;
    try {
      setAArquivar(true);
      const { hash } = await arquivarDocumento({
        id: doc.id,
        numero: doc.numero,
        html: doc.html,
      });
      toast.success(`Arquivado · hash ${hash.slice(0, 12)}…`);
      queryClient.invalidateQueries({ queryKey: ["documento", documentoId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAArquivar(false);
    }
  }

  if (!doc) return <p className="text-muted-foreground">A carregar…</p>;

  const bloqueado = doc.estado !== "rascunho";

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{DOC_LABEL[doc.tipo as DocTipo]}</h1>
          <p className="text-muted-foreground">{doc.numero}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ESTADO_LABEL[doc.estado]}</Badge>
          {ESTADOS.filter((e) => e !== doc.estado).map((e) => (
            <Button
              key={e}
              variant="secondary"
              size="sm"
              disabled={bloqueado && e === "rascunho"}
              onClick={() => mudarEstado.mutate(e)}
            >
              Marcar {ESTADO_LABEL[e].toLowerCase()}
            </Button>
          ))}
          <Button size="sm" onClick={() => imprimirDoc(doc.html, doc.numero ?? "documento")}>
            <Printer className="h-4 w-4" /> PDF (texto)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => ref.current && exportarPdf(ref.current, `${doc.numero ?? "documento"}`)}
          >
            <ImageIcon className="h-4 w-4" /> PDF (imagem)
          </Button>
          <Button size="sm" variant="secondary" onClick={enviarPorEmail}>
            <Mail className="h-4 w-4" /> Enviar ao cliente
          </Button>
          <Button size="sm" variant="secondary" disabled={aArquivar} onClick={arquivarAgora}>
            <Download className="h-4 w-4" /> Arquivar
          </Button>
          <ApagarDialog
            titulo="Apagar documento"
            descricao="O documento é removido do arquivo de forma definitiva."
            bloqueios={
              doc.estado === "entregue"
                ? ["O documento já foi entregue ao cliente e não pode ser apagado."]
                : []
            }
            nomeBackup={`backup-documento-${doc.numero ?? documentoId}.json`}
            recolherBackup={async () => ({ documento: doc })}
            aoApagar={async () => {
              const { error } = await supabase.from("documentos").delete().eq("id", documentoId);
              if (error) throw new Error(error.message);
              await registar(
                "documento",
                "apagou",
                documentoId,
                `Documento ${doc.numero ?? ""} apagado`,
              );
              toast.success("Documento apagado");
              queryClient.invalidateQueries({ queryKey: ["documentos"] });
              window.history.back();
            }}
          />
        </div>
      </div>

      {bloqueado && (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Documento {ESTADO_LABEL[doc.estado].toLowerCase()} — o conteúdo está bloqueado para
          alterações.
          {doc.hash && (
            <span className="font-mono text-xs">impressão digital: {doc.hash.slice(0, 24)}…</span>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-md bg-white p-2 sm:p-4">
        <div ref={ref} dangerouslySetInnerHTML={{ __html: doc.html }} />
      </div>
    </div>
  );
}
