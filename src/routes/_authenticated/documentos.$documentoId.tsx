import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchDocumento } from "@/lib/data";
import { DOC_LABEL, ESTADO_LABEL, type Documento, type DocTipo } from "@/lib/model";
import { exportarPdf } from "@/lib/ficheiros";

export const Route = createFileRoute("/_authenticated/documentos/$documentoId")({
  head: () => ({
    meta: [
      { title: "Documento — Documentos de Segurança Privada" },
      { name: "description", content: "Pré-visualização, estado e exportação em PDF." },
      { property: "og:title", content: "Documento" },
      { property: "og:description", content: "Pré-visualização e exportação em PDF." },
    ],
  }),
  component: DocumentoPage,
});

const ESTADOS: Documento["estado"][] = ["rascunho", "assinado", "entregue"];

function DocumentoPage() {
  const { documentoId } = Route.useParams();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery({
    queryKey: ["documento", documentoId],
    queryFn: () => fetchDocumento(documentoId),
  });

  const mudarEstado = useMutation({
    mutationFn: async (estado: Documento["estado"]) => {
      const { error } = await supabase.from("documentos").update({ estado }).eq("id", documentoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estado atualizado");
      queryClient.invalidateQueries({ queryKey: ["documento", documentoId] });
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return <p className="text-muted-foreground">A carregar…</p>;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{DOC_LABEL[data.tipo as DocTipo]}</h1>
          <p className="text-muted-foreground">{data.numero}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ESTADO_LABEL[data.estado]}</Badge>
          {ESTADOS.filter((e) => e !== data.estado).map((e) => (
            <Button key={e} variant="secondary" size="sm" onClick={() => mudarEstado.mutate(e)}>
              Marcar {ESTADO_LABEL[e].toLowerCase()}
            </Button>
          ))}
          <Button
            size="sm"
            onClick={() =>
              ref.current && exportarPdf(ref.current, `${data.numero ?? "documento"}.pdf`)
            }
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md bg-white p-4">
        <div ref={ref} dangerouslySetInnerHTML={{ __html: data.html }} />
      </div>
    </div>
  );
}
