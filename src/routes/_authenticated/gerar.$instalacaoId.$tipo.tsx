import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCliente,
  fetchEmpresa,
  fetchEquipamentos,
  fetchInstalacao,
  fetchIntervencoes,
  getUserId,
  proximoNumero,
} from "@/lib/data";
import { buildDocumentHtml, CHECKLIST_AUTO } from "@/lib/docs";
import { DOC_LABEL, type DocTipo } from "@/lib/model";

export const Route = createFileRoute("/_authenticated/gerar/$instalacaoId/$tipo")({
  head: () => ({
    meta: [
      { title: "Gerar documento — Documentos de Segurança Privada" },
      { name: "description", content: "Preenche, assina e gera o documento oficial." },
      { property: "og:title", content: "Gerar documento" },
      { property: "og:description", content: "Preenche, assina e gera o documento oficial." },
    ],
  }),
  component: Gerar,
});

const CAMPOS: Record<DocTipo, [string, string, "input" | "area" | "date" | "time"][]> = {
  relatorio: [
    ["data", "Data", "date"],
    ["hora", "Hora", "time"],
    ["tipo", "Tipo de intervenção", "input"],
    ["modo", "Modo de deteção", "input"],
    ["tecnico", "Técnico", "input"],
    ["causa", "Causa provável", "area"],
    ["trabalhos", "Trabalhos efetuados", "area"],
    ["conclusao", "Conclusão", "area"],
  ],
  livro: [],
  declaracao: [
    ["texto", "Texto da declaração (opcional)", "area"],
    ["servicos", "Serviços contratados", "area"],
  ],
  auto: [
    ["retencao", "Retenção de imagens (dias)", "input"],
    ["testes", "Testes efetuados", "area"],
    ["observacoes", "Observações", "area"],
  ],
};

const ASSINANTE: [string, string][] = [
  ["nomeAssinante", "Nome de quem assina"],
  ["qualidadeAssinante", "Qualidade (ex.: responsável pelo sistema)"],
  ["docAssinante", "N.º CC / NIF"],
];

function Gerar() {
  const { instalacaoId, tipo } = Route.useParams();
  const docTipo = tipo as DocTipo;
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    data: new Date().toISOString().slice(0, 10),
  });
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(
    CHECKLIST_AUTO.map((label) => ({ label, ok: true })),
  );
  const [aGuardar, setAGuardar] = useState(false);

  const empresa = useQuery({ queryKey: ["empresa"], queryFn: fetchEmpresa });
  const instalacao = useQuery({
    queryKey: ["instalacao", instalacaoId],
    queryFn: () => fetchInstalacao(instalacaoId),
  });
  const cliente = useQuery({
    queryKey: ["cliente", instalacao.data?.cliente_id],
    queryFn: () => fetchCliente(instalacao.data!.cliente_id),
    enabled: !!instalacao.data?.cliente_id,
  });
  const equipamentos = useQuery({
    queryKey: ["equipamentos", instalacaoId],
    queryFn: () => fetchEquipamentos(instalacaoId),
  });
  const intervencoes = useQuery({
    queryKey: ["intervencoes", instalacaoId],
    queryFn: () => fetchIntervencoes(instalacaoId),
  });

  const html = useMemo(
    () =>
      buildDocumentHtml({
        tipo: docTipo,
        numero: "(atribuído ao guardar)",
        empresa: empresa.data ?? null,
        cliente: cliente.data ?? null,
        instalacao: instalacao.data ?? null,
        equipamentos: equipamentos.data ?? [],
        intervencoes: intervencoes.data ?? [],
        form,
        checklist,
        assinatura,
      }),
    [
      docTipo,
      empresa.data,
      cliente.data,
      instalacao.data,
      equipamentos.data,
      intervencoes.data,
      form,
      checklist,
      assinatura,
    ],
  );

  async function guardar() {
    try {
      setAGuardar(true);
      const user_id = await getUserId();
      const numero = await proximoNumero();
      const finalHtml = buildDocumentHtml({
        tipo: docTipo,
        numero,
        empresa: empresa.data ?? null,
        cliente: cliente.data ?? null,
        instalacao: instalacao.data ?? null,
        equipamentos: equipamentos.data ?? [],
        intervencoes: intervencoes.data ?? [],
        form,
        checklist,
        assinatura,
      });
      const { data, error } = await supabase
        .from("documentos")
        .insert({
          user_id,
          instalacao_id: instalacaoId,
          cliente_id: instalacao.data?.cliente_id ?? null,
          tipo: docTipo,
          numero,
          resumo: form["tipo"] ?? form["testes"] ?? null,
          estado: assinatura ? "assinado" : "rascunho",
          html: finalHtml,
          dados: form,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      toast.success(`Documento ${numero} criado`);
      navigate({ to: "/documentos/$documentoId", params: { documentoId: data.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{DOC_LABEL[docTipo]}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preenchimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(CAMPOS[docTipo] ?? []).map(([campo, label, kind]) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={campo}>{label}</Label>
                  {kind === "area" ? (
                    <Textarea
                      id={campo}
                      rows={3}
                      value={form[campo] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={campo}
                      type={kind === "date" ? "date" : kind === "time" ? "time" : "text"}
                      value={form[campo] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {docTipo === "auto" && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {checklist.map((c, i) => (
                  <label key={c.label} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={c.ok}
                      onCheckedChange={(v) =>
                        setChecklist((prev) =>
                          prev.map((x, n) => (n === i ? { ...x, ok: v === true } : x)),
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Identificação de quem assina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ASSINANTE.map(([campo, label]) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={campo}>{label}</Label>
                  <Input
                    id={campo}
                    value={form[campo] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                  />
                </div>
              ))}
              <SignaturePad value={assinatura} onChange={setAssinatura} />
            </CardContent>
          </Card>


          <Button onClick={guardar} disabled={aGuardar} className="w-full">
            Gerar e guardar documento
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md bg-white p-4">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
