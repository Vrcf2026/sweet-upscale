import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoradaLink } from "@/components/MoradaLink";
import { ApagarDialog } from "@/components/ApagarDialog";
import { supabase } from "@/integrations/supabase/client";
import { Equipamentos } from "@/components/instalacao/Equipamentos";
import { Intervencoes } from "@/components/instalacao/Intervencoes";
import {
  fetchCliente,
  fetchDocumentos,
  fetchEquipamentos,
  fetchInstalacao,
  fetchIntervencoes,
} from "@/lib/data";
import {
  AUTORIDADES,
  DOC_LABEL,
  ESTADOS_INSTALACAO,
  TIPOS_SISTEMA,
  type DocTipo,
} from "@/lib/model";

export const Route = createFileRoute("/_authenticated/instalacoes/$instalacaoId")({
  head: () => ({
    meta: [
      { title: "Instalação — Documentos de Segurança Privada" },
      { name: "description", content: "Equipamento, intervenções e documentos da instalação." },
      { property: "og:title", content: "Instalação" },
      { property: "og:description", content: "Equipamento, intervenções e documentos." },
    ],
  }),
  component: InstalacaoDetalhe,
});

const CAMPOS = [
  ["entidade", "Entidade / designação"],
  ["tipo_sistema", "Tipo de sistema"],
  ["morada", "Morada da instalação"],
  ["localidade", "Localidade"],
  ["responsavel", "Responsável no local"],
  ["contacto_resp", "Contacto do responsável"],
  ["sistema_id", "ID do sistema"],
  ["num_registo", "N.º registo da instalação"],
  ["monitorizado_por", "Monitorizado por"],
  ["instalado_por", "Instalado por"],
  ["data_instalacao", "Data de instalação"],
  ["periodicidade_meses", "Periodicidade de manutenção (meses)"],
  ["proxima_manutencao", "Próxima manutenção"],
  ["autoridade", "Autoridade da zona"],
  ["autoridade_subunidade", "Subunidade (esquadra / posto)"],
  ["estado", "Estado da instalação"],
] as const;

const TIPOS: DocTipo[] = ["relatorio", "livro", "declaracao", "auto"];

function InstalacaoDetalhe() {
  const { instalacaoId } = Route.useParams();
  const queryClient = useQueryClient();
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
  const documentos = useQuery({
    queryKey: ["documentos", "instalacao", instalacaoId],
    queryFn: () => fetchDocumentos({ instalacaoId }),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (instalacao.data) {
      setForm(
        Object.fromEntries(
          CAMPOS.map(([k]) => [
            k,
            ((instalacao.data as unknown as Record<string, string | null>)[k] ?? "") as string,
          ]),
        ),
      );
    }
  }, [instalacao.data]);

  const guardar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("instalacoes")
        .update({
          entidade: form["entidade"] ?? null,
          tipo_sistema: form["tipo_sistema"] ?? null,
          morada: form["morada"] ?? null,
          localidade: form["localidade"] ?? null,
          responsavel: form["responsavel"] ?? null,
          contacto_resp: form["contacto_resp"] ?? null,
          sistema_id: form["sistema_id"] ?? null,
          num_registo: form["num_registo"] ?? null,
          monitorizado_por: form["monitorizado_por"] ?? null,
          instalado_por: form["instalado_por"] ?? null,
          data_instalacao: form["data_instalacao"] || null,
          periodicidade_meses: Number(form["periodicidade_meses"]) || 12,
          proxima_manutencao: form["proxima_manutencao"] || null,
          estado: form["estado"] || "ativa",
          autoridade: form["autoridade"] ?? null,
          autoridade_subunidade: form["autoridade_subunidade"] ?? null,
        })
        .eq("id", instalacaoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Instalação atualizada");
      queryClient.invalidateQueries({ queryKey: ["instalacao", instalacaoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const temAlarme = (instalacao.data?.tipo_sistema ?? "").toLowerCase().includes("alarme");

  const bloqueios: string[] = [];
  if ((documentos.data ?? []).length > 0)
    bloqueios.push(
      `Tem ${documentos.data!.length} documento(s) associado(s). Apaga primeiro os documentos.`,
    );
  if (instalacao.data && instalacao.data.estado !== "entregue")
    bloqueios.push("A instalação tem de estar marcada como \"Entregue ao cliente\".");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {instalacao.data?.entidade || instalacao.data?.morada || "Instalação"}
          </h1>
          {cliente.data && (
            <Link
              to="/clientes/$clienteId"
              params={{ clienteId: cliente.data.id }}
              className="text-sm text-accent hover:underline"
            >
              {cliente.data.nome}
            </Link>
          )}
        </div>
        <ApagarDialog
          titulo="Apagar instalação"
          descricao="Remove a instalação, o seu equipamento e as intervenções registadas."
          bloqueios={bloqueios}
          nomeBackup={`backup-instalacao-${instalacaoId}.json`}
          recolherBackup={async () => ({
            instalacao: instalacao.data,
            cliente: cliente.data,
            equipamentos: equipamentos.data ?? [],
            intervencoes: intervencoes.data ?? [],
          })}
          aoApagar={async () => {
            await supabase.from("equipamentos").delete().eq("instalacao_id", instalacaoId);
            await supabase.from("intervencoes").delete().eq("instalacao_id", instalacaoId);
            const { error } = await supabase.from("instalacoes").delete().eq("id", instalacaoId);
            if (error) throw new Error(error.message);
            toast.success("Instalação apagada");
            queryClient.invalidateQueries({ queryKey: ["instalacoes"] });
            window.history.back();
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(temAlarme ? [...TIPOS, "comunicacao" as DocTipo] : TIPOS).map((tipo) => (
          <Button key={tipo} asChild variant="secondary" size="sm">
            <Link to="/gerar/$instalacaoId/$tipo" params={{ instalacaoId, tipo }}>
              <FileText className="h-4 w-4" /> {DOC_LABEL[tipo]}
            </Link>
          </Button>
        ))}
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="equipamento">Equipamento</TabsTrigger>
          <TabsTrigger value="intervencoes">Intervenções</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              {CAMPOS.map(([campo, label]) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={campo}>{label}</Label>
                  {campo === "tipo_sistema" ? (
                    <Select
                      value={form[campo] ?? ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, tipo_sistema: v }))}
                    >
                      <SelectTrigger id={campo}>
                        <SelectValue placeholder="Escolhe o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_SISTEMA.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : campo === "autoridade" ? (
                    <Select
                      value={form[campo] ?? ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, autoridade: v }))}
                    >
                      <SelectTrigger id={campo}>
                        <SelectValue placeholder="Escolhe a autoridade" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTORIDADES.map((a) => (
                          <SelectItem key={a.valor} value={a.valor}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : campo === "estado" ? (
                    <Select
                      value={form[campo] || "ativa"}
                      onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}
                    >
                      <SelectTrigger id={campo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_INSTALACAO.map((e) => (
                          <SelectItem key={e.valor} value={e.valor}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={campo}
                      type={
                        campo === "data_instalacao" || campo === "proxima_manutencao"
                          ? "date"
                          : campo === "periodicidade_meses"
                            ? "number"
                            : "text"
                      }
                      value={form[campo] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    />
                  )}
                  {campo === "morada" && (
                    <MoradaLink partes={[form["morada"], form["localidade"]]} />
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipamento">
          <Equipamentos instalacaoId={instalacaoId} lista={equipamentos.data ?? []} />
        </TabsContent>

        <TabsContent value="intervencoes">
          <Intervencoes instalacaoId={instalacaoId} lista={intervencoes.data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
