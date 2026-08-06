import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchEmpresa, getUserId } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({
    meta: [
      { title: "Empresa — Documentos de Segurança Privada" },
      { name: "description", content: "Dados do instalador usados em todos os documentos." },
      { property: "og:title", content: "Dados da empresa" },
      { property: "og:description", content: "Configura os dados do instalador certificado." },
    ],
  }),
  component: EmpresaPage,
});

const CAMPOS = [
  ["nome", "Nome da empresa"],
  ["nipc", "NIPC"],
  ["registo", "N.º de registo prévio PSP"],
  ["data_emissao", "Data de emissão"],
  ["morada", "Morada"],
  ["localidade", "Localidade"],
  ["contacto", "Contacto"],
  ["tecnico", "Técnico responsável"],
] as const;

function EmpresaPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["empresa"], queryFn: fetchEmpresa });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setForm(
        Object.fromEntries(CAMPOS.map(([k]) => [k, (data as Record<string, unknown>)[k] as string ?? ""])),
      );
    }
  }, [data]);

  const guardar = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const payload = {
        ...form,
        data_emissao: form["data_emissao"] || null,
        user_id,
      };
      const { error } = await supabase.from("empresa").upsert(payload, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Dados da empresa guardados");
      queryClient.invalidateQueries({ queryKey: ["empresa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dados da empresa</h1>
        <p className="text-muted-foreground">Aparecem no cabeçalho de todos os documentos.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Instalador</CardTitle>
          <CardDescription>Registo prévio junto da PSP</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(([campo, label]) => (
            <div key={campo} className="space-y-2">
              <Label htmlFor={campo}>{label}</Label>
              <Input
                id={campo}
                type={campo === "data_emissao" ? "date" : "text"}
                value={form[campo] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
