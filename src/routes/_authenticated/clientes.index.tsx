import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
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
  const { data } = useQuery({ queryKey: ["clientes"], queryFn: fetchClientes });
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const criar = useMutation({
    mutationFn: async () => {
      if (!form["nome"]?.trim()) throw new Error("O nome é obrigatório");
      const user_id = await getUserId();
      const { error } = await supabase.from("clientes").insert({ ...form, user_id });
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
