import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, UserCog } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes, fetchInstalacoes } from "@/lib/data";
import { useRole } from "@/hooks/useRole";
import {
  apagarUtilizador,
  criarUtilizador,
  definirRole,
  listarUtilizadores,
  redefinirPassword,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/utilizadores")({
  head: () => ({
    meta: [
      { title: "Utilizadores — Documentos de Segurança Privada" },
      {
        name: "description",
        content: "Cria utilizadores da equipa e define acessos por cliente ou instalação.",
      },
      { property: "og:title", content: "Gestão de utilizadores" },
      {
        property: "og:description",
        content: "Contas da equipa e permissões por cliente ou instalação.",
      },
    ],
  }),
  component: Utilizadores,
});

function Utilizadores() {
  const { isSuperadmin, loading } = useRole();
  const queryClient = useQueryClient();

  const listar = useServerFn(listarUtilizadores);
  const criar = useServerFn(criarUtilizador);
  const role = useServerFn(definirRole);
  const password = useServerFn(redefinirPassword);
  const apagar = useServerFn(apagarUtilizador);

  const utilizadores = useQuery({
    queryKey: ["utilizadores"],
    queryFn: () => listar(),
    enabled: isSuperadmin,
  });
  const clientes = useQuery({ queryKey: ["clientes"], queryFn: () => fetchClientes() });
  const instalacoes = useQuery({ queryKey: ["instalacoes"], queryFn: () => fetchInstalacoes() });

  const [novo, setNovo] = useState({
    nome: "",
    email: "",
    password: "",
    role: "tecnico" as "tecnico" | "superadmin",
  });
  const [aberto, setAberto] = useState(false);

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ["utilizadores"] });
  }

  const criarM = useMutation({
    mutationFn: () => criar({ data: novo }),
    onSuccess: () => {
      toast.success("Utilizador criado");
      setNovo({ nome: "", email: "", password: "", role: "tecnico" });
      setAberto(false);
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acessoM = useMutation({
    mutationFn: async (v: {
      userId: string;
      cliente_id?: string | null;
      instalacao_id?: string | null;
    }) => {
      const { error } = await supabase.from("acessos").insert({
        user_id: v.userId,
        cliente_id: v.cliente_id ?? null,
        instalacao_id: v.instalacao_id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Acesso atribuído");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerAcesso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acessos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Acesso removido");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (!isSuperadmin)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem permissão</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Apenas o superadmin pode gerir utilizadores e acessos.
        </CardContent>
      </Card>
    );

  const nomeCliente = (id: string | null) =>
    clientes.data?.find((c) => c.id === id)?.nome ?? "Cliente";
  const nomeInstalacao = (id: string | null) => {
    const i = instalacoes.data?.find((x) => x.id === id);
    return i?.entidade || i?.morada || "Instalação";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserCog className="h-6 w-6 text-accent" /> Utilizadores
        </h1>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Novo utilizador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo utilizador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="u-nome">Nome</Label>
                <Input
                  id="u-nome"
                  value={novo.nome}
                  onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-email">Email</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={novo.email}
                  onChange={(e) => setNovo((n) => ({ ...n, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-pass">Palavra-passe</Label>
                <Input
                  id="u-pass"
                  value={novo.password}
                  onChange={(e) => setNovo((n) => ({ ...n, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select
                  value={novo.role}
                  onValueChange={(v) =>
                    setNovo((n) => ({ ...n, role: v as "tecnico" | "superadmin" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criarM.mutate()} disabled={criarM.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(utilizadores.data ?? []).map((u) => (
        <Card key={u.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{u.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={u.role}
                onValueChange={(v) =>
                  role({ data: { userId: u.id, role: v as "tecnico" | "superadmin" } })
                    .then(() => {
                      toast.success("Perfil atualizado");
                      refrescar();
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const nova = window.prompt("Nova palavra-passe (mín. 8 caracteres)");
                  if (!nova) return;
                  password({ data: { userId: u.id, password: nova } })
                    .then(() => toast.success("Palavra-passe alterada"))
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!window.confirm(`Apagar ${u.email}?`)) return;
                  apagar({ data: { userId: u.id } })
                    .then(() => {
                      toast.success("Utilizador apagado");
                      refrescar();
                    })
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {u.role === "superadmin" ? (
              <p className="text-sm text-muted-foreground">
                Superadmin — acesso total a clientes, instalações e documentos.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {u.acessos.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => removerAcesso.mutate(a.id)}
                      className="rounded-full border border-border px-3 py-1 text-xs hover:border-destructive"
                    >
                      {a.cliente_id
                        ? `Cliente: ${nomeCliente(a.cliente_id)}`
                        : `Instalação: ${nomeInstalacao(a.instalacao_id)}`}{" "}
                      ✕
                    </button>
                  ))}
                  {!u.acessos.length && (
                    <p className="text-sm text-muted-foreground">Sem acessos atribuídos.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value=""
                    onValueChange={(v) => acessoM.mutate({ userId: u.id, cliente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Dar acesso a cliente…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientes.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value=""
                    onValueChange={(v) => acessoM.mutate({ userId: u.id, instalacao_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Dar acesso a instalação…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(instalacoes.data ?? []).map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.entidade || i.morada || "Instalação"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
      {utilizadores.isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os utilizadores.</p>
      )}
    </div>
  );
}
