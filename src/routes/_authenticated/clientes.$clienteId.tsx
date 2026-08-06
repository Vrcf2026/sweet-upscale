import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fetchCliente, fetchInstalacoes, getUserId } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId")({
  head: () => ({
    meta: [
      { title: "Ficha de cliente — Documentos de Segurança Privada" },
      { name: "description", content: "Dados do cliente e instalações associadas." },
      { property: "og:title", content: "Ficha de cliente" },
      { property: "og:description", content: "Dados do cliente e instalações associadas." },
    ],
  }),
  component: ClienteDetalhe,
});

const CAMPOS_CLIENTE = [
  ["nome", "Nome"],
  ["nif", "NIF"],
  ["morada", "Morada"],
  ["localidade", "Localidade"],
  ["cp", "Código postal"],
  ["tlm", "Telemóvel"],
  ["tel", "Telefone"],
  ["email", "Email"],
] as const;

const CAMPOS_INST = [
  ["entidade", "Entidade / designação"],
  ["tipo_sistema", "Tipo de sistema"],
  ["morada", "Morada da instalação"],
  ["localidade", "Localidade"],
  ["responsavel", "Responsável no local"],
  ["contacto_resp", "Contacto do responsável"],
  ["sistema_id", "ID do sistema"],
  ["num_registo", "N.º registo da instalação"],
  ["monitorizado_por", "Monitorizado por"],
  ["data_instalacao", "Data de instalação"],
] as const;

function ClienteDetalhe() {
  const { clienteId } = Route.useParams();
  const queryClient = useQueryClient();
  const cliente = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => fetchCliente(clienteId),
  });
  const instalacoes = useQuery({
    queryKey: ["instalacoes", clienteId],
    queryFn: () => fetchInstalacoes(clienteId),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [nova, setNova] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (cliente.data) {
      setForm(
        Object.fromEntries(
          CAMPOS_CLIENTE.map(([k]) => [
            k,
            ((cliente.data as unknown as Record<string, string | null>)[k] ?? "") as string,
          ]),
        ),
      );
    }
  }, [cliente.data]);

  const guardar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clientes").update(form).eq("id", clienteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cliente atualizado");
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarInstalacao = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const { error } = await supabase.from("instalacoes").insert({
        ...nova,
        data_instalacao: nova["data_instalacao"] || null,
        cliente_id: clienteId,
        user_id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Instalação criada");
      setNova({});
      setAberto(false);
      queryClient.invalidateQueries({ queryKey: ["instalacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cliente apagado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      window.history.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{cliente.data?.nome ?? "Cliente"}</h1>
        <Button variant="ghost" size="sm" onClick={() => apagar.mutate()}>
          <Trash2 className="h-4 w-4" /> Apagar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_CLIENTE.map(([campo, label]) => (
            <div key={campo} className="space-y-2">
              <Label htmlFor={campo}>{label}</Label>
              <Input
                id={campo}
                value={form[campo] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              Guardar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Instalações</CardTitle>
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Nova instalação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova instalação</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {CAMPOS_INST.map(([campo, label]) => (
                  <div key={campo} className="space-y-2">
                    <Label htmlFor={`i-${campo}`}>{label}</Label>
                    <Input
                      id={`i-${campo}`}
                      type={campo === "data_instalacao" ? "date" : "text"}
                      value={nova[campo] ?? ""}
                      onChange={(e) => setNova((f) => ({ ...f, [campo]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => criarInstalacao.mutate()}
                  disabled={criarInstalacao.isPending}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {(instalacoes.data ?? []).map((i) => (
            <Link
              key={i.id}
              to="/instalacoes/$instalacaoId"
              params={{ instalacaoId: i.id }}
              className="block rounded-md border border-border p-3 hover:border-accent"
            >
              <div className="font-medium">{i.entidade || i.morada || "Instalação"}</div>
              <div className="text-sm text-muted-foreground">
                {[i.tipo_sistema, i.localidade].filter(Boolean).join(" · ")}
              </div>
            </Link>
          ))}
          {!instalacoes.data?.length && (
            <p className="text-sm text-muted-foreground">Sem instalações registadas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
