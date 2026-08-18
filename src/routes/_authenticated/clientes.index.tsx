import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes, getUserId } from "@/lib/data";
import { extrairTextoPdf } from "@/lib/ficheiros";
import { extrairOrcamento } from "@/lib/ia.functions";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Documentos de Segurança Privada" },
      { name: "description", content: "Lista de clientes e respetivas instalações." },
      { property: "og:title", content: "Clientes" },
      { property: "og:description", content: "Gestão de clientes do instalador." },
    ],
  }),
  component: ClientesPage,
});

const CAMPOS = [
  ["nome", "Nome"],
  ["nif", "NIF"],
  ["morada", "Morada"],
  ["localidade", "Localidade"],
  ["cp", "Código postal"],
  ["tlm", "Telemóvel"],
  ["tel", "Telefone"],
  ["email", "Email"],
] as const;

function ClientesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["clientes"], queryFn: fetchClientes });
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [aImportarOrcamento, setAImportarOrcamento] = useState(false);
  const orcamentoRef = useRef<HTMLInputElement>(null);

  const criar = useMutation({
    mutationFn: async () => {
      if (!form["nome"]?.trim()) throw new Error("O nome é obrigatório");
      const user_id = await getUserId();
      const { error } = await supabase
        .from("clientes")
        .insert({ ...form, nome: form["nome"].trim(), user_id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cliente criado");
      setForm({});
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function aoImportarOrcamento(file: File) {
    try {
      setAImportarOrcamento(true);
      const texto = await extrairTextoPdf(file);
      if (!texto.trim()) throw new Error("Não foi possível ler texto do PDF");
      const { cliente, instalacao, equipamentos } = await extrairOrcamento({ data: { texto } });
      const user_id = await getUserId();

      const nomeCliente = (cliente["nome"] ?? "").trim();
      let clienteId: string | null = null;

      if (nomeCliente) {
        const { data: existentes, error: erroBusca } = await supabase
          .from("clientes")
          .select("id, nome")
          .ilike("nome", nomeCliente);
        if (erroBusca) throw new Error(erroBusca.message);
        const match = existentes?.find(
          (c) => c.nome.trim().toLowerCase() === nomeCliente.toLowerCase(),
        );
        clienteId = match?.id ?? null;
      }

      if (!clienteId) {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from("clientes")
          .insert({
            user_id,
            nome: nomeCliente || "Cliente sem nome",
            nif: cliente["nif"] || null,
            morada: cliente["morada"] || null,
            localidade: cliente["localidade"] || null,
            cp: cliente["cp"] || null,
            tlm: cliente["tlm"] || null,
            email: cliente["email"] || null,
          })
          .select("id")
          .single();
        if (erroCliente) throw new Error(erroCliente.message);
        clienteId = novoCliente.id;
      }

      const { data: novaInstalacao, error: erroInstalacao } = await supabase
        .from("instalacoes")
        .insert({
          user_id,
          cliente_id: clienteId,
          entidade: instalacao["entidade"] || nomeCliente || null,
          tipo_sistema: instalacao["tipo_sistema"] || null,
          morada: instalacao["morada"] || cliente["morada"] || null,
          localidade: instalacao["localidade"] || cliente["localidade"] || null,
        })
        .select("id")
        .single();
      if (erroInstalacao) throw new Error(erroInstalacao.message);

      const linhasEquip = (equipamentos ?? []).filter((e) => e.equip?.trim());
      if (linhasEquip.length) {
        const { error: erroEquip } = await supabase.from("equipamentos").insert(
          linhasEquip.map((e, n) => ({
            instalacao_id: novaInstalacao.id,
            user_id,
            equip: e.equip,
            marca: e.marca || null,
            serie: e.serie || null,
            local: e.local || null,
            ordem: n,
          })),
        );
        if (erroEquip) throw new Error(erroEquip.message);
      }

      toast.success("Instalação criada a partir do orçamento");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      navigate({ to: "/instalacoes/$instalacaoId", params: { instalacaoId: novaInstalacao.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAImportarOrcamento(false);
    }
  }

  const t = termo.trim().toLowerCase();
  const lista = (data ?? []).filter((c) =>
    !t
      ? true
      : [c.nome, c.nif, c.localidade, c.morada, c.email].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{data?.length ?? 0} registados</p>
        </div>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Só o nome é obrigatório.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              {CAMPOS.map(([campo, label]) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={`novo-${campo}`}>{label}</Label>
                  <Input
                    id={`novo-${campo}`}
                    value={form[campo] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
                Criar cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          variant="secondary"
          disabled={aImportarOrcamento}
          onClick={() => orcamentoRef.current?.click()}
        >
          {aImportarOrcamento ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Nova instalação a partir de orçamento (PDF)
        </Button>
        <input
          ref={orcamentoRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void aoImportarOrcamento(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar cliente…"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {lista.map((c) => (
          <Link key={c.id} to="/clientes/$clienteId" params={{ clienteId: c.id }}>
            <Card className="transition-colors hover:border-accent">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {[c.morada, c.localidade].filter(Boolean).join(", ")}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{c.tlm || c.tel || c.email}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!lista.length && (
          <p className="text-sm text-muted-foreground">Sem clientes para mostrar.</p>
        )}
      </div>
    </div>
  );
}
