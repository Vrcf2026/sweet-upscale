import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  fetchCliente,
  fetchDocumentos,
  fetchEquipamentos,
  fetchInstalacao,
  fetchIntervencoes,
  getUserId,
} from "@/lib/data";
import {
  AUTORIDADES,
  DOC_LABEL,
  ESTADOS_INSTALACAO,
  TIPOS_SISTEMA,
  type DocTipo,
} from "@/lib/model";
import { dataPT } from "@/lib/docs";
import { extrairTextoPdf, lerExcel } from "@/lib/ficheiros";
import { estruturarEquipamento } from "@/lib/ia.functions";

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

type EquipRow = { id: string; equip: string; marca: string | null; serie: string | null; local: string | null };

function Equipamentos({ instalacaoId, lista }: { instalacaoId: string; lista: EquipRow[] }) {
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ equip: "", marca: "", serie: "", local: "" });
  const [texto, setTexto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["equipamentos", instalacaoId] });

  const adicionar = useMutation({
    mutationFn: async (linhas: typeof novo[]) => {
      const user_id = await getUserId();
      const rows = linhas
        .filter((l) => l.equip.trim())
        .map((l, n) => ({ ...l, instalacao_id: instalacaoId, user_id, ordem: lista.length + n }));
      if (!rows.length) throw new Error("Nada para adicionar");
      const { error } = await supabase.from("equipamentos").insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNovo({ equip: "", marca: "", serie: "", local: "" });
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });

  const importarIA = useMutation({
    mutationFn: async (conteudo: string) => {
      const linhas = await estruturarEquipamento({ data: { texto: conteudo } });
      if (!linhas.length) throw new Error("A IA não encontrou equipamento no texto");
      await adicionar.mutateAsync(linhas);
      return linhas.length;
    },
    onSuccess: (n) => {
      setTexto("");
      toast.success(`${n} equipamentos importados`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function aoCarregarFicheiro(file: File) {
    try {
      const lido = file.name.toLowerCase().endsWith(".pdf")
        ? await extrairTextoPdf(file)
        : await lerExcel(file);
      const conteudo = typeof lido === "string" ? lido : JSON.stringify(lido);
      if (!conteudo.trim()) throw new Error("Não foi possível ler o ficheiro");
      setTexto(conteudo.slice(0, 12000));
      toast.success("Ficheiro lido — confirma e importa com IA");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Importar com IA
          </CardTitle>
          <CardDescription>
            Cola o texto de uma fatura/orçamento ou carrega um PDF/Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cola aqui a lista de equipamento…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => importarIA.mutate(texto)}
              disabled={importarIA.isPending || !texto.trim()}
            >
              {importarIA.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Estruturar e adicionar
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Carregar PDF/Excel
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void aoCarregarFicheiro(f);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipamento instalado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <Input
              placeholder="Equipamento"
              value={novo.equip}
              onChange={(e) => setNovo({ ...novo, equip: e.target.value })}
            />
            <Input
              placeholder="Marca/Modelo"
              value={novo.marca}
              onChange={(e) => setNovo({ ...novo, marca: e.target.value })}
            />
            <Input
              placeholder="N.º série"
              value={novo.serie}
              onChange={(e) => setNovo({ ...novo, serie: e.target.value })}
            />
            <Input
              placeholder="Localização"
              value={novo.local}
              onChange={(e) => setNovo({ ...novo, local: e.target.value })}
            />
            <Button onClick={() => adicionar.mutate([novo])}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {lista.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div className="text-sm">
                  <span className="font-medium">{r.equip}</span>{" "}
                  <span className="text-muted-foreground">
                    {[r.marca, r.serie, r.local].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => apagar.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!lista.length && (
              <p className="text-sm text-muted-foreground">Sem equipamento registado.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type IntervRow = {
  id: string;
  data: string;
  hora: string | null;
  tipo: string | null;
  causa: string | null;
  trabalhos: string | null;
  tecnico: string | null;
  num_relatorio: string | null;
};

function Intervencoes({ instalacaoId, lista }: { instalacaoId: string; lista: IntervRow[] }) {
  const queryClient = useQueryClient();
  const [nova, setNova] = useState({
    data: new Date().toISOString().slice(0, 10),
    hora: "",
    tipo: "",
    modo: "",
    causa: "",
    trabalhos: "",
    tecnico: "",
  });

  const criar = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const { error } = await supabase
        .from("intervencoes")
        .insert({ ...nova, instalacao_id: instalacaoId, user_id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Intervenção registada");
      setNova({ ...nova, causa: "", trabalhos: "", hora: "" });
      queryClient.invalidateQueries({ queryKey: ["intervencoes", instalacaoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("intervencoes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["intervencoes", instalacaoId] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registar intervenção</CardTitle>
          <CardDescription>Alimenta o Livro de Registos do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            type="date"
            value={nova.data}
            onChange={(e) => setNova({ ...nova, data: e.target.value })}
          />
          <Input
            type="time"
            value={nova.hora}
            onChange={(e) => setNova({ ...nova, hora: e.target.value })}
          />
          <Input
            placeholder="Tipo (manutenção, avaria, falso alarme…)"
            value={nova.tipo}
            onChange={(e) => setNova({ ...nova, tipo: e.target.value })}
          />
          <Input
            placeholder="Modo de deteção"
            value={nova.modo}
            onChange={(e) => setNova({ ...nova, modo: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Causa"
            value={nova.causa}
            onChange={(e) => setNova({ ...nova, causa: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Trabalhos efetuados"
            value={nova.trabalhos}
            onChange={(e) => setNova({ ...nova, trabalhos: e.target.value })}
          />
          <Input
            placeholder="Técnico"
            value={nova.tecnico}
            onChange={(e) => setNova({ ...nova, tecnico: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              <Plus className="h-4 w-4" /> Registar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {lista.map((r) => (
          <div key={r.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {dataPT(r.data)} {r.hora} · {r.tipo}
              </div>
              <Button variant="ghost" size="sm" onClick={() => apagar.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {r.causa && <p className="text-sm text-muted-foreground">Causa: {r.causa}</p>}
            {r.trabalhos && (
              <p className="text-sm text-muted-foreground">Trabalhos: {r.trabalhos}</p>
            )}
          </div>
        ))}
        {!lista.length && (
          <p className="text-sm text-muted-foreground">Sem intervenções registadas.</p>
        )}
      </div>
    </div>
  );
}
